import { getWithMutations } from '../utils/WithMutations';
import { keyStack } from './constants';
import type { MochartConfig, SeriesConfig, SeriesStackConfig } from '../types/config';
import type { ChartData, NumericValues, StackData } from '../types/data';

type OuterSeriesIds = Record<string, (string | undefined)[]>;

function assignIdIfPositive(seriesIds: (string | undefined)[], seriesConfig: SeriesConfig, values: NumericValues | null): void {
  const count = values ? values.length : 0;
  const { id } = seriesConfig;
  for (let i = 0; i < count; i++) {
    if (values !== null && values[i] !== undefined && values[i]! > 0) {
      seriesIds[i] = id;
    }
  }
}

function assignIdIfNegative(seriesIds: (string | undefined)[], seriesConfig: SeriesConfig, values: NumericValues | null): void {
  const count = values ? values.length : 0;
  const { id } = seriesConfig;
  for (let i = 0; i < count; i++) {
    if (values !== null && values[i] !== undefined && values[i]! < 0) {
      seriesIds[i] = id;
    }
  }
}

function getStackOuterSeriesIds(seriesStackConfigs: SeriesStackConfig[], groupCount: number): OuterSeriesIds {
  const stackOuterSeriesIds: OuterSeriesIds = {};
  let outerSeriesIds: (string | undefined)[];
  const emptyGroupValues: undefined[] = [];
  for (let i=0; i<groupCount; i++) {
    emptyGroupValues.push(undefined);
  }
  for (const { id } of seriesStackConfigs) {
    outerSeriesIds = emptyGroupValues.slice();
    stackOuterSeriesIds[id] = outerSeriesIds;
  }
  return stackOuterSeriesIds;
}

export function getStackData(mochartConfig: MochartConfig, chartData: ChartData): StackData {
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
  for (const seriesStackConfig of seriesStackConfigs) {
    const { id: stackId } = seriesStackConfig;
    const seriesConfigs = seriesStackConfig.seriesConfigs!;
    stackPositiveIds = outerPositiveSeriesIds[stackId];
    stackPositiveFilteredIds = filteredOuterPositiveSeriesIds[stackId];
    stackNegativeIds = outerNegativeSeriesIds[stackId];
    stackNegativeFilteredIds = filteredOuterNegativeSeriesIds[stackId];
    for (const seriesConfig of seriesConfigs) {
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

export function getStackDataWithMutations(stackData: StackData | null, mochartConfig: MochartConfig, chartData: ChartData): StackData {
  return getWithMutations(stackData, getStackData(mochartConfig, chartData));
}
