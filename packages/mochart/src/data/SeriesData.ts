import { nullDomain, getDomainForValues, mergeDomain } from './DomainData';
import { getAxisDomain, getRenderAxisDomain } from './AxisDomainData';
import { NONE } from '../config/core/constants';

import { keyPlain, valueKeys, positionKeys, extraKeys, extraCopyKeys, positionOrComputedOrExtraKeys } from './constants';

import { createArrayFilledWithZero, arrayToMap, mapMap, idAccessor } from '../utils/utils';
import type { DataProvider, CategoryData, CategoryValue, NullableDomain, NumericValues, SeriesData, SeriesDataSet, SeriesDomainObject, SeriesDomainObjects, SeriesValueObject, SeriesValueObjects } from '../types/data';
import type { EnhancedMochartConfig, EnhancedSeriesConfig, EnhancedSeriesGroupConfig, EnhancedSeriesStackConfig, EnhancedValueAxisConfig } from '../types/enhanced';
import type { ExtraCopyKey, ExtraKey, PositionKey, ValueKey } from './constants';

type SeriesContainerConfig = EnhancedValueAxisConfig | EnhancedSeriesStackConfig | EnhancedSeriesGroupConfig;
type SeriesBundle = { data: SeriesDataSet };

export function getSeriesData(mochartConfig: EnhancedMochartConfig, dataProvider: DataProvider, filteredSeriesMap: Record<string, unknown>, categoryData: CategoryData): SeriesData {
  const rawCategoryValues = categoryData.values.raw;

  const { series: seriesConfigs, seriesStacks: seriesStackConfigs, valueAxes: valueAxisConfigs } = mochartConfig;

  const rawSeriesBundle = getRawSeriesBundle(valueAxisConfigs, seriesConfigs, seriesStackConfigs, rawCategoryValues, dataProvider);
  const seriesFilteredFlags = getSeriesFilteredFlags(seriesConfigs, filteredSeriesMap);
  const filteredSeriesBundle = getFilteredSeriesBundle(valueAxisConfigs, seriesConfigs, seriesStackConfigs, rawCategoryValues, rawSeriesBundle, seriesFilteredFlags);

  // bases derive from the render domains: a semantic (collapsed) min would draw zero-height bars
  const axisBases = getValueAxisBases(valueAxisConfigs, rawSeriesBundle.data.renderAxisDomains, filteredSeriesBundle.data.renderAxisDomains);
  const axisSeriesCounts = getSeriesContainerVisibleSeriesCounts(valueAxisConfigs, seriesFilteredFlags);

  return {
    axisBases,
    axisSeriesCounts,
    raw: rawSeriesBundle.data,
    filteredFlags: seriesFilteredFlags,
    filtered: filteredSeriesBundle.data
  };
}

export function getSeriesDataWithRenderAxisDomains(seriesData: SeriesData, rawRenderAxisDomains: SeriesDataSet['renderAxisDomains'], filteredRenderAxisDomains: SeriesDataSet['renderAxisDomains']): SeriesData {
  const raw = Object.assign({}, seriesData.raw, { renderAxisDomains: rawRenderAxisDomains });
  const filtered = Object.assign({}, seriesData.filtered, { renderAxisDomains: filteredRenderAxisDomains });
  return Object.assign({}, seriesData, { raw, filtered });
}

export function getSeriesDataWithAxisBases(seriesData: SeriesData, valueAxisBases: SeriesData['axisBases']): SeriesData {
  return Object.assign({}, seriesData, { axisBases: valueAxisBases });
}

export function getSeriesDataWithSeriesCounts(seriesData: SeriesData, valueAxisSeriesCounts: Record<string, number>): SeriesData {
  return Object.assign({}, seriesData, { axisSeriesCounts: valueAxisSeriesCounts });
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
function getRawSeriesBundle(valueAxisConfigs: EnhancedValueAxisConfig[], seriesConfigs: EnhancedSeriesConfig[], seriesStackConfigs: EnhancedSeriesStackConfig[], rawCategoryValues: readonly CategoryValue[], dataProvider: DataProvider): SeriesBundle {
  const valueObjects = createEmptySeriesValueObjects(seriesConfigs);
  setPlainSeriesValues(seriesConfigs, rawCategoryValues, dataProvider, valueObjects);
  setRangeSeriesValues(seriesConfigs, rawCategoryValues, dataProvider, valueObjects);
  setErrorSeriesValues(seriesConfigs, rawCategoryValues, dataProvider, valueObjects);
  setStackSeriesValues(seriesConfigs, seriesStackConfigs, rawCategoryValues, valueObjects);
  setExtraSeriesValues(seriesConfigs, rawCategoryValues, dataProvider, valueObjects);
  setMinMax(valueObjects);
  const domainObjects = getSeriesDomainObjects(valueObjects);
  const axisDomains = getValueAxisDomains(valueAxisConfigs, domainObjects);
  return {
    data: {
      axisDomains,
      renderAxisDomains: getRenderValueAxisDomains(valueAxisConfigs, axisDomains),
      domains: domainObjects,
      values: valueObjects
    }
  };
}

function getFilteredSeriesBundle(valueAxisConfigs: EnhancedValueAxisConfig[], seriesConfigs: EnhancedSeriesConfig[], seriesStackConfigs: EnhancedSeriesStackConfig[], rawCategoryValues: readonly CategoryValue[], rawSeriesValuesBundle: SeriesBundle, seriesFilteredFlags: Record<string, boolean>): SeriesBundle {
  const valueObjects = createEmptySeriesValueObjects(seriesConfigs);
  for (const key of positionKeys) {
    setFilteredSeriesValues(valueObjects, rawSeriesValuesBundle.data.values, key, seriesFilteredFlags);
  }
  setFilteredStackSeriesValues(seriesConfigs, seriesStackConfigs, rawCategoryValues, valueObjects, rawSeriesValuesBundle.data.values);
  setFilteredExtraSeriesValues(rawSeriesValuesBundle.data.values, valueObjects, seriesFilteredFlags);
  setMinMax(valueObjects);
  const domainObjects = getSeriesDomainObjects(valueObjects);
  const axisDomains = getValueAxisDomains(valueAxisConfigs, domainObjects);
  return {
    data: {
      axisDomains,
      renderAxisDomains: getRenderValueAxisDomains(valueAxisConfigs, axisDomains),
      domains: domainObjects,
      values: valueObjects
    }
  };
}

function createEmptySeriesValueObjects(seriesConfigs: EnhancedSeriesConfig[]): SeriesValueObjects {
  return arrayToMap(seriesConfigs, idAccessor, () => ({
    plain: null, range: null, errorLow: null, errorHigh: null, stack: null, prior: null, marker: null, label: null, color: null, tooltip: null,
    markerCopyKey: null, labelCopyKey: null, colorCopyKey: null, tooltipCopyKey: null, min: null, max: null
  }));
}

function getSeriesValuesForProperty(seriesProperty: string, rawCategoryValues: readonly CategoryValue[], dataProvider: DataProvider): NumericValues {
  const seriesValues: NumericValues = [];
  const categoryCount = rawCategoryValues.length;
  for (let categoryIndex = 0; categoryIndex < categoryCount; categoryIndex++) {
    seriesValues.push(dataProvider.getSeriesValue(rawCategoryValues[categoryIndex], categoryIndex, seriesProperty) as number | undefined);
  }
  return seriesValues;
}

function setPlainSeriesValues(seriesConfigs: EnhancedSeriesConfig[], rawCategoryValues: readonly CategoryValue[], dataProvider: DataProvider, valueObjects: SeriesValueObjects): void {
  for (const seriesConfig of seriesConfigs) {
    valueObjects[seriesConfig.id].plain = getSeriesValuesForProperty(seriesConfig.property!, rawCategoryValues, dataProvider);
  }
}

function setRangeSeriesValues(seriesConfigs: EnhancedSeriesConfig[], rawCategoryValues: readonly CategoryValue[], dataProvider: DataProvider, valueObjects: SeriesValueObjects): void {
  for (const seriesConfig of seriesConfigs) {
    if (seriesConfig.rangeProperty !== NONE) {
      valueObjects[seriesConfig.id].range = getSeriesValuesForProperty(seriesConfig.rangeProperty, rawCategoryValues, dataProvider);
    }
    else {
      valueObjects[seriesConfig.id].range = null;
    }
  }
}

function setErrorSeriesValues(seriesConfigs: EnhancedSeriesConfig[], rawCategoryValues: readonly CategoryValue[], dataProvider: DataProvider, valueObjects: SeriesValueObjects): void {
  for (const seriesConfig of seriesConfigs) {
    valueObjects[seriesConfig.id].errorLow = seriesConfig.errorLowProperty !== NONE ?
      getSeriesValuesForProperty(seriesConfig.errorLowProperty, rawCategoryValues, dataProvider) : null;
    valueObjects[seriesConfig.id].errorHigh = seriesConfig.errorHighProperty !== NONE ?
      getSeriesValuesForProperty(seriesConfig.errorHighProperty, rawCategoryValues, dataProvider) : null;
  }
}

function setExtraSeriesValues(seriesConfigs: EnhancedSeriesConfig[], rawCategoryValues: readonly CategoryValue[], dataProvider: DataProvider, valueObjects: SeriesValueObjects): void {
  let valueObject: SeriesValueObject;
  for (const seriesConfig of seriesConfigs) {
    valueObject = valueObjects[seriesConfig.id];
    const existingProperties: Record<string, ValueKey> = Object.create(null); // null proto: keyed by data property names
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
      valueObject, existingProperties, rawCategoryValues, dataProvider);
    setExtraProperty(seriesConfig.colorProperty !== NONE, seriesConfig.colorProperty, 'color', 'colorCopyKey',
      valueObject, existingProperties, rawCategoryValues, dataProvider);
    setExtraProperty(seriesConfig.labelProperty !== NONE, seriesConfig.labelProperty, 'label', 'labelCopyKey',
      valueObject, existingProperties, rawCategoryValues, dataProvider);
    setExtraProperty(seriesConfig.tooltipProperty !== NONE, seriesConfig.tooltipProperty, 'tooltip', 'tooltipCopyKey',
      valueObject, existingProperties, rawCategoryValues, dataProvider);
  }
}

function setExtraProperty(hasProperty: boolean, property: string | null, valueKey: ExtraKey, valueCopyKey: ExtraCopyKey, valueObject: SeriesValueObject, existingProperties: Record<string, ValueKey>, rawCategoryValues: readonly CategoryValue[], dataProvider: DataProvider): void {
  if (hasProperty) {
    const definedProperty = property!;
    const existingProperty = existingProperties[definedProperty];
    if (existingProperty) {
      valueObject[valueKey] = valueObject[existingProperty];
      valueObject[valueCopyKey] = existingProperty;
    }
    else {
      valueObject[valueKey] = getSeriesValuesForProperty(definedProperty, rawCategoryValues, dataProvider);
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

function setStackSeriesValues(seriesConfigs: EnhancedSeriesConfig[], seriesStackConfigs: EnhancedSeriesStackConfig[], rawCategoryValues: readonly CategoryValue[], valueObjects: SeriesValueObjects): void {
  let valueObject: SeriesValueObject;
  for (const seriesConfig of seriesConfigs) {
    valueObject = valueObjects[seriesConfig.id];
    valueObject.stack = null;
    valueObject.prior = null;
  }
  for (const seriesStackConfig of seriesStackConfigs) {
    const categoryCount = rawCategoryValues.length;
    const positiveStackValues = createArrayFilledWithZero(categoryCount);
    const negativeStackValues = createArrayFilledWithZero(categoryCount);
    const stackSeriesConfigs = seriesStackConfig.seriesConfigs!;
    for (const seriesConfig of stackSeriesConfigs) {
      const values = valueObjects[seriesConfig.id][keyPlain]!;
      setStackSingleSeriesValues(valueObjects[seriesConfig.id], positiveStackValues, negativeStackValues, values);
    }
  }
}

// a non-finite value would poison the running total for every later series in the stack
function isStackableValue(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value);
}

function setStackSingleSeriesValues(valueObject: SeriesValueObject, positiveStackValues: number[], negativeStackValues: number[], values: NumericValues): void {
  const count = values.length;
  let priorValues: NumericValues = [];
  const stackValues: NumericValues = [];
  let value: number | undefined, tempValue: number | undefined;
  for (let i=0; i<count; i++) {
    value = values[i];
    if (!isStackableValue(value)) {
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
    if (!isStackableValue(value) || value >= 0) {
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
    if (isStackableValue(value)) {
      if (value > 0) {
        positiveStackValues[i]+= value;
      }
      else if (value < 0) {
        negativeStackValues[i]+= value;
      }
    }
  }
}

function setFilteredStackSeriesValues(seriesConfigs: EnhancedSeriesConfig[], seriesStackConfigs: EnhancedSeriesStackConfig[], rawCategoryValues: readonly CategoryValue[], filteredValueObjects: SeriesValueObjects, rawValueObjects: SeriesValueObjects): void {
  let filteredValueObject: SeriesValueObject;
  for (const seriesConfig of seriesConfigs) {
    filteredValueObject = filteredValueObjects[seriesConfig.id];
    filteredValueObject.stack = null;
    filteredValueObject.prior = null;
  }
  for (const seriesStackConfig of seriesStackConfigs) {
    let filteredSeriesFound = false;
    const categoryCount = rawCategoryValues.length;
    const positiveStackValues = createArrayFilledWithZero(categoryCount);
    const negativeStackValues = createArrayFilledWithZero(categoryCount);
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
  const seriesDomainObjects: SeriesDomainObjects = Object.create(null);

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

function getSeriesFilteredFlags(seriesConfigs: EnhancedSeriesConfig[], filteredSeriesMap: Record<string, unknown>): Record<string, boolean> {
  const seriesFilteredFlags: Record<string, boolean> = Object.create(null);
  for (const seriesConfig of seriesConfigs) {
    // own-key check: the map may be a host-provided plain object, so ids like constructor must not hit Object.prototype
    // only true filters: a controlled map may carry false for the series it wants shown
    seriesFilteredFlags[seriesConfig.id] = Object.prototype.hasOwnProperty.call(filteredSeriesMap, seriesConfig.id) &&
      filteredSeriesMap[seriesConfig.id] === true;
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

function getValueAxisDomains(valueAxisConfigs: EnhancedValueAxisConfig[], seriesDomainObjects: SeriesDomainObjects): Record<string, NullableDomain> {
  return arrayToMap(valueAxisConfigs, idAccessor,
                    valueAxisConfig => getValueAxisDomain(valueAxisConfig, seriesDomainObjects));
}

function getRenderValueAxisDomains(valueAxisConfigs: EnhancedValueAxisConfig[], axisDomains: Record<string, NullableDomain>): Record<string, NullableDomain> {
  return arrayToMap(valueAxisConfigs, idAccessor,
                    valueAxisConfig => getRenderAxisDomain(valueAxisConfig, axisDomains[valueAxisConfig.id]) as NullableDomain);
}

function getValueAxisDomain(valueAxisConfig: EnhancedValueAxisConfig, seriesDomainObjects: SeriesDomainObjects): NullableDomain {
  return getAxisDomain(valueAxisConfig, () => calculateValueAxisDomain(valueAxisConfig, seriesDomainObjects)) as NullableDomain;
}

export function calculateValueAxisDomain(valueAxisConfig: EnhancedValueAxisConfig, seriesDomainObjects: SeriesDomainObjects): NullableDomain {
  const axisDomain: NullableDomain = [null, null];
  const seriesConfigs = valueAxisConfig.seriesConfigs!;
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

export function getValueAxisBases(valueAxisConfigs: EnhancedValueAxisConfig[], rawValueAxisDomains: Record<string, NullableDomain>, filteredValueAxisDomains: Record<string, NullableDomain>): Record<string, number | null> {
  return arrayToMap(valueAxisConfigs, idAccessor,
    valueAxisConfig =>
      valueAxisConfig.base !== NONE ? valueAxisConfig.base :
        valueAxisConfig.adjustForFiltering ? filteredValueAxisDomains[valueAxisConfig.id][0] : rawValueAxisDomains[valueAxisConfig.id][0])
}

export function getSeriesContainerVisibleSeriesCounts(seriesContainerConfigs: SeriesContainerConfig[], filteredSeriesFlags: Record<string, boolean>): Record<string, number> {
  return arrayToMap(seriesContainerConfigs, idAccessor, seriesContainerConfig =>
    getSeriesContainerVisibleSeriesCount(seriesContainerConfig, filteredSeriesFlags))
}

function getSeriesContainerVisibleSeriesCount(seriesContainerConfig: SeriesContainerConfig, filteredSeriesFlags: Record<string, boolean>): number {
  let seriesCount = 0;
  const seriesConfigs = seriesContainerConfig.seriesConfigs!;
  for (const seriesConfig of seriesConfigs) {
    if (filteredSeriesFlags[seriesConfig.id] === false) {
      seriesCount++;
    }
  }
  return seriesCount;
}

function getCategorySeriesValueObject(seriesValueObject: SeriesValueObject, categoryIndex: number): Partial<Record<ValueKey, number | null | undefined>> {
  const categorySeriesValueObject: Partial<Record<ValueKey, number | null | undefined>> = {};
  let keyValues: NumericValues | null;
  for (const key of valueKeys) {
    keyValues = seriesValueObject[key];
    if (keyValues !== undefined) {
      if (keyValues === null) {
        categorySeriesValueObject[key] = null;
      }
      else {
        categorySeriesValueObject[key] = keyValues[categoryIndex];
      }
    }
  }
  return categorySeriesValueObject;
}

export function getSeriesValueObjects(seriesData: SeriesData, categoryIndex: number) {
  const { axisBases, axisSeriesCounts, filteredFlags, raw, filtered } = seriesData;

  return {
    axisBases,
    axisSeriesCounts,
    filteredFlags,
    raw:  {
      axisDomains: raw.axisDomains,
      renderAxisDomains: raw.renderAxisDomains,
      domains: raw.domains,
      values: mapMap(raw.values, seriesValueObject => getCategorySeriesValueObject(seriesValueObject, categoryIndex))
    },
    filtered: {
      axisDomains: filtered.axisDomains,
      renderAxisDomains: filtered.renderAxisDomains,
      domains: filtered.domains,
      values: mapMap(filtered.values, seriesValueObject => getCategorySeriesValueObject(seriesValueObject, categoryIndex))
    }
  }
}
