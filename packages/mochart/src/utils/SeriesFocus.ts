import type { FocusPercentageMap } from '../types/animation';
import type { EnhancedSeriesConfig } from '../types/enhanced';

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
