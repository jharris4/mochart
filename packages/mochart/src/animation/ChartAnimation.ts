import { getChartDataWithData, getChartDataWithGroupData, getChartDataWithValues, getChartDataWithSeriesDomains, getChartDataWithAxisDomains } from '../data/ChartData';

import { getGroupDataWithNumericValues } from '../data/GroupData';

import { getSeriesDataWithSeriesValues } from '../data/SeriesData';

import { domainKeys, positionOrComputedKeys, extraAndCopyKeys } from '../data/constants';

import { TYPE_DATE, SCALE_LINEAR } from '../config/core/constants';

import { enhanceValueObjects } from './SeriesAnimationData';

import type { GroupAxisConfig, MochartConfig } from '../types/config';
import type { DomainKey, ExtraCopyKey, ExtraKey, PositionOrComputedKey } from '../data/constants';
import type { SeriesValueObjects as DataSeriesValueObjects } from '../types/data';
import type {
  AnimationChartData,
  AxisDeltaData,
  AxisDomain,
  AxisDomains,
  ChartAnimationData,
  DomainDelta,
  DomainDeltaMap,
  NumericArrayDelta,
  NumericDomain,
  NumericValues,
  NumericValuesDelta,
  SeriesDomainDelta,
  SeriesDomainDeltaMap,
  SeriesDomainObject,
  SeriesDomainObjects,
  SeriesValueDelta,
  SeriesValueDeltaMap,
  SeriesValueObject,
  SeriesValueObjects
} from '../types/animation';

function requireAxisDeltaData(axisDeltaData: ChartAnimationData['axisExpansionData']): AxisDeltaData {
  if (axisDeltaData.start === null || axisDeltaData.end === null || axisDeltaData.deltas === null) {
    throw new Error('Cannot interpolate an empty axis transition');
  }
  return axisDeltaData as AxisDeltaData;
}

/**
 *
 * getChartData for delta percentage functions
 *
 **/
export function getChartDataForAxisDelta(
  mochartConfig: MochartConfig,
  chartAnimationData: ChartAnimationData,
  expand: boolean,
  percentage: number
): AnimationChartData {
  const axisDeltaData = requireAxisDeltaData(expand ? chartAnimationData.axisExpansionData : chartAnimationData.axisCollapseData);
  if (percentage === 0) {
    return axisDeltaData.start;
  }
  else if (percentage === 1) {
    return axisDeltaData.end;
  }
  else {
    let deltaPercentage = axisDeltaData.deltaPercentage * percentage;
    let groupAxisDomain = getGroupAxisDomainForDelta(mochartConfig.groupAxisConfig, axisDeltaData.start.groupData.axisDomain as AxisDomain, axisDeltaData.end.groupData.axisDomain as AxisDomain,
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
    let chartData: AnimationChartData = getChartDataWithAxisDomains(axisDeltaData.start, groupAxisDomain, rawSeriesAxisDomains, filteredSeriesAxisDomains);
    chartData = getChartDataWithSeriesDomains(chartData, rawSeriesDomains, filteredSeriesDomains);
    if (numericGroupValues !== null) {
      chartData = getChartDataWithGroupData(chartData, getGroupDataWithNumericValues(chartData.groupData, numericGroupValues));
    }
    return chartData;
  }
}

function getNumericGroupValuesForDelta(axisDeltaData: AxisDeltaData, deltaPercentage: number, percentage: number): number[] | null {
  const groupValueDeltaData = axisDeltaData.deltas.values.group;
  if (groupValueDeltaData !== null) {
    if (groupValueDeltaData.deltaPercentage >= deltaPercentage) {
      let deltaFactorPercentage = groupValueDeltaData.deltaFactor! * percentage;
      let startGroupValues = groupValueDeltaData.start;
      let groupValueDeltas = groupValueDeltaData.deltas;
      const groupValues: number[] = [];
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

function getGroupAxisDomainForDelta(
  groupAxisConfig: GroupAxisConfig,
  startAxisDomain: AxisDomain,
  endAxisDomain: AxisDomain,
  axisDelta: DomainDelta,
  deltaPercentage: number,
  percentage: number
): AxisDomain {
  if (groupAxisConfig.type === TYPE_DATE && groupAxisConfig.scale === SCALE_LINEAR) {
    if (axisDelta.deltaPercentage < deltaPercentage) {
      return endAxisDomain;
    }
    else {
      const startDateDomain = startAxisDomain as [Date, Date];
      const axisDomainDelta = axisDelta.delta;
      if (axisDomainDelta === null) {
        return endAxisDomain;
      }
      const deltaFactorPercentage = axisDelta.deltaFactor! * percentage;
      return [
        new Date(startDateDomain[0].getTime() + axisDomainDelta[0] * deltaFactorPercentage),
        new Date(startDateDomain[1].getTime() + axisDomainDelta[1] * deltaFactorPercentage)
      ]
    }
  }
  else {
    return getDomainForDelta(startAxisDomain as NumericDomain, endAxisDomain as NumericDomain, axisDelta, deltaPercentage, percentage);
  }
}

function getDomainForDelta(startDomain: NumericDomain, endDomain: NumericDomain, domainDelta: DomainDelta, deltaPercentage: number, percentage: number): NumericDomain {
  if (domainDelta.deltaPercentage < deltaPercentage) {
    return endDomain;
  }
  else {
    if (domainDelta.delta === null) {
      return endDomain;
    }
    const deltaFactorPercentage = domainDelta.deltaFactor! * percentage;
    return [
      startDomain[0] + domainDelta.delta[0] * deltaFactorPercentage,
      startDomain[1] + domainDelta.delta[1] * deltaFactorPercentage
    ]
  }
}

function getAxisDomainsForDeltas(
  startAxisDomains: AxisDomains,
  endAxisDomains: AxisDomains,
  axisDeltaObject: DomainDeltaMap,
  deltaPercentage: number,
  percentage: number
): AxisDomains {
  if (axisDeltaObject.deltaPercentage < deltaPercentage) {
    return endAxisDomains;
  }
  else {
    const axisDomains: AxisDomains = {};
    const deltas = axisDeltaObject.deltas;
    if (deltas === null) {
      return endAxisDomains;
    }
    let axisIds = Object.keys(startAxisDomains);
    for (let axisId of axisIds) {
      axisDomains[axisId] = getDomainForDelta(startAxisDomains[axisId] as NumericDomain, endAxisDomains[axisId] as NumericDomain, deltas[axisId], deltaPercentage, percentage);
    }
    return axisDomains;
  }
}

function getSeriesDomainsForDeltas(
  startSeriesDomains: SeriesDomainObjects,
  endSeriesDomains: SeriesDomainObjects,
  domainDeltaObject: SeriesDomainDeltaMap,
  deltaPercentage: number,
  percentage: number
): SeriesDomainObjects {
  if (domainDeltaObject.deltaPercentage < deltaPercentage) {
    return endSeriesDomains;
  }
  else {
    const seriesDomains: SeriesDomainObjects = {};
    const deltas = domainDeltaObject.deltas;
    if (deltas === null) {
      return endSeriesDomains;
    }
    let seriesIds = Object.keys(startSeriesDomains);
    for (let seriesId of seriesIds) {
      seriesDomains[seriesId] = getSeriesDomainForDelta(startSeriesDomains[seriesId], endSeriesDomains[seriesId], deltas[seriesId], deltaPercentage, percentage);
    }
    return seriesDomains;
  }
}

function getSeriesDomainForDelta(
  startSeriesDomainObject: SeriesDomainObject,
  endSeriesDomainObject: SeriesDomainObject,
  domainDelta: SeriesDomainDelta,
  deltaPercentage: number,
  percentage: number
): SeriesDomainObject {
  if (domainDelta.deltaPercentage < deltaPercentage) {
    return endSeriesDomainObject;
  }
  else {
    const seriesDomainObject: SeriesDomainObject = {};
    for (let key of domainKeys) {
      setKeyedSeriesDomainForDelta(seriesDomainObject, key, startSeriesDomainObject, endSeriesDomainObject, domainDelta, deltaPercentage, percentage);
    }
    return seriesDomainObject;
  }
}

function setKeyedSeriesDomainForDelta(
  seriesDomainObject: SeriesDomainObject,
  valueKey: DomainKey,
  startSeriesDomainObject: SeriesDomainObject,
  endSeriesDomainObject: SeriesDomainObject,
  domainDelta: SeriesDomainDelta,
  deltaPercentage: number,
  percentage: number
): void {
  if (domainDelta[valueKey].deltaPercentage < deltaPercentage) {
    seriesDomainObject[valueKey] = endSeriesDomainObject[valueKey];
  }

  seriesDomainObject[valueKey] = getDomainForDelta(startSeriesDomainObject[valueKey] as NumericDomain, endSeriesDomainObject[valueKey] as NumericDomain, domainDelta[valueKey], deltaPercentage, percentage)
}

export function getChartDataForValueDelta(
  _mochartConfig: MochartConfig,
  chartAnimationData: ChartAnimationData,
  percentage: number
): AnimationChartData {
  const valueDeltaData = chartAnimationData.valueChangeData;
  if (percentage === 0) {
    return valueDeltaData.start;
  }
  else if (percentage === 1) {
    return valueDeltaData.end;
  }
  else {
    let deltaPercentage = valueDeltaData.deltaPercentage * percentage;
    let rawValues = getValueObjectsForDelta(valueDeltaData.start.seriesData.raw.values as unknown as SeriesValueObjects, valueDeltaData.end.seriesData.raw.values as unknown as SeriesValueObjects, valueDeltaData.deltas.raw, deltaPercentage, percentage);
    let filteredValues = getFilteredValueObjectsForDelta(valueDeltaData.start.seriesData.filtered.values as unknown as SeriesValueObjects, valueDeltaData.end.seriesData.filtered.values as unknown as SeriesValueObjects, valueDeltaData.deltas.filtered, rawValues, deltaPercentage, percentage);
    
    enhanceValueObjects(rawValues);
    enhanceValueObjects(filteredValues);

    if (valueDeltaData.deltas.groupOrder.deltaPercentage !== 0) {
      return getChartDataWithData(valueDeltaData.start,
        getGroupDataWithNumericValues(valueDeltaData.start.groupData, getGroupNumericValuesForDelta(valueDeltaData.deltas.groupOrder, deltaPercentage, percentage)),
        getSeriesDataWithSeriesValues(valueDeltaData.start.seriesData, rawValues as unknown as DataSeriesValueObjects, filteredValues as unknown as DataSeriesValueObjects));
    }
    else {
      return getChartDataWithValues(valueDeltaData.start, rawValues as unknown as DataSeriesValueObjects, filteredValues as unknown as DataSeriesValueObjects);
    }
  }
}

function getGroupNumericValuesForDelta(groupOrderDeltaData: NumericArrayDelta, deltaPercentage: number, percentage: number): number[] {
  if (groupOrderDeltaData.start === undefined || groupOrderDeltaData.end === undefined) {
    throw new Error('Cannot interpolate an empty group-order transition');
  }
  if (groupOrderDeltaData.deltaPercentage < deltaPercentage) {
    return groupOrderDeltaData.end;
  }
  else {
    return getValuesForDelta(groupOrderDeltaData.start, groupOrderDeltaData.deltas, percentage * groupOrderDeltaData.deltaFactor!);
  }
}

function getValueObjectsForDelta(
  startValueObjects: SeriesValueObjects,
  endValueObjects: SeriesValueObjects,
  valueDeltaObjectData: SeriesValueDeltaMap,
  deltaPercentage: number,
  percentage: number
): SeriesValueObjects {
  if (valueDeltaObjectData.deltaPercentage < deltaPercentage) {
    return endValueObjects;
  }
  else {
    let valueDeltaObjects = valueDeltaObjectData.deltas;
    const valueObjects: SeriesValueObjects = {};
    let seriesIds = Object.keys(startValueObjects);
    for (let seriesId of seriesIds) {
      valueObjects[seriesId] = getValueObjectForDelta(startValueObjects[seriesId], endValueObjects[seriesId], valueDeltaObjects[seriesId], deltaPercentage, percentage);
    }
    return valueObjects;
  }
}

function getFilteredValueObjectsForDelta(
  startValueObjects: SeriesValueObjects,
  endValueObjects: SeriesValueObjects,
  valueDeltaObjectData: SeriesValueDeltaMap,
  rawValueObjects: SeriesValueObjects,
  deltaPercentage: number,
  percentage: number
): SeriesValueObjects {
  if (valueDeltaObjectData.deltaCopied === true) {
    return rawValueObjects;
  }
  else if (valueDeltaObjectData.deltaPercentage < deltaPercentage) {
    return endValueObjects;
  }
  else {
    let valueDeltaObjects = valueDeltaObjectData.deltas;
    const valueObjects: SeriesValueObjects = {};
    let seriesIds = Object.keys(startValueObjects);
    for (let seriesId of seriesIds) {
      valueObjects[seriesId] = getFilteredValueObjectForDelta(startValueObjects[seriesId], endValueObjects[seriesId], valueDeltaObjects[seriesId], rawValueObjects[seriesId], deltaPercentage, percentage);
    }
    return valueObjects;
  }
}

function getValueObjectForDelta(
  startValueObject: SeriesValueObject,
  endValueObject: SeriesValueObject,
  valueDeltaObject: SeriesValueDelta,
  deltaPercentage: number,
  percentage: number
): SeriesValueObject {
  if (valueDeltaObject.deltaPercentage < deltaPercentage) {
    return endValueObject;
  }
  else {
    const valueObject = {} as SeriesValueObject;
    for (let key of positionOrComputedKeys) {
      setValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, key, deltaPercentage, percentage);
    }
    for (let { extraKey, copyKey } of extraAndCopyKeys) {
      setExtraValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, extraKey, copyKey, deltaPercentage, percentage);
    }
    return valueObject;
  }
}

function setExtraValueSeriesValuesForDelta(
  valueObject: SeriesValueObject,
  startValueObject: SeriesValueObject,
  endValueObject: SeriesValueObject,
  valueDeltaObject: SeriesValueDelta,
  valueKey: ExtraKey,
  valueCopyKey: ExtraCopyKey,
  deltaPercentage: number,
  percentage: number
): void {
  valueObject[valueCopyKey] = startValueObject[valueCopyKey];
  const copiedValueKey = valueObject[valueCopyKey];
  if (typeof copiedValueKey === 'string') {
    valueObject[valueKey] = valueObject[copiedValueKey] as NumericValues | null;
  }
  else {
    setValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, valueKey, deltaPercentage, percentage);
  }
}

function getFilteredValueObjectForDelta(
  startValueObject: SeriesValueObject,
  endValueObject: SeriesValueObject,
  valueDeltaObject: SeriesValueDelta,
  rawValueObject: SeriesValueObject,
  deltaPercentage: number,
  percentage: number
): SeriesValueObject {
  if (valueDeltaObject.deltaCopied === true) {
    return rawValueObject;
  }
  else if (valueDeltaObject.deltaPercentage < deltaPercentage) {
    return endValueObject;
  }
  else {
    const valueObject = {} as SeriesValueObject;
    for (let key of positionOrComputedKeys) {
      setFilteredValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, rawValueObject, key, deltaPercentage, percentage);
    }
    for (let { extraKey, copyKey } of extraAndCopyKeys) {
      setFilteredExtraValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, rawValueObject, extraKey, copyKey, deltaPercentage, percentage);
    }
    return valueObject;
  }
}

function setFilteredExtraValueSeriesValuesForDelta(
  valueObject: SeriesValueObject,
  startValueObject: SeriesValueObject,
  endValueObject: SeriesValueObject,
  valueDeltaObject: SeriesValueDelta,
  rawValueObject: SeriesValueObject,
  valueKey: ExtraKey,
  valueCopyKey: ExtraCopyKey,
  deltaPercentage: number,
  percentage: number
): void {
  valueObject[valueCopyKey] = startValueObject[valueCopyKey];
  const copiedValueKey = valueObject[valueCopyKey];
  if (typeof copiedValueKey === 'string') {
    valueObject[valueKey] = valueObject[copiedValueKey] as NumericValues | null;
  }
  else {
    setFilteredValueSeriesValuesForDelta(valueObject, startValueObject, endValueObject, valueDeltaObject, rawValueObject, valueKey, deltaPercentage, percentage);
  }
}

function setValueSeriesValuesForDelta(
  valueObject: SeriesValueObject,
  startValueObject: SeriesValueObject,
  endValueObject: SeriesValueObject,
  valueDeltaObject: SeriesValueDelta,
  valueKey: PositionOrComputedKey | ExtraKey,
  deltaPercentage: number,
  percentage: number
): void {
  const valueDelta = valueDeltaObject[valueKey] as NumericValuesDelta;
  if (valueDelta.deltaPercentage < deltaPercentage) {
    valueObject[valueKey] = endValueObject[valueKey];
  }
  else {
    valueObject[valueKey] = getValuesForDelta(
      startValueObject[valueKey] as NumericValues,
      valueDelta.deltas!,
      valueDelta.deltaFactor! * percentage
    );
  }
}

function setFilteredValueSeriesValuesForDelta(
  valueObject: SeriesValueObject,
  startValueObject: SeriesValueObject,
  endValueObject: SeriesValueObject,
  valueDeltaObject: SeriesValueDelta,
  rawValueObject: SeriesValueObject,
  valueKey: PositionOrComputedKey | ExtraKey,
  deltaPercentage: number,
  percentage: number
): void {
  const valueDelta = valueDeltaObject[valueKey] as NumericValuesDelta;
  if (valueDelta.deltaCopied === true) {
    valueObject[valueKey] = rawValueObject[valueKey];
  }
  else if (valueDelta.deltaPercentage < deltaPercentage) {
    valueObject[valueKey] = endValueObject[valueKey];
  }
  else {
    valueObject[valueKey] = getValuesForDelta(
      startValueObject[valueKey] as NumericValues,
      valueDelta.deltas!,
      valueDelta.deltaFactor! * percentage
    );
  }
}

function getValuesForDelta(startValues: number[], valueDeltas: number[], percentage: number): number[];
function getValuesForDelta(startValues: NumericValues, valueDeltas: number[], percentage: number): NumericValues;
function getValuesForDelta(startValues: NumericValues, valueDeltas: number[], percentage: number): NumericValues {
  const values = startValues.slice();
  let i, count = startValues.length;
  for (i=0; i<count; i++) {
    if (valueDeltas[i] !== 0) {
      values[i] = values[i]! + valueDeltas[i] * percentage;
    }
  }
  return values;
}
