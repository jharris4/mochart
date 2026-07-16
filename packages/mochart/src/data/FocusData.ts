import { getDomainForValues, mergeDomain } from '../data/DomainData';
import { getGroupSpacingInfo } from '../data/AxisData';
import { getWithMutations } from '../utils/WithMutations';
import { arrayToMap, idAccessor } from '../utils/utils';
import { NONE } from '../config/core/constants';

function isFocused(value) {
  return value !== void 0 && value !== null && value !== -1;
}

function getPercentageForDomain(domain, value, inverted) {
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

export function getFocusData(mochartConfig, chartData, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId, computeDomainPercentages = true) {
  const { seriesAxisConfigs, seriesConfigs } = mochartConfig;
  const groupValues = chartData.groupData.values.raw;
  let groupFocusPercentages, seriesAxisFocusPercentages, seriesFocusPercentages;
  if (isFocused(focusedGroupIndex)) {
    groupFocusPercentages = groupValues.map(groupIndex => -1);
    groupFocusPercentages[focusedGroupIndex] = 1;
  }
  else {
    groupFocusPercentages = groupValues.map(groupIndex => null);
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

export function getFocusDataWithDomainPercentages(focusData, mochartConfig, chartData) {
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

export function getFocusDataWithGroupChanges(focusData, mochartConfig, chartData, groupDeltaData, isAddition, copyPercentages) {
  const { focusedSeriesAxisId, focusedSeriesId, groupFocusPercentages: oldGroupFocusPercentages, seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
  let { focusedGroupIndex } = focusData;
  let groupFocusPercentages;
  if (isAddition) {
    const initValue = focusedGroupIndex >= 0 ? -1 : null;
    groupFocusPercentages = groupDeltaData.values.merged.map(v => initValue);
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
    groupFocusPercentages = groupDeltaData.indices.new.map(v => initValue);

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

export function getSeriesConfigsOrderedByFocus(mochartConfig, focusData) {
  const { focusedSeriesAxisId, focusedSeriesId, seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
  const { seriesAxisConfigs, seriesConfigs } = mochartConfig;

  const focusedSeriesIdsMap = {};

  if (isFocused(focusedSeriesAxisId)) {
    const focusedSeriesAxisConfig = mochartConfig.seriesAxisConfigsById[focusedSeriesAxisId];
    if (focusedSeriesAxisConfig) {
      const seriesAxisFocusedSeriesConfigs = focusedSeriesAxisConfig.seriesConfigs;
      for (let seriesConfig of seriesAxisFocusedSeriesConfigs) {
        focusedSeriesIdsMap[seriesConfig.id] = true;
      }
    }
  }
  else if (isFocused(focusedSeriesId)) {
    const focusedSeriesConfig = mochartConfig.seriesConfigsById[focusedSeriesId];
    if (focusedSeriesConfig !== null) {
      if (focusedSeriesConfig.group !== NONE) {
        const groupFocusedSeriesConfigs = focusedSeriesConfig.seriesGroupConfig.seriesConfigs;
        for (let seriesConfig of groupFocusedSeriesConfigs) {
          focusedSeriesIdsMap[seriesConfig.id] = true;
        }
      }
      if (focusedSeriesConfig.stack !== NONE) {
        const stackFocusedSeriesConfigs = focusedSeriesConfig.seriesStackConfig.seriesConfigs;
        for (let seriesConfig of stackFocusedSeriesConfigs) {
          focusedSeriesIdsMap[seriesConfig.id] = true;
        }
      }
    }
  }

  const defocusedSeriesConfigs = [];
  const focusedSeriesConfigs = [];
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

function getGroupFocusDomainPercentages(mochartConfig, groupData, focusedGroupIndex) {
  let groupPercentages = [];
  if (isFocused(focusedGroupIndex)) {
    const { axisDomain, values } = groupData;
    const { numeric } = values;
    const value = numeric[focusedGroupIndex];
    const min = axisDomain[0];
    const max = axisDomain[1];
    if (value >= min && value <= max) {
      const { groupRange } = getGroupSpacingInfo(mochartConfig.groupAxisConfig, axisDomain, 1);
      const minPercentage = groupRange[0];
      const maxPercentage = groupRange[1];
      const extentPercentage = maxPercentage - minPercentage;
      const domainExtent = (max === min) ? 1 : (max - min);

      groupPercentages = [minPercentage + extentPercentage * (value - min) / domainExtent];
    }
  }
  return groupPercentages;
}

function getSeriesAxisFocusDomainPercentages(mochartConfig, seriesData, focusedSeriesAxisId) {
  let seriesPercentages = [];
  if (isFocused(focusedSeriesAxisId)) {
    const inverted = mochartConfig.chartConfig.inverted;
    const seriesAxisConfig = mochartConfig.seriesAxisConfigsById[focusedSeriesAxisId];
    const { axisBases, raw, filtered } = seriesData;
    const { id } = seriesAxisConfig;
    const axisDomains = seriesAxisConfig.adjustForSuppression ? filtered.axisDomains : raw.axisDomains;
    const axisDomain = axisDomains[id];
    const axisBase = axisBases[id];

    if (axisDomain[0] !== null) { // if the domain has no values then min ([0]) and max ([1]) will both be null
      if (axisDomain[0] !== undefined || axisDomain[1] !== undefined) {
        if (axisDomain[0] !== undefined && axisDomain[1] !== undefined) {
          if (axisDomain[0] !== axisDomain[1]) {
            seriesPercentages = [
              getPercentageForDomain(axisDomain, axisDomain[0], inverted),
              getPercentageForDomain(axisDomain, axisDomain[1], inverted)
            ];
          }
          else {
            seriesPercentages = [
              getPercentageForDomain(axisDomain, axisDomain[0], inverted)
            ];
          }
        }
        else if (axisDomain[0] !== undefined) {
          seriesPercentages = [
            getPercentageForDomain(axisDomain, axisDomain[0], inverted)
          ];
        }
        else {
          seriesPercentages = [
            getPercentageForDomain(axisDomain, axisDomain[1], inverted)
          ];
        }
      }
    }
  }
  return seriesPercentages;
}

function getSeriesFocusDomainPercentages(mochartConfig, seriesData, focusedGroupIndex, focusedSeriesId) {
  let seriesPercentages = [];
  if (isFocused(focusedGroupIndex) || isFocused(focusedSeriesId)) {
    if (isFocused(focusedSeriesId)) {
      const inverted = mochartConfig.plotConfig.inverted;
      const seriesConfig = mochartConfig.seriesConfigsById[focusedSeriesId];
      const { axisBases, raw, filtered } = seriesData;
      const { id, axis, seriesAxisConfig } = seriesConfig;
      const axisDomains = seriesAxisConfig.adjustForSuppression ? filtered.axisDomains : raw.axisDomains;
      const axisDomain = axisDomains[axis];
      const axisBase = axisBases[axis];

      const { values, domains } = filtered;
      const { max: maxValues, min: minValues } = values[id];

      if (maxValues !== null || minValues !== null) {
        if (isFocused(focusedGroupIndex)) {
          let seriesGroupValues = [];
          if (maxValues !== null && minValues !== null) {
            const maxValue = maxValues[focusedGroupIndex];
            const minValue = minValues[focusedGroupIndex];
            if (maxValue !== void 0 || minValue !== void 0) {
              if (maxValue !== void 0 && minValue !== void 0) {
                if (maxValue !== minValue) {
                  seriesGroupValues = [maxValue, minValue];
                }
                else {
                  seriesGroupValues = [maxValue];
                }
              }
              else if (maxValue !== void 0) {
                seriesGroupValues = [maxValue];
              }
              else {
                seriesGroupValues = [minValue];
              }
            }
          }
          else {
            const value = maxValues !== null ? maxValues[focusedGroupIndex] : minValues[focusedGroupIndex];
            if (value !== void 0) {

              seriesGroupValues = [value];
            }
          }
          if (seriesGroupValues.length === 1 && seriesGroupValues[0] !== axisBase) {
            seriesGroupValues.push(axisBase);
          }
          seriesPercentages = seriesGroupValues.map(value => getPercentageForDomain(axisDomain, value, inverted));
        }
        else {
          let seriesFocusDomain = [null, null];
          const maxValuesDomain = getDomainForValues(maxValues);
          const minValuesDomain = getDomainForValues(minValues);
          if (maxValuesDomain[0] !== null || minValuesDomain[0] !== null) {
            if (maxValuesDomain[0] !== null && minValuesDomain[0] !== null) {
              seriesFocusDomain = mergeDomain(maxValuesDomain, minValuesDomain);
            }
            else if (maxValuesDomain[0] !== null) {
              seriesFocusDomain = maxValuesDomain;
            }
            else if (!seriesConfig.stack !== NONE) { // for stacks, if max is undefined then the value was undefined...
              seriesFocusDomain = minValuesDomain;
            }
          }
          if (seriesFocusDomain[0] !== null) { // if the domain has no values then min ([0]) and max ([1]) will both be null
            if (seriesFocusDomain[0] !== void 0 || seriesFocusDomain[1] !== void 0) {
              if (seriesFocusDomain[0] !== void 0 && seriesFocusDomain[1] !== void 0) {
                if (seriesFocusDomain[0] !== seriesFocusDomain[1]) {
                  seriesPercentages = [
                    getPercentageForDomain(axisDomain, seriesFocusDomain[0], inverted),
                    getPercentageForDomain(axisDomain, seriesFocusDomain[1], inverted)
                  ];
                }
                else {
                  seriesPercentages = [
                    getPercentageForDomain(axisDomain, seriesFocusDomain[0], inverted)
                  ];
                }
              }
              else if (seriesFocusDomain[0] !== void 0) {
                seriesPercentages = [
                  getPercentageForDomain(axisDomain, seriesFocusDomain[0], inverted)
                ];
              }
              else {
                seriesPercentages = [
                  getPercentageForDomain(axisDomain, seriesFocusDomain[1], inverted)
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

function getSeriesAxisComputedFocusDomainPercentages(mochartConfig, focusedSeriesId, seriesPercentages) {
  const { seriesAxisConfigs } = mochartConfig;
  const seriesAxisPercentages = arrayToMap(seriesAxisConfigs, idAccessor, () => []);
  if (isFocused(focusedSeriesId)) {
    const seriesConfig = mochartConfig.seriesConfigsById[focusedSeriesId];
    seriesAxisPercentages[seriesConfig.axis] = seriesPercentages;
  }
  return seriesAxisPercentages;
}

export function getFocusDataWithMutations(oldFocusData, newFocusData) {
  return getWithMutations(oldFocusData, newFocusData);
}