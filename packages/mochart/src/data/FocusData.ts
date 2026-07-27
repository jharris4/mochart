import { getDomainForValues, mergeDomain } from '../data/DomainData';
import { getGroupSpacingInfo } from '../data/AxisData';
import { getWithMutations } from '../utils/WithMutations';
import { arrayToMap, idAccessor } from '../utils/utils';
import { NONE } from '../config/core/constants';
import type { FocusData, FocusPercentage, GroupDeltaData } from '../types/animation';
import type { MochartConfig, SeriesConfig } from '../types/config';
import type { ChartData, GroupData, NullableDomain, SeriesData } from '../types/data';

function isFocused(value: number | null | undefined): value is number;
function isFocused(value: string | null | undefined): value is string;
function isFocused(value: number | string | null | undefined): value is number | string {
  return value !== undefined && value !== null && value !== -1;
}

function getPercentageForDomain(domain: [number, number], value: number, inverted: boolean): number {
  if (domain[0] === domain[1]) {
    return inverted ? 0 : 1;
  }
  if (value >= domain[1]) {
    value = domain[1];
  }
  else if (value <= domain[0]) {
    value = domain[0];
  }
  if (inverted) {
    return (value - domain[0]) / (domain[1] - domain[0]);
  }
  else {
    return (domain[1] - value) / (domain[1] - domain[0]);
  }
}

export function getFocusData(mochartConfig: MochartConfig, chartData: ChartData, focusedGroupIndex: number, focusedSeriesAxisId: string | null, focusedSeriesId: string | null, computeDomainPercentages = true): FocusData {
  const { seriesAxisConfigs, seriesConfigs } = mochartConfig;
  const groupValues = chartData.groupData.values.raw;
  let groupFocusPercentages: FocusPercentage[];
  let seriesAxisFocusPercentages: Record<string, FocusPercentage>;
  let seriesFocusPercentages: Record<string, FocusPercentage>;
  if (isFocused(focusedGroupIndex)) {
    groupFocusPercentages = groupValues.map(() => -1);
    groupFocusPercentages[focusedGroupIndex] = 1;
  }
  else {
    groupFocusPercentages = groupValues.map(() => null);
  }
  if (isFocused(focusedSeriesAxisId)) {
    seriesAxisFocusPercentages = arrayToMap(seriesAxisConfigs, idAccessor, () => -1);
    seriesAxisFocusPercentages[focusedSeriesAxisId] = 1;
  }
  else {
    seriesAxisFocusPercentages = arrayToMap(seriesAxisConfigs, idAccessor, () => null);
  }
  if (isFocused(focusedSeriesId)) {
    seriesFocusPercentages = arrayToMap(seriesConfigs, idAccessor, () => -1);
    seriesFocusPercentages[focusedSeriesId] = 1;
  }
  else {
    seriesFocusPercentages = arrayToMap(seriesConfigs, idAccessor, () => null);
  }
  let groupFocusDomainPercentages, seriesAxisFocusDomainPercentages, seriesFocusDomainPercentages, seriesAxisComputedFocusDomainPercentages;
  if (computeDomainPercentages) {
    groupFocusDomainPercentages = getGroupFocusDomainPercentages(mochartConfig, chartData.groupData, focusedGroupIndex);
    seriesAxisFocusDomainPercentages = getSeriesAxisFocusDomainPercentages(mochartConfig, chartData.seriesData, focusedSeriesAxisId);
    seriesFocusDomainPercentages = getSeriesFocusDomainPercentages(mochartConfig, chartData.seriesData, focusedGroupIndex, focusedSeriesId);
    seriesAxisComputedFocusDomainPercentages = getSeriesAxisComputedFocusDomainPercentages(mochartConfig, focusedSeriesId, seriesFocusDomainPercentages);
  }
  return {
    focusedGroupIndex,
    focusedSeriesAxisId,
    focusedSeriesId,
    groupFocusPercentages,
    seriesAxisFocusPercentages,
    seriesFocusPercentages,
    groupFocusDomainPercentages,
    seriesAxisFocusDomainPercentages,
    seriesFocusDomainPercentages,
    seriesAxisComputedFocusDomainPercentages
  };
}

export function getFocusDataWithDomainPercentages(focusData: FocusData, mochartConfig: MochartConfig, chartData: ChartData): FocusData {
  const { focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId, groupFocusPercentages, seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
  let groupFocusDomainPercentages = getGroupFocusDomainPercentages(mochartConfig, chartData.groupData, focusedGroupIndex);
  let seriesAxisFocusDomainPercentages = getSeriesAxisFocusDomainPercentages(mochartConfig, chartData.seriesData, focusedSeriesAxisId);
  let seriesFocusDomainPercentages = getSeriesFocusDomainPercentages(mochartConfig, chartData.seriesData, focusedGroupIndex, focusedSeriesId);
  let seriesAxisComputedFocusDomainPercentages = getSeriesAxisComputedFocusDomainPercentages(mochartConfig, focusedSeriesId, seriesFocusDomainPercentages);
  return {
    focusedGroupIndex,
    focusedSeriesAxisId,
    focusedSeriesId,
    groupFocusPercentages,
    seriesAxisFocusPercentages,
    seriesFocusPercentages,
    groupFocusDomainPercentages,
    seriesAxisFocusDomainPercentages,
    seriesFocusDomainPercentages,
    seriesAxisComputedFocusDomainPercentages
  }
}

export function getFocusDataWithGroupChanges(focusData: FocusData, mochartConfig: MochartConfig, chartData: ChartData, groupDeltaData: GroupDeltaData, isAddition: boolean, copyPercentages: boolean): FocusData {
  const { focusedSeriesAxisId, focusedSeriesId, groupFocusPercentages: oldGroupFocusPercentages, seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
  let { focusedGroupIndex } = focusData;
  let groupFocusPercentages: FocusPercentage[];
  if (isAddition) {
    const initValue = focusedGroupIndex >= 0 ? -1 : null;
    groupFocusPercentages = groupDeltaData.values.merged.map(() => initValue);
    if (copyPercentages) {
      const oldIndices = groupDeltaData.indices.old;
      let i, count = oldIndices.length;
      for (i=0; i<count; i++) {
        groupFocusPercentages[oldIndices[i]] = oldGroupFocusPercentages[i];
      }
    }
    else if (focusedGroupIndex >= 0) {
      groupFocusPercentages[groupDeltaData.indices.old[focusedGroupIndex]] = oldGroupFocusPercentages[focusedGroupIndex];
    }
    if (focusedGroupIndex >= 0) {
      focusedGroupIndex = groupDeltaData.indices.old[focusedGroupIndex];
    }
  }
  else {
    const newFocusedGroupIndex = focusedGroupIndex >= 0 ? groupDeltaData.values.new.indexOf(groupDeltaData.values.merged[focusedGroupIndex]) : -1;

    const initValue = newFocusedGroupIndex >= 0 ? -1 : null;
    groupFocusPercentages = groupDeltaData.indices.new.map(() => initValue);

    if (copyPercentages) {
      const newIndices = groupDeltaData.indices.new;
      let i, count = newIndices.length;
      for (i=0; i<count; i++) {
        groupFocusPercentages[i] = oldGroupFocusPercentages[newIndices[i]];
      }
    }
    else if (newFocusedGroupIndex >= 0) {
      groupFocusPercentages[newFocusedGroupIndex] = oldGroupFocusPercentages[focusedGroupIndex];
    }
    focusedGroupIndex = newFocusedGroupIndex;
  }

  const groupFocusDomainPercentages = getGroupFocusDomainPercentages(mochartConfig, chartData.groupData, focusedGroupIndex);
  const seriesAxisFocusDomainPercentages = getSeriesAxisFocusDomainPercentages(mochartConfig, chartData.seriesData, focusedSeriesAxisId);
  const seriesFocusDomainPercentages = getSeriesFocusDomainPercentages(mochartConfig, chartData.seriesData, focusedGroupIndex, focusedSeriesId);
  const seriesAxisComputedFocusDomainPercentages = getSeriesAxisComputedFocusDomainPercentages(mochartConfig, focusedSeriesId, seriesFocusDomainPercentages);

  return {
    focusedGroupIndex,
    focusedSeriesAxisId,
    focusedSeriesId,
    groupFocusPercentages,
    seriesAxisFocusPercentages,
    seriesFocusPercentages,
    groupFocusDomainPercentages,
    seriesAxisFocusDomainPercentages,
    seriesFocusDomainPercentages,
    seriesAxisComputedFocusDomainPercentages
  }
}

export function getSeriesConfigsOrderedByFocus(mochartConfig: MochartConfig, focusData: FocusData): SeriesConfig[] {
  const { focusedSeriesAxisId, focusedSeriesId, seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
  const { seriesAxisConfigs, seriesConfigs } = mochartConfig;

  const focusedSeriesIdsMap: Record<string, boolean> = {};

  if (isFocused(focusedSeriesAxisId)) {
    const focusedSeriesAxisConfig = mochartConfig.seriesAxisConfigsById[focusedSeriesAxisId];
    if (focusedSeriesAxisConfig) {
      const seriesAxisFocusedSeriesConfigs = focusedSeriesAxisConfig.seriesConfigs!;
      for (let seriesConfig of seriesAxisFocusedSeriesConfigs) {
        focusedSeriesIdsMap[seriesConfig.id] = true;
      }
    }
  }
  else if (isFocused(focusedSeriesId)) {
    const focusedSeriesConfig = mochartConfig.seriesConfigsById[focusedSeriesId];
    if (focusedSeriesConfig !== undefined) {
      if (focusedSeriesConfig.group !== NONE) {
        const groupFocusedSeriesConfigs = focusedSeriesConfig.seriesGroupConfig!.seriesConfigs!;
        for (let seriesConfig of groupFocusedSeriesConfigs) {
          focusedSeriesIdsMap[seriesConfig.id] = true;
        }
      }
      if (focusedSeriesConfig.stack !== NONE) {
        const stackFocusedSeriesConfigs = focusedSeriesConfig.seriesStackConfig!.seriesConfigs!;
        for (let seriesConfig of stackFocusedSeriesConfigs) {
          focusedSeriesIdsMap[seriesConfig.id] = true;
        }
      }
    }
  }

  const defocusedSeriesConfigs: SeriesConfig[] = [];
  const focusedSeriesConfigs: SeriesConfig[] = [];
  for (let seriesConfig of seriesConfigs) {
    const { id } = seriesConfig;
    if (id !== focusedSeriesId) {
      if ((seriesFocusPercentages[id] !== null && seriesFocusPercentages[id] > 0) || focusedSeriesIdsMap[id] === true) {
        focusedSeriesConfigs.push(seriesConfig);
      }
      else {
        defocusedSeriesConfigs.push(seriesConfig);
      }
    }
  }
  if (isFocused(focusedSeriesId)) {
    focusedSeriesConfigs.push(mochartConfig.seriesConfigsById[focusedSeriesId]);
  }
  return defocusedSeriesConfigs.concat(focusedSeriesConfigs);
}

function getGroupFocusDomainPercentages(mochartConfig: MochartConfig, groupData: GroupData, focusedGroupIndex: number): number[] {
  let groupPercentages: number[] = [];
  if (isFocused(focusedGroupIndex)) {
    const { axisDomain, values } = groupData;
    const { numeric } = values;
    const value = numeric[focusedGroupIndex];
    const min = axisDomain[0];
    const max = axisDomain[1];
    if (min !== null && max !== null && value >= +min && value <= +max) {
      const { groupRange } = getGroupSpacingInfo(mochartConfig.groupAxisConfig, axisDomain, 1);
      const minPercentage = groupRange[0];
      const maxPercentage = groupRange[1];
      const extentPercentage = maxPercentage - minPercentage;
      const numericMin = +min;
      const numericMax = +max;
      const domainExtent = (numericMax === numericMin) ? 1 : (numericMax - numericMin);

      groupPercentages = [minPercentage + extentPercentage * (value - numericMin) / domainExtent];
    }
  }
  return groupPercentages;
}

function getSeriesAxisFocusDomainPercentages(mochartConfig: MochartConfig, seriesData: SeriesData, focusedSeriesAxisId: string | null): number[] {
  let seriesPercentages: number[] = [];
  if (isFocused(focusedSeriesAxisId)) {
    const inverted = mochartConfig.plotConfig.inverted;
    const seriesAxisConfig = mochartConfig.seriesAxisConfigsById[focusedSeriesAxisId];
    const { axisBases, raw, filtered } = seriesData;
    const { id } = seriesAxisConfig;
    const axisDomains = seriesAxisConfig.adjustForSuppression ? filtered.axisDomains : raw.axisDomains;
    const axisDomain = axisDomains[id];
    if (axisDomain[0] !== null && axisDomain[1] !== null) {
      const completeDomain: [number, number] = [axisDomain[0], axisDomain[1]];
      if (axisDomain[0] !== axisDomain[1]) {
        seriesPercentages = [
          getPercentageForDomain(completeDomain, axisDomain[0], inverted),
          getPercentageForDomain(completeDomain, axisDomain[1], inverted)
        ];
      }
      else {
        seriesPercentages = [getPercentageForDomain(completeDomain, axisDomain[0], inverted)];
      }
    }
  }
  return seriesPercentages;
}

function getSeriesFocusDomainPercentages(mochartConfig: MochartConfig, seriesData: SeriesData, focusedGroupIndex: number, focusedSeriesId: string | null): number[] {
  let seriesPercentages: number[] = [];
  if (isFocused(focusedGroupIndex) || isFocused(focusedSeriesId)) {
    if (isFocused(focusedSeriesId)) {
      const inverted = mochartConfig.plotConfig.inverted;
      const seriesConfig = mochartConfig.seriesConfigsById[focusedSeriesId];
      const { axisBases, raw, filtered } = seriesData;
      const { id } = seriesConfig;
      const axis = seriesConfig.axis!;
      const seriesAxisConfig = seriesConfig.seriesAxisConfig!;
      const axisDomains = seriesAxisConfig.adjustForSuppression ? filtered.axisDomains : raw.axisDomains;
      const axisDomain = axisDomains[axis] as [number, number];
      const axisBase = axisBases[axis];

      const { values, domains } = filtered;
      const { max: maxValues, min: minValues } = values[id];

      if (maxValues !== null || minValues !== null) {
        if (isFocused(focusedGroupIndex)) {
          let seriesGroupValues: number[] = [];
          if (maxValues !== null && minValues !== null) {
            const maxValue = maxValues[focusedGroupIndex];
            const minValue = minValues[focusedGroupIndex];
            if (maxValue !== undefined || minValue !== undefined) {
              if (maxValue !== undefined && minValue !== undefined) {
                if (maxValue !== minValue) {
                  seriesGroupValues = [maxValue, minValue];
                }
                else {
                  seriesGroupValues = [maxValue];
                }
              }
              else if (maxValue !== undefined) {
                seriesGroupValues = [maxValue];
              }
              else {
                seriesGroupValues = [minValue!];
              }
            }
          }
          else {
            const value = maxValues !== null ? maxValues[focusedGroupIndex] : minValues![focusedGroupIndex];
            if (value !== undefined) {

              seriesGroupValues = [value];
            }
          }
          if (seriesGroupValues.length === 1 && seriesGroupValues[0] !== axisBase) {
            if (axisBase !== null) {
              seriesGroupValues.push(axisBase);
            }
          }
          seriesPercentages = seriesGroupValues.map(value => getPercentageForDomain(axisDomain, value, inverted));
        }
        else {
          let seriesFocusDomain: NullableDomain = [null, null];
          const maxValuesDomain = getDomainForValues(maxValues);
          const minValuesDomain = getDomainForValues(minValues);
          if (maxValuesDomain[0] !== null || minValuesDomain[0] !== null) {
            if (maxValuesDomain[0] !== null && minValuesDomain[0] !== null) {
              seriesFocusDomain = mergeDomain(maxValuesDomain, minValuesDomain);
            }
            else if (maxValuesDomain[0] !== null) {
              seriesFocusDomain = maxValuesDomain;
            }
            else if (seriesConfig.stack !== NONE) { // for stacks, if max is undefined then the value was undefined...
              seriesFocusDomain = minValuesDomain;
            }
          }
          if (seriesFocusDomain[0] !== null) { // if the domain has no values then min ([0]) and max ([1]) will both be null
            if (seriesFocusDomain[0] !== undefined || seriesFocusDomain[1] !== undefined) {
              if (seriesFocusDomain[0] !== undefined && seriesFocusDomain[1] !== undefined) {
                if (seriesFocusDomain[0] !== seriesFocusDomain[1]) {
                  seriesPercentages = [
                    getPercentageForDomain(axisDomain, seriesFocusDomain[0], inverted),
                    getPercentageForDomain(axisDomain, seriesFocusDomain[1]!, inverted)
                  ];
                }
                else {
                  seriesPercentages = [
                    getPercentageForDomain(axisDomain, seriesFocusDomain[0], inverted)
                  ];
                }
              }
              else if (seriesFocusDomain[0] !== undefined) {
                seriesPercentages = [
                  getPercentageForDomain(axisDomain, seriesFocusDomain[0], inverted)
                ];
              }
              else {
                seriesPercentages = [
                  getPercentageForDomain(axisDomain, seriesFocusDomain[1]!, inverted)
                ];
              }
            }
          }
        }
      }
    }
  }
  return seriesPercentages;
}

function getSeriesAxisComputedFocusDomainPercentages(mochartConfig: MochartConfig, focusedSeriesId: string | null, seriesPercentages: number[]): Record<string, number[]> {
  const { seriesAxisConfigs } = mochartConfig;
  const seriesAxisPercentages = arrayToMap(seriesAxisConfigs, idAccessor, (): number[] => []);
  if (isFocused(focusedSeriesId)) {
    const seriesConfig = mochartConfig.seriesConfigsById[focusedSeriesId];
    seriesAxisPercentages[seriesConfig.axis!] = seriesPercentages;
  }
  return seriesAxisPercentages;
}

export function getFocusDataWithMutations(oldFocusData: FocusData, newFocusData: FocusData): FocusData {
  return getWithMutations(oldFocusData, newFocusData);
}
