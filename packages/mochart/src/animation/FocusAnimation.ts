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
    const categoryFocusPercentages = getCategoryFocusPercentages(focusAnimationData.group, percentage);
    const valueAxisFocusPercentages = getValueAxisFocusPercentages(focusAnimationData.valueAxis, percentage);
    const seriesFocusPercentages = getSeriesFocusPercentages(focusAnimationData.series, percentage);

    return {
      categoryFocusPercentages,
      valueAxisFocusPercentages,
      seriesFocusPercentages,
      focusedCategoryIndex: focusAnimationData.end.focusedCategoryIndex,
      focusedValueAxisId: focusAnimationData.end.focusedValueAxisId,
      focusedSeriesId: focusAnimationData.end.focusedSeriesId,
      categoryFocusDomainPercentages: focusAnimationData.end.categoryFocusDomainPercentages,
      valueAxisFocusDomainPercentages: focusAnimationData.end.valueAxisFocusDomainPercentages,
      seriesFocusDomainPercentages: focusAnimationData.end.seriesFocusDomainPercentages,
      valueAxisComputedFocusDomainPercentages: focusAnimationData.end.valueAxisComputedFocusDomainPercentages
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

function getCategoryFocusPercentages(
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
    const count = start.length;
    for (let i=0; i<count; i++) {
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

function getValueAxisFocusPercentages(
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
    const focusPercentages: FocusPercentageMap = Object.create(null); // TODO, investigate reusing this map for subsequent calls
    const valueAxisIds = Object.keys(start);
    for (const valueAxisId of valueAxisIds) {
      if (deltaPercentages[valueAxisId] >= percentage) {
        focusPercentages[valueAxisId] = getFocusPercentage(start[valueAxisId], percentage, deltaFactors[valueAxisId], deltas[valueAxisId]);
      }
      else {
        focusPercentages[valueAxisId] = end[valueAxisId];
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
    const focusPercentages: FocusPercentageMap = Object.create(null); // TODO, investigate reusing this map for subsequent calls
    const seriesIds = Object.keys(start);
    for (const seriesId of seriesIds) {
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
