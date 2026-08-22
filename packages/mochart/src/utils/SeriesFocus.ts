import { NONE } from '../config/core/constants';
import type { FocusPercentageMap } from '../types/animation';
import type { EnhancedMochartConfig, EnhancedSeriesConfig } from '../types/enhanced';

export function leaderSeriesId(mochartConfig: EnhancedMochartConfig, seriesId: string): string {
  const { followSeries } = mochartConfig.seriesById[seriesId];
  return followSeries !== NONE ? followSeries : seriesId;
}

export function getSeriesFocusPercentage(seriesConfig: EnhancedSeriesConfig, valueAxisFocusPercentages: FocusPercentageMap, seriesFocusPercentages: FocusPercentageMap): number | null {
  const { id, axis, useAxisFocus } = seriesConfig;
  if (axis !== undefined && valueAxisFocusPercentages[axis] !== undefined && seriesFocusPercentages[id] !== undefined) {
    const seriesFocusPercentage = seriesFocusPercentages[id];
    return (useAxisFocus && valueAxisFocusPercentages[axis] !== null) ? Math.max(valueAxisFocusPercentages[axis]!, seriesFocusPercentage!) : seriesFocusPercentage;
  }
  else {
    return null;
  }
}
