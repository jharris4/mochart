import { getChartDataWithSeriesData, getChartDataWithData } from '../data/ChartData';

import { getCategoryDataWithRenderAxisDomain, getCategoryDataFromValues, getCategoryDataWithNumericValues } from '../data/CategoryData';

import { getSafeDomainExtent, getSafeDomainExtents } from '../data/DomainData';

import { getSeriesContainerFilteredSeriesCounts, getSeriesDataWithRenderAxisDomains, getSeriesDataWithSeriesValues,
  getSeriesDataWithDomains, setMinMax } from '../data/SeriesData';

import { createArrayFilledWithUndefined, createArrayWithValueIfNotUndefined, copyArrayWithValueIfNotUndefined,
  areMapsEqual, setArrayValuesIfOneIsUndefined,
  setArrayValuesFromSourcesIfOneIsUndefined, setArrayValuesForRange, hasUndefinedForRange, getMaxAbsoluteValue,
  getArrayDeltas, replaceArrayUndefinedWithValue } from '../utils/utils';

import {
  hasCategoryChanges, hasNumericValueOffsets, getNumericValuesWithoutOffsets,
  getMergedNumericValues, createCategoryOrderDeltaData, setCategoryOrderDeltaFactors, getNumericValueOffsets } from './CategoryAnimationData';

import { getMaxAxisDomains, getTranslatingAxisIds, getTranslationAxisDomainDeltas, setAxisDeltaFactors,
  withAxisDomainsForIds, withSeriesDomainsForAxes } from './DomainAnimationData';

import { keyPlain, positionKeys, positionOrComputedKeys, positionOrComputedOrExtraKeys, extraAndCopyKeys } from '../data/constants';

import { NONE } from '../config/core/constants';

import { mapMap } from '../utils/utils';
import type { AnimationConfig } from '../types/config';
import type { EnhancedMochartConfig, EnhancedSeriesConfig, EnhancedSeriesStackConfig } from '../types/enhanced';
import type {
  AxisDomains, ChartData, NumericValues, SeriesData, SeriesDataSet, SeriesDomainObject,
  SeriesDomainObjects, SeriesValueObject, SeriesValueObjects
} from '../types/data';
import type {
  CategoryDeltaData, NumericValuesDelta, OuterChangeCounts,
  SeriesValueDelta, SeriesValueDeltaMap, ValueChangeData
} from '../types/animation';
import type { ExtraCopyKey, ExtraKey, PositionKey, PositionOrComputedKey, ValueKey } from '../data/constants';

type AxisExtents = Record<string, number>;
type ValueDeltaObject = Record<ValueKey, NumericValuesDelta> & { deltaPercentage: number; deltaCopied?: boolean };

/**
 *
 * Various constants
 *
 **/

const nullValueObject: SeriesValueObject = {
  plain: null, range: null, errorLow: null, errorHigh: null, stack: null, prior: null, marker: null, label: null, color: null, tooltip: null,
  markerCopyKey: null, labelCopyKey: null, colorCopyKey: null, tooltipCopyKey: null, min: null, max: null
};

const emptyValueDelta = {
  deltaPercentage: 0,
  deltas: null
};

const emptyCopiedValueDelta = {
  deltaPercentage: 0,
  deltaCopied: true,
  deltas: null
};

const emptyNotCopiedValueDelta = {
  deltaPercentage: 0,
  deltaCopied: false,
  deltas: null
};


export function getInitialValueChangeData(mochartConfig: EnhancedMochartConfig, newChartData: ChartData): ValueChangeData {
  const initialValues = getInitialSeriesValueObjects(mochartConfig.series, newChartData.seriesData.raw.domains,
    newChartData.seriesData.raw.values, newChartData.seriesData.raw.priorIndices, newChartData.seriesData.axisBases);
  const initialFilteredValues = getInitialFilteredSeriesValueObjects(mochartConfig.seriesStacks,
    initialValues, newChartData.seriesData.filteredFlags);

  const startChartData = getChartDataWithSeriesData(newChartData, getSeriesDataWithSeriesValues(newChartData.seriesData, initialValues, initialFilteredValues));

  return createValueDeltaData(mochartConfig, startChartData, newChartData, newChartData, newChartData.seriesData.raw.renderAxisDomains,
    newChartData.seriesData.filtered.renderAxisDomains, newChartData.seriesData.raw.domains, null);
}

export function getFilterDeltaData(mochartConfig: EnhancedMochartConfig, oldSeriesData: SeriesData, newSeriesData: SeriesData) {
  let filtersChanged = false;
  let axisSeriesCounts = oldSeriesData.axisSeriesCounts;
  let stackSeriesCounts = oldSeriesData.stackSeriesCounts;
  let groupSeriesCounts = oldSeriesData.groupSeriesCounts;
  if (!areMapsEqual(oldSeriesData.filteredFlags, newSeriesData.filteredFlags)) {
    const filteredFlags = getFilteredFlagsFromValues(oldSeriesData, newSeriesData);
    filtersChanged = true;
    axisSeriesCounts = getSeriesContainerFilteredSeriesCounts(mochartConfig.valueAxes, filteredFlags);
    stackSeriesCounts = getSeriesContainerFilteredSeriesCounts(mochartConfig.seriesStacks, filteredFlags);
    groupSeriesCounts = getSeriesContainerFilteredSeriesCounts(mochartConfig.seriesGroups, filteredFlags);
  }
  return {
    filtersChanged,
    axisSeriesCounts,
    stackSeriesCounts,
    groupSeriesCounts
  }
}

function getFilteredFlagsFromValues(oldSeriesData: SeriesData, newSeriesData: SeriesData): Record<string, boolean> {
  const filteredFlags: Record<string, boolean> = Object.create(null);
  const oldFilteredValueObjects = oldSeriesData.filtered.values;
  const newFilteredValueObjects = newSeriesData.filtered.values;
  const seriesIds = Object.keys(oldFilteredValueObjects);
  for (const seriesId of seriesIds) {
    filteredFlags[seriesId] = (oldFilteredValueObjects[seriesId][keyPlain] === null && newFilteredValueObjects[seriesId][keyPlain] === null);
  }
  return filteredFlags;
}

export function getTransitionValueChangeData(mochartConfig: EnhancedMochartConfig, prevChartData: ChartData, newChartData: ChartData, categoryDeltaData: CategoryDeltaData): ValueChangeData {
  const { seriesData: prevSeriesData } = prevChartData;

  let startCategoryData = prevChartData.categoryData;
  let endCategoryData = startCategoryData;
  let finalCategoryData = startCategoryData;

  let categoryOrderOffsets: number[] | null = null;

  if (hasCategoryChanges(categoryDeltaData)) {
    const mergedNumericValues = getMergedNumericValues(mochartConfig.categoryAxis, startCategoryData.values.numeric, categoryDeltaData);
    let mergedCategoryData = getCategoryDataFromValues(mochartConfig.categoryAxis, categoryDeltaData.values.merged, categoryDeltaData.values.displayMerged);
    mergedCategoryData = getCategoryDataWithRenderAxisDomain(mergedCategoryData, prevChartData.categoryData.renderAxisDomain);
    startCategoryData = mergedCategoryData;
    if (mergedNumericValues !== null) {
      startCategoryData = getCategoryDataWithNumericValues(mergedCategoryData, mergedNumericValues);
    }
    endCategoryData = mergedCategoryData;
    finalCategoryData = getCategoryDataWithRenderAxisDomain(newChartData.categoryData, endCategoryData.renderAxisDomain);
  }
  else if (hasNumericValueOffsets(mochartConfig.categoryAxis, startCategoryData)) {
    endCategoryData = getCategoryDataWithNumericValues(startCategoryData, getNumericValuesWithoutOffsets(startCategoryData));
  }

  categoryOrderOffsets = getNumericValueOffsets(mochartConfig.categoryAxis, startCategoryData);

  const startValues: SeriesValueObjects = getSeriesValueObjectsWithChanges(prevSeriesData.raw, categoryDeltaData.indices.old, categoryDeltaData.indices.added);
  const startFilteredValues: SeriesValueObjects = getFilteredSeriesValueObjectsWithChanges(prevSeriesData.filtered, prevSeriesData.raw,
    startValues, categoryDeltaData.indices.old, categoryDeltaData.indices.added);

  // TODO - here is where the series values from the prev series data all need to be rearranged if necessary

  const endValues: SeriesValueObjects = getSeriesValueObjectsWithChanges(newChartData.seriesData.raw, categoryDeltaData.indices.new, categoryDeltaData.indices.removed);
  const endFilteredValues: SeriesValueObjects = getFilteredSeriesValueObjectsWithChanges(newChartData.seriesData.filtered, newChartData.seriesData.raw,
    endValues, categoryDeltaData.indices.new, categoryDeltaData.indices.removed);
  finalCategoryData = getCategoryDataWithNumericValues(finalCategoryData, categoryDeltaData.indices.new);

  const startSeriesData = getSeriesDataWithSeriesValues(prevSeriesData, startValues, startFilteredValues);

  // translating axes finish this phase on their new domains; union axes hold the old until contraction
  const translatingAxisIds = getTranslatingAxisIds(mochartConfig.valueAxes, prevSeriesData.raw.renderAxisDomains, prevSeriesData.filtered.renderAxisDomains,
    newChartData.seriesData.raw.renderAxisDomains, newChartData.seriesData.filtered.renderAxisDomains);
  const endRawRenderAxisDomains = withAxisDomainsForIds(prevSeriesData.raw.renderAxisDomains, newChartData.seriesData.raw.renderAxisDomains, translatingAxisIds);
  const endFilteredRenderAxisDomains = withAxisDomainsForIds(prevSeriesData.filtered.renderAxisDomains, newChartData.seriesData.filtered.renderAxisDomains, translatingAxisIds);
  const endRawSeriesDomains = withSeriesDomainsForAxes(prevSeriesData.raw.domains, newChartData.seriesData.raw.domains, mochartConfig.series, translatingAxisIds);
  const endFilteredSeriesDomains = withSeriesDomainsForAxes(prevSeriesData.filtered.domains, newChartData.seriesData.filtered.domains, mochartConfig.series, translatingAxisIds);

  let endSeriesData = getSeriesDataWithSeriesValues(prevSeriesData, endValues, endFilteredValues);
  let finalSeriesData = getSeriesDataWithRenderAxisDomains(newChartData.seriesData, endRawRenderAxisDomains, endFilteredRenderAxisDomains);
  finalSeriesData = getSeriesDataWithDomains(finalSeriesData, endRawSeriesDomains, endFilteredSeriesDomains);
  if (translatingAxisIds.length > 0) {
    endSeriesData = getSeriesDataWithRenderAxisDomains(endSeriesData, endRawRenderAxisDomains, endFilteredRenderAxisDomains);
    endSeriesData = getSeriesDataWithDomains(endSeriesData, endRawSeriesDomains, endFilteredSeriesDomains);
  }

  setAllBaseValuesForOuterChanges(mochartConfig.animation, mochartConfig.series, startSeriesData, endSeriesData,
    prevSeriesData, newChartData.seriesData, categoryDeltaData.outerCounts);
  setAllBaseValuesForChanges(mochartConfig.series, startSeriesData, endSeriesData);

  enhanceValueObjects(startSeriesData.filtered.values);
  enhanceValueObjects(endSeriesData.filtered.values);

  return createValueDeltaData(mochartConfig, getChartDataWithData(prevChartData, startCategoryData, startSeriesData),
    getChartDataWithData(prevChartData, endCategoryData, endSeriesData),
    getChartDataWithData(newChartData, finalCategoryData, finalSeriesData), startSeriesData.raw.renderAxisDomains, startSeriesData.filtered.renderAxisDomains, startSeriesData.raw.domains, categoryOrderOffsets);
}

export function enhanceValueObjects(valueObjects: SeriesValueObjects): void {
  const seriesIds = Object.keys(valueObjects);
  for (const seriesId of seriesIds) {
    enhanceValueObject(valueObjects[seriesId]);
  }
}

function enhanceValueObject(valueObject: SeriesValueObject): void {
  if (valueObject.stack !== null) {
    valueObject.max = valueObject.stack;
    valueObject.min = valueObject.prior;
  }
  else {
    valueObject.max = valueObject.plain;
    valueObject.min = valueObject.range;
  }
}

/**
 *
 * getValueDeltaData functions
 *
 **/

function getInitialSeriesValueObjects(seriesConfigs: EnhancedSeriesConfig[], seriesDomains: SeriesDomainObjects, rawSeriesValueObjects: SeriesValueObjects, _seriesPriorIndices: number[] | undefined, axisBases: Record<string, number | null>): SeriesValueObjects {
  const valueObjects = mapMap(rawSeriesValueObjects, () => ({} as SeriesValueObject));
  for (const positionOrComputedKey of positionOrComputedKeys) {
    setInitialSeriesValues(valueObjects, seriesConfigs, rawSeriesValueObjects, positionOrComputedKey, axisBases);
  }
  setAllInitialExtraSeriesValues(valueObjects, seriesConfigs, seriesDomains, rawSeriesValueObjects, axisBases);
  setMinMax(valueObjects);

  return valueObjects;
}

function setInitialSeriesValues(valueObjects: SeriesValueObjects, seriesConfigs: EnhancedSeriesConfig[], rawValueObjects: SeriesValueObjects, valueKey: PositionOrComputedKey, axisBases: Record<string, number | null>): void {
  for (const seriesConfig of seriesConfigs) {
    const { id, axis } = seriesConfig;
    if (rawValueObjects[id][valueKey] !== null) {
      valueObjects[id][valueKey] = createArrayWithValueIfNotUndefined(rawValueObjects[id][valueKey]!, axisBases[axis!] ?? undefined);
    }
    else {
      valueObjects[id][valueKey] = null;
    }
  }
}

function setAllInitialExtraSeriesValues(seriesValueObjects: SeriesValueObjects, seriesConfigs: EnhancedSeriesConfig[], seriesDomains: SeriesDomainObjects, rawSeriesValueObjects: SeriesValueObjects, axisBases: Record<string, number | null>): void {
  let valueObject, rawValueObject;
  for (const seriesConfig of seriesConfigs) {
    const { id, axis } = seriesConfig;
    valueObject = seriesValueObjects[id];
    rawValueObject = rawSeriesValueObjects[id];
    setInitialExtraSeriesValues(valueObject, rawValueObject, 'marker', 'markerCopyKey', seriesDomains[id].marker[0] ?? undefined);
    setInitialExtraSeriesValues(valueObject, rawValueObject, 'color', 'colorCopyKey', seriesDomains[id].color[0] ?? undefined);
    setInitialExtraSeriesValues(valueObject, rawValueObject, 'label', 'labelCopyKey', axisBases[axis!] ?? undefined);
    setInitialExtraSeriesValues(valueObject, rawValueObject, 'tooltip', 'tooltipCopyKey', seriesDomains[id].tooltip[0] ?? undefined);
  }
}

function setInitialExtraSeriesValues(valueObject: SeriesValueObject, rawValueObject: SeriesValueObject, valueKey: ExtraKey, valueCopyKey: ExtraCopyKey, baseValue: number | undefined): void {
  if (rawValueObject[valueKey] !== null) {
    if (rawValueObject[valueCopyKey] !== null) {
      valueObject[valueKey] = valueObject[rawValueObject[valueCopyKey]! as ValueKey] as NumericValues | null;
      valueObject[valueCopyKey] = rawValueObject[valueCopyKey];
    }
    else {
      valueObject[valueKey] = createArrayWithValueIfNotUndefined(rawValueObject[valueKey], baseValue);
      valueObject[valueCopyKey] = null;
    }
  }
  else {
    valueObject[valueKey] = null;
    valueObject[valueCopyKey] = null;
  }
}

function getInitialFilteredSeriesValueObjects(seriesStackConfigs: EnhancedSeriesStackConfig[], initialValueObjects: SeriesValueObjects, seriesFilteredFlags: Record<string, boolean>): SeriesValueObjects {
  // copy objects (inner arrays stay shared for identity checks): the stack/prior/
  // min/max writes below must not leak into the raw side
  const valueObjects = mapMap(initialValueObjects, valueObject => ({ ...valueObject }));
  const seriesIds = Object.keys(initialValueObjects);
  for (const seriesId of seriesIds) {
    if (seriesFilteredFlags[seriesId] === true) {
      valueObjects[seriesId] = { ...nullValueObject };
    }
  }
  setInitialStackAndPriorSeriesValues(seriesStackConfigs, valueObjects);
  setMinMax(valueObjects);
  return valueObjects;
}

function setInitialStackAndPriorSeriesValues(seriesStackConfigs: EnhancedSeriesStackConfig[], initialFilteredValueObjects: SeriesValueObjects): void {
  for (const seriesStackConfig of seriesStackConfigs) {
    let filteredSeriesFound = false;
    let valueObject: SeriesValueObject, stackValues: NumericValues | null, priorValues: NumericValues | null = null;
    const stackedSeriesConfigs = seriesStackConfig.seriesConfigs!;
    for (const seriesConfig of stackedSeriesConfigs) {
      valueObject = initialFilteredValueObjects[seriesConfig.id];
      stackValues = valueObject.stack;
      if (stackValues === null) {
        filteredSeriesFound = true;
        valueObject.prior = priorValues;
      }
      else {
        if (filteredSeriesFound) {
          stackValues = stackValues.slice();
          valueObject.stack = stackValues;
          valueObject.prior = priorValues;
        }
        priorValues = stackValues;
      }
    }
  }
}

function getSeriesValueObjectsWithChanges(valueHolder: SeriesDataSet, baseIndices: number[], changedIndices: number[]): SeriesValueObjects {
  const valueObjects = mapMap(valueHolder.values, () => ({} as SeriesValueObject));
  for (const key of positionOrComputedKeys) {
    setAllSeriesValuesWithChanges(valueObjects, valueHolder.values, key, baseIndices, changedIndices);
  }
  setAllExtraSeriesValuesWithChanges(valueObjects, valueHolder.values, baseIndices, changedIndices);
  setMinMax(valueObjects);
  return valueObjects;
}

function setAllExtraSeriesValuesWithChanges(targetValueObjects: SeriesValueObjects, valueObjects: SeriesValueObjects, baseIndices: number[], changedIndices: number[]): void {
  const seriesIds = Object.keys(valueObjects);
  let targetValueObject, valueObject;
  for (const seriesId of seriesIds) {
    targetValueObject = targetValueObjects[seriesId];
    valueObject = valueObjects[seriesId];
    for (const { extraKey, copyKey } of extraAndCopyKeys) {
      setExtraSeriesValuesWithChanges(targetValueObject, valueObject, extraKey, copyKey, baseIndices, changedIndices);
    }
  }
}

function setExtraSeriesValuesWithChanges(targetValueObject: SeriesValueObject, valueObject: SeriesValueObject, valueKey: ExtraKey, valueCopyKey: ExtraCopyKey, baseIndices: number[], changedIndices: number[]): void {
  if (valueObject[valueKey] !== null) {
    if (valueObject[valueCopyKey] !== null) {
      targetValueObject[valueKey] = targetValueObject[valueObject[valueCopyKey]! as ValueKey] as NumericValues | null;
      targetValueObject[valueCopyKey] = valueObject[valueCopyKey];
    }
    else {
      targetValueObject[valueKey] = getSeriesValuesWithChanges(valueObject[valueKey], baseIndices, changedIndices);
      targetValueObject[valueCopyKey] = null;
    }
  }
  else {
    targetValueObject[valueKey] = null;
    targetValueObject[valueCopyKey] = null;
  }
}

function getFilteredSeriesValueObjectsWithChanges(filteredValueHolder: SeriesDataSet, valueHolder: SeriesDataSet, valueObjectsWithChanges: SeriesValueObjects, baseIndices: number[], changedIndices: number[]): SeriesValueObjects {
  const valueObjects = mapMap(filteredValueHolder.values, () => ({} as SeriesValueObject));
  for (const key of positionOrComputedKeys) {
    setAllFilteredSeriesValuesWithChanges(valueObjects, filteredValueHolder.values, valueHolder.values, valueObjectsWithChanges, key, baseIndices, changedIndices);
  }
  setAllFilteredExtraSeriesValuesWithChanges(valueObjects, filteredValueHolder.values, valueHolder.values, valueObjectsWithChanges, baseIndices, changedIndices);
  setMinMax(valueObjects);
  return valueObjects;
}

function setAllFilteredExtraSeriesValuesWithChanges(targetValueObjects: SeriesValueObjects, filteredValueObjects: SeriesValueObjects, rawValueObjects: SeriesValueObjects, valueObjectsWithChanges: SeriesValueObjects, baseIndices: number[], changedIndices: number[]): void {
  const seriesIds = Object.keys(rawValueObjects);
  let targetValueObject, filteredValueObject, rawValueObject, valueObjectWithChanges;
  for (const seriesId of seriesIds) {
    targetValueObject = targetValueObjects[seriesId];
    filteredValueObject = filteredValueObjects[seriesId];
    rawValueObject = rawValueObjects[seriesId];
    valueObjectWithChanges = valueObjectsWithChanges[seriesId];
    for (const { extraKey, copyKey } of extraAndCopyKeys) {
      setFilteredExtraSeriesValuesWithChanges(targetValueObject, filteredValueObject, rawValueObject, valueObjectWithChanges,
        extraKey, copyKey, baseIndices, changedIndices);
    }
  }
}

function setFilteredExtraSeriesValuesWithChanges(targetValueObject: SeriesValueObject, filteredValueObject: SeriesValueObject, rawValueObject: SeriesValueObject, valueObjectWithChanges: SeriesValueObject, valueKey: ExtraKey, valueCopyKey: ExtraCopyKey, baseIndices: number[], changedIndices: number[]): void {
  if (filteredValueObject[valueKey] === rawValueObject[valueKey]) {
    targetValueObject[valueKey] = valueObjectWithChanges[valueKey];
  }
  else if (filteredValueObject[valueKey] !== null) {
    if (filteredValueObject[valueCopyKey] !== null) {
      targetValueObject[valueKey] = targetValueObject[filteredValueObject[valueCopyKey]! as ValueKey] as NumericValues | null;
    }
    else {
      targetValueObject[valueKey] = getSeriesValuesWithChanges(filteredValueObject[valueKey], baseIndices, changedIndices);
    }
  }
  else {
    targetValueObject[valueKey] = null;
  }
  targetValueObject[valueCopyKey] = filteredValueObject[valueCopyKey];
}

function setAllSeriesValuesWithChanges(targetValueObjects: SeriesValueObjects, valueObjects: SeriesValueObjects, valueKey: PositionOrComputedKey, baseIndices: number[], changedIndices: number[]): void {
  const seriesIds = Object.keys(valueObjects);
  for (const seriesId of seriesIds) {
    targetValueObjects[seriesId][valueKey] = getSeriesValuesWithChanges(valueObjects[seriesId][valueKey], baseIndices, changedIndices);
  }
}

function setAllFilteredSeriesValuesWithChanges(targetValueObjects: SeriesValueObjects, filteredValueObjects: SeriesValueObjects, valueObjects: SeriesValueObjects, valueObjectsWithChanges: SeriesValueObjects, valueKey: PositionOrComputedKey, baseIndices: number[], changedIndices: number[]): void {
  const seriesIds = Object.keys(valueObjects);
  for (const seriesId of seriesIds) {
    if (filteredValueObjects[seriesId][valueKey] === valueObjects[seriesId][valueKey]) {
      targetValueObjects[seriesId][valueKey] = valueObjectsWithChanges[seriesId][valueKey];
    }
    else {
      targetValueObjects[seriesId][valueKey] = getSeriesValuesWithChanges(filteredValueObjects[seriesId][valueKey], baseIndices, changedIndices);
    }
  }
}

function getSeriesValuesWithChanges(values: NumericValues | null, baseIndices: number[], changedIndices: number[]): NumericValues | null {
  if (values === null) {
    return null;
  }
  else {
    const changedCount = changedIndices.length;
    const baseCount = baseIndices.length;
    let i;
    const seriesValues: NumericValues = createArrayFilledWithUndefined(baseCount + changedCount);
    for (i = 0; i < baseCount; i++) {
      seriesValues[baseIndices[i]] = values[i];
    }
    return seriesValues;
  }
}

function setAllBaseValuesForChanges(seriesConfigs: EnhancedSeriesConfig[], startSeriesData: SeriesData, endSeriesData: SeriesData): void {
  for (const seriesConfig of seriesConfigs) {
    const { id, axis } = seriesConfig;
    const axisBase = startSeriesData.axisBases[axis!] ?? undefined;
    const startValueObject = startSeriesData.raw.values[id];
    const endValueObject = endSeriesData.raw.values[id];

    for (const key of positionKeys) {
      setBaseValuesForChanges(startValueObject, endValueObject, key, axisBase);
    }

    const startRawSeriesDomainObject = startSeriesData.raw.domains[id];

    for (const { extraKey, copyKey } of extraAndCopyKeys) {
      setBaseExtraValuesForChanges(startValueObject, endValueObject, extraKey, copyKey, axisBase, startRawSeriesDomainObject, extraKey !== 'label');
    }
    setStackBaseValuesForChanges(startValueObject, endValueObject);

    const startFilteredValueObject = startSeriesData.filtered.values[id];
    const endFilteredValueObject = endSeriesData.filtered.values[id];

    for (const key of positionKeys) {
      if (areValueReferencesDifferent(startFilteredValueObject, endFilteredValueObject, startValueObject, endValueObject, key)) {
        setBaseValuesForChanges(startFilteredValueObject, endFilteredValueObject, key, axisBase);
      }
    }
    for (const { extraKey, copyKey } of extraAndCopyKeys) {
      if (areValueReferencesDifferent(startFilteredValueObject, endFilteredValueObject, startValueObject, endValueObject, extraKey)) {
        setBaseExtraValuesForChanges(startFilteredValueObject, endFilteredValueObject, extraKey, copyKey, axisBase, startRawSeriesDomainObject, extraKey !== 'label');
      }
    }
    if (areValueReferencesDifferent(startFilteredValueObject, endFilteredValueObject, startValueObject, endValueObject, 'stack')) {
      setStackBaseValuesForChanges(startFilteredValueObject, endFilteredValueObject);
    }
  };
}

function setBaseExtraValuesForChanges(startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, valueKey: ExtraKey, valueCopyKey: ExtraCopyKey, axisBase: number | undefined, seriesDomainObject: SeriesDomainObject, useSeriesDomain: boolean): void {
  if (typeof startValueObject[valueCopyKey] === 'string') {
    startValueObject[valueKey] = startValueObject[startValueObject[valueCopyKey]! as ValueKey] as NumericValues | null;
    endValueObject[valueKey] = endValueObject[startValueObject[valueCopyKey]! as ValueKey] as NumericValues | null;
  }
  else {
    let valueBase: number | undefined = axisBase;
    if (useSeriesDomain) {
      valueBase = seriesDomainObject[valueKey][0] ?? undefined;
    }
    setBaseValuesForChanges(startValueObject, endValueObject, valueKey, valueBase);
  }
}

function setBaseValuesForChanges(startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, valueKey: ValueKey, axisBase: number | undefined): void {
  const startValues = startValueObject[valueKey];
  const endValues = endValueObject[valueKey];
  if (startValues !== endValues) { // not both null
    if (startValues === null) {
      startValueObject[valueKey] = createArrayWithValueIfNotUndefined(endValues!, axisBase);
    }
    else if (endValues === null) {
      endValueObject[valueKey] = createArrayWithValueIfNotUndefined(startValues, axisBase);
    }
    else {
      setArrayValuesIfOneIsUndefined(startValues, endValues, axisBase);
    }
  }
}

function setStackBaseValuesForChanges(startValueObject: SeriesValueObject, endValueObject: SeriesValueObject): void {
  let startStackValues = startValueObject.stack;
  const startPriorValues = startValueObject.prior;
  let endStackValues = endValueObject.stack;
  const endPriorValues = endValueObject.prior;

  if (startStackValues !== endStackValues) { // not both null
    if (startPriorValues !== null) {
      replaceArrayUndefinedWithValue(startPriorValues, 0);
    }
    if (endPriorValues !== null) {
      replaceArrayUndefinedWithValue(endPriorValues, 0);
    }
    if (startStackValues === null) {
      startValueObject.stack = startStackValues = copyArrayWithValueIfNotUndefined(startPriorValues!, endStackValues!);
    }
    else if (endStackValues === null) {
      endValueObject.stack = endStackValues = copyArrayWithValueIfNotUndefined(endPriorValues!, startStackValues);
    }
    setArrayValuesFromSourcesIfOneIsUndefined(startStackValues!, endStackValues!, startPriorValues!, endPriorValues!);
  }
}

function setAllBaseValuesForOuterChanges(_animationConfig: AnimationConfig, seriesConfigs: EnhancedSeriesConfig[], startSeriesData: SeriesData, endSeriesData: SeriesData, oldSeriesData: SeriesData, newSeriesData: SeriesData, outerCounts: { added: OuterChangeCounts; removed: OuterChangeCounts }): void {
  for (const seriesConfig of seriesConfigs) {
    const { id } = seriesConfig;
    if (seriesConfig.animateBaseFromAdjacent) {
      const startValueObject = startSeriesData.raw.values[id];
      const endValueObject = endSeriesData.raw.values[id];
      const oldValueObject = oldSeriesData.raw.values[id];
      const newValueObject = newSeriesData.raw.values[id];

      for (const key of positionKeys) {
        setBaseValuesForOuterChanges(startValueObject, endValueObject, oldValueObject, newValueObject, key, outerCounts);
      }

      const startFilteredValueObject = startSeriesData.filtered.values[id];
      const endFilteredValueObject = endSeriesData.filtered.values[id];
      const oldFilteredValueObject = oldSeriesData.filtered.values[id];
      const newFilteredValueObject = newSeriesData.filtered.values[id];

      for (const key of positionKeys) {
        if (areValueReferencesDifferent(startFilteredValueObject, endFilteredValueObject, startValueObject, endValueObject, key)) {
          setBaseValuesForOuterChanges(startFilteredValueObject, endFilteredValueObject,
            oldFilteredValueObject, newFilteredValueObject, key, outerCounts);
        }
      }
    }
  };
}

function setBaseValuesForOuterChanges(startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, oldValueObject: SeriesValueObject, newValueObject: SeriesValueObject, valueKey: PositionKey, outerCounts: { added: OuterChangeCounts; removed: OuterChangeCounts }): void {
  setBaseValuesForOuterChange(startValueObject[valueKey], oldValueObject[valueKey], newValueObject[valueKey], outerCounts.added);
  setBaseValuesForOuterChange(endValueObject[valueKey], newValueObject[valueKey], oldValueObject[valueKey], outerCounts.removed);
}

function setBaseValuesForOuterChange(targetValues: NumericValues | null, sourceValues: NumericValues | null, changedValues: NumericValues | null, outerCountChanges: OuterChangeCounts): void {
  if (targetValues !== null && sourceValues !== null && changedValues !== null && sourceValues.length > 0) {
    if (outerCountChanges.before > 0 && sourceValues[0] !== undefined && !hasUndefinedForRange(changedValues, 0, outerCountChanges.before)) {
      setArrayValuesForRange(targetValues, 0, outerCountChanges.before, sourceValues[0]);
    }
    if (outerCountChanges.after > 0 && sourceValues[sourceValues.length - 1] !== undefined  && !hasUndefinedForRange(changedValues, targetValues.length - outerCountChanges.after, targetValues.length)) {
      setArrayValuesForRange(targetValues, targetValues.length - outerCountChanges.after, targetValues.length, sourceValues[sourceValues.length-1]);
    }
  }
}

function createValueDeltaData(mochartConfig: EnhancedMochartConfig, startChartData: ChartData, endChartData: ChartData, finalChartData: ChartData, rawValueAxisDomains: AxisDomains, filteredValueAxisDomains: AxisDomains, rawSeriesDomains: SeriesDomainObjects, ordinalCategoryOrderOffets: number[] | null): ValueChangeData {
  // extents over the union of the phase endpoints, so a value and its translating domain share the
  // same pacing basis (for union axes start covers end, so this matches the start extent exactly);
  // a collapsed or inverted domain would weight every value delta at 0, hence the safe extents
  const rawValueAxisExtents = getSafeDomainExtents(getMaxAxisDomains(rawValueAxisDomains, endChartData.seriesData.raw.renderAxisDomains));
  const filteredValueAxisExtents = getSafeDomainExtents(getMaxAxisDomains(filteredValueAxisDomains, endChartData.seriesData.filtered.renderAxisDomains));
  const valueDeltaData = createRawValueDeltaData(mochartConfig, startChartData.seriesData.raw.values,
    endChartData.seriesData.raw.values, rawValueAxisExtents, rawSeriesDomains);
  const filteredValueDeltaData = createFilteredValueDeltaData(mochartConfig,
    startChartData.seriesData.filtered.values, endChartData.seriesData.filtered.values,
    startChartData.seriesData.raw.values, endChartData.seriesData.raw.values, valueDeltaData, filteredValueAxisExtents, rawSeriesDomains);

  const categoryOrderDeltaData = createCategoryOrderDeltaData(mochartConfig, startChartData, endChartData, ordinalCategoryOrderOffets);

  // non-zero only for translating axes: the value phase moves their render domains directly
  const rawDomainDeltaData = getTranslationAxisDomainDeltas(startChartData.seriesData.raw.renderAxisDomains,
    endChartData.seriesData.raw.renderAxisDomains, rawValueAxisExtents);
  const filteredDomainDeltaData = getTranslationAxisDomainDeltas(startChartData.seriesData.filtered.renderAxisDomains,
    endChartData.seriesData.filtered.renderAxisDomains, filteredValueAxisExtents);

  const deltaPercentage = Math.max(valueDeltaData.deltaPercentage, filteredValueDeltaData.deltaPercentage, categoryOrderDeltaData.deltaPercentage,
    rawDomainDeltaData.deltaPercentage, filteredDomainDeltaData.deltaPercentage);
  setValueDeltaFactors(valueDeltaData, deltaPercentage);
  setValueDeltaFactors(filteredValueDeltaData, deltaPercentage);
  setCategoryOrderDeltaFactors(categoryOrderDeltaData, deltaPercentage);
  setAxisDeltaFactors(rawDomainDeltaData, deltaPercentage);
  setAxisDeltaFactors(filteredDomainDeltaData, deltaPercentage);

  return {
    start: startChartData,
    deltaPercentage,
    deltas: {
      categoryOrder: categoryOrderDeltaData,
      raw: valueDeltaData,
      filtered: filteredValueDeltaData,
      domain: { raw: rawDomainDeltaData, filtered: filteredDomainDeltaData }
    },
    end: endChartData,
    final: finalChartData
  };
}

function createRawValueDeltaData(mochartConfig: EnhancedMochartConfig, startValueObjects: SeriesValueObjects, endValueObjects: SeriesValueObjects, valueAxisExtents: AxisExtents, seriesDomains: SeriesDomainObjects): SeriesValueDeltaMap {
  let deltaPercentage = 0;
  const deltas: Record<string, ValueDeltaObject> = Object.create(null);
  let deltaObject: ValueDeltaObject;

  const seriesConfigs = mochartConfig.series;
  for (const seriesConfig of seriesConfigs) {
    const { id, axis } = seriesConfig;
    deltaObject = createRawValueDeltaDataObject(startValueObjects[id], endValueObjects[id],
      valueAxisExtents[axis!]!, seriesDomains[id]!);
    deltaPercentage = Math.max(deltaPercentage, deltaObject.deltaPercentage);
    deltas[id] = deltaObject;
  }

  adjustDeltaPercentagesForStackedCategories(mochartConfig.seriesStacks, deltas);
  adjustDeltaPercentagesForRangedSeries(seriesConfigs, deltas);
  adjustDeltaPercentagesForErrorBarSeries(seriesConfigs, deltas);
  adjustDeltaPercentagesForFollowerCategories(seriesConfigs, deltas);

  return {
    deltaPercentage,
    deltas
  };
}

// A ranged series (rangeProperty, unstacked) draws one shape between its
// plain and range values, so the two keys share a duration — the max of the
// pair, mirroring what adjustDeltaPercentagesForStackedCategories does for
// stacks. With independent durations each edge travels at the global speed
// and the nearer one arrives first, so a bar collapsing to the base holds
// its full extent while it slides and only snaps shut at the end.
function adjustDeltaPercentagesForRangedSeries(seriesConfigs: EnhancedSeriesConfig[], deltaObjects: Record<string, ValueDeltaObject>): void {
  for (const seriesConfig of seriesConfigs) {
    if (seriesConfig.rangeProperty !== NONE && seriesConfig.stack === NONE) {
      const deltaObject = deltaObjects[seriesConfig.id];
      const plainDelta = deltaObject.plain;
      const rangeDelta = deltaObject.range;
      // zero-delta and copied entries are shared constants — never mutated
      if (plainDelta.deltaPercentage !== 0 && rangeDelta.deltaPercentage !== 0 &&
        plainDelta.deltaCopied !== true && rangeDelta.deltaCopied !== true) {
        const maxDeltaPercentage = Math.max(plainDelta.deltaPercentage, rangeDelta.deltaPercentage);
        plainDelta.deltaPercentage = maxDeltaPercentage;
        rangeDelta.deltaPercentage = maxDeltaPercentage;
      }
    }
  }
}

// An error-bar series draws its whisker anchored to the shape drawn from the
// plain/range values, so all of its animated keys share a duration for the
// same reason ranged series do: with independent durations the whisker's ends
// arrive before or after the bar edge they're anchored to and the bar slides
// out from under its whisker mid-tween.
function adjustDeltaPercentagesForErrorBarSeries(seriesConfigs: EnhancedSeriesConfig[], deltaObjects: Record<string, ValueDeltaObject>): void {
  const syncKeys = ['plain', 'range', 'errorLow', 'errorHigh'] as const;
  for (const seriesConfig of seriesConfigs) {
    if ((seriesConfig.errorLowProperty !== NONE || seriesConfig.errorHighProperty !== NONE) && seriesConfig.stack === NONE) {
      const deltaObject = deltaObjects[seriesConfig.id];
      let maxDeltaPercentage = 0;
      for (const key of syncKeys) {
        const delta = deltaObject[key];
        if (delta.deltaPercentage !== 0 && delta.deltaCopied !== true) {
          maxDeltaPercentage = Math.max(maxDeltaPercentage, delta.deltaPercentage);
        }
      }
      if (maxDeltaPercentage === 0) {
        continue;
      }
      for (const key of syncKeys) {
        const delta = deltaObject[key];
        // zero-delta and copied entries are shared constants — never mutated
        if (delta.deltaPercentage !== 0 && delta.deltaCopied !== true) {
          delta.deltaPercentage = maxDeltaPercentage;
        }
      }
    }
  }
}

// A followSeries group — a leader plus its followers, e.g. a hollow
// candlestick body with its wick segments — renders one visual mark from
// several series, so the group shares a duration the same way a stack does:
// every member's plain/range keys take the group's max delta percentage.
// With independent durations, edges that coincide across members (a wick
// segment ends exactly where the body starts) travel at different speeds and
// the segments slide into or away from the body mid-animation; with a shared
// duration the coincident edges interpolate with the same progress and stay
// coincident through every frame.
function adjustDeltaPercentagesForFollowerCategories(seriesConfigs: EnhancedSeriesConfig[], deltaObjects: Record<string, ValueDeltaObject>): void {
  let followerCategories: Record<string, EnhancedSeriesConfig[]> | null = null;
  for (const seriesConfig of seriesConfigs) {
    if (seriesConfig.followSeries !== NONE && seriesConfig.stack === NONE) {
      followerCategories ??= Object.create(null) as Record<string, EnhancedSeriesConfig[]>;
      (followerCategories[seriesConfig.followSeries] ??= []).push(seriesConfig);
    }
  }
  if (followerCategories === null) {
    return;
  }
  const syncKeys = ['plain', 'range', 'errorLow', 'errorHigh'] as const;
  for (const seriesConfig of seriesConfigs) {
    const followers = followerCategories[seriesConfig.id];
    if (followers === undefined || seriesConfig.stack !== NONE) {
      continue;
    }
    const members = [seriesConfig, ...followers];
    let maxDeltaPercentage = 0;
    for (const member of members) {
      const deltaObject = deltaObjects[member.id];
      for (const key of syncKeys) {
        const delta = deltaObject[key];
        if (delta.deltaPercentage !== 0 && delta.deltaCopied !== true) {
          maxDeltaPercentage = Math.max(maxDeltaPercentage, delta.deltaPercentage);
        }
      }
    }
    if (maxDeltaPercentage === 0) {
      continue;
    }
    for (const member of members) {
      const deltaObject = deltaObjects[member.id];
      let adjusted = false;
      for (const key of syncKeys) {
        const delta = deltaObject[key];
        // zero-delta and copied entries are shared constants — never mutated
        if (delta.deltaPercentage !== 0 && delta.deltaCopied !== true) {
          delta.deltaPercentage = maxDeltaPercentage;
          adjusted = true;
        }
      }
      if (adjusted) {
        deltaObject.deltaPercentage = Math.max(deltaObject.deltaPercentage, maxDeltaPercentage);
      }
    }
  }
}

function adjustDeltaPercentagesForStackedCategories(seriesStackConfigs: EnhancedSeriesStackConfig[], deltaObjects: Record<string, ValueDeltaObject>): void {
  let maxDeltaPercentage;
  let currentDeltaObject;
  for (const seriesStackConfig of seriesStackConfigs) {
    maxDeltaPercentage = 0;
    const stackedSeriesConfigs = seriesStackConfig.seriesConfigs!;
    for (const seriesConfig of stackedSeriesConfigs) {
      const { id } = seriesConfig;
      maxDeltaPercentage = Math.max(maxDeltaPercentage, deltaObjects[id].stack.deltaPercentage, deltaObjects[id].prior.deltaPercentage);
    };

    if (maxDeltaPercentage !== 0) {
      for (const seriesConfig of stackedSeriesConfigs) {
        currentDeltaObject = deltaObjects[seriesConfig.id];
        if (currentDeltaObject.stack.deltaPercentage !== 0) {
          currentDeltaObject.stack.deltaPercentage = maxDeltaPercentage;
          currentDeltaObject.deltaPercentage = Math.max(currentDeltaObject.deltaPercentage, maxDeltaPercentage);
        }
        if (currentDeltaObject.prior.deltaPercentage !== 0) {
          currentDeltaObject.prior.deltaPercentage = maxDeltaPercentage;
          currentDeltaObject.deltaPercentage = Math.max(currentDeltaObject.deltaPercentage, maxDeltaPercentage);
        }
      }
    }
  }
}

function createRawValueDeltaDataObject(startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, valueAxisExtent: number, seriesDomain: SeriesDomainObject): ValueDeltaObject {
  const valueDeltaObject = {} as ValueDeltaObject;
  for (const key of positionOrComputedKeys) {
    setRawSeriesValueDeltas(valueDeltaObject, startValueObject, endValueObject, key, valueAxisExtent);
  }
  for (const { extraKey, copyKey } of extraAndCopyKeys) {
    setRawExtraSeriesValueDeltas(valueDeltaObject, startValueObject, endValueObject, extraKey, copyKey, valueAxisExtent, seriesDomain, extraKey !== 'label');
  }
  valueDeltaObject.deltaPercentage = getMaxDeltaPercentage(valueDeltaObject);
  return valueDeltaObject;
}

function setRawExtraSeriesValueDeltas(valueDeltaObject: ValueDeltaObject, startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, valueKey: ExtraKey, valueCopyKey: ExtraCopyKey, valueAxisExtent: number, seriesDomain: SeriesDomainObject, useSeriesDomain: boolean): void {
  if (startValueObject[valueCopyKey] === null) {
    let domainExtent = valueAxisExtent;
    if (useSeriesDomain) {
      domainExtent = getSafeDomainExtent(seriesDomain[valueKey]);
    }
    setRawSeriesValueDeltas(valueDeltaObject, startValueObject, endValueObject, valueKey, domainExtent);
  }
  else {
    valueDeltaObject[valueKey] = emptyValueDelta;
  }
}

function setRawSeriesValueDeltas(valueDeltaObject: ValueDeltaObject, startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, valueKey: ValueKey, valueAxisExtent: number): void {
  if (startValueObject[valueKey] !== null) {
    valueDeltaObject[valueKey] = getSeriesValuesDeltas(startValueObject[valueKey]!, endValueObject[valueKey]!, valueAxisExtent);
  }
  else {
    valueDeltaObject[valueKey] = emptyValueDelta;
  }
}

function getSeriesValuesDeltas(startValues: NumericValues, endValues: NumericValues, valueAxisExtent: number): NumericValuesDelta {
  const deltas = getArrayDeltas(startValues as number[], endValues);
  const deltaPercentage = valueAxisExtent > 0 ? getMaxAbsoluteValue(deltas) / valueAxisExtent : 0;
  return deltaPercentage === 0 ? emptyValueDelta : {
    deltaPercentage,
    deltas
  };
}

function getMaxDeltaPercentage(valueDeltaObject: ValueDeltaObject): number {
  return Math.max(valueDeltaObject.plain.deltaPercentage, valueDeltaObject.range.deltaPercentage,
    valueDeltaObject.errorLow.deltaPercentage, valueDeltaObject.errorHigh.deltaPercentage,
    valueDeltaObject.stack.deltaPercentage, valueDeltaObject.marker.deltaPercentage,
    valueDeltaObject.color.deltaPercentage, valueDeltaObject.label.deltaPercentage,
    valueDeltaObject.tooltip.deltaPercentage);
}

function getAllDeltaCopied(valueDeltaObject: ValueDeltaObject): boolean {
  return valueDeltaObject.plain.deltaCopied === true && valueDeltaObject.range.deltaCopied === true &&
    valueDeltaObject.errorLow.deltaCopied === true && valueDeltaObject.errorHigh.deltaCopied === true &&
    valueDeltaObject.stack.deltaCopied === true;
}

function createFilteredValueDeltaData(mochartConfig: EnhancedMochartConfig, startFilteredValueObjects: SeriesValueObjects, endFilteredValueObjects: SeriesValueObjects, startValueObjects: SeriesValueObjects, endValueObjects: SeriesValueObjects, valueDeltaData: SeriesValueDeltaMap, valueAxisExtents: AxisExtents, seriesDomains: SeriesDomainObjects): SeriesValueDeltaMap {
  let deltaPercentage = 0;
  let deltaCopied = true;
  const deltas: Record<string, ValueDeltaObject> = Object.create(null);
  let deltaObject: ValueDeltaObject;

  const seriesConfigs = mochartConfig.series;
  for (const seriesConfig of seriesConfigs) {
    const { id, axis } = seriesConfig;
    deltaObject = createFilteredValueDeltaDataObject(
      startFilteredValueObjects[id], endFilteredValueObjects[id],
      startValueObjects[id], endValueObjects[id], valueDeltaData.deltas[id] as ValueDeltaObject, valueAxisExtents[axis!]!, seriesDomains[id]!);
    deltaPercentage = Math.max(deltaPercentage, deltaObject.deltaPercentage);
    if (deltaObject.deltaCopied === false) {
      deltaCopied = false;
    }
    deltas[id] = (deltaObject);
  };

  adjustDeltaPercentagesForStackedCategories(mochartConfig.seriesStacks, deltas);
  adjustDeltaPercentagesForRangedSeries(seriesConfigs, deltas);
  adjustDeltaPercentagesForErrorBarSeries(seriesConfigs, deltas);
  adjustDeltaPercentagesForFollowerCategories(seriesConfigs, deltas);

  return {
    deltaPercentage,
    deltaCopied,
    deltas
  };
}

function createFilteredValueDeltaDataObject(startFilteredValueObject: SeriesValueObject, endFilteredValueObject: SeriesValueObject, startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, rawValueDeltaObject: ValueDeltaObject, valueAxisExtent: number, seriesDomain: SeriesDomainObject): ValueDeltaObject {
  const valueDeltaObject = {} as ValueDeltaObject;
  for (const key of positionOrComputedKeys) {
    setFilteredSeriesValueDeltas(valueDeltaObject, startFilteredValueObject, endFilteredValueObject, startValueObject, endValueObject, rawValueDeltaObject, key, valueAxisExtent);
  }
  for (const { extraKey, copyKey } of extraAndCopyKeys) {
    setFilteredExtraSeriesValueDeltas(valueDeltaObject, startFilteredValueObject, endFilteredValueObject, startValueObject, endValueObject, rawValueDeltaObject, extraKey, copyKey, valueAxisExtent, seriesDomain, extraKey !== 'label');
  }
  valueDeltaObject.deltaPercentage = getMaxDeltaPercentage(valueDeltaObject);
  valueDeltaObject.deltaCopied = getAllDeltaCopied(valueDeltaObject);
  return valueDeltaObject;
}

function setFilteredExtraSeriesValueDeltas(valueDeltaObject: ValueDeltaObject, startFilteredValueObject: SeriesValueObject, endFilteredValueObject: SeriesValueObject, startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, rawValueDeltaObject: ValueDeltaObject, valueKey: ExtraKey, valueCopyKey: ExtraCopyKey, valueAxisExtent: number, seriesDomain: SeriesDomainObject, useSeriesDomain: boolean): void {
  if (startFilteredValueObject[valueCopyKey] !== null) {
    valueDeltaObject[valueKey] = emptyCopiedValueDelta;
  }
  else {
    let domainExtent = valueAxisExtent;
    if (useSeriesDomain) {
      domainExtent = getSafeDomainExtent(seriesDomain[valueKey]);
    }
    setFilteredSeriesValueDeltas(valueDeltaObject, startFilteredValueObject, endFilteredValueObject, startValueObject, endValueObject, rawValueDeltaObject, valueKey, domainExtent);
  }
}

function setFilteredSeriesValueDeltas(valueDeltaObject: ValueDeltaObject, startFilteredValueObject: SeriesValueObject, endFilteredValueObject: SeriesValueObject, startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, rawValueDeltaObject: ValueDeltaObject, valueKey: ValueKey, valueAxisExtent: number): void {
  const filteredIsNotCopy = areValueReferencesDifferent(startFilteredValueObject, endFilteredValueObject, startValueObject, endValueObject, valueKey);
  if (startFilteredValueObject[valueKey] !== null && filteredIsNotCopy) {
    valueDeltaObject[valueKey] = getSeriesValuesDeltas(startFilteredValueObject[valueKey]!, endFilteredValueObject[valueKey]!, valueAxisExtent);
    valueDeltaObject[valueKey].deltaCopied = false;
  }
  else {
    valueDeltaObject[valueKey] = filteredIsNotCopy ? emptyNotCopiedValueDelta : Object.assign({}, emptyCopiedValueDelta , { deltaPercentage: rawValueDeltaObject[valueKey].deltaPercentage });
  }
}

function areValueReferencesDifferent(startFilteredValueObject: SeriesValueObject, endFilteredValueObjects: SeriesValueObject, startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, valueKey: ValueKey): boolean {
  return (startFilteredValueObject[valueKey] !== startValueObject[valueKey] || endFilteredValueObjects[valueKey] !== endValueObject[valueKey]);
}

function setValueDeltaFactors(valueDeltaObject: SeriesValueDeltaMap, deltaPercentage: number): void {
  const deltas = valueDeltaObject.deltas;
  const seriesIds = Object.keys(deltas);
  for (const seriesId of seriesIds) {
    setValueDeltaFactorForObject(deltas[seriesId], deltaPercentage);
  }
}

function setValueDeltaFactorForObject(valueDeltaDataObject: SeriesValueDelta, deltaPercentage: number): void {
  for (const key of positionOrComputedOrExtraKeys) {
    setValueDeltaFactorForValues(valueDeltaDataObject, key, deltaPercentage);
  }
}

function setValueDeltaFactorForValues(valueDeltaDataObject: SeriesValueDelta, valueKey: ValueKey, deltaPercentage: number): void {
  const valuesDelta = valueDeltaDataObject[valueKey] as NumericValuesDelta;
  const valuesDeltaPercentage = valuesDelta.deltaPercentage;
  if (valuesDeltaPercentage === 0) {
    valuesDelta.deltaFactor = 0;
  }
  else {
    valuesDelta.deltaFactor = deltaPercentage / valuesDeltaPercentage;
  }
}
