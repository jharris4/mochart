import type { FocusPercentage, FocusPercentageMap } from '../types/animation';
import type { SeriesConfig } from '../types/config';

export function getFocusValue(focusPercentage: FocusPercentage, normalValue: number, focusedValue: number, defocusedValue: number): number {
  // TODO - this assumes that focusedValue >= normalValue >= defocusedValue. This should be validated or improved...
  if (focusPercentage === null || focusPercentage === 0) {
    return normalValue;
  }
  else if (focusPercentage < 0) {
    return normalValue + focusPercentage * (normalValue - defocusedValue);
  }
  else if (focusPercentage > 0) {
    return normalValue + focusPercentage * (focusedValue - normalValue);
  }
  return normalValue;
}

export function getGroupFocusPercentage(groupFocusPercentage: FocusPercentage, seriesFocusPercentage: FocusPercentage): FocusPercentage {
  return getCombinedFocusPercentage(groupFocusPercentage, seriesFocusPercentage);
}

function getCombinedFocusPercentage(percentageA: FocusPercentage, percentageB: FocusPercentage): FocusPercentage {
  if (percentageA === null && percentageB === null) {
    return null;
  }
  else if (percentageA === null || percentageA === 0) {
    return percentageB;
  }
  else if (percentageB === null || percentageB === 0) {
    return percentageA;
  }
  else if (percentageA < 0 && percentageB < 0) {
    return Math.min(percentageA, percentageB);
  }
  else {
    return Math.max(percentageA, percentageB);
  }
}

export function getAggregateSeriesFocusPercentage(seriesConfigs: SeriesConfig[], seriesFocusPercentages: FocusPercentageMap): FocusPercentage {
  let maxPercentage: FocusPercentage = null;
  let seriesFocusPercentage: FocusPercentage;
  for (let seriesConfig of seriesConfigs) {
    seriesFocusPercentage = seriesFocusPercentages[seriesConfig.id];
    if (seriesFocusPercentage !== null) {
      if (maxPercentage === null || seriesFocusPercentage > maxPercentage) {
        maxPercentage = seriesFocusPercentage;
      }
    }
  }
  return maxPercentage;
}

export function getFocusedDefocused(focusPercentage: FocusPercentage): { focused: boolean; defocused: boolean } {
  return {
    focused: focusPercentage !== null && focusPercentage > 0,
    defocused: focusPercentage !== null && focusPercentage < 0
  };
}

export function getFocusPercentageColor(focusPercentage: FocusPercentage, normalColor: string, focusedColor: string, defocusedColor: string): string {
  const { focused, defocused } = getFocusedDefocused(focusPercentage);
  if (focused) {
    return focusedColor;
  }
  else if (defocused) {
    return defocusedColor;
  }
  else {
    return normalColor;
  }
}

export function getAxisFocusColor(axisFocusPercentage: FocusPercentage | undefined, seriesFocusPercentage: FocusPercentage | undefined, useSeriesFocus: boolean, normalColor: string, focusedColor: string, defocusedColor: string): string {
  let color = normalColor;
  if (axisFocusPercentage !== undefined && seriesFocusPercentage !== undefined) {
    if (axisFocusPercentage !== null) {
      color = getFocusPercentageColor(axisFocusPercentage, normalColor, focusedColor, defocusedColor);
    }
    else if (useSeriesFocus ) {
      color = getFocusPercentageColor(seriesFocusPercentage, normalColor, focusedColor, defocusedColor);
    }
  }
  return color;
}

export function getAxisFocusOpacity(axisFocusPercentage: FocusPercentage | undefined, seriesFocusPercentage: FocusPercentage | undefined, useSeriesFocus: boolean, normalOpacity: number, focusedOpacity: number, defocusedOpacity: number): number {
  let opacity = normalOpacity;
  if (axisFocusPercentage !== undefined && seriesFocusPercentage !== undefined && !(axisFocusPercentage === null && seriesFocusPercentage === null)) {
    const percentage = useSeriesFocus ? getCombinedFocusPercentage(axisFocusPercentage, seriesFocusPercentage) : axisFocusPercentage;
    opacity = getFocusValue(percentage, normalOpacity, focusedOpacity, defocusedOpacity);
  }
  return opacity;
}
