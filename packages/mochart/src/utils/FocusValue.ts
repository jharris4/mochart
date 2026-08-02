import { COLOR_SAME } from '../config/core/constants';
import type { FocusPercentage, FocusPercentageMap } from '../types/animation';
import type { Style, SeriesConfig } from '../types/config';

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
  for (const seriesConfig of seriesConfigs) {
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

/** `'same'` defers to whatever color the normal state uses. */
export function getSameColor(color: string, normalColor: string): string {
  return color === COLOR_SAME ? normalColor : color;
}

export function getFocusPercentageColor(focusPercentage: FocusPercentage, normalColor: string, focusedColor: string, defocusedColor: string): string {
  const { focused, defocused } = getFocusedDefocused(focusPercentage);
  if (focused) {
    return getSameColor(focusedColor, normalColor);
  }
  else if (defocused) {
    return getSameColor(defocusedColor, normalColor);
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

export interface AxisStyleStates {
  normal: Partial<Style>;
  focused: Partial<Style>;
  defocused: Partial<Style>;
}

const emptyStyle: Partial<Style> = {};

const styleColorMembers = new Set<string>(['strokeColor', 'fillColor']);

/** Only members the normal state has are resolved, so anything it leaves out produces no attribute. */
export function getAxisFocusStyle(axisFocusPercentage: FocusPercentage | undefined, seriesFocusPercentage: FocusPercentage | undefined, useSeriesFocus: boolean, styleStates: AxisStyleStates): Partial<Style> {
  const normal = (styleStates.normal ?? emptyStyle) as Record<string, unknown>;
  const focused = (styleStates.focused ?? emptyStyle) as Record<string, unknown>;
  const defocused = (styleStates.defocused ?? emptyStyle) as Record<string, unknown>;
  const style: Record<string, unknown> = {};
  for (const member of Object.keys(normal)) {
    const normalValue = normal[member];
    const focusedValue = focused[member] === undefined ? normalValue : focused[member];
    const defocusedValue = defocused[member] === undefined ? normalValue : defocused[member];
    if (styleColorMembers.has(member)) {
      style[member] = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus,
        normalValue as string, focusedValue as string, defocusedValue as string);
    }
    else if (typeof normalValue === 'number' && typeof focusedValue === 'number' && typeof defocusedValue === 'number') {
      style[member] = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus,
        normalValue, focusedValue, defocusedValue);
    }
    else {
      // nothing to move between: an unset (null) width stays unset in every state
      style[member] = normalValue;
    }
  }
  return style as Partial<Style>;
}
