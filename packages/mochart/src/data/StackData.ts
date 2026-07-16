import { getWithMutations } from '../utils/WithMutations';
import { keyStack } from './constants';

function assignIdIfPositive(seriesIds, seriesConfig, values) {
  const count = values ? values.length : 0;
  const { id } = seriesConfig;
  for (let i = 0; i < count; i++) {
    if (values[i] > 0) {
      seriesIds[i] = id;
    }
  }
}

function assignIdIfNegative(seriesIds, seriesConfig, values) {
  const count = values ? values.length : 0;
  const { id } = seriesConfig;
  for (let i = 0; i < count; i++) {
    if (values[i] < 0) {
      seriesIds[i] = id;
    }
  }
}

function getStackOuterSeriesIds(seriesStackConfigs, groupCount) {
  const stackOuterSeriesIds = {};
  let outerSeriesIds;
  const emptyGroupValues = [];
  for (let i=0; i<groupCount; i++) {
    emptyGroupValues.push(void 0);
  }
  for (let { id } of seriesStackConfigs) {
    outerSeriesIds = emptyGroupValues.slice();
    stackOuterSeriesIds[id] = outerSeriesIds;
  }
  return stackOuterSeriesIds;
}

export function getStackData(mochartConfig, chartData) {
  const { seriesStackConfigs } = mochartConfig;
  const { raw, filtered } = chartData.seriesData;
  const { values: rawValues } = raw;
  const { values: filteredValues } = filtered;

  const groupValues = chartData.groupData.values.raw;
  const outerPositiveSeriesIds = getStackOuterSeriesIds(seriesStackConfigs, groupValues.length);
  const filteredOuterPositiveSeriesIds = getStackOuterSeriesIds(seriesStackConfigs, groupValues.length);
  const outerNegativeSeriesIds = getStackOuterSeriesIds(seriesStackConfigs, groupValues.length);
  const filteredOuterNegativeSeriesIds = getStackOuterSeriesIds(seriesStackConfigs, groupValues.length);
  let stackPositiveIds, stackPositiveFilteredIds, stackNegativeIds, stackNegativeFilteredIds, id;
  for (let seriesStackConfig of seriesStackConfigs) {
    const { id: stackId, seriesConfigs } = seriesStackConfig;
    stackPositiveIds = outerPositiveSeriesIds[stackId];
    stackPositiveFilteredIds = filteredOuterPositiveSeriesIds[stackId];
    stackNegativeIds = outerNegativeSeriesIds[stackId];
    stackNegativeFilteredIds = filteredOuterNegativeSeriesIds[stackId];
    for (let seriesConfig of seriesConfigs) {
      id = seriesConfig.id;
      assignIdIfPositive(stackPositiveIds, seriesConfig, rawValues[id][keyStack]);
      assignIdIfPositive(stackPositiveFilteredIds, seriesConfig, filteredValues[id][keyStack]);
      assignIdIfNegative(stackNegativeIds, seriesConfig, rawValues[id][keyStack]);
      assignIdIfNegative(stackNegativeFilteredIds, seriesConfig, filteredValues[id][keyStack]);
    }
  }
  return {
    outerPositiveSeriesIds,
    filteredOuterPositiveSeriesIds,
    outerNegativeSeriesIds,
    filteredOuterNegativeSeriesIds
  }
}

export function getStackDataWithMutations(stackData, mochartConfig, chartData) {
  return getWithMutations(stackData, getStackData(mochartConfig, chartData));
}
