import { scaleLinear } from 'd3-scale';
import { interpolateRgb, interpolateHsl, interpolateLab, interpolateHcl } from 'd3-interpolate';

import {
  NONE, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX, COLOR_SAME, COLOR_SERIES,
  COLOR_INTERPOLATION_HCL, COLOR_INTERPOLATION_HSL, COLOR_INTERPOLATION_LAB, COLOR_INTERPOLATION_RGB,
  RENDERER_AREA, RENDERER_BAR, RENDERER_LINE
} from '../config/core/constants';
import { getFocusedDefocused } from './FocusValue';
import type { FocusPercentage } from '../types/animation';
import type { ColorPaletteConfig, SeriesColor, SeriesConfig } from '../types/config';
import type { NumericValues, SeriesDomainObject, SeriesValueObject } from '../types/data';

const colorLookupMap = {
  strokeColors: {
    series: {
      normal: { paletteKey: 'series', configKey: 'strokeColor' },
      focused: { paletteKey: 'seriesFocused', configKey: 'focusedStrokeColor' },
      defocused: { paletteKey: 'seriesDefocused', configKey: 'defocusedStrokeColor' }
    },
    marker: {
      normal: { paletteKey: 'marker', configKey: 'markerStrokeColor' },
      focused: { paletteKey: 'markerFocused', configKey: 'markerFocusedStrokeColor' },
      defocused: { paletteKey: 'markerDefocused', configKey: 'markerDefocusedStrokeColor' }
    },
    label: {
      normal: { paletteKey: 'label', configKey: 'labelStrokeColor' },
      focused: { paletteKey: 'labelFocused', configKey: 'labelFocusedStrokeColor' },
      defocused: { paletteKey: 'labelDefocused', configKey: 'labelDefocusedStrokeColor' }
    }
  },
  fillColors: {
    series: {
      normal: { paletteKey: 'series', configKey: 'fillColor' },
      focused: { paletteKey: 'seriesFocused', configKey: 'focusedFillColor' },
      defocused: { paletteKey: 'seriesDefocused', configKey: 'defocusedFillColor' }
    },
    marker: {
      normal: { paletteKey: 'marker', configKey: 'markerFillColor' },
      focused: { paletteKey: 'markerFocused', configKey: 'markerFocusedFillColor' },
      defocused: { paletteKey: 'markerDefocused', configKey: 'markerDefocusedFillColor' }
    },
    label: {
      normal: { paletteKey: 'label', configKey: 'labelFillColor' },
      focused: { paletteKey: 'labelFocused', configKey: 'labelFocusedFillColor' },
      defocused: { paletteKey: 'labelDefocused', configKey: 'labelDefocusedFillColor' }
    }
  }
} as const;

type FillOrStrokeKey = keyof typeof colorLookupMap;
type ColorMapKey = keyof (typeof colorLookupMap)['strokeColors'];
type FocusKey = 'normal' | 'focused' | 'defocused';
type ColorArgs = [seriesIndex?: number, focusPercentage?: FocusPercentage, defaultColor?: SeriesColor | null, groupIndex?: number];
type ColorInterpolator = (start: string, end: string) => (value: number) => string;
interface ColorScale {
  (value: number): string;
  range(values: readonly (string | null)[]): ColorScale;
  domain(values: readonly number[]): ColorScale;
  interpolate(interpolator: ColorInterpolator): ColorScale;
}

function getColor(fillOrStrokeKey: FillOrStrokeKey, mapKey: ColorMapKey, colorPaletteConfig: ColorPaletteConfig, seriesConfig: SeriesConfig, seriesIndex = 0, focusPercentage: FocusPercentage = null, defaultColor: SeriesColor | null = '', groupIndex?: number): SeriesColor | null {
  const { focused, defocused } = getFocusedDefocused(focusPercentage);
  let focusKey: FocusKey = focused ? 'focused' : (defocused ? 'defocused' : 'normal');
  let { configKey, paletteKey } = colorLookupMap[fillOrStrokeKey][mapKey][focusKey];
  for (let i = 0; i < 2; i++) {
    if ((seriesConfig[configKey] as SeriesColor) === COLOR_SERIES) {
      mapKey = 'series';
      ({ configKey, paletteKey } = colorLookupMap[fillOrStrokeKey][mapKey][focusKey]);
    }
    else if ((seriesConfig[configKey] as SeriesColor) === COLOR_SAME) {
      focusKey = 'normal';
      ({ configKey, paletteKey } = colorLookupMap[fillOrStrokeKey][mapKey][focusKey]);
    }
  }
  const color = seriesConfig[configKey] as SeriesColor;
  if (color === COLOR_SERIES_INDEX) {
    const colors = colorPaletteConfig[paletteKey][fillOrStrokeKey];
    return colors[seriesIndex % colors.length];
  }
  else if (color === COLOR_GROUP_INDEX) {
    if (groupIndex !== undefined) {
      const colors = colorPaletteConfig[paletteKey][fillOrStrokeKey];
      return colors[groupIndex % colors.length];
    }
    return defaultColor;
  }
  else {
    return color;
  }
}

export function getSeriesOpacities(seriesConfig: SeriesConfig) {
  const { renderer } = seriesConfig;
  let opacity, focusedOpacity, defocusedOpacity;
  if (renderer === RENDERER_AREA || renderer === RENDERER_BAR) {
    opacity = seriesConfig.fillOpacity;
    focusedOpacity = seriesConfig.focusedFillOpacity;
    defocusedOpacity = seriesConfig.defocusedFillOpacity;
  }
  else if (renderer === RENDERER_LINE) {
    opacity = seriesConfig.strokeOpacity;
    focusedOpacity = seriesConfig.focusedStrokeOpacity;
    defocusedOpacity = seriesConfig.defocusedStrokeOpacity;
  }
  else {
    const { markerShape } = seriesConfig;
    if (markerShape !== NONE) {
      opacity = seriesConfig.markerFillOpacity;
      focusedOpacity = seriesConfig.markerFocusedFillOpacity;
      defocusedOpacity = seriesConfig.markerDefocusedFillOpacity;
    }
    else {
      opacity = seriesConfig.labelFillOpacity;
      focusedOpacity = seriesConfig.labelFocusedFillOpacity;
      defocusedOpacity = seriesConfig.labelDefocusedFillOpacity;
    }
  }
  return {
    opacity,
    focusedOpacity,
    defocusedOpacity
  };
}

export function getSeriesColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: SeriesConfig, ...args: ColorArgs): SeriesColor | null {
  const { renderer } = seriesConfig;
  if (renderer === RENDERER_AREA || renderer === RENDERER_BAR) {
    return getSeriesFillColor(colorPaletteConfig, seriesConfig, ...args);
  }
  else if (renderer === RENDERER_LINE) {
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

export function getSeriesFillColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: SeriesConfig, ...[seriesIndex, focusPercentage, defaultColor, groupIndex]: ColorArgs): SeriesColor | null {
  return getColor('fillColors', 'series', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex);
}

export function getSeriesStrokeColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: SeriesConfig, ...[seriesIndex, focusPercentage, defaultColor, groupIndex]: ColorArgs): SeriesColor | null {
  return getColor('strokeColors', 'series', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex);
}

export function getSeriesMarkerFillColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: SeriesConfig, ...[seriesIndex, focusPercentage, defaultColor, groupIndex]: ColorArgs): SeriesColor | null {
  return getColor('fillColors', 'marker', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex);
}

export function getSeriesMarkerStrokeColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: SeriesConfig, ...[seriesIndex, focusPercentage, defaultColor, groupIndex]: ColorArgs): SeriesColor | null {
  return getColor('strokeColors', 'marker', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex);
}

export function getSeriesLabelFillColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: SeriesConfig, ...[seriesIndex, focusPercentage, defaultColor, groupIndex]: ColorArgs): SeriesColor | null {
  return getColor('fillColors', 'label', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex);
}

export function getSeriesLabelStrokeColor(colorPaletteConfig: ColorPaletteConfig, seriesConfig: SeriesConfig, ...[seriesIndex, focusPercentage, defaultColor, groupIndex]: ColorArgs): SeriesColor | null {
  return getColor('strokeColors', 'label', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex);
}

function getColorInterpolator(seriesConfig: SeriesConfig): ColorInterpolator | null {
  let colorInterpolation = seriesConfig.colorInterpolation;
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
  // TODO - handle colorDomain === [null, null]
  const colorScale = scaleLinear() as unknown as ColorScale;
  colorScale.range(colorRange).domain(colorDomain);
  return interpolator ? colorScale.interpolate(interpolator) : colorScale;
}

export function getSeriesColorGenerator(seriesConfig: SeriesConfig, _focusPercentage: FocusPercentage, rawDomains: SeriesDomainObject, filteredValues: SeriesValueObject): (index: number) => string {
  const colorValues = filteredValues.color as NumericValues;
  let interpolator = getColorInterpolator(seriesConfig);

  if (seriesConfig.colorBase !== NONE) {
    const { colorBase } = seriesConfig;
    let aboveColorScale = buildScale([seriesConfig.colorBaseAboveMin, seriesConfig.colorBaseAboveMax],
      [colorBase, Math.max(rawDomains.color[1]!, colorBase)], interpolator);
    let belowColorScale = buildScale([seriesConfig.colorBaseBelowMin, seriesConfig.colorBaseBelowMax],
      [Math.min(rawDomains.color[0]!, colorBase), colorBase], interpolator);

    return function getColor(index: number) {
      // TODO - what if color property-value is undefined?!?!
      const colorValue = colorValues[index]!;
      if (colorValue < colorBase) {
        return belowColorScale(colorValue);
      }
      else {
        return aboveColorScale(colorValue);
      }
    }
  }
  else {
    let colorScale = buildScale([seriesConfig.colorMin, seriesConfig.colorMax], rawDomains.color as [number, number], interpolator);
    return function getColor(index: number) {
      // TODO - what if color property-value is undefined?!?!
      const colorValue = colorValues[index]!;
      return colorScale(colorValue);
    }
  }
}

export function getSeriesGradientColors(seriesConfig: SeriesConfig): string[] | null {
  const { colorBase, colorMin, colorMax, colorBaseAboveMin, colorBaseAboveMax, colorBaseBelowMin, colorBaseBelowMax } = seriesConfig;
  let colors = null;
  if (colorBase === NONE && colorMin !== NONE && colorMax !== NONE) {
    colors = [colorMin, colorMax];
  }
  else if (colorBase !== NONE && colorBaseAboveMin !== NONE && colorBaseAboveMax !== NONE &&
    colorBaseBelowMin !== NONE && colorBaseBelowMax !== NONE) {
    colors = [colorBaseBelowMin, colorBaseBelowMax, colorBaseAboveMin, colorBaseAboveMax];
  }
  return colors;
}
