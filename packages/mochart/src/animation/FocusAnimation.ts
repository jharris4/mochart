import type {
  ArrayFocusDeltaData,
  FocusAnimationData,
  FocusData,
  FocusPercentage,
  FocusPercentageMap,
  MapFocusDeltaData
} from '../types/animation';

export function getFocusDataForPercent(focusAnimationData: FocusAnimationData, percentage: number): FocusData {
  if (focusAnimationData.start === focusAnimationData.end) {
    return focusAnimationData.start;
  }
  else if (percentage === 0) {
    return focusAnimationData.start;
  }
  else if (percentage === 1) {
    return focusAnimationData.end;
  }
  else {
    let groupFocusPercentages = getGroupFocusPercentages(focusAnimationData.group, percentage);
    let seriesAxisFocusPercentages = getSeriesAxisFocusPercentages(focusAnimationData.seriesAxis, percentage);
    let seriesFocusPercentages = getSeriesFocusPercentages(focusAnimationData.series, percentage);

    return {
      groupFocusPercentages,
      seriesAxisFocusPercentages,
      seriesFocusPercentages,
      focusedGroupIndex: focusAnimationData.end.focusedGroupIndex,
      focusedSeriesAxisId: focusAnimationData.end.focusedSeriesAxisId,
      focusedSeriesId: focusAnimationData.end.focusedSeriesId,
      groupFocusDomainPercentages: focusAnimationData.end.groupFocusDomainPercentages,
      seriesAxisFocusDomainPercentages: focusAnimationData.end.seriesAxisFocusDomainPercentages,
      seriesFocusDomainPercentages: focusAnimationData.end.seriesFocusDomainPercentages,
      seriesAxisComputedFocusDomainPercentages: focusAnimationData.end.seriesAxisComputedFocusDomainPercentages
    };
  }
}

function getFocusPercentage(start: FocusPercentage, percentage: number, deltaFactor: number, delta: number): FocusPercentage {
  if (delta === 0) {
    return start;
  }
  else if (start !== null) {
    return start + percentage * deltaFactor * delta;
  }
  else {
    return percentage * deltaFactor * delta;
  }
}

function getGroupFocusPercentages(
  { start, deltas, deltaPercentage, deltaPercentages, deltaFactors, end }: ArrayFocusDeltaData,
  percentage: number
): FocusPercentage[] {
  if (start === end) {
    return start;
  }
  else if (deltaPercentage === 0) {
    return start;
  }
  else if (deltaPercentages !== null && deltaFactors !== null) {
    const focusPercentages: FocusPercentage[] = []; // TODO, investigate reusing this array for subsequent calls
    let i, count = start.length;
    for (i=0; i<count; i++) {
      if (deltaPercentages[i] >= percentage) {
        focusPercentages.push(getFocusPercentage(start[i], percentage, deltaFactors[i], deltas[i]));
      }
      else {
        focusPercentages.push(end[i]);
      }
    }
    return focusPercentages;
  }
  return start;
}

function getSeriesAxisFocusPercentages(
  { start, deltas, deltaPercentage, deltaPercentages, deltaFactors, end }: MapFocusDeltaData,
  percentage: number
): FocusPercentageMap {
  if (start === end) {
    return start;
  }
  else if (deltaPercentage === 0) {
    return start;
  }
  else if (deltaPercentages !== null && deltaFactors !== null) {
    const focusPercentages: FocusPercentageMap = {}; // TODO, investigate reusing this map for subsequent calls
    let seriesAxisIds = Object.keys(start);
    for (let seriesAxisId of seriesAxisIds) {
      if (deltaPercentages[seriesAxisId] >= percentage) {
        focusPercentages[seriesAxisId] = getFocusPercentage(start[seriesAxisId], percentage, deltaFactors[seriesAxisId], deltas[seriesAxisId]);
      }
      else {
        focusPercentages[seriesAxisId] = end[seriesAxisId];
      }
    }
    return focusPercentages;
  }
  return start;
}

function getSeriesFocusPercentages(
  { start, deltas, deltaPercentage, deltaPercentages, deltaFactors, end }: MapFocusDeltaData,
  percentage: number
): FocusPercentageMap {
  if (start === end) {
    return start;
  }
  else if (deltaPercentage === 0) {
    return start;
  }
  else if (deltaPercentages !== null && deltaFactors !== null) {
    const focusPercentages: FocusPercentageMap = {}; // TODO, investigate reusing this map for subsequent calls
    let seriesIds = Object.keys(start);
    for (let seriesId of seriesIds) {
      if (deltaPercentages[seriesId] >= percentage) {
        focusPercentages[seriesId] = getFocusPercentage(start[seriesId], percentage, deltaFactors[seriesId], deltas[seriesId]);
      }
      else {
        focusPercentages[seriesId] = end[seriesId];
      }
    }
    return focusPercentages;
  }
  return start;
}
