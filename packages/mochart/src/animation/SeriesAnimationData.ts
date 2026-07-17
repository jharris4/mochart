import { getChartDataWithSeriesData, getChartDataWithData } from '../data/ChartData';

import { getGroupDataWithAxisDomain, getGroupDataFromValues, getGroupDataWithNumericValues } from '../data/GroupData';

import { getDomainExtents, getSafeDomainExtent } from '../data/DomainData';

import { getSeriesContainerFilteredSeriesCounts, getSeriesDataWithAxisDomains, getSeriesDataWithSeriesValues,
  getSeriesDataWithDomains, setMinMax } from '../data/SeriesData';

import { createArrayFilledWithUndefined, createArrayWithValueIfNotUndefined, copyArrayWithValueIfNotUndefined,
  areMapsEqual, setArrayValuesIfOneIsUndefined,
  setArrayValuesFromSourcesIfOneIsUndefined, setArrayValuesForRange, hasUndefinedForRange, getMaxAbsoluteValue,
  getArrayDeltas, replaceArrayUndefinedWithValue } from '../utils/utils';

import {
  hasGroupAdditions, hasGroupRemovals, hasGroupReorder, hasGroupChanges, hasNumericValueOffsets, getNumericValuesWithoutOffsets,
  getMergedNumericValues, createGroupOrderDeltaData, setGroupOrderDeltaFactors, getNumericValueOffsets } from './GroupAnimationData';

import { valueKeys, keyPlain, positionKeys, positionOrComputedKeys, positionOrComputedOrExtraKeys, extraAndCopyKeys } from '../data/constants';

import { copyWithValueOnlyIfOtherUndefined, mapMap } from '../utils/utils';
import type { AnimationConfig, MochartConfig, SeriesConfig, SeriesStackConfig } from '../types/config';
import type {
  AxisDomains, ChartData, NumericValues, SeriesData, SeriesDataSet, SeriesDomainObject,
  SeriesDomainObjects, SeriesValueObject, SeriesValueObjects
} from '../types/data';
import type {
  GroupDeltaData, NumericArrayDelta, NumericValuesDelta, OuterChangeCounts,
  SeriesValueDelta, SeriesValueDeltaMap, ValueChangeData
} from '../types/animation';
import type { ExtraCopyKey, ExtraKey, PositionKey, PositionOrComputedKey, ValueKey } from '../data/constants';

type PartialSeriesValueObjects = Record<string, Partial<SeriesValueObject>>;
type AxisExtents = Record<string, number>;
type ValueDeltaObject = Record<ValueKey, NumericValuesDelta> & { deltaPercentage: number; deltaCopied?: boolean };

/**
 *
 * Various constants
 *
 **/

const nullValueObject: SeriesValueObject = {
  plain: null, range: null, stack: null, prior: null, marker: null, label: null, color: null,
  markerCopyKey: null, labelCopyKey: null, colorCopyKey: null, min: null, max: null
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


export function getInitialValueChangeData(mochartConfig: MochartConfig, newChartData: ChartData): ValueChangeData {
  let initialValues = getInitialSeriesValueObjects(mochartConfig.seriesConfigs, newChartData.seriesData.raw.domains,
    newChartData.seriesData.raw.values, newChartData.seriesData.raw.priorIndices, newChartData.seriesData.axisBases);
  let initialFilteredValues = getInitialFilteredSeriesValueObjects(mochartConfig.seriesStackConfigs,
    initialValues, newChartData.seriesData.filteredFlags);

  let startChartData = getChartDataWithSeriesData(newChartData, getSeriesDataWithSeriesValues(newChartData.seriesData, initialValues, initialFilteredValues));

  return createValueDeltaData(mochartConfig, startChartData, newChartData, newChartData, newChartData.seriesData.raw.axisDomains,
    newChartData.seriesData.filtered.axisDomains, newChartData.seriesData.raw.domains, null);
}

export function getFilterDeltaData(mochartConfig: MochartConfig, oldSeriesData: SeriesData, newSeriesData: SeriesData) {
  let filtersChanged = false;
  let axisSeriesCounts = oldSeriesData.axisSeriesCounts;
  let stackSeriesCounts = oldSeriesData.stackSeriesCounts;
  let groupSeriesCounts = oldSeriesData.groupSeriesCounts;
  let priorIndices = oldSeriesData.filtered.priorIndices;
  if (!areMapsEqual(oldSeriesData.filteredFlags, newSeriesData.filteredFlags)) {
    let filteredFlags = getFilteredFlagsFromValues(oldSeriesData, newSeriesData);
    filtersChanged = true;
    axisSeriesCounts = getSeriesContainerFilteredSeriesCounts(mochartConfig.seriesAxisConfigs, filteredFlags);
    stackSeriesCounts = getSeriesContainerFilteredSeriesCounts(mochartConfig.seriesStackConfigs, filteredFlags);
    groupSeriesCounts = getSeriesContainerFilteredSeriesCounts(mochartConfig.seriesGroupConfigs, filteredFlags);
  }
  return {
    filtersChanged,
    axisSeriesCounts,
    stackSeriesCounts,
    groupSeriesCounts
  }
}

function getFilteredFlagsFromValues(oldSeriesData: SeriesData, newSeriesData: SeriesData): Record<string, boolean> {
  let filteredFlags: Record<string, boolean> = {};
  let oldFilteredValueObjects = oldSeriesData.filtered.values;
  let newFilteredValueObjects = newSeriesData.filtered.values;
  let seriesIds = Object.keys(oldFilteredValueObjects);
  for (let seriesId of seriesIds) {
    filteredFlags[seriesId] = (oldFilteredValueObjects[seriesId][keyPlain] === null && newFilteredValueObjects[seriesId][keyPlain] === null);
  }
  return filteredFlags;
}

export function getTransitionValueChangeData(mochartConfig: MochartConfig, prevChartData: ChartData, newChartData: ChartData, groupDeltaData: GroupDeltaData): ValueChangeData {
  let startValues: SeriesValueObjects, startFilteredValues: SeriesValueObjects;
  let endValues: SeriesValueObjects, endFilteredValues: SeriesValueObjects;
  const { seriesData: prevSeriesData } = prevChartData;

  let startGroupData = prevChartData.groupData;
  let endGroupData = startGroupData;
  let finalGroupData = startGroupData;

  let groupOrderOffsets: number[] | null = null;

  if (hasGroupChanges(groupDeltaData)) {
    let mergedNumericValues = getMergedNumericValues(mochartConfig.groupAxisConfig, startGroupData.values.numeric, groupDeltaData);
    let mergedGroupData = getGroupDataFromValues(mochartConfig.groupAxisConfig, groupDeltaData.values.merged, groupDeltaData.values.displayMerged);
    mergedGroupData = getGroupDataWithAxisDomain(mergedGroupData, prevChartData.groupData.axisDomain);
    startGroupData = mergedGroupData;
    if (mergedNumericValues !== null) {
      startGroupData = getGroupDataWithNumericValues(mergedGroupData, mergedNumericValues);
    }
    endGroupData = mergedGroupData;
    finalGroupData = getGroupDataWithAxisDomain(newChartData.groupData, endGroupData.axisDomain);
  }
  else if (hasNumericValueOffsets(mochartConfig.groupAxisConfig, startGroupData)) {
    endGroupData = getGroupDataWithNumericValues(startGroupData, getNumericValuesWithoutOffsets(startGroupData));
  }

  groupOrderOffsets = getNumericValueOffsets(mochartConfig.groupAxisConfig, startGroupData);

  startValues = getSeriesValueObjectsWithChanges(prevSeriesData.raw, groupDeltaData.indices.old, groupDeltaData.indices.added);
  startFilteredValues = getFilteredSeriesValueObjectsWithChanges(prevSeriesData.filtered, prevSeriesData.raw,
    startValues, groupDeltaData.indices.old, groupDeltaData.indices.added);

  // TODO - here is where the series values from the prev series data all need to be rearranged if necessary

  endValues = getSeriesValueObjectsWithChanges(newChartData.seriesData.raw, groupDeltaData.indices.new, groupDeltaData.indices.removed);
  endFilteredValues = getFilteredSeriesValueObjectsWithChanges(newChartData.seriesData.filtered, newChartData.seriesData.raw,
    endValues, groupDeltaData.indices.new, groupDeltaData.indices.removed);
  finalGroupData = getGroupDataWithNumericValues(finalGroupData, groupDeltaData.indices.new);

  let startSeriesData = getSeriesDataWithSeriesValues(prevSeriesData, startValues, startFilteredValues);

  let endSeriesData = getSeriesDataWithSeriesValues(prevSeriesData, endValues, endFilteredValues);
  let finalSeriesData = getSeriesDataWithAxisDomains(newChartData.seriesData, prevSeriesData.raw.axisDomains, prevSeriesData.filtered.axisDomains);
  finalSeriesData = getSeriesDataWithDomains(finalSeriesData, prevSeriesData.raw.domains, prevSeriesData.filtered.domains);

  setAllBaseValuesForOuterChanges(mochartConfig.animationConfig, mochartConfig.seriesConfigs, startSeriesData, endSeriesData,
    prevSeriesData, newChartData.seriesData, groupDeltaData.outerCounts);
  setAllBaseValuesForChanges(mochartConfig.seriesConfigs, startSeriesData, endSeriesData);

  enhanceValueObjects(startSeriesData.filtered.values);
  enhanceValueObjects(endSeriesData.filtered.values);

  return createValueDeltaData(mochartConfig, getChartDataWithData(prevChartData, startGroupData, startSeriesData),
    getChartDataWithData(prevChartData, endGroupData, endSeriesData),
    getChartDataWithData(newChartData, finalGroupData, finalSeriesData), startSeriesData.raw.axisDomains, startSeriesData.filtered.axisDomains, startSeriesData.raw.domains, groupOrderOffsets);
}

export function enhanceValueObjects(valueObjects: SeriesValueObjects): void {
  let seriesIds = Object.keys(valueObjects);
  for (let seriesId of seriesIds) {
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

function getInitialSeriesValueObjects(seriesConfigs: SeriesConfig[], seriesDomains: SeriesDomainObjects, rawSeriesValueObjects: SeriesValueObjects, _seriesPriorIndices: number[] | undefined, axisBases: Record<string, number | null>): SeriesValueObjects {
  let valueObjects = mapMap(rawSeriesValueObjects, () => ({} as SeriesValueObject));
  for (let positionOrComputedKey of positionOrComputedKeys) {
    setInitialSeriesValues(valueObjects, seriesConfigs, rawSeriesValueObjects, positionOrComputedKey, axisBases);
  }
  setAllInitialExtraSeriesValues(valueObjects, seriesConfigs, seriesDomains, rawSeriesValueObjects, axisBases);
  setMinMax(valueObjects);

  return valueObjects;
}

function setInitialSeriesValues(valueObjects: SeriesValueObjects, seriesConfigs: SeriesConfig[], rawValueObjects: SeriesValueObjects, valueKey: PositionOrComputedKey, axisBases: Record<string, number | null>): void {
  for (let seriesConfig of seriesConfigs) {
    const { id, axis } = seriesConfig;
    if (rawValueObjects[id][valueKey] !== null) {
      valueObjects[id][valueKey] = createArrayWithValueIfNotUndefined(rawValueObjects[id][valueKey]!, axisBases[axis!] ?? undefined);
    }
    else {
      valueObjects[id][valueKey] = null;
    }
  }
}

function setAllInitialExtraSeriesValues(seriesValueObjects: SeriesValueObjects, seriesConfigs: SeriesConfig[], seriesDomains: SeriesDomainObjects, rawSeriesValueObjects: SeriesValueObjects, axisBases: Record<string, number | null>): void {
  let valueObject, rawValueObject;
  for (let seriesConfig of seriesConfigs) {
    const { id, axis } = seriesConfig;
    valueObject = seriesValueObjects[id];
    rawValueObject = rawSeriesValueObjects[id];
    setInitialExtraSeriesValues(valueObject, rawValueObject, 'marker', 'markerCopyKey', seriesDomains[id].marker[0] ?? undefined);
    setInitialExtraSeriesValues(valueObject, rawValueObject, 'color', 'colorCopyKey', seriesDomains[id].color[0] ?? undefined);
    setInitialExtraSeriesValues(valueObject, rawValueObject, 'label', 'labelCopyKey', axisBases[axis!] ?? undefined);
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

function getInitialFilteredSeriesValueObjects(seriesStackConfigs: SeriesStackConfig[], initialValueObjects: SeriesValueObjects, seriesFilteredFlags: Record<string, boolean>): SeriesValueObjects {
  let valueObjects = mapMap(initialValueObjects, valueObject => valueObject);
  let seriesIds = Object.keys(initialValueObjects);
  for (let seriesId of seriesIds) {
    if (seriesFilteredFlags[seriesId] === true) {
      valueObjects[seriesId] = nullValueObject;
    }
  }
  setInitialStackAndPriorSeriesValues(seriesStackConfigs, valueObjects);
  setMinMax(valueObjects);
  return valueObjects;
}

function setInitialStackAndPriorSeriesValues(seriesStackConfigs: SeriesStackConfig[], initialFilteredValueObjects: SeriesValueObjects): void {
  for (let seriesStackConfig of seriesStackConfigs) {
    let filteredSeriesFound = false;
    let valueObject: SeriesValueObject, stackValues: NumericValues | null, priorValues: NumericValues | null = null;
    let stackedSeriesConfigs = seriesStackConfig.seriesConfigs!;
    for (let seriesConfig of stackedSeriesConfigs) {
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
  let valueObjects = mapMap(valueHolder.values, () => ({} as SeriesValueObject));
  for (let key of positionOrComputedKeys) {
    setAllSeriesValuesWithChanges(valueObjects, valueHolder.values, key, baseIndices, changedIndices);
  }
  setAllExtraSeriesValuesWithChanges(valueObjects, valueHolder.values, baseIndices, changedIndices);
  setMinMax(valueObjects);
  return valueObjects;
}

function setAllExtraSeriesValuesWithChanges(targetValueObjects: SeriesValueObjects, valueObjects: SeriesValueObjects, baseIndices: number[], changedIndices: number[]): void {
  let seriesIds = Object.keys(valueObjects);
  let targetValueObject, valueObject;
  for (let seriesId of seriesIds) {
    targetValueObject = targetValueObjects[seriesId];
    valueObject = valueObjects[seriesId];
    for (let { extraKey, copyKey } of extraAndCopyKeys) {
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
  let valueObjects = mapMap(filteredValueHolder.values, () => ({} as SeriesValueObject));
  for (let key of positionOrComputedKeys) {
    setAllFilteredSeriesValuesWithChanges(valueObjects, filteredValueHolder.values, valueHolder.values, valueObjectsWithChanges, key, baseIndices, changedIndices);
  }
  setAllFilteredExtraSeriesValuesWithChanges(valueObjects, filteredValueHolder.values, valueHolder.values, valueObjectsWithChanges, baseIndices, changedIndices);
  setMinMax(valueObjects);
  return valueObjects;
}

function setAllFilteredExtraSeriesValuesWithChanges(targetValueObjects: SeriesValueObjects, filteredValueObjects: SeriesValueObjects, rawValueObjects: SeriesValueObjects, valueObjectsWithChanges: SeriesValueObjects, baseIndices: number[], changedIndices: number[]): void {
  let seriesIds = Object.keys(rawValueObjects);
  let targetValueObject, filteredValueObject, rawValueObject, valueObjectWithChanges;
  for (let seriesId of seriesIds) {
    targetValueObject = targetValueObjects[seriesId];
    filteredValueObject = filteredValueObjects[seriesId];
    rawValueObject = rawValueObjects[seriesId];
    valueObjectWithChanges = valueObjectsWithChanges[seriesId];
    for (let { extraKey, copyKey } of extraAndCopyKeys) {
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
  let seriesIds = Object.keys(valueObjects);
  for (let seriesId of seriesIds) {
    targetValueObjects[seriesId][valueKey] = getSeriesValuesWithChanges(valueObjects[seriesId][valueKey], baseIndices, changedIndices);
  }
}

function setAllFilteredSeriesValuesWithChanges(targetValueObjects: SeriesValueObjects, filteredValueObjects: SeriesValueObjects, valueObjects: SeriesValueObjects, valueObjectsWithChanges: SeriesValueObjects, valueKey: PositionOrComputedKey, baseIndices: number[], changedIndices: number[]): void {
  let seriesIds = Object.keys(valueObjects);
  for (let seriesId of seriesIds) {
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
    let changedCount = changedIndices.length;
    let baseCount = baseIndices.length;
    let i;
    let seriesValues: NumericValues = createArrayFilledWithUndefined(baseCount + changedCount);
    for (i = 0; i < baseCount; i++) {
      seriesValues[baseIndices[i]] = values[i];
    }
    return seriesValues;
  }
}

function setAllBaseValuesForChanges(seriesConfigs: SeriesConfig[], startSeriesData: SeriesData, endSeriesData: SeriesData): void {
  for (let seriesConfig of seriesConfigs) {
    const { id, axis } = seriesConfig;
    let axisBase = startSeriesData.axisBases[axis!] ?? undefined;
    let startValueObject = startSeriesData.raw.values[id];
    let endValueObject = endSeriesData.raw.values[id];

    for (let key of positionKeys) {
      setBaseValuesForChanges(startValueObject, endValueObject, key, axisBase);
    }

    let startRawSeriesDomainObject = startSeriesData.raw.domains[id];

    for (let { extraKey, copyKey } of extraAndCopyKeys) {
      setBaseExtraValuesForChanges(startValueObject, endValueObject, extraKey, copyKey, axisBase, startRawSeriesDomainObject, extraKey !== 'label');
    }
    setStackBaseValuesForChanges(startValueObject, endValueObject);

    let startFilteredValueObject = startSeriesData.filtered.values[id];
    let endFilteredValueObject = endSeriesData.filtered.values[id];

    for (let key of positionKeys) {
      if (areValueReferencesDifferent(startFilteredValueObject, endFilteredValueObject, startValueObject, endValueObject, key)) {
        setBaseValuesForChanges(startFilteredValueObject, endFilteredValueObject, key, axisBase);
      }
    }
    for (let { extraKey, copyKey } of extraAndCopyKeys) {
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
  let startValues = startValueObject[valueKey];
  let endValues = endValueObject[valueKey];
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
  let startPriorValues = startValueObject.prior;
  let endStackValues = endValueObject.stack;
  let endPriorValues = endValueObject.prior;

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

function setAllBaseValuesForOuterChanges(_animationConfig: AnimationConfig, seriesConfigs: SeriesConfig[], startSeriesData: SeriesData, endSeriesData: SeriesData, oldSeriesData: SeriesData, newSeriesData: SeriesData, outerCounts: { added: OuterChangeCounts; removed: OuterChangeCounts }): void {
  for (let seriesConfig of seriesConfigs) {
    const { id } = seriesConfig;
    if (seriesConfig.animateBaseFromAdjacent) {
      let startValueObject = startSeriesData.raw.values[id];
      let endValueObject = endSeriesData.raw.values[id];
      let oldValueObject = oldSeriesData.raw.values[id];
      let newValueObject = newSeriesData.raw.values[id];

      for (let key of positionKeys) {
        setBaseValuesForOuterChanges(startValueObject, endValueObject, oldValueObject, newValueObject, key, outerCounts);
      }

      let startFilteredValueObject = startSeriesData.filtered.values[id];
      let endFilteredValueObject = endSeriesData.filtered.values[id];
      let oldFilteredValueObject = oldSeriesData.filtered.values[id];
      let newFilteredValueObject = newSeriesData.filtered.values[id];

      for (let key of positionKeys) {
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
    if (outerCountChanges.before > 0 && sourceValues[0] !== void 0 && !hasUndefinedForRange(changedValues, 0, outerCountChanges.before)) {
      setArrayValuesForRange(targetValues, 0, outerCountChanges.before, sourceValues[0]);
    }
    if (outerCountChanges.after > 0 && sourceValues[sourceValues.length - 1] !== void 0  && !hasUndefinedForRange(changedValues, targetValues.length - outerCountChanges.after, targetValues.length)) {
      setArrayValuesForRange(targetValues, targetValues.length - outerCountChanges.after, targetValues.length, sourceValues[sourceValues.length-1]);
    }
  }
}

function createValueDeltaData(mochartConfig: MochartConfig, startChartData: ChartData, endChartData: ChartData, finalChartData: ChartData, rawSeriesAxisDomains: AxisDomains, filteredSeriesAxisDomains: AxisDomains, rawSeriesDomains: SeriesDomainObjects, ordinalGroupOrderOffets: number[] | null): ValueChangeData {
  let rawSeriesAxisExtents = getDomainExtents(rawSeriesAxisDomains);
  let filteredSeriesAxisExtents = getDomainExtents(filteredSeriesAxisDomains);
  let valueDeltaData = createRawValueDeltaData(mochartConfig, startChartData.seriesData.raw.values,
    endChartData.seriesData.raw.values, rawSeriesAxisExtents, rawSeriesDomains);
  let filteredValueDeltaData = createFilteredValueDeltaData(mochartConfig,
    startChartData.seriesData.filtered.values, endChartData.seriesData.filtered.values,
    startChartData.seriesData.raw.values, endChartData.seriesData.raw.values, valueDeltaData, filteredSeriesAxisExtents, rawSeriesDomains);

  let groupOrderDeltaData = createGroupOrderDeltaData(mochartConfig, startChartData, endChartData, ordinalGroupOrderOffets);

  let deltaPercentage = Math.max(valueDeltaData.deltaPercentage, filteredValueDeltaData.deltaPercentage, groupOrderDeltaData.deltaPercentage);
  setValueDeltaFactors(valueDeltaData, deltaPercentage);
  setValueDeltaFactors(filteredValueDeltaData, deltaPercentage);
  setGroupOrderDeltaFactors(groupOrderDeltaData, deltaPercentage);

  return {
    start: startChartData,
    deltaPercentage,
    deltas: {
      groupOrder: groupOrderDeltaData,
      raw: valueDeltaData,
      filtered: filteredValueDeltaData
    },
    end: endChartData,
    final: finalChartData
  };
}

function createRawValueDeltaData(mochartConfig: MochartConfig, startValueObjects: SeriesValueObjects, endValueObjects: SeriesValueObjects, seriesAxisExtents: AxisExtents, seriesDomains: SeriesDomainObjects): SeriesValueDeltaMap {
  let deltaPercentage = 0;
  let deltas: Record<string, ValueDeltaObject> = {}, deltaObject: ValueDeltaObject;

  let seriesConfigs = mochartConfig.seriesConfigs;
  for (let seriesConfig of seriesConfigs) {
    const { id, axis } = seriesConfig;
    deltaObject = createRawValueDeltaDataObject(startValueObjects[id], endValueObjects[id],
      seriesAxisExtents[axis!]!, seriesDomains[id]!);
    deltaPercentage = Math.max(deltaPercentage, deltaObject.deltaPercentage);
    deltas[id] = deltaObject;
  }

  adjustDeltaPercentagesForStackedGroups(mochartConfig.seriesStackConfigs, deltas);

  return {
    deltaPercentage,
    deltas
  };
}

function adjustDeltaPercentagesForStackedGroups(seriesStackConfigs: SeriesStackConfig[], deltaObjects: Record<string, ValueDeltaObject>): void {
  let maxDeltaPercentage;
  let currentDeltaObject;
  for (let seriesStackConfig of seriesStackConfigs) {
    maxDeltaPercentage = 0;
    let stackedSeriesConfigs = seriesStackConfig.seriesConfigs!;
    for (let seriesConfig of stackedSeriesConfigs) {
      const { id } = seriesConfig;
      maxDeltaPercentage = Math.max(maxDeltaPercentage, deltaObjects[id].stack.deltaPercentage, deltaObjects[id].prior.deltaPercentage);
    };

    if (maxDeltaPercentage !== 0) {
      for (let seriesConfig of stackedSeriesConfigs) {
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

function createRawValueDeltaDataObject(startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, seriesAxisExtent: number, seriesDomain: SeriesDomainObject): ValueDeltaObject {
  let valueDeltaObject = {} as ValueDeltaObject;
  for (let key of positionOrComputedKeys) {
    setRawSeriesValueDeltas(valueDeltaObject, startValueObject, endValueObject, key, seriesAxisExtent);
  }
  for (let { extraKey, copyKey } of extraAndCopyKeys) {
    setRawExtraSeriesValueDeltas(valueDeltaObject, startValueObject, endValueObject, extraKey, copyKey, seriesAxisExtent, seriesDomain, extraKey !== 'label');
  }
  valueDeltaObject.deltaPercentage = getMaxDeltaPercentage(valueDeltaObject);
  return valueDeltaObject;
}

function setRawExtraSeriesValueDeltas(valueDeltaObject: ValueDeltaObject, startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, valueKey: ExtraKey, valueCopyKey: ExtraCopyKey, seriesAxisExtent: number, seriesDomain: SeriesDomainObject, useSeriesDomain: boolean): void {
  if (startValueObject[valueCopyKey] === null) {
    let domainExtent = seriesAxisExtent;
    if (useSeriesDomain) {
      domainExtent = getSafeDomainExtent(seriesDomain[valueKey]);
    }
    setRawSeriesValueDeltas(valueDeltaObject, startValueObject, endValueObject, valueKey, domainExtent);
  }
  else {
    valueDeltaObject[valueKey] = emptyValueDelta;
  }
}

function setRawSeriesValueDeltas(valueDeltaObject: ValueDeltaObject, startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, valueKey: ValueKey, seriesAxisExtent: number): void {
  if (startValueObject[valueKey] !== null) {
    valueDeltaObject[valueKey] = getSeriesValuesDeltas(startValueObject[valueKey]!, endValueObject[valueKey]!, seriesAxisExtent);
  }
  else {
    valueDeltaObject[valueKey] = emptyValueDelta;
  }
}

function getSeriesValuesDeltas(startValues: NumericValues, endValues: NumericValues, seriesAxisExtent: number): NumericValuesDelta {
  let deltas = getArrayDeltas(startValues as number[], endValues);
  let deltaPercentage = seriesAxisExtent > 0 ? getMaxAbsoluteValue(deltas) / seriesAxisExtent : 0;
  return deltaPercentage === 0 ? emptyValueDelta : {
    deltaPercentage,
    deltas
  };
}

function getMaxDeltaPercentage(valueDeltaObject: ValueDeltaObject): number {
  return Math.max(valueDeltaObject.plain.deltaPercentage, valueDeltaObject.range.deltaPercentage,
    valueDeltaObject.stack.deltaPercentage, valueDeltaObject.marker.deltaPercentage,
    valueDeltaObject.color.deltaPercentage, valueDeltaObject.label.deltaPercentage);
}

function getAllDeltaCopied(valueDeltaObject: ValueDeltaObject): boolean {
  return valueDeltaObject.plain.deltaCopied === true && valueDeltaObject.range.deltaCopied === true &&
    valueDeltaObject.stack.deltaCopied === true;
}

function createFilteredValueDeltaData(mochartConfig: MochartConfig, startFilteredValueObjects: SeriesValueObjects, endFilteredValueObjects: SeriesValueObjects, startValueObjects: SeriesValueObjects, endValueObjects: SeriesValueObjects, valueDeltaData: SeriesValueDeltaMap, seriesAxisExtents: AxisExtents, seriesDomains: SeriesDomainObjects): SeriesValueDeltaMap {
  let deltaPercentage = 0;
  let deltaCopied = true;
  let deltas: Record<string, ValueDeltaObject> = {};
  let deltaObject: ValueDeltaObject;

  let seriesConfigs = mochartConfig.seriesConfigs;
  for (let seriesConfig of seriesConfigs) {
    const { id, axis } = seriesConfig;
    deltaObject = createFilteredValueDeltaDataObject(
      startFilteredValueObjects[id], endFilteredValueObjects[id],
      startValueObjects[id], endValueObjects[id], valueDeltaData.deltas[id] as ValueDeltaObject, seriesAxisExtents[axis!]!, seriesDomains[id]!);
    deltaPercentage = Math.max(deltaPercentage, deltaObject.deltaPercentage);
    if (deltaObject.deltaCopied === false) {
      deltaCopied = false;
    }
    deltas[id] = (deltaObject);
  };

  adjustDeltaPercentagesForStackedGroups(mochartConfig.seriesStackConfigs, deltas);

  return {
    deltaPercentage,
    deltaCopied,
    deltas
  };
}

function createFilteredValueDeltaDataObject(startFilteredValueObject: SeriesValueObject, endFilteredValueObject: SeriesValueObject, startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, rawValueDeltaObject: ValueDeltaObject, seriesAxisExtent: number, seriesDomain: SeriesDomainObject): ValueDeltaObject {
  let valueDeltaObject = {} as ValueDeltaObject;
  for (let key of positionOrComputedKeys) {
    setFilteredSeriesValueDeltas(valueDeltaObject, startFilteredValueObject, endFilteredValueObject, startValueObject, endValueObject, rawValueDeltaObject, key, seriesAxisExtent);
  }
  for (let { extraKey, copyKey } of extraAndCopyKeys) {
    setFilteredExtraSeriesValueDeltas(valueDeltaObject, startFilteredValueObject, endFilteredValueObject, startValueObject, endValueObject, rawValueDeltaObject, extraKey, copyKey, seriesAxisExtent, seriesDomain, extraKey !== 'label');
  }
  valueDeltaObject.deltaPercentage = getMaxDeltaPercentage(valueDeltaObject);
  valueDeltaObject.deltaCopied = getAllDeltaCopied(valueDeltaObject);
  return valueDeltaObject;
}

function setFilteredExtraSeriesValueDeltas(valueDeltaObject: ValueDeltaObject, startFilteredValueObject: SeriesValueObject, endFilteredValueObject: SeriesValueObject, startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, rawValueDeltaObject: ValueDeltaObject, valueKey: ExtraKey, valueCopyKey: ExtraCopyKey, seriesAxisExtent: number, seriesDomain: SeriesDomainObject, useSeriesDomain: boolean): void {
  if (startFilteredValueObject[valueCopyKey] !== null) {
    valueDeltaObject[valueKey] = emptyCopiedValueDelta;
  }
  else {
    let domainExtent = seriesAxisExtent;
    if (useSeriesDomain) {
      domainExtent = getSafeDomainExtent(seriesDomain[valueKey]);
    }
    setFilteredSeriesValueDeltas(valueDeltaObject, startFilteredValueObject, endFilteredValueObject, startValueObject, endValueObject, rawValueDeltaObject, valueKey, domainExtent);
  }
}

function setFilteredSeriesValueDeltas(valueDeltaObject: ValueDeltaObject, startFilteredValueObject: SeriesValueObject, endFilteredValueObject: SeriesValueObject, startValueObject: SeriesValueObject, endValueObject: SeriesValueObject, rawValueDeltaObject: ValueDeltaObject, valueKey: ValueKey, seriesAxisExtent: number): void {
  let filteredIsNotCopy = areValueReferencesDifferent(startFilteredValueObject, endFilteredValueObject, startValueObject, endValueObject, valueKey);
  if (startFilteredValueObject[valueKey] !== null && filteredIsNotCopy) {
    valueDeltaObject[valueKey] = getSeriesValuesDeltas(startFilteredValueObject[valueKey]!, endFilteredValueObject[valueKey]!, seriesAxisExtent);
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
  let deltas = valueDeltaObject.deltas;
  let seriesIds = Object.keys(deltas);
  for (let seriesId of seriesIds) {
    setValueDeltaFactorForObject(deltas[seriesId], deltaPercentage);
  }
}

function setValueDeltaFactorForObject(valueDeltaDataObject: SeriesValueDelta, deltaPercentage: number): void {
  for (let key of positionOrComputedOrExtraKeys) {
    setValueDeltaFactorForValues(valueDeltaDataObject, key, deltaPercentage);
  }
}

function setValueDeltaFactorForValues(valueDeltaDataObject: SeriesValueDelta, valueKey: ValueKey, deltaPercentage: number): void {
  const valuesDelta = valueDeltaDataObject[valueKey] as NumericValuesDelta;
  let valuesDeltaPercentage = valuesDelta.deltaPercentage;
  if (valuesDeltaPercentage === 0) {
    valuesDelta.deltaFactor = 0;
  }
  else {
    valuesDelta.deltaFactor = deltaPercentage / valuesDeltaPercentage;
  }
}
