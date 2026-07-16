import { getChartDataWithData, getChartDataWithGroupData, getChartDataWithValues, getChartDataWithSeriesDomains, getChartDataWithAxisDomains } from '../data/ChartData';

import { getGroupDataWithNumericValues } from '../data/GroupData';

import { getSeriesDataWithSeriesValues } from '../data/SeriesData';

import { domainKeys, positionOrComputedKeys, extraAndCopyKeys } from '../data/constants';

import { TYPE_DATE, SCALE_LINEAR } from '../config/core/constants';

import { enhanceValueObjects } from './SeriesAnimationData';

/**
 *
 * getChartData for delta percentage functions
 *
 **/
export function getChartDataForAxisDelta(mochartConfig, chartAnimationData, expand, percentage) {
  let axisDeltaData = expand ? chartAnimationData.axisExpansionData : chartAnimationData.axisCollapseData;
  if (percentage === 0) {
    return axisDeltaData.start;
  }
  else if (percentage === 1) {
    return axisDeltaData.end;
  }
  else {
    let deltaPercentage = axisDeltaData.deltaPercentage * percentage;
    let groupAxisDomain = getGroupAxisDomainForDelta(mochartConfig.groupAxisConfig, axisDeltaData.start.groupData.axisDomain, axisDeltaData.end.groupData.axisDomain,
      axisDeltaData.deltas.domain.axis.group, deltaPercentage, percentage);
    let rawSeriesAxisDomains = getAxisDomainsForDeltas(axisDeltaData.start.seriesData.raw.axisDomains, axisDeltaData.end.seriesData.raw.axisDomains,
      axisDeltaData.deltas.domain.axis.series.raw, deltaPercentage, percentage);
    let filteredSeriesAxisDomains = getAxisDomainsForDeltas(axisDeltaData.start.seriesData.filtered.axisDomains, axisDeltaData.end.seriesData.filtered.axisDomains,
      axisDeltaData.deltas.domain.axis.series.filtered, deltaPercentage, percentage);
    let numericGroupValues = getNumericGroupValuesForDelta(axisDeltaData, deltaPercentage, percentage);
    let rawSeriesDomains = getSeriesDomainsForDeltas(axisDeltaData.start.seriesData.raw.domains, axisDeltaData.end.seriesData.raw.domains,
      axisDeltaData.deltas.domain.series.raw, deltaPercentage, percentage);
    let filteredSeriesDomains = getSeriesDomainsForDeltas(axisDeltaData.start.seriesData.filtered.domains, axisDeltaData.end.seriesData.filtered.domains,
      axisDeltaData.deltas.domain.series.filtered, deltaPercentage, percentage);
    let chartData = getChartDataWithAxisDomains(axisDeltaData.start, groupAxisDomain, rawSeriesAxisDomains, filteredSeriesAxisDomains);
    chartData = getChartDataWithSeriesDomains(chartData, rawSeriesDomains, filteredSeriesDomains);
    if (numericGroupValues !== null) {
      chartData = getChartDataWithGroupData(chartData, getGroupDataWithNumericValues(chartData.groupData, numericGroupValues));
    }
    return chartData;
  }
}

function getNumericGroupValuesForDelta(axisDeltaData, deltaPercentage, percentage) {
  let groupValueDeltaData = axisDeltaData.deltas.values.group;
  if (groupValueDeltaData !== null) {
    if (groupValueDeltaData.deltaPercentage >= deltaPercentage) {
      let deltaFactorPercentage = groupValueDeltaData.deltaFactor * percentage;
      let startGroupValues = groupValueDeltaData.start;
      let groupValueDeltas = groupValueDeltaData.deltas;
      let groupValues = [];
      let i, count = startGroupValues.length;
      for (i=0; i<count; i++) {
        groupValues.push(startGroupValues[i] + deltaFactorPercentage * groupValueDeltas[i]);
      }
      return groupValues;
    }
    else {
      return groupValueDeltaData.end;
    }
  }
  else {
    return null;
  }
}

function getGroupAxisDomainForDelta(groupAxisConfig, startAxisDomain, endAxisDomain, axisDelta, deltaPercentage, percentage) {
  if (groupAxisConfig.type === TYPE_DATE && groupAxisConfig.scale === SCALE_LINEAR) {
    if (axisDelta.deltaPercentage < deltaPercentage) {
      return endAxisDomain;
    }
    else {
      let deltaFactorPercentage = axisDelta.deltaFactor * percentage;
      return [
        new Date(startAxisDomain[0].getTime() + axisDelta.delta[0] * deltaFactorPercentage),
        new Date(startAxisDomain[1].getTime() + axisDelta.delta[1] * deltaFactorPercentage)
      ]
    }
  }
  else {
    return getDomainForDelta(startAxisDomain, endAxisDomain, axisDelta, deltaPercentage, percentage);
  }
}

function getDomainForDelta(startDomain, endDomain, domainDelta, deltaPercentage, percentage) {
  if (domainDelta.deltaPercentage < deltaPercentage) {
    return endDomain;
  }
  else {
    let deltaFactorPercentage = domainDelta.deltaFactor * percentage;
    return [
      startDomain[0] + domainDelta.delta[0] * deltaFactorPercentage,
      startDomain[1] + domainDelta.delta[1] * deltaFactorPercentage
    ]
  }
}

function getAxisDomainsForDeltas(startAxisDomains, endAxisDomains, axisDeltaObject, deltaPercentage, percentage) {
  if (axisDeltaObject.deltaPercentage < deltaPercentage) {
    return endAxisDomains;
  }
  else {
    let axisDomains = {};
    let deltas = axisDeltaObject.deltas;
    let axisIds = Object.keys(startAxisDomains);
    for (let axisId of axisIds) {
      axisDomains[axisId] = getDomainForDelta(startAxisDomains[axisId], endAxisDomains[axisId], deltas[axisId], deltaPercentage, percentage);
    }
    return axisDomains;
  }
}

function getSeriesDomainsForDeltas(startSeriesDomains, endSeriesDomains, domainDeltaObject, deltaPercentage, percentage) {
  if (domainDeltaObject.deltaPercentage < deltaPercentage) {
    return endSeriesDomains;
  }
  else {
    let seriesDomains = {};
    let deltas = domainDeltaObject.deltas;
    let seriesIds = Object.keys(startSeriesDomains);
    for (let seriesId of seriesIds) {
      seriesDomains[seriesId] = getSeriesDomainForDelta(startSeriesDomains[seriesId], endSeriesDomains[seriesId], deltas[seriesId], deltaPercentage, percentage);
    }
    return seriesDomains;
  }
}

function getSeriesDomainForDelta(startSeriesDomainObject, endSeriesDomainObject, domainDelta, deltaPercentage, percentage) {
  if (domainDelta.deltaPercentage < deltaPercentage) {
    return endSeriesDomainObject;
  }
  else {
    let seriesDomainObject = {};
    for (let key of domainKeys) {
      setKeyedSeriesDomainForDelta(seriesDomainObject, key, startSeriesDomainObject, endSeriesDomainObject, domainDelta, deltaPercentage, percentage);
    }
    return seriesDomainObject;
  }
}

function setKeyedSeriesDomainForDelta(seriesDomainObject, valueKey, startSeriesDomainObject, endSeriesDomainObject, domainDelta, deltaPercentage, percentage) {
  if (domainDelta[valueKey].deltaPercentage < deltaPercentage) {
    seriesDomainObject[valueKey] = endSeriesDomainObject[valueKey];
  }

  seriesDomainObject[valueKey] = getDomainForDelta(startSeriesDomainObject[valueKey], endSeriesDomainObject[valueKey], domainDelta[valueKey], deltaPercentage, percentage)
}

export function getChartDataForValueDelta(mochartConfig, chartAnimationData, percentage) {
  let valueDeltaData = chartAnimationData.valueChangeData;
  if (percentage === 0) {
    return valueDeltaData.start;
  }
  else if (percentage === 1) {
    return valueDeltaData.end;
  }
  else {
    let deltaPercentage = valueDeltaData.deltaPercentage * percentage;
    let rawValues = getValueObjectsForDelta(valueDeltaData.start.seriesData.raw.values, valueDeltaData.end.seriesData.raw.values, valueDeltaData.deltas.raw, deltaPercentage, percentage);
    let filteredValues = getFilteredValueObjectsForDelta(valueDeltaData.start.seriesData.filtered.values, valueDeltaData.end.seriesData.filtered.values, valueDeltaData.deltas.filtered, rawValues, deltaPercentage, percentage);
    
    enhanceValueObjects(rawValues);
    enhanceValueObjects(filteredValues);

    if (valueDeltaData.deltas.groupOrder.deltaPercentage !== 0) {
      return getChartDataWithData(valueDeltaData.start,
        getGroupDataWithNumericValues(valueDeltaData.start.groupData, getGroupNumericValuesForDelta(valueDeltaData.deltas.groupOrder, deltaPercentage, percentage)),
        getSeriesDataWithSeriesValues(valueDeltaData.start.seriesData, rawValues, filteredValues));
    }
    else {
      return getChartDataWithValues(valueDeltaData.start, rawValues, filteredValues);
    }
  }
}

function getGroupNumericValuesForDelta(groupOrderDeltaData, deltaPercentage, percentage) {
  if (groupOrderDeltaData.deltaPercentage < deltaPercentage) {
    return groupOrderDeltaData.end;
  }
  else {
    return getValuesForDelta(groupOrderDeltaData.start, groupOrderDeltaData.deltas, percentage * groupOrderDeltaData.deltaFactor);
  }
}

function getValueObjectsForDelta(startValueObjects, endValueObjects, valueDeltaObjectData, deltaPercentage, percentage) {
  if (valueDeltaObjectData.deltaPercentage < deltaPercentage) {
    return endValueObjects;
  }
  else {
    let valueDeltaObjects = valueDeltaObjectData.deltas;
    let valueObjects = {};
    let seriesIds = Object.keys(startValueObjects);
    for (let seriesId of seriesIds) {
      valueObjects[seriesId] = getValueObjectForDelta(startValueObjects[seriesId], endValueObjects[seriesId], valueDeltaObjects[seriesId], deltaPercentage, percentage);
    }
    return valueObjects;
  }
}

function getFilteredValueObjectsForDelta(startValueObjects, endValueObjects, valueDeltaObjectData, rawValueObjects, deltaPercentage, percentage) {
  if (valueDeltaObjectData.deltaCopied === true) {
    return rawValueObjects;
  }
  else if (valueDeltaObjectData.deltaPercentage < deltaPercentage) {
    return endValueObjects;
  }
  else {
    let valueDeltaObjects = valueDeltaObjectData.deltas;
    let valueObjects = {};
    let seriesIds = Object.keys(startValueObjects);
    for (let seriesId of seriesIds) {
      valueObjects[seriesId] = getFilteredValueObjectForDelta(startValueObjects[seriesId], endValueObjects[seriesId], valueDeltaObjects[seriesId], rawValueObjects[seriesId], deltaPercentage, percentage);
    }
    return valueObjects;
  }
}

function getValueObjectForDelta(startValueObject, endValueObject, valueDeltaObject, deltaPercentage, percentage) {
  if (valueDeltaObject.deltaPercentage < deltaPercentage) {
    return endValueObject;
  }
  else {
    let valueObject = {};
    for (let key of positionOrComputedKeys) {
      setValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, key, deltaPercentage, percentage);
    }
    for (let { extraKey, copyKey } of extraAndCopyKeys) {
      setExtraValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, extraKey, copyKey, deltaPercentage, percentage);
    }
    return valueObject;
  }
}

function setExtraValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, valueKey, valueCopyKey, deltaPercentage, percentage) {
  valueObject[valueCopyKey] = startValueObject[valueCopyKey];
  if (valueObject[valueCopyKey] !== null) {
    valueObject[valueKey] = valueObject[valueObject[valueCopyKey]];
  }
  else {
    setValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, valueKey, deltaPercentage, percentage);
  }
}

function getFilteredValueObjectForDelta(startValueObject, endValueObject, valueDeltaObject, rawValueObject, deltaPercentage, percentage) {
  if (valueDeltaObject.deltaCopied === true) {
    return rawValueObject;
  }
  else if (valueDeltaObject.deltaPercentage < deltaPercentage) {
    return endValueObject;
  }
  else {
    let valueObject = {};
    for (let key of positionOrComputedKeys) {
      setFilteredValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, rawValueObject, key, deltaPercentage, percentage);
    }
    for (let { extraKey, copyKey } of extraAndCopyKeys) {
      setFilteredExtraValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, rawValueObject, extraKey, copyKey, deltaPercentage, percentage);
    }
    return valueObject;
  }
}

function setFilteredExtraValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, rawValueObject, valueKey, valueCopyKey, deltaPercentage, percentage) {
  valueObject[valueCopyKey] = startValueObject[valueCopyKey];
  if (valueObject[valueCopyKey] !== null) {
    valueObject[valueKey] = valueObject[valueObject[valueCopyKey]];
  }
  else {
    setFilteredValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, rawValueObject, valueKey, deltaPercentage, percentage);
  }
}

function setValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, valueKey, deltaPercentage, percentage) {
  if (valueDeltaObject[valueKey].deltaPercentage < deltaPercentage) {
    valueObject[valueKey] = endValueObject[valueKey];
  }
  else {
    valueObject[valueKey] = getValuesForDelta(startValueObject[valueKey], valueDeltaObject[valueKey].deltas, valueDeltaObject[valueKey].deltaFactor * percentage);
  }
}

function setFilteredValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, rawValueObject, valueKey, deltaPercentage, percentage) {
  if (valueDeltaObject[valueKey].deltaCopied === true) {
    valueObject[valueKey] = rawValueObject[valueKey];
  }
  else if (valueDeltaObject[valueKey].deltaPercentage < deltaPercentage) {
    valueObject[valueKey] = endValueObject[valueKey];
  }
  else {
    valueObject[valueKey] = getValuesForDelta(startValueObject[valueKey], valueDeltaObject[valueKey].deltas, valueDeltaObject[valueKey].deltaFactor * percentage);
  }
}

function getValuesForDelta(startValues, valueDeltas, percentage) {
  let values = startValues.slice();
  let i, count = startValues.length;
  for (i=0; i<count; i++) {
    if (valueDeltas[i] !== 0) {
      values[i]+= valueDeltas[i] * percentage;
    }
  }
  return values;
}