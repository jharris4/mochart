import { nullDomain, getDomainForValues, mergeDomain } from './DomainData';
import { getAxisDomain } from './AxisDomainData';
import { NONE } from '../config/core/constants';

import { keyPlain, valueKeys, positionKeys, extraKeys, extraCopyKeys, positionOrComputedOrExtraKeys } from './constants';

import { createArrayFilledWithZero, arrayToMap, mapMap, idAccessor } from '../utils/utils';
import type { DataProvider, GroupData, GroupValue, NullableDomain, NumericValues, SeriesData, SeriesDataSet, SeriesDomainObject, SeriesDomainObjects, SeriesValueObject, SeriesValueObjects } from '../types/data';
import type { MochartConfig, SeriesAxisConfig, SeriesConfig, SeriesGroupConfig, SeriesStackConfig } from '../types/config';
import type { ExtraCopyKey, ExtraKey, PositionKey, ValueKey } from './constants';

type SeriesContainerConfig = SeriesAxisConfig | SeriesStackConfig | SeriesGroupConfig;
type SeriesBundle = { data: SeriesDataSet };

export function getSeriesData(mochartConfig: MochartConfig, dataProvider: DataProvider, filteredSeriesMap: Record<string, unknown>, groupData: GroupData): SeriesData {
  const rawGroupValues = groupData.values.raw;

  const { seriesConfigs, seriesGroupConfigs, seriesStackConfigs, seriesAxisConfigs } = mochartConfig;

  const rawSeriesBundle = getRawSeriesBundle(seriesAxisConfigs, seriesConfigs, seriesStackConfigs, rawGroupValues, dataProvider);
  const seriesFilteredFlags = getSeriesFilteredFlags(seriesConfigs, filteredSeriesMap);
  const filteredSeriesBundle = getFilteredSeriesBundle(seriesAxisConfigs, seriesConfigs, seriesStackConfigs, rawGroupValues, rawSeriesBundle, seriesFilteredFlags);

  const axisBases = getSeriesAxisBases(seriesAxisConfigs, rawSeriesBundle.data.axisDomains, filteredSeriesBundle.data.axisDomains);
  const axisSeriesCounts = getSeriesContainerFilteredSeriesCounts(seriesAxisConfigs, seriesFilteredFlags);
  const stackSeriesCounts = getSeriesContainerFilteredSeriesCounts(seriesStackConfigs, seriesFilteredFlags);
  const groupSeriesCounts = getSeriesContainerFilteredSeriesCounts(seriesGroupConfigs, seriesFilteredFlags);

  return {
    axisBases,
    axisSeriesCounts,
    stackSeriesCounts,
    groupSeriesCounts,
    raw: rawSeriesBundle.data,
    filteredFlags: seriesFilteredFlags,
    filtered: filteredSeriesBundle.data
  };
}

export function getSeriesDataWithAxisDomains(seriesData: SeriesData, rawAxisDomains: SeriesDataSet['axisDomains'], filteredDomains: SeriesDataSet['axisDomains']): SeriesData {
  const raw = Object.assign({}, seriesData.raw, { axisDomains: rawAxisDomains });
  const filtered = Object.assign({}, seriesData.filtered, { axisDomains: filteredDomains });
  return Object.assign({}, seriesData, { raw, filtered });
}

export function getSeriesDataWithAxisBases(seriesData: SeriesData, seriesAxisBases: SeriesData['axisBases']): SeriesData {
  return Object.assign({}, seriesData, { axisBases: seriesAxisBases });
}

export function getSeriesDataWithSeriesCounts(seriesData: SeriesData, seriesAxisSeriesCounts: Record<string, number>, seriesStackSeriesCounts: Record<string, number>, seriesGroupSeriesCounts: Record<string, number>): SeriesData {
  return Object.assign({}, seriesData, {
    axisSeriesCounts: seriesAxisSeriesCounts, stackSeriesCounts: seriesStackSeriesCounts, groupSeriesCounts: seriesGroupSeriesCounts
  });
}

export function getSeriesDataWithFilteredFlags(seriesData: SeriesData, filteredFlags: Record<string, boolean>): SeriesData {
  return Object.assign({}, seriesData, { filteredFlags });
}

export function getSeriesDataWithSeriesValues(seriesData: SeriesData, values: SeriesValueObjects, filteredValues: SeriesValueObjects): SeriesData;
export function getSeriesDataWithSeriesValues(seriesData: SeriesData, values: Record<string, Partial<SeriesValueObject>>, filteredValues: Record<string, Partial<SeriesValueObject>>): SeriesData;
export function getSeriesDataWithSeriesValues(seriesData: SeriesData, values: Record<string, Partial<SeriesValueObject>>, filteredValues: Record<string, Partial<SeriesValueObject>>): SeriesData {
  const raw = Object.assign({}, seriesData.raw, { values: values as SeriesValueObjects });
  const filtered = Object.assign({}, seriesData.filtered, { values: filteredValues as SeriesValueObjects });
  return Object.assign({}, seriesData, { raw, filtered });
}

export function getSeriesDataWithDomains(seriesData: SeriesData, domains: SeriesDomainObjects, filteredDomains: SeriesDomainObjects): SeriesData {
  const raw = Object.assign({}, seriesData.raw, { domains: domains });
  const filtered = Object.assign({}, seriesData.filtered, { domains: filteredDomains });
  return Object.assign({}, seriesData, { raw, filtered });
}

/**
 *
 * series data functions
 *
 **/
function getRawSeriesBundle(seriesAxisConfigs: SeriesAxisConfig[], seriesConfigs: SeriesConfig[], seriesStackConfigs: SeriesStackConfig[], rawGroupValues: readonly GroupValue[], dataProvider: DataProvider): SeriesBundle {
  const valueObjects = createEmptySeriesValueObjects(seriesConfigs);
  setPlainSeriesValues(seriesConfigs, rawGroupValues, dataProvider, valueObjects);
  setRangeSeriesValues(seriesConfigs, rawGroupValues, dataProvider, valueObjects);
  setErrorSeriesValues(seriesConfigs, rawGroupValues, dataProvider, valueObjects);
  setStackSeriesValues(seriesConfigs, seriesStackConfigs, rawGroupValues, valueObjects);
  setExtraSeriesValues(seriesConfigs, rawGroupValues, dataProvider, valueObjects);
  setMinMax(valueObjects);
  const domainObjects = getSeriesDomainObjects(valueObjects);
  const axisDomains = getSeriesAxisDomains(seriesAxisConfigs, domainObjects);
  return {
    data: {
      axisDomains,
      domains: domainObjects,
      values: valueObjects
    }
  };
}

function getFilteredSeriesBundle(seriesAxisConfigs: SeriesAxisConfig[], seriesConfigs: SeriesConfig[], seriesStackConfigs: SeriesStackConfig[], rawGroupValues: readonly GroupValue[], rawSeriesValuesBundle: SeriesBundle, seriesFilteredFlags: Record<string, boolean>): SeriesBundle {
  const valueObjects = createEmptySeriesValueObjects(seriesConfigs);
  for (const key of positionKeys) {
    setFilteredSeriesValues(valueObjects, rawSeriesValuesBundle.data.values, key, seriesFilteredFlags);
  }
  setFilteredStackSeriesValues(seriesConfigs, seriesStackConfigs, rawGroupValues, valueObjects, rawSeriesValuesBundle.data.values);
  setFilteredExtraSeriesValues(rawSeriesValuesBundle.data.values, valueObjects, seriesFilteredFlags);
  setMinMax(valueObjects);
  const domainObjects = getSeriesDomainObjects(valueObjects);
  const axisDomains = getSeriesAxisDomains(seriesAxisConfigs, domainObjects);
  return {
    data: {
      axisDomains,
      domains: domainObjects,
      values: valueObjects
    }
  };
}

function createEmptySeriesValueObjects(seriesConfigs: SeriesConfig[]): SeriesValueObjects {
  return arrayToMap(seriesConfigs, idAccessor, () => ({
    plain: null, range: null, errorLow: null, errorHigh: null, stack: null, prior: null, marker: null, label: null, color: null, tooltip: null,
    markerCopyKey: null, labelCopyKey: null, colorCopyKey: null, tooltipCopyKey: null, min: null, max: null
  }));
}

function getSeriesValuesForProperty(seriesProperty: string, rawGroupValues: readonly GroupValue[], dataProvider: DataProvider): NumericValues {
  const seriesValues: NumericValues = [];
  const groupCount = rawGroupValues.length;
  for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
    seriesValues.push(dataProvider.getSeriesValue(rawGroupValues[groupIndex], groupIndex, seriesProperty) as number | undefined);
  }
  return seriesValues;
}

function setPlainSeriesValues(seriesConfigs: SeriesConfig[], rawGroupValues: readonly GroupValue[], dataProvider: DataProvider, valueObjects: SeriesValueObjects): void {
  for (const seriesConfig of seriesConfigs) {
    valueObjects[seriesConfig.id].plain = getSeriesValuesForProperty(seriesConfig.property!, rawGroupValues, dataProvider);
  }
}

function setRangeSeriesValues(seriesConfigs: SeriesConfig[], rawGroupValues: readonly GroupValue[], dataProvider: DataProvider, valueObjects: SeriesValueObjects): void {
  for (const seriesConfig of seriesConfigs) {
    if (seriesConfig.rangeProperty !== NONE) {
      valueObjects[seriesConfig.id].range = getSeriesValuesForProperty(seriesConfig.rangeProperty, rawGroupValues, dataProvider);
    }
    else {
      valueObjects[seriesConfig.id].range = null;
    }
  }
}

function setErrorSeriesValues(seriesConfigs: SeriesConfig[], rawGroupValues: readonly GroupValue[], dataProvider: DataProvider, valueObjects: SeriesValueObjects): void {
  for (const seriesConfig of seriesConfigs) {
    valueObjects[seriesConfig.id].errorLow = seriesConfig.errorLowProperty !== NONE ?
      getSeriesValuesForProperty(seriesConfig.errorLowProperty, rawGroupValues, dataProvider) : null;
    valueObjects[seriesConfig.id].errorHigh = seriesConfig.errorHighProperty !== NONE ?
      getSeriesValuesForProperty(seriesConfig.errorHighProperty, rawGroupValues, dataProvider) : null;
  }
}

function setExtraSeriesValues(seriesConfigs: SeriesConfig[], rawGroupValues: readonly GroupValue[], dataProvider: DataProvider, valueObjects: SeriesValueObjects): void {
  let valueObject: SeriesValueObject;
  for (const seriesConfig of seriesConfigs) {
    valueObject = valueObjects[seriesConfig.id];
    const existingProperties: Record<string, ValueKey> = {};
    existingProperties[seriesConfig.property!] = 'plain';
    if (seriesConfig.rangeProperty !== NONE) {
      existingProperties[seriesConfig.rangeProperty] = 'range';
    }
    if (seriesConfig.errorLowProperty !== NONE) {
      existingProperties[seriesConfig.errorLowProperty] = 'errorLow';
    }
    if (seriesConfig.errorHighProperty !== NONE) {
      existingProperties[seriesConfig.errorHighProperty] = 'errorHigh';
    }
    setExtraProperty(seriesConfig.markerProperty !== NONE, seriesConfig.markerProperty, 'marker', 'markerCopyKey',
      valueObject, existingProperties, rawGroupValues, dataProvider);
    setExtraProperty(seriesConfig.colorProperty !== NONE, seriesConfig.colorProperty, 'color', 'colorCopyKey',
      valueObject, existingProperties, rawGroupValues, dataProvider);
    setExtraProperty(seriesConfig.labelProperty !== NONE, seriesConfig.labelProperty, 'label', 'labelCopyKey',
      valueObject, existingProperties, rawGroupValues, dataProvider);
    setExtraProperty(seriesConfig.tooltipProperty !== NONE, seriesConfig.tooltipProperty, 'tooltip', 'tooltipCopyKey',
      valueObject, existingProperties, rawGroupValues, dataProvider);
  }
}

function setExtraProperty(hasProperty: boolean, property: string | null, valueKey: ExtraKey, valueCopyKey: ExtraCopyKey, valueObject: SeriesValueObject, existingProperties: Record<string, ValueKey>, rawGroupValues: readonly GroupValue[], dataProvider: DataProvider): void {
  if (hasProperty) {
    const definedProperty = property!;
    const existingProperty = existingProperties[definedProperty];
    if (existingProperty) {
      valueObject[valueKey] = valueObject[existingProperty];
      valueObject[valueCopyKey] = existingProperty;
    }
    else {
      valueObject[valueKey] = getSeriesValuesForProperty(definedProperty, rawGroupValues, dataProvider);
      valueObject[valueCopyKey] = null;
      existingProperties[definedProperty] = valueKey;
    }
  }
  else {
    valueObject[valueKey] = null;
    valueObject[valueCopyKey] = null;
  }
}

function setFilteredExtraSeriesValues(rawValueObjects: SeriesValueObjects, valueObjects: SeriesValueObjects, seriesFilteredFlags: Record<string, boolean>): void {
  const seriesIds = Object.keys(rawValueObjects);

  let rawValueObject, valueObject;
  for (const seriesId of seriesIds) {
    rawValueObject = rawValueObjects[seriesId];
    valueObject = valueObjects[seriesId];
    if (seriesFilteredFlags[seriesId] === true) {
      for (const extraKey of extraKeys) {
        valueObject[extraKey] = null;
      }
    }
    else {
      for (const extraKey of extraKeys) {
        valueObject[extraKey] = rawValueObject[extraKey];
      }
    }
    for (const extraCopyKey of extraCopyKeys) {
      valueObject[extraCopyKey] = rawValueObject[extraCopyKey];
    }
  }
}

function setStackSeriesValues(seriesConfigs: SeriesConfig[], seriesStackConfigs: SeriesStackConfig[], rawGroupValues: readonly GroupValue[], valueObjects: SeriesValueObjects): void {
  let valueObject: SeriesValueObject;
  for (const seriesConfig of seriesConfigs) {
    valueObject = valueObjects[seriesConfig.id];
    valueObject.stack = null;
    valueObject.prior = null;
  }
  for (const seriesStackConfig of seriesStackConfigs) {
    const groupCount = rawGroupValues.length;
    const positiveStackValues = createArrayFilledWithZero(groupCount);
    const negativeStackValues = createArrayFilledWithZero(groupCount);
    const stackSeriesConfigs = seriesStackConfig.seriesConfigs!;
    for (const seriesConfig of stackSeriesConfigs) {
      const values = valueObjects[seriesConfig.id][keyPlain]!;
      setStackSingleSeriesValues(valueObjects[seriesConfig.id], positiveStackValues, negativeStackValues, values);
    }
  }
}

function setStackSingleSeriesValues(valueObject: SeriesValueObject, positiveStackValues: number[], negativeStackValues: number[], values: NumericValues): void {
  const count = values.length;
  let priorValues: NumericValues = [];
  const stackValues: NumericValues = [];
  let value: number | undefined, tempValue: number | undefined;
  for (let i=0; i<count; i++) {
    value = values[i];
    if (value === undefined) {
      priorValues.push(positiveStackValues[i]);
      stackValues.push(undefined);
    }
    else if (value >= 0) {
      tempValue = positiveStackValues[i];
      priorValues.push(tempValue);
      positiveStackValues[i] = tempValue = tempValue + value;
      stackValues.push(tempValue);
    }
    else {
      tempValue = negativeStackValues[i];
      priorValues.push(tempValue);
      negativeStackValues[i] = tempValue = tempValue + value;
      stackValues.push(tempValue);
    }
  }
  if (tempValue === undefined) { // no values were stacked, so don't set the prior values
    priorValues = stackValues;
  }
  valueObject.stack = stackValues;
  valueObject.prior = priorValues;
}

function getStackPriorValues(positiveStackValues: number[], negativeStackValues: number[], values: NumericValues): NumericValues {
  const priorValues: NumericValues = [];
  let value: number | undefined;
  const count = values.length;
  for (let i = 0; i < count; i++) {
    value = values[i];
    if (value === undefined || value >= 0) {
      priorValues.push(positiveStackValues[i]);
    }
    else {
      priorValues.push(negativeStackValues[i]);
    }
  }
  return priorValues;
}

function incrementStackValues(positiveStackValues: number[], negativeStackValues: number[], values: NumericValues): void {
  const count = values.length;
  for (let i=0; i<count; i++) {
    const value = values[i];
    if (value !== undefined) {
      if (value > 0) {
        positiveStackValues[i]+= value;
      }
      else if (value < 0) {
        negativeStackValues[i]+= value;
      }
    }
  }
}

function setFilteredStackSeriesValues(seriesConfigs: SeriesConfig[], seriesStackConfigs: SeriesStackConfig[], rawGroupValues: readonly GroupValue[], filteredValueObjects: SeriesValueObjects, rawValueObjects: SeriesValueObjects): void {
  let filteredValueObject: SeriesValueObject;
  for (const seriesConfig of seriesConfigs) {
    filteredValueObject = filteredValueObjects[seriesConfig.id];
    filteredValueObject.stack = null;
    filteredValueObject.prior = null;
  }
  for (const seriesStackConfig of seriesStackConfigs) {
    let filteredSeriesFound = false;
    const groupCount = rawGroupValues.length;
    const positiveStackValues = createArrayFilledWithZero(groupCount);
    const negativeStackValues = createArrayFilledWithZero(groupCount);
    const stackSeriesConfigs = seriesStackConfig.seriesConfigs!;
    let rawValueObject: SeriesValueObject;
    for (const seriesConfig of stackSeriesConfigs) {
      filteredValueObject = filteredValueObjects[seriesConfig.id];
      const values = filteredValueObject[keyPlain];
      if (values !== null) {
        if (filteredSeriesFound) {
          setStackSingleSeriesValues(filteredValueObject, positiveStackValues, negativeStackValues, values);
        }
        else {
          incrementStackValues(positiveStackValues, negativeStackValues, values);
          rawValueObject = rawValueObjects[seriesConfig.id];
          filteredValueObject.stack = rawValueObject.stack;
          filteredValueObject.prior = rawValueObject.prior;
        }
      }
      else {
        filteredSeriesFound = true;
        rawValueObject = rawValueObjects[seriesConfig.id];
        filteredValueObject.prior = getStackPriorValues(positiveStackValues, negativeStackValues, rawValueObject[keyPlain]!);
      }
    }
  }
}

export function setMinMax(valueObjects: Record<string, Partial<SeriesValueObject>>): void {
  const seriesIds = Object.keys(valueObjects);
  let valueObject;
  for (const seriesId of seriesIds) {
    valueObject = valueObjects[seriesId];
    if (valueObject.stack !== null) {
      valueObject.max = valueObject.stack;
      valueObject.min = valueObject.prior;
    }
    else {
      valueObject.max = valueObject.plain;
      valueObject.min = valueObject.range;
    }
  }
}

function getSeriesDomainObjects(seriesValueObjects: SeriesValueObjects): SeriesDomainObjects {
  const seriesDomainObjects: SeriesDomainObjects = {};

  const seriesIds = Object.keys(seriesValueObjects);
  for (const seriesId of seriesIds) {
    seriesDomainObjects[seriesId] = getSeriesDomainObject(seriesValueObjects[seriesId]);
  }
  return seriesDomainObjects;
}

function getSeriesDomainObject(seriesValueObject: SeriesValueObject): SeriesDomainObject {
  const seriesDomainObject: SeriesDomainObject = {};
  for (const key of positionOrComputedOrExtraKeys) {
    setSeriesDomain(seriesDomainObject, seriesValueObject, key);
  }
  let domain = nullDomain;
  if (seriesValueObject.plain !== null) {
    if (seriesValueObject.stack !== null) {
      domain = mergeDomain(seriesDomainObject.stack, seriesDomainObject.prior);
    }
    else {
      domain = seriesValueObject.range !== null ? mergeDomain(seriesDomainObject.plain, seriesDomainObject.range) : seriesDomainObject.plain;
      // error bounds join the domain so whiskers never clip (stacked series can't configure them)
      if (seriesValueObject.errorLow !== null) {
        domain = mergeDomain(domain, seriesDomainObject.errorLow);
      }
      if (seriesValueObject.errorHigh !== null) {
        domain = mergeDomain(domain, seriesDomainObject.errorHigh);
      }
    }
  }
  seriesDomainObject.domain = domain;
  return seriesDomainObject;
}

function setSeriesDomain(seriesDomainObject: SeriesDomainObject, seriesValuesObject: SeriesValueObject, valueKey: ValueKey): void {
  if (seriesValuesObject[valueKey] !== null) {
    seriesDomainObject[valueKey] = getDomainForValues(seriesValuesObject[valueKey]);
  }
  else {
    seriesDomainObject[valueKey] = nullDomain;
  }
}

function getSeriesFilteredFlags(seriesConfigs: SeriesConfig[], filteredSeriesMap: Record<string, unknown>): Record<string, boolean> {
  const seriesFilteredFlags: Record<string, boolean> = {};
  for (const seriesConfig of seriesConfigs) {
    seriesFilteredFlags[seriesConfig.id] = filteredSeriesMap[seriesConfig.id] !== undefined;
  }
  return seriesFilteredFlags;
}

function setFilteredSeriesValues(valueObjects: SeriesValueObjects, rawValueObjects: SeriesValueObjects, valueKey: PositionKey, seriesFilteredFlags: Record<string, boolean>): void {
  const seriesIds = Object.keys(valueObjects);
  for (const seriesId of seriesIds) {
    if (seriesFilteredFlags[seriesId] === true) {
      valueObjects[seriesId][valueKey] = null;
    }
    else {
      valueObjects[seriesId][valueKey] = rawValueObjects[seriesId][valueKey];
    }
  }
}

function getSeriesAxisDomains(seriesAxisConfigs: SeriesAxisConfig[], seriesDomainObjects: SeriesDomainObjects): Record<string, NullableDomain> {
  return arrayToMap(seriesAxisConfigs, idAccessor,
                    seriesAxisConfig => getSeriesAxisDomain(seriesAxisConfig, seriesDomainObjects));
}

function getSeriesAxisDomain(seriesAxisConfig: SeriesAxisConfig, seriesDomainObjects: SeriesDomainObjects): NullableDomain {
  return getAxisDomain(seriesAxisConfig, () => calculateSeriesAxisDomain(seriesAxisConfig, seriesDomainObjects)) as NullableDomain;
}

function calculateSeriesAxisDomain(seriesAxisConfig: SeriesAxisConfig, seriesDomainObjects: SeriesDomainObjects): NullableDomain {
  const axisDomain: NullableDomain = [null, null];
  const seriesConfigs = seriesAxisConfig.seriesConfigs!;
  for (const seriesConfig of seriesConfigs) {
    const seriesDomain = seriesDomainObjects[seriesConfig.id].domain;
    if (seriesDomain[0] !== null && (axisDomain[0] === null || seriesDomain[0] < axisDomain[0])) {
      axisDomain[0] = seriesDomain[0];
    }
    if (seriesDomain[1] !== null && (axisDomain[1] === null || seriesDomain[1] > axisDomain[1])) {
      axisDomain[1] = seriesDomain[1];
    }
  }
  return axisDomain;
}

export function getSeriesAxisBases(seriesAxisConfigs: SeriesAxisConfig[], rawSeriesAxisDomains: Record<string, NullableDomain>, filteredSeriesAxisDomains: Record<string, NullableDomain>): Record<string, number | null> {
  return arrayToMap(seriesAxisConfigs, idAccessor,
    seriesAxisConfig =>
      seriesAxisConfig.base !== NONE ? seriesAxisConfig.base :
        seriesAxisConfig.adjustForFiltering ? filteredSeriesAxisDomains[seriesAxisConfig.id][0] : rawSeriesAxisDomains[seriesAxisConfig.id][0])
}

export function getSeriesContainerFilteredSeriesCounts(seriesContainerConfigs: SeriesContainerConfig[], filteredSeriesFlags: Record<string, boolean>): Record<string, number> {
  return arrayToMap(seriesContainerConfigs, idAccessor, seriesContainerConfig =>
    getSeriesContainerFilteredSeriesCount(seriesContainerConfig, filteredSeriesFlags))
}

function getSeriesContainerFilteredSeriesCount(seriesContainerConfig: SeriesContainerConfig, filteredSeriesFlags: Record<string, boolean>): number {
  let seriesCount = 0;
  const seriesConfigs = seriesContainerConfig.seriesConfigs!;
  for (const seriesConfig of seriesConfigs) {
    if (filteredSeriesFlags[seriesConfig.id] === false) {
      seriesCount++;
    }
  }
  return seriesCount;
}

function getGroupSeriesValueObject(seriesValueObject: SeriesValueObject, groupIndex: number): Partial<Record<ValueKey, number | null | undefined>> {
  const groupSeriesValueObject: Partial<Record<ValueKey, number | null | undefined>> = {};
  let keyValues: NumericValues | null;
  for (const key of valueKeys) {
    keyValues = seriesValueObject[key];
    if (keyValues !== undefined) {
      if (keyValues === null) {
        groupSeriesValueObject[key] = null;
      }
      else {
        groupSeriesValueObject[key] = keyValues[groupIndex];
      }
    }
  }
  return groupSeriesValueObject;
}

export function getSeriesValueObjects(seriesData: SeriesData, groupIndex: number) {
  const { axisBases, axisSeriesCounts, stackSeriesCounts, groupSeriesCounts, filteredFlags, raw, filtered } = seriesData;

  return {
    axisBases,
    axisSeriesCounts,
    stackSeriesCounts,
    groupSeriesCounts,
    filteredFlags,
    raw:  {
      axisDomains: raw.axisDomains,
      domains: raw.domains,
      values: mapMap(raw.values, seriesValueObject => getGroupSeriesValueObject(seriesValueObject, groupIndex))
    },
    filtered: {
      axisDomains: filtered.axisDomains,
      domains: filtered.domains,
      values: mapMap(filtered.values, seriesValueObject => getGroupSeriesValueObject(seriesValueObject, groupIndex))
    }
  }
}
