import { scaleLinear } from 'd3-scale';
import { interpolateRgb, interpolateHsl, interpolateLab, interpolateHcl } from 'd3-interpolate';

import {
  NONE, COLOR_SERIES_INDEX, COLOR_CATEGORY_INDEX, COLOR_SAME, COLOR_SERIES,
  COLOR_INTERPOLATION_HCL, COLOR_INTERPOLATION_HSL, COLOR_INTERPOLATION_LAB, COLOR_INTERPOLATION_RGB,
  RENDERER_AREA, RENDERER_BAR, RENDERER_LINE
} from '../config/core/constants';
import { getFocusedDefocused } from './FocusValue';
import type { FocusPercentage } from '../types/animation';
import type { ColorPaletteConfig, SeriesColor } from '../types/config';
import type { EnhancedSeriesConfig } from '../types/enhanced';
import type { NumericValues, SeriesDomainObject, SeriesValueObject } from '../types/data';

// A colour resolves along two axes: `'series'` hops the element axis (a marker
// defers to the shape) and `'same'` hops the focus axis (focused defers to
// normal); both end at the shape's normal colour, so a chain is at most two hops.
// Each element's styleKey (the series config style it reads) and paletteKey (the
// colorPaletteConfig entry its palette keywords index into) must stay in lockstep.
const elementKeys = {
  series: { styleKey: 'shapeStyle', paletteKey: 'series' },
  marker: { styleKey: 'markerStyle', paletteKey: 'marker' },
  label: { styleKey: 'labelTextStyle', paletteKey: 'label' },
  errorBar: { styleKey: 'errorBarStyle', paletteKey: 'errorBar' }
} as const;

const styleMemberKeys = {
  strokeColors: 'strokeColor',
  fillColors: 'fillColor'
} as const;

type FillOrStrokeKey = keyof typeof styleMemberKeys;
type ColorMapKey = keyof typeof elementKeys;
type FocusKey = 'normal' | 'focused' | 'defocused';
type StyleStateRecord = Record<FocusKey, Record<string, SeriesColor | number | null | undefined>>;
type ColorArgs = [seriesIndex?: number, focusPercentage?: FocusPercentage, defaultColor?: SeriesColor | null, categoryIndex?: number];
type ColorInterpolator = (start: string, end: string) => (value: number) => string;
interface ColorScale {
  (value: number): string;
  range(values: readonly (string | null)[]): ColorScale;
  domain(values: readonly number[]): ColorScale;
  interpolate(interpolator: ColorInterpolator): ColorScale;
}

function readColor(seriesConfig: EnhancedSeriesConfig, mapKey: ColorMapKey, focusKey: FocusKey, member: 'strokeColor' | 'fillColor'): SeriesColor {
  const styleStates = seriesConfig[elementKeys[mapKey].styleKey] as unknown as StyleStateRecord;
  return styleStates[focusKey][member] as SeriesColor;
}

function getColor(fillOrStrokeKey: FillOrStrokeKey, mapKey: ColorMapKey, colorPaletteConfig: ColorPaletteConfig, seriesConfig: EnhancedSeriesConfig, seriesIndex = 0, focusPercentage: FocusPercentage = null, defaultColor: SeriesColor | null = '', categoryIndex?: number): SeriesColor | null {
  const { focused, defocused } = getFocusedDefocused(focusPercentage);
  const member = styleMemberKeys[fillOrStrokeKey];
  let focusKey: FocusKey = focused ? 'focused' : (defocused ? 'defocused' : 'normal');
  for (let i = 0; i < 2; i++) {
    const value = readColor(seriesConfig, mapKey, focusKey, member);
    if (value === COLOR_SERIES) {
      mapKey = 'series';
    }
    else if (value === COLOR_SAME) {
      focusKey = 'normal';
    }
  }
  const color = readColor(seriesConfig, mapKey, focusKey, member);
  if (color === COLOR_SERIES_INDEX) {
    const colors = colorPaletteConfig[elementKeys[mapKey].paletteKey][focusKey][fillOrStrokeKey];
    return colors[seriesIndex % colors.length]!;
  }
  else if (color === COLOR_CATEGORY_INDEX) {
    if (categoryIndex !== undefined) {
      const colors = colorPaletteConfig[elementKeys[mapKey].paletteKey][focusKey][fillOrStrokeKey];
      return colors[categoryIndex % colors.length]!;
    }
    return defaultColor;
  }
  else {
    return color;
  }
}

/**
 * A fill-rendered series drawn as an outline only — transparent fill with a
 * visible stroke, e.g. a hollow candlestick body. The legend/tooltip color
 * icons fall back to the stroke color and opacities for these, since the fill
 * ones would produce an invisible icon.
 */
function isHollowShape(seriesConfig: EnhancedSeriesConfig): boolean {
  const { fillOpacity, strokeWidth } = seriesConfig.shapeStyle.normal;
  return fillOpacity === 0 && strokeWidth! > 0;
}

export function getSeriesOpacities(seriesConfig: EnhancedSeriesConfig) {
  const { renderer } = seriesConfig;
  let opacity, focusedOpacity, defocusedOpacity;
  if ((renderer === RENDERER_AREA || renderer === RENDERER_BAR) && !isHollowShape(seriesConfig)) {
    const { normal, focused, defocused } = seriesConfig.shapeStyle;
    opacity = normal.fillOpacity!;
    focusedOpacity = focused.fillOpacity!;
    defocusedOpacity = defocused.fillOpacity!;
  }
  else if (renderer === RENDERER_LINE || renderer === RENDERER_AREA || renderer === RENDERER_BAR) {
    // a line series, or a hollow fill shape falling back to its stroke
    const { normal, focused, defocused } = seriesConfig.shapeStyle;
    opacity = normal.strokeOpacity!;
    focusedOpacity = focused.strokeOpacity!;
    defocusedOpacity = defocused.strokeOpacity!;
  }
  else {
    const { markerShape } = seriesConfig;
    const { normal, focused, defocused } = markerShape !== NONE ? seriesConfig.markerStyle : seriesConfig.labelTextStyle;
    opacity = normal.fillOpacity!;
    focusedOpacity = focused.fillOpacity!;
    defocusedOpacity = defocused.fillOpacity!;
  }
  return {
    opacity,
    focusedOpacity,
    defocusedOpacity
  };
}

export function getSeriesColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: EnhancedSeriesConfig, ...args: ColorArgs): SeriesColor | null {
  const { renderer } = seriesConfig;
  if ((renderer === RENDERER_AREA || renderer === RENDERER_BAR) && !isHollowShape(seriesConfig)) {
    return getSeriesFillColor(colorPaletteConfig, seriesConfig, ...args);
  }
  else if (renderer === RENDERER_LINE || renderer === RENDERER_AREA || renderer === RENDERER_BAR) {
    // a line series, or a hollow fill shape falling back to its stroke
    return getSeriesStrokeColor(colorPaletteConfig, seriesConfig, ...args);
  }
  else {
    const { markerShape } = seriesConfig;
    if (markerShape !== NONE) {
      return getSeriesMarkerFillColor(colorPaletteConfig, seriesConfig, ...args);
    }
    else {
      return getSeriesLabelFillColor(colorPaletteConfig, seriesConfig, ...args);
    }
  }
}

export function getSeriesFillColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: EnhancedSeriesConfig, ...[seriesIndex, focusPercentage, defaultColor, categoryIndex]: ColorArgs): SeriesColor | null {
  return getColor('fillColors', 'series', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, categoryIndex);
}

export function getSeriesStrokeColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: EnhancedSeriesConfig, ...[seriesIndex, focusPercentage, defaultColor, categoryIndex]: ColorArgs): SeriesColor | null {
  return getColor('strokeColors', 'series', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, categoryIndex);
}

export function getSeriesMarkerFillColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: EnhancedSeriesConfig, ...[seriesIndex, focusPercentage, defaultColor, categoryIndex]: ColorArgs): SeriesColor | null {
  return getColor('fillColors', 'marker', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, categoryIndex);
}

export function getSeriesMarkerStrokeColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: EnhancedSeriesConfig, ...[seriesIndex, focusPercentage, defaultColor, categoryIndex]: ColorArgs): SeriesColor | null {
  return getColor('strokeColors', 'marker', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, categoryIndex);
}

export function getSeriesLabelFillColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: EnhancedSeriesConfig, ...[seriesIndex, focusPercentage, defaultColor, categoryIndex]: ColorArgs): SeriesColor | null {
  return getColor('fillColors', 'label', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, categoryIndex);
}

export function getSeriesLabelStrokeColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: EnhancedSeriesConfig, ...[seriesIndex, focusPercentage, defaultColor, categoryIndex]: ColorArgs): SeriesColor | null {
  return getColor('strokeColors', 'label', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, categoryIndex);
}

export function getSeriesErrorBarStrokeColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: EnhancedSeriesConfig, ...[seriesIndex, focusPercentage, defaultColor, categoryIndex]: ColorArgs): SeriesColor | null {
  return getColor('strokeColors', 'errorBar', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, categoryIndex);
}

function getColorInterpolator(seriesConfig: EnhancedSeriesConfig): ColorInterpolator | null {
  const colorInterpolation = seriesConfig.colorScale.interpolation;
  if (colorInterpolation === COLOR_INTERPOLATION_RGB) {
    return interpolateRgb;
  }
  else if (colorInterpolation === COLOR_INTERPOLATION_HSL) {
    return interpolateHsl;
  }
  else if (colorInterpolation === COLOR_INTERPOLATION_LAB) {
    return interpolateLab;
  }
  else if (colorInterpolation === COLOR_INTERPOLATION_HCL) {
    return interpolateHcl;
  }
  return null;
}

function buildScale(colorRange: readonly (string | null)[], colorDomain: readonly number[], interpolator: ColorInterpolator | null): ColorScale {
  const colorScale = scaleLinear() as unknown as ColorScale;
  colorScale.range(colorRange).domain(colorDomain);
  return interpolator ? colorScale.interpolate(interpolator) : colorScale;
}

/**
 * Per-datum colors for a `colorProperty` series. A row without a color value
 * (and every row when none has one, i.e. a `[null, null]` domain) gets the
 * scale's `missing` color; with `missing: null` the generator returns `null`
 * and the caller falls back to the series' own colors.
 */
export function getSeriesColorGenerator(seriesConfig: EnhancedSeriesConfig, _focusPercentage: FocusPercentage, rawDomains: SeriesDomainObject, filteredValues: SeriesValueObject): (index: number) => string | null {
  const colorValues = filteredValues.color as NumericValues;
  const interpolator = getColorInterpolator(seriesConfig);

  const { min, max, missing, base } = seriesConfig.colorScale;
  const [colorDomainMin, colorDomainMax] = rawDomains.color;
  if (colorDomainMin === null || colorDomainMax === null) {
    return () => missing;
  }

  if (base.value !== NONE) {
    const colorBase = base.value;
    const aboveColorScale = buildScale([base.aboveMin, base.aboveMax],
      [colorBase, Math.max(colorDomainMax, colorBase)], interpolator);
    const belowColorScale = buildScale([base.belowMin, base.belowMax],
      [Math.min(colorDomainMin, colorBase), colorBase], interpolator);

    return function getColor(index: number) {
      const colorValue = colorValues[index];
      if (colorValue === undefined) {
        return missing;
      }
      if (colorValue < colorBase) {
        return belowColorScale(colorValue);
      }
      else {
        return aboveColorScale(colorValue);
      }
    }
  }
  else {
    const colorScale = buildScale([min, max], [colorDomainMin, colorDomainMax], interpolator);
    return function getColor(index: number) {
      const colorValue = colorValues[index];
      if (colorValue === undefined) {
        return missing;
      }
      return colorScale(colorValue);
    }
  }
}

export function getSeriesGradientColors(seriesConfig: EnhancedSeriesConfig): string[] | null {
  const { min, max, base } = seriesConfig.colorScale;
  let colors = null;
  if (base.value === NONE && min !== NONE && max !== NONE) {
    colors = [min, max];
  }
  else if (base.value !== NONE && base.aboveMin !== NONE && base.aboveMax !== NONE &&
    base.belowMin !== NONE && base.belowMax !== NONE) {
    colors = [base.belowMin, base.belowMax, base.aboveMin, base.aboveMax];
  }
  return colors;
}
