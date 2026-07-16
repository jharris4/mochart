import { scaleLinear } from 'd3-scale';
import { interpolateRgb, interpolateHsl, interpolateLab, interpolateHcl } from 'd3-interpolate';

import {
  NONE, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX, COLOR_SAME, COLOR_SERIES,
  COLOR_INTERPOLATION_HCL, COLOR_INTERPOLATION_HSL, COLOR_INTERPOLATION_LAB, COLOR_INTERPOLATION_RGB,
  RENDERER_AREA, RENDERER_BAR, RENDERER_LINE, RENDERER_NONE
} from '../config/core/constants';
import { getFocusedDefocused } from './FocusValue';

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
};

function getColor(fillOrStrokeKey, mapKey, colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex) {
  const { focused, defocused } = getFocusedDefocused(focusPercentage);
  let focusKey = focused ? 'focused' : (defocused ? 'defocused' : 'normal');
  let { configKey, paletteKey } = colorLookupMap[fillOrStrokeKey][mapKey][focusKey];
  for (let i = 0; i < 2; i++) {
    if (seriesConfig[configKey] === COLOR_SERIES) {
      mapKey = 'series';
      ({ configKey, paletteKey } = colorLookupMap[fillOrStrokeKey][mapKey][focusKey]);
    }
    else if (seriesConfig[configKey] === COLOR_SAME) {
      focusKey = 'normal';
      ({ configKey, paletteKey } = colorLookupMap[fillOrStrokeKey][mapKey][focusKey]);
    }
  }
  const color = seriesConfig[configKey];
  if (color === COLOR_SERIES_INDEX) {
    const colors = colorPaletteConfig[paletteKey][fillOrStrokeKey];
    return colors[seriesIndex % colors.length];
  }
  else if (color === COLOR_GROUP_INDEX) {
    if (groupIndex !== void 0) {
      const colors = colorPaletteConfig[paletteKey][fillOrStrokeKey];
      return colors[groupIndex % colors.length];
    }
    return defaultColor;
  }
  else {
    return color;
  }
}

export function getSeriesOpacities(seriesConfig) {
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

export function getSeriesColor(colorPaletteConfig, seriesConfig, ...args: [seriesIndex?: any, focusPercentage?: any, defaultColor?: any, groupIndex?: any]) {
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

export function getSeriesFillColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex) {
  return getColor('fillColors', 'series', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex);
}

export function getSeriesStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex) {
  return getColor('strokeColors', 'series', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex);
}

export function getSeriesMarkerFillColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex) {
  return getColor('fillColors', 'marker', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex);
}

export function getSeriesMarkerStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex) {
  return getColor('strokeColors', 'marker', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex);
}

export function getSeriesLabelFillColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex) {
  return getColor('fillColors', 'label', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex);
}

export function getSeriesLabelStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex) {
  return getColor('strokeColors', 'label', colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, defaultColor, groupIndex);
}

function getColorInterpolator(seriesConfig) {
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

function buildScale(colorRange, colorDomain, interpolator) {
  // TODO - handle colorDomain === [null, null]
  return scaleLinear().range(colorRange).domain(colorDomain).interpolate(interpolator);
}

export function getSeriesColorGenerator(seriesConfig, focusPercentage, rawDomains, filteredValues) {
  let colorValues = filteredValues.color;
  let interpolator = getColorInterpolator(seriesConfig);

  if (seriesConfig.colorBase !== NONE) {
    const { colorBase } = seriesConfig;
    let aboveColorScale = buildScale([seriesConfig.colorBaseAboveMin, seriesConfig.colorBaseAboveMax],
      [colorBase, Math.max(rawDomains.color[1], colorBase)], interpolator);
    let belowColorScale = buildScale([seriesConfig.colorBaseBelowMin, seriesConfig.colorBaseBelowMax],
      [Math.min(rawDomains.color[0], colorBase), colorBase], interpolator);

    return function getColor(index) {
      // TODO - what if color property-value is undefined?!?!
      let colorValue = colorValues[index];
      if (colorValue < colorBase) {
        return belowColorScale(colorValue);
      }
      else {
        return aboveColorScale(colorValue);
      }
    }
  }
  else {
    let colorScale = buildScale([seriesConfig.colorMin, seriesConfig.colorMax], rawDomains.color, interpolator);
    return function getColor(index) {
      // TODO - what if color property-value is undefined?!?!
      let colorValue = colorValues[index];
      return colorScale(colorValue);
    }
  }
}

export function getSeriesGradientColors(seriesConfig) {
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