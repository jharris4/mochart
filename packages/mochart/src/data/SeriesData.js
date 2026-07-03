import { nullDomain, getDomainForValues, mergeDomain } from './DomainData';
import { getAxisDomain } from './AxisDomainData';
import { NONE } from '../config/core/constants';

import { keyPlain, valueKeys, positionKeys, extraKeys, extraCopyKeys, positionOrComputedOrExtraKeys } from './constants';

import { copyWithValueOnlyIfOtherUndefined, createArrayFilledWithZero, arrayToMap, mapMap, idAccessor } from '../utils/utils';

export function getSeriesData(mochartConfig, dataProvider, filteredSeriesMap, groupData) {
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

export function getSeriesDataWithAxisDomains(seriesData, rawAxisDomains, filteredDomains) {
  const raw = Object.assign({}, seriesData.raw, { axisDomains: rawAxisDomains });
  const filtered = Object.assign({}, seriesData.filtered, { axisDomains: filteredDomains });
  return Object.assign({}, seriesData, { raw, filtered });
}

export function getSeriesDataWithAxisBases(seriesData, seriesAxisBases) {
  return Object.assign({}, seriesData, { axisBases: seriesAxisBases });
}

export function getSeriesDataWithSeriesCounts(seriesData, seriesAxisSeriesCounts, seriesStackSeriesCounts, seriesGroupSeriesCounts) {
  return Object.assign({}, seriesData, {
    axisSeriesCounts: seriesAxisSeriesCounts, stackSeriesCount: seriesStackSeriesCounts, groupSeriesCounts: seriesGroupSeriesCounts
  });
}

export function getSeriesDataWithFilteredFlags(seriesData, filteredFlags) {
  return Object.assign({}, seriesData, { filteredFlags });
}

export function getSeriesDataWithSeriesValues(seriesData, values, filteredValues) {
  const raw = Object.assign({}, seriesData.raw, { values: values });
  const filtered = Object.assign({}, seriesData.filtered, { values: filteredValues });
  return Object.assign({}, seriesData, { raw, filtered });
}

export function getSeriesDataWithDomains(seriesData, domains, filteredDomains) {
  const raw = Object.assign({}, seriesData.raw, { domains: domains });
  const filtered = Object.assign({}, seriesData.filtered, { domains: filteredDomains });
  return Object.assign({}, seriesData, { raw, filtered });
}

/**
 *
 * series data functions
 *
 **/
function getRawSeriesBundle(seriesAxisConfigs, seriesConfigs, seriesStackConfigs, rawGroupValues, dataProvider) {
  let valueObjects = arrayToMap(seriesConfigs, idAccessor, () => ({}));
  setPlainSeriesValues(seriesConfigs, rawGroupValues, dataProvider, valueObjects);
  setRangeSeriesValues(seriesConfigs, rawGroupValues, dataProvider, valueObjects);
  setStackSeriesValues(seriesConfigs, seriesStackConfigs, rawGroupValues, valueObjects);
  setExtraSeriesValues(seriesConfigs, rawGroupValues, dataProvider, valueObjects);
  setMinMax(valueObjects);
  let domainObjects = getSeriesDomainObjects(valueObjects);
  let axisDomains = getSeriesAxisDomains(seriesAxisConfigs, domainObjects);
  return {
    data: {
      axisDomains,
      domains: domainObjects,
      values: valueObjects
    }
  };
}

function getFilteredSeriesBundle(seriesAxisConfigs, seriesConfigs, seriesStackConfigs, rawGroupValues, rawSeriesValuesBundle, seriesFilteredFlags) {
  let valueObjects = arrayToMap(seriesConfigs, idAccessor, () => ({}));
  for (let key of positionKeys) {
    setFilteredSeriesValues(valueObjects, rawSeriesValuesBundle.data.values, key, seriesFilteredFlags);
  }
  setFilteredStackSeriesValues(seriesConfigs, seriesStackConfigs, rawGroupValues, valueObjects, rawSeriesValuesBundle.data.values);
  setFilteredExtraSeriesValues(rawSeriesValuesBundle.data.values, valueObjects, seriesFilteredFlags);
  setMinMax(valueObjects);
  let domainObjects = getSeriesDomainObjects(valueObjects);
  let axisDomains = getSeriesAxisDomains(seriesAxisConfigs, domainObjects);
  return {
    data: {
      axisDomains,
      domains: domainObjects,
      values: valueObjects
    }
  };
}

function getSeriesValuesForProperty(seriesProperty, rawGroupValues, dataProvider) {
  let seriesValues = [];
  const groupCount = rawGroupValues.length;
  for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
    seriesValues.push(dataProvider.getSeriesValue(rawGroupValues[groupIndex], groupIndex, seriesProperty));
  }
  return seriesValues;
}

function setPlainSeriesValues(seriesConfigs, rawGroupValues, dataProvider, valueObjects) {
  for (let seriesConfig of seriesConfigs) {
    valueObjects[seriesConfig.id].plain = getSeriesValuesForProperty(seriesConfig.property, rawGroupValues, dataProvider);
  }
}

function setRangeSeriesValues(seriesConfigs, rawGroupValues, dataProvider, valueObjects) {
  for (let seriesConfig of seriesConfigs) {
    if (seriesConfig.rangeProperty !== NONE) {
      valueObjects[seriesConfig.id].range = getSeriesValuesForProperty(seriesConfig.rangeProperty, rawGroupValues, dataProvider);
    }
    else {
      valueObjects[seriesConfig.id].range = null;
    }
  }
}

function setExtraSeriesValues(seriesConfigs, rawGroupValues, dataProvider, valueObjects) {
  let valueObject;
  for (let seriesConfig of seriesConfigs) {
    valueObject = valueObjects[seriesConfig.id];
    let existingProperties = {};
    existingProperties[seriesConfig.property] = 'plain';
    if (seriesConfig.rangeProperty !== NONE) {
      existingProperties[seriesConfig.rangeProperty] = 'range';
    }
    setExtraProperty(seriesConfig.markerProperty !== NONE, seriesConfig.markerProperty, 'marker', 'markerCopyKey',
      valueObject, existingProperties, rawGroupValues, dataProvider);
    setExtraProperty(seriesConfig.colorProperty !== NONE, seriesConfig.colorProperty, 'color', 'colorCopyKey',
      valueObject, existingProperties, rawGroupValues, dataProvider);
    setExtraProperty(seriesConfig.labelProperty !== NONE, seriesConfig.labelProperty, 'label', 'labelCopyKey',
      valueObject, existingProperties, rawGroupValues, dataProvider);
  }
}

function setExtraProperty(hasProperty, property, valueKey, valueCopyKey, valueObject, existingProperties, rawGroupValues, dataProvider) {
  if (hasProperty) {
    let existingProperty = existingProperties[property];
    if (existingProperty) {
      valueObject[valueKey] = valueObject[existingProperty];
      valueObject[valueCopyKey] = existingProperty;
    }
    else {
      valueObject[valueKey] = getSeriesValuesForProperty(property, rawGroupValues, dataProvider);
      valueObject[valueCopyKey] = null;
      existingProperties[property] = valueKey;
    }
  }
  else {
    valueObject[valueKey] = null;
    valueObject[valueCopyKey] = null;
  }
}

function setFilteredExtraSeriesValues(rawValueObjects, valueObjects, seriesFilteredFlags) {
  let seriesIds = Object.keys(rawValueObjects);

  let rawValueObject, valueObject;
  for (let seriesId of seriesIds) {
    rawValueObject = rawValueObjects[seriesId];
    valueObject = valueObjects[seriesId];
    if (seriesFilteredFlags[seriesId] === true) {
      for (let extraKey of extraKeys) {
        valueObject[extraKey] = null;
      }
    }
    else {
      for (let extraKey of extraKeys) {
        valueObject[extraKey] = rawValueObject[extraKey];
      }
    }
    for (let extraCopyKey of extraCopyKeys) {
      valueObject[extraCopyKey] = rawValueObject[extraCopyKey];
    }
  }
}

function setStackSeriesValues(seriesConfigs, seriesStackConfigs, rawGroupValues, valueObjects) {
  let valueObject;
  for (let seriesConfig of seriesConfigs) {
    valueObject = valueObjects[seriesConfig.id];
    valueObject.stack = null;
    valueObject.prior = null;
  }
  for (let seriesStackConfig of seriesStackConfigs) {
    let groupCount = rawGroupValues.length;
    let positiveStackValues = createArrayFilledWithZero(groupCount);
    let negativeStackValues = createArrayFilledWithZero(groupCount);
    const { seriesConfigs } = seriesStackConfig;
    for (let seriesConfig of seriesConfigs) {
      let values = valueObjects[seriesConfig.id][keyPlain];
      setStackSingleSeriesValues(valueObjects[seriesConfig.id], positiveStackValues, negativeStackValues, values);
    }
  }
}

function setStackSingleSeriesValues(valueObject, positiveStackValues, negativeStackValues, values) {
  let i, count = values.length;
  let priorValues = [];
  let stackValues = [];
  let value, tempValue;
  for (i=0; i<count; i++) {
    value = values[i];
    if (value === void 0) {
      priorValues.push(positiveStackValues[i]);
      stackValues.push(void 0);
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
  if (tempValue === void 0) { // no values were stacked, so don't set the prior values
    priorValues = stackValues;
  }
  valueObject.stack = stackValues;
  valueObject.prior = priorValues;
}

function getStackPriorValues(positiveStackValues, negativeStackValues, values) {
  let priorValues = [];
  let value;
  let i, count = values.length;
  for (i = 0; i < count; i++) {
    value = values[i];
    if (value >= 0 || value === void 0) {
      priorValues.push(positiveStackValues[i]);
    }
    else {
      priorValues.push(negativeStackValues[i]);
    }
  }
  return priorValues;
}

function incrementStackValues(positiveStackValues, negativeStackValues, values) {
  let i, value, count = values.length;
  for (i=0; i<count; i++) {
    value = values[i];
    if (value !== void 0) {
      if (value > 0) {
        positiveStackValues[i]+= value;
      }
      else if (value < 0) {
        negativeStackValues[i]+= value;
      }
    }
  }
}

function setFilteredStackSeriesValues(seriesConfigs, seriesStackConfigs, rawGroupValues, filteredValueObjects, rawValueObjects) {
  let filteredValueObject;
  for (let seriesConfig of seriesConfigs) {
    filteredValueObject = filteredValueObjects[seriesConfig.id];
    filteredValueObject.stack = null;
    filteredValueObject.prior = null;
  }
  for (let seriesStackConfig of seriesStackConfigs) {
    let filteredSeriesFound = false;
    let groupCount = rawGroupValues.length;
    let positiveStackValues = createArrayFilledWithZero(groupCount);
    let negativeStackValues = createArrayFilledWithZero(groupCount);
    const { seriesConfigs } = seriesStackConfig;
    let filteredValueObject, rawValueObject;
    for (let seriesConfig of seriesConfigs) {
      filteredValueObject = filteredValueObjects[seriesConfig.id];
      let values = filteredValueObject[keyPlain];
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
        filteredValueObject.prior = getStackPriorValues(positiveStackValues, negativeStackValues, rawValueObject[keyPlain]);
      }
    }
  }
}

export function setMinMax(valueObjects) {
  let seriesIds = Object.keys(valueObjects);
  let valueObject;
  for (let seriesId of seriesIds) {
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

function getSeriesDomainObjects(seriesValueObjects) {
  let seriesDomainObjects = {};

  let seriesIds = Object.keys(seriesValueObjects);
  for (let seriesId of seriesIds) {
    seriesDomainObjects[seriesId] = getSeriesDomainObject(seriesValueObjects[seriesId]);
  }
  return seriesDomainObjects;
}

function getSeriesDomainObject(seriesValueObject) {
  let seriesDomainObject = {};
  for (let key of positionOrComputedOrExtraKeys) {
    setSeriesDomain(seriesDomainObject, seriesValueObject, key);
  }
  let domain = nullDomain;
  if (seriesValueObject.plain !== null) {
    if (seriesValueObject.stack !== null) {
      domain = mergeDomain(seriesDomainObject.stack, seriesDomainObject.prior);
    }
    else if (seriesValueObject.range !== null) {
      domain = mergeDomain(seriesDomainObject.plain, seriesDomainObject.range);
    }
    else {
      domain = seriesDomainObject.plain;
    }
  }
  seriesDomainObject.domain = domain;
  return seriesDomainObject;
}

function setSeriesDomain(seriesDomainObject, seriesValuesObject, valueKey) {
  if (seriesValuesObject[valueKey] !== null) {
    seriesDomainObject[valueKey] = getDomainForValues(seriesValuesObject[valueKey]);
  }
  else {
    seriesDomainObject[valueKey] = nullDomain;
  }
}

function getSeriesFilteredFlags(seriesConfigs, filteredSeriesMap) {
  let seriesFilteredFlags = {};
  for (let seriesConfig of seriesConfigs) {
    seriesFilteredFlags[seriesConfig.id] = filteredSeriesMap[seriesConfig.id] !== void 0;
  }
  return seriesFilteredFlags;
}

function setFilteredSeriesValues(valueObjects, rawValueObjects, valueKey, seriesFilteredFlags) {
  let seriesIds = Object.keys(valueObjects);
  for (let seriesId of seriesIds) {
    if (seriesFilteredFlags[seriesId] === true) {
      valueObjects[seriesId][valueKey] = null;
    }
    else {
      valueObjects[seriesId][valueKey] = rawValueObjects[seriesId][valueKey];
    }
  }
}

function getSeriesAxisDomains(seriesAxisConfigs, seriesDomainObjects) {
  return arrayToMap(seriesAxisConfigs, idAccessor,
                    seriesAxisConfig => getSeriesAxisDomain(seriesAxisConfig, seriesDomainObjects));
}

function getSeriesAxisDomain(seriesAxisConfig, seriesDomainObjects) {
  return getAxisDomain(seriesAxisConfig, () => calculateSeriesAxisDomain(seriesAxisConfig, seriesDomainObjects));
}

function calculateSeriesAxisDomain(seriesAxisConfig, seriesDomainObjects) {
  let axisDomain = [null, null];
  const { seriesConfigs } = seriesAxisConfig;
  for (let seriesConfig of seriesConfigs) {
    let seriesDomain = seriesDomainObjects[seriesConfig.id].domain;
    if (seriesDomain[0] !== null && (axisDomain[0] === null || seriesDomain[0] < axisDomain[0])) {
      axisDomain[0] = seriesDomain[0];
    }
    if (seriesDomain[1] !== null && (axisDomain[1] === null || seriesDomain[1] > axisDomain[1])) {
      axisDomain[1] = seriesDomain[1];
    }
  }
  return axisDomain;
}

export function getSeriesAxisBases(seriesAxisConfigs, rawSeriesAxisDomains, filteredSeriesAxisDomains) {
  return arrayToMap(seriesAxisConfigs, idAccessor,
    seriesAxisConfig =>
      seriesAxisConfig.base !== NONE ? seriesAxisConfig.base :
        seriesAxisConfig.adjustForSuppression ? filteredSeriesAxisDomains[seriesAxisConfig.id][0] : rawSeriesAxisDomains[seriesAxisConfig.id][0])
}

export function getSeriesContainerFilteredSeriesCounts(seriesContainerConfigs, filteredSeriesFlags) {
  return arrayToMap(seriesContainerConfigs, idAccessor, seriesContainerConfig =>
    getSeriesContainerFilteredSeriesCount(seriesContainerConfig, filteredSeriesFlags))
}

function getSeriesContainerFilteredSeriesCount(seriesContainerConfig, filteredSeriesFlags) {
  let seriesCount = 0;
  const { seriesConfigs } = seriesContainerConfig;
  for (let seriesConfig of seriesConfigs) {
    if (filteredSeriesFlags[seriesConfig.id] === false) {
      seriesCount++;
    }
  }
  return seriesCount;
}

function getGroupSeriesValueObject(seriesValueObject, groupIndex) {
  let groupSeriesValueObject = {};
  let keyValues;
  for (let key of valueKeys) {
    keyValues = seriesValueObject[key];
    if (keyValues !== void 0) {
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

export function getSeriesValueObjects(seriesData, groupIndex) {
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