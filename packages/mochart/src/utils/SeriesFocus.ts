import type { FocusPercentageMap } from '../types/animation';
import type { SeriesConfig } from '../types/config';

export function getSeriesFocusPercentage(seriesConfig: SeriesConfig, seriesAxisFocusPercentages: FocusPercentageMap, seriesFocusPercentages: FocusPercentageMap): number | null {
  const { id, axis, useAxisFocus } = seriesConfig;
  if (axis !== undefined && seriesAxisFocusPercentages[axis] !== void 0 && seriesFocusPercentages[id] !== void 0) {
    const seriesFocusPercentage = seriesFocusPercentages[id];
    return (useAxisFocus && seriesAxisFocusPercentages[axis] !== null) ? Math.max(seriesAxisFocusPercentages[axis]!, seriesFocusPercentage!) : seriesFocusPercentage;
  }
  else {
    return null;
  }
}
