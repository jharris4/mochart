import { getFocusData, getFocusDataWithMutations } from '../data/FocusData';

export function getFocusAnimationData(mochartConfig, oldFocusData, newFocusData) {
  let startFocusData = oldFocusData;
  let endFocusData = newFocusData;
  let groupFocusDeltaData = getGroupFocusDeltaData(startFocusData.groupFocusPercentages, endFocusData.groupFocusPercentages);
  let seriesAxisFocusDeltaData = getSeriesAxisFocusDeltaData(oldFocusData.seriesAxisFocusPercentages, newFocusData.seriesAxisFocusPercentages);
  let seriesFocusDeltaData = getSeriesFocusDeltaData(oldFocusData.seriesFocusPercentages, newFocusData.seriesFocusPercentages);
  return {
    start: startFocusData,
    deltaPercentage: Math.max(groupFocusDeltaData.deltaPercentage, seriesAxisFocusDeltaData.deltaPercentage, seriesFocusDeltaData.deltaPercentage),
    group: groupFocusDeltaData,
    seriesAxis: seriesAxisFocusDeltaData,
    series: seriesFocusDeltaData,
    end: endFocusData,
    final: newFocusData
  };
}

function getFocusDelta(newFocusPercentage, oldFocusPercentage) {
  newFocusPercentage = newFocusPercentage === null ? 0 : newFocusPercentage;
  oldFocusPercentage = oldFocusPercentage === null ? 0 : oldFocusPercentage;
  return newFocusPercentage - oldFocusPercentage;
}

function getGroupFocusDeltaData(oldFocusPercentages, newFocusPercentages) {
  let focusDeltas = [];
  let focusDelta, maxDelta = 0;
  let i, count = oldFocusPercentages.length;
  for (i=0; i<count; i++) {
    focusDelta = getFocusDelta(newFocusPercentages[i], oldFocusPercentages[i]);
    focusDeltas.push(focusDelta);
    if (Math.abs(focusDelta) > maxDelta) {
      maxDelta = Math.abs(focusDelta);
    }
  }
  let deltaPercentages = null;
  let deltaFactors = null;
  if (maxDelta > 0) {
    deltaPercentages = [];
    deltaFactors = [];
    let focusDelta;
    for (i=0; i<count; i++) {
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

function getSeriesAxisFocusDeltaData(oldFocusPercentages, newFocusPercentages) {
  let focusDeltas = {};
  let focusDelta, maxDelta = 0;
  let seriesAxisIds = Object.keys(oldFocusPercentages);
  for (let seriesAxisId of seriesAxisIds) {
    focusDelta = getFocusDelta(newFocusPercentages[seriesAxisId], oldFocusPercentages[seriesAxisId]);
    focusDeltas[seriesAxisId] = focusDelta;
    if (Math.abs(focusDelta) > maxDelta) {
      maxDelta = Math.abs(focusDelta);
    }
  }
  let deltaPercentages = null;
  let deltaFactors = null;
  if (maxDelta > 0) {
    deltaPercentages = {};
    deltaFactors = {};
    let focusDelta;
    for (let seriesAxisId of seriesAxisIds) {
      focusDelta = Math.abs(focusDeltas[seriesAxisId]);
      if (focusDelta > 0) {
        deltaPercentages[seriesAxisId] = focusDelta / maxDelta;
        deltaFactors[seriesAxisId] = maxDelta / focusDelta;
      }
      else {
        deltaPercentages[seriesAxisId] = 0;
        deltaFactors[seriesAxisId] = 0;
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

function getSeriesFocusDeltaData(oldFocusPercentages, newFocusPercentages) {
  let focusDeltas = {};
  let focusDelta, maxDelta = 0;
  let seriesIds = Object.keys(oldFocusPercentages);
  for (let seriesId of seriesIds) {
    focusDelta = getFocusDelta(newFocusPercentages[seriesId], oldFocusPercentages[seriesId]);
    focusDeltas[seriesId] = focusDelta;
    if (Math.abs(focusDelta) > maxDelta) {
      maxDelta = Math.abs(focusDelta);
    }
  }
  let deltaPercentages = null;
  let deltaFactors = null;
  if (maxDelta > 0) {
    deltaPercentages = {};
    deltaFactors = {};
    let focusDelta;
    for (let seriesId of seriesIds) {
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