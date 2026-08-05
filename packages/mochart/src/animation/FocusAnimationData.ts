import type { EnhancedMochartConfig } from '../types/enhanced';
import type {
  ArrayFocusDeltaData,
  FocusAnimationData,
  FocusData,
  FocusPercentage,
  FocusPercentageMap,
  MapFocusDeltaData
} from '../types/animation';

export function getFocusAnimationData(_mochartConfig: EnhancedMochartConfig, oldFocusData: FocusData, newFocusData: FocusData): FocusAnimationData {
  const startFocusData = oldFocusData;
  const endFocusData = newFocusData;
  const categoryFocusDeltaData = getCategoryFocusDeltaData(startFocusData.categoryFocusPercentages, endFocusData.categoryFocusPercentages);
  const valueAxisFocusDeltaData = getValueAxisFocusDeltaData(oldFocusData.valueAxisFocusPercentages, newFocusData.valueAxisFocusPercentages);
  const seriesFocusDeltaData = getSeriesFocusDeltaData(oldFocusData.seriesFocusPercentages, newFocusData.seriesFocusPercentages);
  return {
    start: startFocusData,
    deltaPercentage: Math.max(categoryFocusDeltaData.deltaPercentage, valueAxisFocusDeltaData.deltaPercentage, seriesFocusDeltaData.deltaPercentage),
    group: categoryFocusDeltaData,
    valueAxis: valueAxisFocusDeltaData,
    series: seriesFocusDeltaData,
    end: endFocusData,
    final: newFocusData
  };
}

function getFocusDelta(newFocusPercentage: FocusPercentage, oldFocusPercentage: FocusPercentage): number {
  newFocusPercentage = newFocusPercentage === null ? 0 : newFocusPercentage;
  oldFocusPercentage = oldFocusPercentage === null ? 0 : oldFocusPercentage;
  return newFocusPercentage - oldFocusPercentage;
}

function getCategoryFocusDeltaData(oldFocusPercentages: FocusPercentage[], newFocusPercentages: FocusPercentage[]): ArrayFocusDeltaData {
  const focusDeltas: number[] = [];
  let focusDelta, maxDelta = 0;
  const count = oldFocusPercentages.length;
  for (let i=0; i<count; i++) {
    focusDelta = getFocusDelta(newFocusPercentages[i], oldFocusPercentages[i]);
    focusDeltas.push(focusDelta);
    if (Math.abs(focusDelta) > maxDelta) {
      maxDelta = Math.abs(focusDelta);
    }
  }
  let deltaPercentages: number[] | null = null;
  let deltaFactors: number[] | null = null;
  if (maxDelta > 0) {
    deltaPercentages = [];
    deltaFactors = [];
    let focusDelta;
    for (let i=0; i<count; i++) {
      focusDelta = Math.abs(focusDeltas[i]);
      if (focusDelta > 0) {
        deltaPercentages.push(focusDelta / maxDelta);
        deltaFactors.push(maxDelta / focusDelta);
      }
      else {
        deltaPercentages.push(0);
        deltaFactors.push(0);
      }
    }
  }
  return {
    start: oldFocusPercentages,
    deltas: focusDeltas,
    deltaPercentage: maxDelta,
    deltaPercentages,
    deltaFactors,
    end: newFocusPercentages
  };
}

function getValueAxisFocusDeltaData(oldFocusPercentages: FocusPercentageMap, newFocusPercentages: FocusPercentageMap): MapFocusDeltaData {
  const focusDeltas: Record<string, number> = Object.create(null);
  let focusDelta, maxDelta = 0;
  const valueAxisIds = Object.keys(oldFocusPercentages);
  for (const valueAxisId of valueAxisIds) {
    focusDelta = getFocusDelta(newFocusPercentages[valueAxisId], oldFocusPercentages[valueAxisId]);
    focusDeltas[valueAxisId] = focusDelta;
    if (Math.abs(focusDelta) > maxDelta) {
      maxDelta = Math.abs(focusDelta);
    }
  }
  let deltaPercentages: Record<string, number> | null = null;
  let deltaFactors: Record<string, number> | null = null;
  if (maxDelta > 0) {
    deltaPercentages = Object.create(null) as Record<string, number>;
    deltaFactors = Object.create(null) as Record<string, number>;
    let focusDelta;
    for (const valueAxisId of valueAxisIds) {
      focusDelta = Math.abs(focusDeltas[valueAxisId]);
      if (focusDelta > 0) {
        deltaPercentages[valueAxisId] = focusDelta / maxDelta;
        deltaFactors[valueAxisId] = maxDelta / focusDelta;
      }
      else {
        deltaPercentages[valueAxisId] = 0;
        deltaFactors[valueAxisId] = 0;
      }
    }
  }
  return {
    start: oldFocusPercentages,
    deltas: focusDeltas,
    deltaPercentage: maxDelta,
    deltaPercentages,
    deltaFactors,
    end: newFocusPercentages
  };
}

function getSeriesFocusDeltaData(oldFocusPercentages: FocusPercentageMap, newFocusPercentages: FocusPercentageMap): MapFocusDeltaData {
  const focusDeltas: Record<string, number> = Object.create(null);
  let focusDelta, maxDelta = 0;
  const seriesIds = Object.keys(oldFocusPercentages);
  for (const seriesId of seriesIds) {
    focusDelta = getFocusDelta(newFocusPercentages[seriesId], oldFocusPercentages[seriesId]);
    focusDeltas[seriesId] = focusDelta;
    if (Math.abs(focusDelta) > maxDelta) {
      maxDelta = Math.abs(focusDelta);
    }
  }
  let deltaPercentages: Record<string, number> | null = null;
  let deltaFactors: Record<string, number> | null = null;
  if (maxDelta > 0) {
    deltaPercentages = Object.create(null) as Record<string, number>;
    deltaFactors = Object.create(null) as Record<string, number>;
    let focusDelta;
    for (const seriesId of seriesIds) {
      focusDelta = Math.abs(focusDeltas[seriesId]);
      if (focusDelta > 0) {
        deltaPercentages[seriesId] = focusDelta / maxDelta;
        deltaFactors[seriesId] = maxDelta / focusDelta;
      }
      else {
        deltaPercentages[seriesId] = 0;
        deltaFactors[seriesId] = 0;
      }
    }
  }
  return {
    start: oldFocusPercentages,
    deltas: focusDeltas,
    deltaPercentage: maxDelta,
    deltaPercentages,
    deltaFactors,
    end: newFocusPercentages
  };
}
