import { getDomainForValues, mergeDomain } from '../data/DomainData';
import { getCategorySpacingInfo } from '../data/AxisData';
import { getWithMutations } from '../utils/WithMutations';
import { arrayToMap, idAccessor } from '../utils/utils';
import { NONE } from '../config/core/constants';
import type { FocusData, FocusPercentage, CategoryDeltaData } from '../types/animation';
import type { EnhancedMochartConfig, EnhancedSeriesConfig } from '../types/enhanced';
import type { ChartData, CategoryData, NullableDomain, SeriesData } from '../types/data';

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

export function getFocusData(mochartConfig: EnhancedMochartConfig, chartData: ChartData, focusedCategoryIndex: number, focusedValueAxisId: string | null, focusedSeriesId: string | null, computeDomainPercentages = true): FocusData {
  const { valueAxes: valueAxisConfigs, series: seriesConfigs } = mochartConfig;
  const categoryValues = chartData.categoryData.values.raw;
  // an out-of-range controlled index is unfocused, never a sparse write past the data
  if (focusedCategoryIndex >= categoryValues.length) {
    focusedCategoryIndex = -1;
  }
  // likewise an id naming no series/axis: hosts mirror focus between charts that need not share ids
  if (focusedSeriesId !== null && mochartConfig.seriesById[focusedSeriesId] === undefined) {
    focusedSeriesId = null;
  }
  if (focusedValueAxisId !== null && mochartConfig.valueAxesById[focusedValueAxisId] === undefined) {
    focusedValueAxisId = null;
  }
  let categoryFocusPercentages: FocusPercentage[];
  let valueAxisFocusPercentages: Record<string, FocusPercentage>;
  let seriesFocusPercentages: Record<string, FocusPercentage>;
  if (isFocused(focusedCategoryIndex)) {
    categoryFocusPercentages = categoryValues.map(() => -1);
    categoryFocusPercentages[focusedCategoryIndex] = 1;
  }
  else {
    categoryFocusPercentages = categoryValues.map(() => null);
  }
  if (isFocused(focusedValueAxisId)) {
    valueAxisFocusPercentages = arrayToMap(valueAxisConfigs, idAccessor, () => -1);
    valueAxisFocusPercentages[focusedValueAxisId] = 1;
  }
  else {
    valueAxisFocusPercentages = arrayToMap(valueAxisConfigs, idAccessor, () => null);
  }
  if (isFocused(focusedSeriesId)) {
    seriesFocusPercentages = arrayToMap(seriesConfigs, idAccessor, () => -1);
    seriesFocusPercentages[focusedSeriesId] = 1;
    // follower series (followSeries) share their leader's focus, matching the
    // legend filtering behavior — e.g. a candlestick wick lighting up with its
    // body
    for (const seriesConfig of seriesConfigs) {
      if (seriesConfig.followSeries === focusedSeriesId) {
        seriesFocusPercentages[seriesConfig.id] = 1;
      }
    }
  }
  else {
    seriesFocusPercentages = arrayToMap(seriesConfigs, idAccessor, () => null);
  }
  let categoryFocusDomainPercentages, valueAxisFocusDomainPercentages, seriesFocusDomainPercentages, valueAxisComputedFocusDomainPercentages;
  if (computeDomainPercentages) {
    categoryFocusDomainPercentages = getCategoryFocusDomainPercentages(mochartConfig, chartData.categoryData, focusedCategoryIndex);
    valueAxisFocusDomainPercentages = getValueAxisFocusDomainPercentages(mochartConfig, chartData.seriesData, focusedValueAxisId);
    seriesFocusDomainPercentages = getSeriesFocusDomainPercentages(mochartConfig, chartData.seriesData, focusedCategoryIndex, focusedSeriesId);
    valueAxisComputedFocusDomainPercentages = getValueAxisComputedFocusDomainPercentages(mochartConfig, focusedSeriesId, seriesFocusDomainPercentages);
  }
  return {
    focusedCategoryIndex,
    focusedValueAxisId,
    focusedSeriesId,
    categoryFocusPercentages,
    valueAxisFocusPercentages,
    seriesFocusPercentages,
    categoryFocusDomainPercentages,
    valueAxisFocusDomainPercentages,
    seriesFocusDomainPercentages,
    valueAxisComputedFocusDomainPercentages
  };
}

export function getFocusDataWithDomainPercentages(focusData: FocusData, mochartConfig: EnhancedMochartConfig, chartData: ChartData): FocusData {
  const { focusedCategoryIndex, focusedValueAxisId, focusedSeriesId, categoryFocusPercentages, valueAxisFocusPercentages, seriesFocusPercentages } = focusData;
  const categoryFocusDomainPercentages = getCategoryFocusDomainPercentages(mochartConfig, chartData.categoryData, focusedCategoryIndex);
  const valueAxisFocusDomainPercentages = getValueAxisFocusDomainPercentages(mochartConfig, chartData.seriesData, focusedValueAxisId);
  const seriesFocusDomainPercentages = getSeriesFocusDomainPercentages(mochartConfig, chartData.seriesData, focusedCategoryIndex, focusedSeriesId);
  const valueAxisComputedFocusDomainPercentages = getValueAxisComputedFocusDomainPercentages(mochartConfig, focusedSeriesId, seriesFocusDomainPercentages);
  return {
    focusedCategoryIndex,
    focusedValueAxisId,
    focusedSeriesId,
    categoryFocusPercentages,
    valueAxisFocusPercentages,
    seriesFocusPercentages,
    categoryFocusDomainPercentages,
    valueAxisFocusDomainPercentages,
    seriesFocusDomainPercentages,
    valueAxisComputedFocusDomainPercentages
  }
}

export function getFocusDataWithCategoryChanges(focusData: FocusData, mochartConfig: EnhancedMochartConfig, chartData: ChartData, categoryDeltaData: CategoryDeltaData, isAddition: boolean, copyPercentages: boolean): FocusData {
  const { focusedValueAxisId, focusedSeriesId, categoryFocusPercentages: oldCategoryFocusPercentages, valueAxisFocusPercentages, seriesFocusPercentages } = focusData;
  let { focusedCategoryIndex } = focusData;
  let categoryFocusPercentages: FocusPercentage[];
  if (isAddition) {
    const initValue = focusedCategoryIndex >= 0 ? -1 : null;
    categoryFocusPercentages = categoryDeltaData.values.merged.map(() => initValue);
    if (copyPercentages) {
      const oldIndices = categoryDeltaData.indices.old;
      const count = oldIndices.length;
      for (let i=0; i<count; i++) {
        categoryFocusPercentages[oldIndices[i]] = oldCategoryFocusPercentages[i];
      }
    }
    else if (focusedCategoryIndex >= 0) {
      categoryFocusPercentages[categoryDeltaData.indices.old[focusedCategoryIndex]] = oldCategoryFocusPercentages[focusedCategoryIndex];
    }
    if (focusedCategoryIndex >= 0) {
      focusedCategoryIndex = categoryDeltaData.indices.old[focusedCategoryIndex];
    }
  }
  else {
    const newFocusedCategoryIndex = focusedCategoryIndex >= 0 ? categoryDeltaData.values.new.indexOf(categoryDeltaData.values.merged[focusedCategoryIndex]) : -1;

    const initValue = newFocusedCategoryIndex >= 0 ? -1 : null;
    categoryFocusPercentages = categoryDeltaData.indices.new.map(() => initValue);

    if (copyPercentages) {
      const newIndices = categoryDeltaData.indices.new;
      const count = newIndices.length;
      for (let i=0; i<count; i++) {
        categoryFocusPercentages[i] = oldCategoryFocusPercentages[newIndices[i]];
      }
    }
    else if (newFocusedCategoryIndex >= 0) {
      categoryFocusPercentages[newFocusedCategoryIndex] = oldCategoryFocusPercentages[focusedCategoryIndex];
    }
    focusedCategoryIndex = newFocusedCategoryIndex;
  }

  const categoryFocusDomainPercentages = getCategoryFocusDomainPercentages(mochartConfig, chartData.categoryData, focusedCategoryIndex);
  const valueAxisFocusDomainPercentages = getValueAxisFocusDomainPercentages(mochartConfig, chartData.seriesData, focusedValueAxisId);
  const seriesFocusDomainPercentages = getSeriesFocusDomainPercentages(mochartConfig, chartData.seriesData, focusedCategoryIndex, focusedSeriesId);
  const valueAxisComputedFocusDomainPercentages = getValueAxisComputedFocusDomainPercentages(mochartConfig, focusedSeriesId, seriesFocusDomainPercentages);

  return {
    focusedCategoryIndex,
    focusedValueAxisId,
    focusedSeriesId,
    categoryFocusPercentages,
    valueAxisFocusPercentages,
    seriesFocusPercentages,
    categoryFocusDomainPercentages,
    valueAxisFocusDomainPercentages,
    seriesFocusDomainPercentages,
    valueAxisComputedFocusDomainPercentages
  }
}

export function getSeriesConfigsOrderedByFocus(mochartConfig: EnhancedMochartConfig, focusData: FocusData): EnhancedSeriesConfig[] {
  const { focusedValueAxisId, focusedSeriesId, seriesFocusPercentages } = focusData;
  const { series: seriesConfigs } = mochartConfig;

  const focusedSeriesIdsMap: Record<string, boolean> = Object.create(null);

  if (isFocused(focusedValueAxisId)) {
    const focusedValueAxisConfig = mochartConfig.valueAxesById[focusedValueAxisId];
    if (focusedValueAxisConfig) {
      const valueAxisFocusedSeriesConfigs = focusedValueAxisConfig.seriesConfigs!;
      for (const seriesConfig of valueAxisFocusedSeriesConfigs) {
        focusedSeriesIdsMap[seriesConfig.id] = true;
      }
    }
  }
  else if (isFocused(focusedSeriesId)) {
    const focusedSeriesConfig = mochartConfig.seriesById[focusedSeriesId];
    if (focusedSeriesConfig !== undefined) {
      if (focusedSeriesConfig.group !== NONE) {
        const categoryFocusedSeriesConfigs = focusedSeriesConfig.seriesGroupConfig!.seriesConfigs!;
        for (const seriesConfig of categoryFocusedSeriesConfigs) {
          focusedSeriesIdsMap[seriesConfig.id] = true;
        }
      }
      if (focusedSeriesConfig.stack !== NONE) {
        const stackFocusedSeriesConfigs = focusedSeriesConfig.seriesStackConfig!.seriesConfigs!;
        for (const seriesConfig of stackFocusedSeriesConfigs) {
          focusedSeriesIdsMap[seriesConfig.id] = true;
        }
      }
      for (const seriesConfig of seriesConfigs) {
        if (seriesConfig.followSeries === focusedSeriesId) {
          focusedSeriesIdsMap[seriesConfig.id] = true;
        }
      }
    }
  }

  const defocusedSeriesConfigs: EnhancedSeriesConfig[] = [];
  const focusedSeriesConfigs: EnhancedSeriesConfig[] = [];
  for (const seriesConfig of seriesConfigs) {
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
  if (isFocused(focusedSeriesId) && mochartConfig.seriesById[focusedSeriesId] !== undefined) {
    focusedSeriesConfigs.push(mochartConfig.seriesById[focusedSeriesId]);
  }
  return defocusedSeriesConfigs.concat(focusedSeriesConfigs);
}

function getCategoryFocusDomainPercentages(mochartConfig: EnhancedMochartConfig, categoryData: CategoryData, focusedCategoryIndex: number): number[] {
  let categoryPercentages: number[] = [];
  if (isFocused(focusedCategoryIndex)) {
    const { renderAxisDomain, values } = categoryData;
    const { numeric } = values;
    const value = numeric[focusedCategoryIndex];
    const min = renderAxisDomain[0];
    const max = renderAxisDomain[1];
    if (min !== null && max !== null && value >= +min && value <= +max) {
      const { categoryRange } = getCategorySpacingInfo(mochartConfig.categoryAxis, renderAxisDomain, 1);
      const minPercentage = categoryRange[0];
      const maxPercentage = categoryRange[1];
      const extentPercentage = maxPercentage - minPercentage;
      const numericMin = +min;
      const numericMax = +max;
      const domainExtent = (numericMax === numericMin) ? 1 : (numericMax - numericMin);

      categoryPercentages = [minPercentage + extentPercentage * (value - numericMin) / domainExtent];
    }
  }
  return categoryPercentages;
}

function getValueAxisFocusDomainPercentages(mochartConfig: EnhancedMochartConfig, seriesData: SeriesData, focusedValueAxisId: string | null): number[] {
  let seriesPercentages: number[] = [];
  if (isFocused(focusedValueAxisId)) {
    const inverted = mochartConfig.plot.inverted;
    const valueAxisConfig = mochartConfig.valueAxesById[focusedValueAxisId];
    const { raw, filtered } = seriesData;
    const { id } = valueAxisConfig;
    const axisDomains = valueAxisConfig.adjustForFiltering ? filtered.renderAxisDomains : raw.renderAxisDomains;
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

function getSeriesFocusDomainPercentages(mochartConfig: EnhancedMochartConfig, seriesData: SeriesData, focusedCategoryIndex: number, focusedSeriesId: string | null): number[] {
  let seriesPercentages: number[] = [];
  if (isFocused(focusedCategoryIndex) || isFocused(focusedSeriesId)) {
    if (isFocused(focusedSeriesId)) {
      const inverted = mochartConfig.plot.inverted;
      const seriesConfig = mochartConfig.seriesById[focusedSeriesId];
      const { axisBases, raw, filtered } = seriesData;
      const { id } = seriesConfig;
      const axis = seriesConfig.axis!;
      const valueAxisConfig = seriesConfig.valueAxisConfig!;
      const axisDomains = valueAxisConfig.adjustForFiltering ? filtered.renderAxisDomains : raw.renderAxisDomains;
      const axisDomain = axisDomains[axis] as [number, number];
      const axisBase = axisBases[axis];

      const { values } = filtered;
      // the focused series plus its same-axis followers (followSeries), so a
      // composite mark like a candlestick highlights its full extent (wick
      // low/high included, not just the body)
      const focusedSeriesConfigs = [seriesConfig,
        ...mochartConfig.series.filter(config => config.followSeries === id && config.axis === axis)];

      if (isFocused(focusedCategoryIndex)) {
        let seriesCategoryValues: number[] = [];
        for (const config of focusedSeriesConfigs) {
          const { max: maxValues, min: minValues } = values[config.id];
          const maxValue = maxValues !== null ? maxValues[focusedCategoryIndex] : undefined;
          const minValue = minValues !== null ? minValues[focusedCategoryIndex] : undefined;
          if (maxValue !== undefined) {
            seriesCategoryValues.push(maxValue);
          }
          if (minValue !== undefined && minValue !== maxValue) {
            seriesCategoryValues.push(minValue);
          }
        }
        if (seriesCategoryValues.length > 1) {
          const maxValue = Math.max(...seriesCategoryValues);
          const minValue = Math.min(...seriesCategoryValues);
          seriesCategoryValues = maxValue !== minValue ? [maxValue, minValue] : [maxValue];
        }
        if (seriesCategoryValues.length === 1 && seriesCategoryValues[0] !== axisBase) {
          if (axisBase !== null) {
            seriesCategoryValues.push(axisBase);
          }
        }
        seriesPercentages = seriesCategoryValues.map(value => getPercentageForDomain(axisDomain, value, inverted));
      }
      else {
        let seriesFocusDomain: NullableDomain = [null, null];
        for (const config of focusedSeriesConfigs) {
          const { max: maxValues, min: minValues } = values[config.id];
          let configFocusDomain: NullableDomain = [null, null];
          const maxValuesDomain = getDomainForValues(maxValues);
          const minValuesDomain = getDomainForValues(minValues);
          if (maxValuesDomain[0] !== null || minValuesDomain[0] !== null) {
            if (maxValuesDomain[0] !== null && minValuesDomain[0] !== null) {
              configFocusDomain = mergeDomain(maxValuesDomain, minValuesDomain);
            }
            else if (maxValuesDomain[0] !== null) {
              configFocusDomain = maxValuesDomain;
            }
            else if (config.stack !== NONE) { // for stacks, if max is undefined then the value was undefined...
              configFocusDomain = minValuesDomain;
            }
          }
          seriesFocusDomain = mergeDomain(seriesFocusDomain, configFocusDomain);
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
  return seriesPercentages;
}

function getValueAxisComputedFocusDomainPercentages(mochartConfig: EnhancedMochartConfig, focusedSeriesId: string | null, seriesPercentages: number[]): Record<string, number[]> {
  const { valueAxes: valueAxisConfigs } = mochartConfig;
  const valueAxisPercentages = arrayToMap(valueAxisConfigs, idAccessor, (): number[] => []);
  if (isFocused(focusedSeriesId)) {
    const seriesConfig = mochartConfig.seriesById[focusedSeriesId];
    valueAxisPercentages[seriesConfig.axis!] = seriesPercentages;
  }
  return valueAxisPercentages;
}

export function getFocusDataWithMutations(oldFocusData: FocusData, newFocusData: FocusData): FocusData {
  return getWithMutations(oldFocusData, newFocusData);
}
