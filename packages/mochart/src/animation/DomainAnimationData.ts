import { getDomainExtents, getMaxDomain, copyDomain } from '../data/DomainData';

import { getGroupDataWithAxisDomain, getGroupDataWithNumericValues } from '../data/GroupData';

import { getChartDataWithData, getChartDataWithAxisDomains, getChartDataWithSeriesData } from '../data/ChartData';

import { getSeriesDataWithAxisDomains, getSeriesDataWithAxisBases, getSeriesDataWithDomains, getSeriesAxisBases } from '../data/SeriesData';

import { domainKeys } from '../data/constants';

import { hasGroupAdditions, hasGroupRemovals, getExpansionGroupValueDeltaData, getCollapseGroupValueDeltaData } from './GroupAnimationData';

import { mapMap } from '../utils/utils';

import { SCALE_ORDINAL, SCALE_LINEAR, TYPE_DATE } from '../config/core/constants';
import type { AxisDomains, ChartData, GroupAxisDomain, NullableDomain, SeriesDomainObject, SeriesDomainObjects } from '../types/data';
import type { GroupAxisConfig, MochartConfig, SeriesAxisConfig, SeriesConfig } from '../types/config';
import type {
  AxisDeltaData, CompleteNumericArrayDelta, DomainDelta, DomainDeltaMap, GroupDeltaData,
  NumericDomain, SeriesDomainDelta, SeriesDomainDeltaMap
} from '../types/animation';

/**
 *
 * Various constants
 *
 **/

const emptyGroupAxisDomainDelta = {
  deltaPercentage: 0,
  delta: null
};

const emptySeriesAxisDomainDelta = {
  deltaPercentage: 0,
  deltas: null
};

const emptySeriesDomainDelta = {
  deltaPercentage: 0,
  deltas: null
};

export const emptyAxisDeltaData = {
  start: null,
  deltaPercentage: 0,
  deltas: null,
  end: null
};

/**
 *
 * Various utility functions
 *
 **/

function getPositiveDomainDelta(fromDomain: NullableDomain, toDomain: NullableDomain): NumericDomain {
  let domainDelta: NumericDomain = [0,0];
  const fromMin = fromDomain[0]!;
  const fromMax = fromDomain[1]!;
  const toMin = toDomain[0]!;
  const toMax = toDomain[1]!;
  if (toMin < fromMin) {
    domainDelta[0] = toMin - fromMin;
  }
  if (toMax > fromMax) {
    domainDelta[1] = toMax - fromMax;
  }
  return domainDelta;
}

function getPositiveDomainDeltaPercentage(domainDelta: NumericDomain, domainExtent: number): number {
  if (domainDelta[0] < 0 || domainDelta[1] > 0) {
    let domainDeltaExtent = Math.abs(domainDelta[0]) + domainDelta[1];
    return domainDeltaExtent / (domainDeltaExtent + domainExtent);
  }
  else {
    return 0;
  }
}

function getDomainExtentWithValueGetter(domain: GroupAxisDomain, getValue: (value: GroupAxisDomain[number]) => number): number {
  return getValue(domain[1]) - getValue(domain[0]);
}

export function getMaxAxisDomains(domains: AxisDomains, otherDomains: AxisDomains): AxisDomains {
  let maxDomains: AxisDomains = {};
  let axisIds = Object.keys(domains);
  for (let axisId of axisIds) {
    maxDomains[axisId] = getMaxDomain(domains[axisId], otherDomains[axisId]);
  }
  return maxDomains;
}

function getMaxSeriesDomain(domainObject: SeriesDomainObject, otherDomainObject: SeriesDomainObject): SeriesDomainObject {
  let newDomainObject: SeriesDomainObject = {};
  let i, length = domainKeys.length, key;
  for (i=0; i<length; i++) {
    key = domainKeys[i];
    newDomainObject[key] = getMaxDomain(domainObject[key], otherDomainObject[key]);
  }
  return newDomainObject;
}

function getMaxSeriesDomains(domainObjects: SeriesDomainObjects, otherDomainObjects: SeriesDomainObjects): SeriesDomainObjects {
  let newDomainObjects: SeriesDomainObjects = {};
  let seriesIds = Object.keys(domainObjects);
  let i, count = domainObjects.length;
  for (let seriesId of seriesIds) {
    newDomainObjects[seriesId] = getMaxSeriesDomain(domainObjects[seriesId], otherDomainObjects[seriesId]);
  }
  return newDomainObjects;
}

function copySeriesAxisDomains(seriesAxisDomains: AxisDomains): AxisDomains {
  return mapMap<NullableDomain, NullableDomain>(seriesAxisDomains, x => copyDomain(x));
}

function copySeriesDomains(seriesDomainObjects: SeriesDomainObjects): SeriesDomainObjects {
  return mapMap(seriesDomainObjects, x => copySeriesDomain(x));
}

function copySeriesDomain(seriesDomainObject: SeriesDomainObject): SeriesDomainObject {
  let domainObject: SeriesDomainObject = {};
  for (let key of domainKeys) {
    domainObject[key] = copyDomain(seriesDomainObject[key]);
  }
  return domainObject;
}

/**
 *
 * Main axis/domain animation functions
 *
 **/

export function getTransitionAxisExpansionData(mochartConfig: MochartConfig, prevChartData: ChartData, newChartData: ChartData, groupDeltaData: GroupDeltaData): AxisDeltaData {
  let finalChartData = prevChartData;
  let endChartData = prevChartData;
  let finalGroupData = prevChartData.groupData;
  let endGroupData = prevChartData.groupData;
  let finalGroupAxisDomain = prevChartData.groupData.axisDomain;

  let groupValueDeltaData: CompleteNumericArrayDelta | null = null;

  let startGroupAxisDomain: GroupAxisDomain, endGroupAxisDomain: GroupAxisDomain;

  const { groupAxisConfig, seriesAxisConfigs, seriesConfigs } = mochartConfig;

  if (groupAxisConfig.scale === SCALE_ORDINAL) {
    if (hasGroupAdditions(groupDeltaData)) {
      startGroupAxisDomain = prevChartData.groupData.axisDomain;
      endGroupAxisDomain = [0, (groupDeltaData.indices.old.length + groupDeltaData.indices.added.length) - 1];
    }
    else {
      startGroupAxisDomain = prevChartData.groupData.axisDomain;
      endGroupAxisDomain = prevChartData.groupData.axisDomain;
    }
  }
  else {
    startGroupAxisDomain = copyDomain(prevChartData.groupData.axisDomain);
    endGroupAxisDomain = getMaxDomain(prevChartData.groupData.axisDomain, newChartData.groupData.axisDomain);
    setBaseDomainForChanges(startGroupAxisDomain, endGroupAxisDomain);
  }

  let groupAxisDomainDelta = getGroupAxisDomainDelta(groupAxisConfig, startGroupAxisDomain, endGroupAxisDomain);
  if (groupAxisDomainDelta.deltaPercentage !== 0) {
    finalGroupAxisDomain = endGroupAxisDomain;
    groupValueDeltaData = getExpansionGroupValueDeltaData(groupAxisConfig, groupDeltaData, prevChartData, newChartData, endGroupAxisDomain);

    endGroupData = getGroupDataWithAxisDomain(prevChartData.groupData, endGroupAxisDomain);
    finalGroupData = getGroupDataWithAxisDomain(prevChartData.groupData, finalGroupAxisDomain);

    if (groupValueDeltaData !== null) {
      endGroupData = getGroupDataWithNumericValues(endGroupData, groupValueDeltaData.end);
      finalGroupData = getGroupDataWithNumericValues(finalGroupData, groupValueDeltaData.end);
    }
  }

  let finalSeriesData = prevChartData.seriesData;
  let endSeriesData = prevChartData.seriesData;
  let finalRawSeriesAxisDomains = prevChartData.seriesData.raw.axisDomains;
  let finalFilteredSeriesAxisDomains = prevChartData.seriesData.filtered.axisDomains;
  let finalSeriesAxisBases = prevChartData.seriesData.axisBases;

  let startRawSeriesAxisDomains = copySeriesAxisDomains(prevChartData.seriesData.raw.axisDomains);
  let startFilteredSeriesAxisDomains = copySeriesAxisDomains(prevChartData.seriesData.filtered.axisDomains);
  let endRawSeriesAxisDomains = copySeriesAxisDomains(newChartData.seriesData.raw.axisDomains);
  let endFilteredSeriesAxisDomains = copySeriesAxisDomains(newChartData.seriesData.filtered.axisDomains);
  setAllBaseAxisDomainsForChanges(startRawSeriesAxisDomains, endRawSeriesAxisDomains);
  setAllBaseAxisDomainsForChanges(startFilteredSeriesAxisDomains, endFilteredSeriesAxisDomains);

  let rawSeriesAxisExtents = getDomainExtents(startRawSeriesAxisDomains);
  let filteredSeriesAxisExtents = getDomainExtents(startFilteredSeriesAxisDomains);
  let rawSeriesAxisDomainDeltas = getSeriesAxisDomainDeltas(startRawSeriesAxisDomains, endRawSeriesAxisDomains, rawSeriesAxisExtents);
  let filteredSeriesAxisDomainDeltas = getSeriesAxisDomainDeltas(startFilteredSeriesAxisDomains, endFilteredSeriesAxisDomains, filteredSeriesAxisExtents);

  if (rawSeriesAxisDomainDeltas.deltaPercentage !== 0) {
    endRawSeriesAxisDomains = getMaxAxisDomains(startRawSeriesAxisDomains, endRawSeriesAxisDomains);
    finalRawSeriesAxisDomains = getMaxAxisDomains(prevChartData.seriesData.raw.axisDomains, newChartData.seriesData.raw.axisDomains);
  }
  else {
    endRawSeriesAxisDomains = startRawSeriesAxisDomains;
  }
  if (filteredSeriesAxisDomainDeltas.deltaPercentage !== 0) {
    endFilteredSeriesAxisDomains = getMaxAxisDomains(startFilteredSeriesAxisDomains, endFilteredSeriesAxisDomains);
    finalFilteredSeriesAxisDomains = getMaxAxisDomains(prevChartData.seriesData.filtered.axisDomains, newChartData.seriesData.filtered.axisDomains);
    finalSeriesAxisBases = getSeriesAxisBases(seriesAxisConfigs, finalRawSeriesAxisDomains, finalFilteredSeriesAxisDomains);
  }
  else {
    endFilteredSeriesAxisDomains = startFilteredSeriesAxisDomains;
  }

  let finalRawSeriesDomains = prevChartData.seriesData.raw.domains;
  let finalFilteredSeriesDomains = prevChartData.seriesData.filtered.domains;

  let startRawSeriesDomains = copySeriesDomains(prevChartData.seriesData.raw.domains);
  let startFilteredSeriesDomains = copySeriesDomains(prevChartData.seriesData.filtered.domains);
  let endRawSeriesDomains = copySeriesDomains(newChartData.seriesData.raw.domains);
  let endFilteredSeriesDomains = copySeriesDomains(newChartData.seriesData.filtered.domains);
  setAllBaseSeriesDomainsForChanges(startRawSeriesDomains, endRawSeriesDomains);
  setAllBaseSeriesDomainsForChanges(startFilteredSeriesDomains, endFilteredSeriesDomains);

  let rawSeriesDomainDeltas = getSeriesDomainDeltas(seriesConfigs, startRawSeriesDomains, endRawSeriesDomains, rawSeriesAxisExtents);
  let filteredSeriesDomainDeltas = getSeriesDomainDeltas(seriesConfigs, startFilteredSeriesDomains, endFilteredSeriesDomains, filteredSeriesAxisExtents);

  if (rawSeriesDomainDeltas.deltaPercentage !== 0) {
    endRawSeriesDomains = getMaxSeriesDomains(startRawSeriesDomains, endRawSeriesDomains);
    finalRawSeriesDomains = getMaxSeriesDomains(prevChartData.seriesData.raw.domains, newChartData.seriesData.raw.domains)
  }
  else {
    endRawSeriesDomains = startRawSeriesDomains;
  }
  if (filteredSeriesDomainDeltas.deltaPercentage !== 0) {
    endFilteredSeriesDomains = getMaxSeriesDomains(startFilteredSeriesDomains, endFilteredSeriesDomains);
    finalFilteredSeriesDomains = getMaxSeriesDomains(prevChartData.seriesData.filtered.domains, newChartData.seriesData.filtered.domains)
  }
  else {
    endFilteredSeriesDomains = startFilteredSeriesDomains;
  }

  if (rawSeriesAxisDomainDeltas.deltaPercentage !== 0 || filteredSeriesAxisDomainDeltas.deltaPercentage !== 0 ||
      rawSeriesDomainDeltas.deltaPercentage !== 0 || filteredSeriesDomainDeltas.deltaPercentage !== 0) {
    endSeriesData = getSeriesDataWithAxisDomains(endSeriesData, endRawSeriesAxisDomains, endFilteredSeriesAxisDomains);
    endSeriesData = getSeriesDataWithDomains(endSeriesData, endRawSeriesDomains, endFilteredSeriesDomains);
    finalSeriesData = getSeriesDataWithAxisDomains(finalSeriesData, finalRawSeriesAxisDomains, finalFilteredSeriesAxisDomains);
    finalSeriesData = getSeriesDataWithAxisBases(finalSeriesData, finalSeriesAxisBases);
    finalSeriesData = getSeriesDataWithDomains(finalSeriesData, finalRawSeriesDomains, finalFilteredSeriesDomains);
  }

  if (groupAxisDomainDelta.deltaPercentage !== 0 || rawSeriesAxisDomainDeltas.deltaPercentage !== 0 || filteredSeriesAxisDomainDeltas.deltaPercentage !== 0 ||
    rawSeriesDomainDeltas.deltaPercentage !== 0 || filteredSeriesDomainDeltas.deltaPercentage !== 0) {
    finalChartData = getChartDataWithData(prevChartData, finalGroupData, finalSeriesData);
    endChartData = getChartDataWithData(prevChartData, endGroupData, endSeriesData);
  }

  let startChartData = getChartDataWithAxisDomains(prevChartData, startGroupAxisDomain, startRawSeriesAxisDomains, startFilteredSeriesAxisDomains);
  startChartData = getChartDataWithSeriesData(startChartData, getSeriesDataWithDomains(startChartData.seriesData, startRawSeriesDomains, startFilteredSeriesDomains));

  adjustFilteredAxisDomainDeltas(seriesAxisConfigs, rawSeriesAxisDomainDeltas, filteredSeriesAxisDomainDeltas);

  return createAxisDeltaData(startChartData, endChartData, finalChartData, groupAxisDomainDelta, rawSeriesAxisDomainDeltas,
    filteredSeriesAxisDomainDeltas, rawSeriesDomainDeltas, filteredSeriesDomainDeltas, groupValueDeltaData);
}

export function getTransitionAxisCollapseData(mochartConfig: MochartConfig, prevChartData: ChartData, newChartData: ChartData, groupDeltaData: GroupDeltaData): AxisDeltaData {
  let startGroupData = newChartData.groupData;
  let endGroupData = newChartData.groupData;

  let groupValueDeltaData: CompleteNumericArrayDelta | null = null;

  let startGroupAxisDomain = copyDomain(prevChartData.groupData.axisDomain);
  let endGroupAxisDomain = copyDomain(newChartData.groupData.axisDomain);
  setBaseDomainForChanges(startGroupAxisDomain, endGroupAxisDomain);

  const { groupAxisConfig, seriesAxisConfigs, seriesConfigs } = mochartConfig;

  let groupAxisDomainDelta = getGroupAxisDomainDelta(groupAxisConfig, endGroupAxisDomain, startGroupAxisDomain);
  if (groupAxisDomainDelta.deltaPercentage !== 0) {
    groupValueDeltaData = getCollapseGroupValueDeltaData(groupAxisConfig, groupDeltaData, prevChartData, newChartData, startGroupAxisDomain);

    startGroupData = getGroupDataWithAxisDomain(startGroupData, startGroupAxisDomain);
    endGroupData = getGroupDataWithAxisDomain(endGroupData, endGroupAxisDomain);
  }

  let startSeriesData = newChartData.seriesData;
  let endSeriesData = newChartData.seriesData;

  let startRawSeriesAxisDomains = copySeriesAxisDomains(prevChartData.seriesData.raw.axisDomains);
  let startFilteredSeriesAxisDomains = copySeriesAxisDomains(prevChartData.seriesData.filtered.axisDomains);
  let endRawSeriesAxisDomains = copySeriesAxisDomains(newChartData.seriesData.raw.axisDomains);
  let endFilteredSeriesAxisDomains = copySeriesAxisDomains(newChartData.seriesData.filtered.axisDomains);
  setAllBaseAxisDomainsForChanges(startRawSeriesAxisDomains, endRawSeriesAxisDomains);
  setAllBaseAxisDomainsForChanges(startFilteredSeriesAxisDomains, endFilteredSeriesAxisDomains);

  let rawSeriesAxisExtents = getDomainExtents(endRawSeriesAxisDomains);
  let filteredSeriesAxisExtents = getDomainExtents(endFilteredSeriesAxisDomains);
  let rawSeriesAxisDomainDeltas = getSeriesAxisDomainDeltas(endRawSeriesAxisDomains, startRawSeriesAxisDomains, rawSeriesAxisExtents);
  let filteredSeriesAxisDomainDeltas = getSeriesAxisDomainDeltas(endFilteredSeriesAxisDomains, startFilteredSeriesAxisDomains, filteredSeriesAxisExtents);

  let startRawSeriesDomains = copySeriesDomains(prevChartData.seriesData.raw.domains);
  let startFilteredSeriesDomains = copySeriesDomains(prevChartData.seriesData.filtered.domains);
  let endRawSeriesDomains = copySeriesDomains(newChartData.seriesData.raw.domains);
  let endFilteredSeriesDomains = copySeriesDomains(newChartData.seriesData.filtered.domains);
  setAllBaseSeriesDomainsForChanges(startRawSeriesDomains, endRawSeriesDomains);
  setAllBaseSeriesDomainsForChanges(startFilteredSeriesDomains, endFilteredSeriesDomains);

  let rawSeriesDomainDeltas = getSeriesDomainDeltas(seriesConfigs, endRawSeriesDomains, startRawSeriesDomains, rawSeriesAxisExtents);
  let filteredSeriesDomainDeltas = getSeriesDomainDeltas(seriesConfigs, endFilteredSeriesDomains, startFilteredSeriesDomains, filteredSeriesAxisExtents);

  if (rawSeriesAxisDomainDeltas.deltaPercentage !== 0 || filteredSeriesAxisDomainDeltas.deltaPercentage !== 0 ||
    rawSeriesDomainDeltas.deltaPercentage !== 0 || filteredSeriesDomainDeltas.deltaPercentage !== 0) {
    startSeriesData = getSeriesDataWithAxisDomains(startSeriesData, startRawSeriesAxisDomains, startFilteredSeriesAxisDomains);
    startSeriesData = getSeriesDataWithDomains(startSeriesData, startRawSeriesDomains, startFilteredSeriesDomains);
    endSeriesData = getSeriesDataWithAxisDomains(endSeriesData, endRawSeriesAxisDomains, endFilteredSeriesAxisDomains);
    endSeriesData = getSeriesDataWithDomains(endSeriesData, endRawSeriesDomains, endFilteredSeriesDomains);
  }

  let startChartData = getChartDataWithData(newChartData, startGroupData, startSeriesData);
  let endChartData = getChartDataWithData(newChartData, endGroupData, endSeriesData);

  adjustFilteredAxisDomainDeltas(seriesAxisConfigs, rawSeriesAxisDomainDeltas, filteredSeriesAxisDomainDeltas);

  return invertAxisDeltas(createAxisDeltaData(startChartData, endChartData, newChartData, groupAxisDomainDelta,
    rawSeriesAxisDomainDeltas, filteredSeriesAxisDomainDeltas, rawSeriesDomainDeltas, filteredSeriesDomainDeltas, groupValueDeltaData));
}

function adjustFilteredAxisDomainDeltas(seriesAxisConfigs: SeriesAxisConfig[], rawSeriesAxisDomainDeltas: DomainDeltaMap, filteredSeriesAxisDomainDeltas: DomainDeltaMap): void {
  if (filteredSeriesAxisDomainDeltas.deltaPercentage !== 0) {
    const { deltas: rawDeltas } = rawSeriesAxisDomainDeltas;
    const { deltas: filteredDeltas } = filteredSeriesAxisDomainDeltas;

    let newDeltaPercentage = 0;
    let filteredDeltaPercentage;

    for (let axisConfig of seriesAxisConfigs) {
      filteredDeltaPercentage = filteredDeltas![axisConfig.id]!.deltaPercentage;
      if (filteredDeltaPercentage !== 0 && !axisConfig.adjustForSuppression) {
        filteredDeltaPercentage = filteredDeltas![axisConfig.id]!.deltaPercentage = rawDeltas !== null ? rawDeltas[axisConfig.id]!.deltaPercentage : 0;
      }
      newDeltaPercentage = Math.max(newDeltaPercentage, filteredDeltaPercentage);
    }
    filteredSeriesAxisDomainDeltas.deltaPercentage = newDeltaPercentage;
  }
}

/**
 *
 * getAxisDeltaData functions
 *
 **/
function getSeriesAxisDomainDeltas(fromSeriesAxisDomains: AxisDomains, toSeriesAxisDomains: AxisDomains, fromSeriesAxisDomainExtents: Record<string, number>): DomainDeltaMap {
  let deltaPercentage = 0;
  const deltas: Record<string, DomainDelta> = {};

  let axisDelta, axisDeltaPercentage;
  const seriesAxisIds = Object.keys(fromSeriesAxisDomains);
  for (let id of seriesAxisIds) {
    axisDelta = getPositiveDomainDelta(fromSeriesAxisDomains[id], toSeriesAxisDomains[id]);
    axisDeltaPercentage = getPositiveDomainDeltaPercentage(axisDelta, fromSeriesAxisDomainExtents[id]);
    deltaPercentage = Math.max(deltaPercentage, axisDeltaPercentage);
    deltas[id] = {
      deltaPercentage: axisDeltaPercentage,
      delta: axisDelta
    };
  }
  return deltaPercentage === 0 ? emptySeriesAxisDomainDelta : {
    deltaPercentage,
    deltas
  };
}

function getGroupAxisDomainDelta(groupAxisConfig: GroupAxisConfig, fromGroupAxisDomain: GroupAxisDomain, toGroupAxisDomain: GroupAxisDomain): DomainDelta {
  let delta: NumericDomain = [0, 0];

  const getValue = (groupValue: GroupAxisDomain[number]): number => groupValue === null ? 0 : groupValue instanceof Date ? groupValue.getTime() : groupValue;

  if (getValue(toGroupAxisDomain[0]) < getValue(fromGroupAxisDomain[0])) {
    delta[0] = getValue(toGroupAxisDomain[0]) - getValue(fromGroupAxisDomain[0]);
  }
  if (getValue(toGroupAxisDomain[1]) > getValue(fromGroupAxisDomain[1])) {
    delta[1] = getValue(toGroupAxisDomain[1]) - getValue(fromGroupAxisDomain[1]);
  }

  let deltaPercentage = getPositiveDomainDeltaPercentage(delta, getDomainExtentWithValueGetter(fromGroupAxisDomain, getValue));

  return deltaPercentage === 0 ? emptyGroupAxisDomainDelta : {
    deltaPercentage,
    delta
  }
}

function getOrdinalGroupValueDeltaData(oldNumericValues: number[], newNumericValues: number[]): Omit<CompleteNumericArrayDelta, 'deltaPercentage'> {
  let deltas: number[] = [];
  let i, count = oldNumericValues.length;
  for (i=0; i<count; i++) {
    deltas.push(newNumericValues[i] - oldNumericValues[i]);
  }
  return {
    start: oldNumericValues,
    deltas,
    end: newNumericValues
  }
}

function getSeriesDomainDeltas(seriesConfigs: SeriesConfig[], fromDomainObjects: SeriesDomainObjects, toDomainObjects: SeriesDomainObjects, fromAxisExtents: Record<string, number>): SeriesDomainDeltaMap {
  let deltaPercentage = 0;
  let deltas: Record<string, SeriesDomainDelta> = {};
  let domainDelta, domainDeltaPercentage;
  for (let seriesConfig of seriesConfigs) {
    const { id } = seriesConfig;
    domainDelta = getSeriesDomainDelta(fromDomainObjects[id]!, toDomainObjects[id]!, fromAxisExtents[seriesConfig.axis!]!);
    deltaPercentage = Math.max(deltaPercentage, domainDelta.deltaPercentage);
    deltas[id] = domainDelta;
  }
  return deltaPercentage === 0 ? emptySeriesDomainDelta : {
    deltaPercentage,
    deltas
  };
}

function getSeriesDomainDelta(fromDomainObject: SeriesDomainObject, toDomainObject: SeriesDomainObject, fromAxisExtent: number): SeriesDomainDelta {
  let newDomainObject = {} as SeriesDomainDelta;
  let deltaPercentage = 0;
  let key, domainDelta, domainDeltaPercentage;
  let i, length = domainKeys.length;
  for (i=0; i<length; i++) {
    key = domainKeys[i];
    domainDelta = getPositiveDomainDelta(fromDomainObject[key], toDomainObject[key]);
    domainDeltaPercentage = getPositiveDomainDeltaPercentage(domainDelta, fromAxisExtent);
    deltaPercentage = Math.max(deltaPercentage, domainDeltaPercentage);
    newDomainObject[key] ={
      deltaPercentage: domainDeltaPercentage,
      delta: domainDelta
    };
  }
  newDomainObject.deltaPercentage = deltaPercentage;
  return newDomainObject;
}

function createAxisDeltaData(startChartData: ChartData, endChartData: ChartData, finalChartData: ChartData, groupAxisDomainDelta: DomainDelta, rawSeriesAxisDomainDeltas: DomainDeltaMap,
                             filteredSeriesAxisDomainDeltas: DomainDeltaMap, rawSeriesDomainDeltas: SeriesDomainDeltaMap, filteredSeriesDomainDeltas: SeriesDomainDeltaMap, groupValueDeltaData: CompleteNumericArrayDelta | null): AxisDeltaData {
  let deltaPercentage = Math.max(groupAxisDomainDelta.deltaPercentage, rawSeriesAxisDomainDeltas.deltaPercentage,
    filteredSeriesAxisDomainDeltas.deltaPercentage, rawSeriesDomainDeltas.deltaPercentage, groupValueDeltaData ? groupValueDeltaData.deltaPercentage : 0);
  setDeltaFactor(groupAxisDomainDelta, deltaPercentage);
  setGroupValueDeltaFactor(groupValueDeltaData, deltaPercentage);
  setAxisDeltaFactors(rawSeriesAxisDomainDeltas, deltaPercentage);
  setAxisDeltaFactors(filteredSeriesAxisDomainDeltas, deltaPercentage);
  setDomainDeltaFactors(rawSeriesDomainDeltas, deltaPercentage);
  setDomainDeltaFactors(filteredSeriesDomainDeltas, deltaPercentage);

  return {
    start: startChartData,
    deltaPercentage,
    deltas: {
      domain: {
        axis: {
          group: groupAxisDomainDelta,
          series: {
            raw: rawSeriesAxisDomainDeltas,
            filtered: filteredSeriesAxisDomainDeltas
          }
        },
        series: {
          raw: rawSeriesDomainDeltas,
          filtered: filteredSeriesDomainDeltas
        }
      },
      values: {
        group: groupValueDeltaData
      }
    },
    end: endChartData,
    final: finalChartData
  };
}

function setDeltaFactor(deltaObject: { deltaPercentage: number; deltaFactor?: number }, deltaPercentage: number): void {
  if (deltaObject.deltaPercentage === 0) {
    deltaObject.deltaFactor = 0;
  }
  else {
    deltaObject.deltaFactor = deltaPercentage / deltaObject.deltaPercentage;
  }
}

function setGroupValueDeltaFactor(deltaObject: CompleteNumericArrayDelta | null, deltaPercentage: number): void {
  if (deltaObject) {
    setDeltaFactor(deltaObject, deltaPercentage);
  }
}

function setAxisDeltaFactors(axisDeltaObjectHolder: DomainDeltaMap, deltaPercentage: number): void {
  if (axisDeltaObjectHolder.deltas !== null) {
    let axisDeltaObjects = axisDeltaObjectHolder.deltas;
    let axisIds = Object.keys(axisDeltaObjects);
    for (let axisId of axisIds) {
      setDeltaFactor(axisDeltaObjects[axisId], deltaPercentage);
    }
  }
}

function setDomainDeltaFactors(domainDeltaObjectHolder: SeriesDomainDeltaMap, deltaPercentage: number): void {
  if (domainDeltaObjectHolder.deltas !== null) {
    let domainDeltaObjects = domainDeltaObjectHolder.deltas;
    let seriesIds = Object.keys(domainDeltaObjects);
    for (let seriesId of seriesIds) {
      setDomainDeltaFactor(domainDeltaObjects[seriesId], deltaPercentage);
    }
  }
}

function setDomainDeltaFactor(domainDeltaObject: SeriesDomainDelta, deltaPercentage: number): void {
  setDeltaFactor(domainDeltaObject, deltaPercentage);
  for (let key of domainKeys) {
    setDeltaFactor(domainDeltaObject[key], deltaPercentage);
  }
}

function invertAxisDeltas(axisDeltaData: AxisDeltaData): AxisDeltaData {
  if (axisDeltaData.deltas.domain.axis.group.delta !== null) {
    invertDomainDeltas(axisDeltaData.deltas.domain.axis.group.delta);
  }
  let rawSeriesAxisDeltas = axisDeltaData.deltas.domain.axis.series.raw.deltas;
  if (rawSeriesAxisDeltas !== null) {
    let axisIds = Object.keys(rawSeriesAxisDeltas);
    for (let axisId of axisIds) {
      invertDomainDeltas(rawSeriesAxisDeltas[axisId].delta!);
    }
  }
  let filteredSeriesAxisDeltas = axisDeltaData.deltas.domain.axis.series.filtered.deltas;
  if (filteredSeriesAxisDeltas !== null) {
    let axisIds = Object.keys(filteredSeriesAxisDeltas);
    for (let axisId of axisIds) {
      invertDomainDeltas(filteredSeriesAxisDeltas[axisId].delta!);
    }
  }
  let rawSeriesDomainDeltas = axisDeltaData.deltas.domain.series.raw.deltas;
  if (rawSeriesDomainDeltas !== null) {
    invertSeriesDomainDeltas(rawSeriesDomainDeltas);
  }
  let filteredSeriesDomainDeltas = axisDeltaData.deltas.domain.series.filtered.deltas;
  if (filteredSeriesDomainDeltas !== null) {
    invertSeriesDomainDeltas(filteredSeriesDomainDeltas);
  }
  return axisDeltaData;
}

function invertSeriesDomainDeltas(seriesDomainDeltas: Record<string, SeriesDomainDelta>): void {
  let seriesIds = Object.keys(seriesDomainDeltas);
  for (let seriesId of seriesIds) {
    invertSeriesDomainDeltaObject(seriesDomainDeltas[seriesId]);
  }
}

function invertSeriesDomainDeltaObject(seriesDomainDeltaObject: SeriesDomainDelta): void {
  for (let key of domainKeys) {
    invertDomainDeltas(seriesDomainDeltaObject[key].delta!);
  }
}

function invertDomainDeltas(domainDelta: NumericDomain): void {
  domainDelta[0] = domainDelta[0] === 0 ? 0 : -1 * domainDelta[0];
  domainDelta[1] = domainDelta[1] === 0 ? 0 : -1 * domainDelta[1];
}

function setAllBaseAxisDomainsForChanges(startAxisDomains: AxisDomains, endAxisDomains: AxisDomains): void {
  let axisIds = Object.keys(startAxisDomains);
  for (let axisId of axisIds) {
    setBaseDomainForChanges(startAxisDomains[axisId], endAxisDomains[axisId]);
  }
}

function setBaseDomainForChanges<T extends number | Date>(startAxisDomain: NullableDomain<T>, endAxisDomain: NullableDomain<T>): void {
  if (startAxisDomain[0] === null) {
    if (endAxisDomain[0] !== null) {
      startAxisDomain[0] = startAxisDomain[1] = endAxisDomain[0];
    }
  }
  else if (endAxisDomain[0] === null) {
    endAxisDomain[0] = endAxisDomain[1] = startAxisDomain[0];
  }
}

function setAllBaseSeriesDomainsForChanges(startDomainObjects: SeriesDomainObjects, endDomainObjects: SeriesDomainObjects): void {
  let seriesIds = Object.keys(startDomainObjects);
  for (let seriesId of seriesIds) {
    setBaseSeriesDomainForChanges(startDomainObjects[seriesId], endDomainObjects[seriesId]);
  }
}

function setBaseSeriesDomainForChanges(startDomainObject: SeriesDomainObject, endDomainObject: SeriesDomainObject): void {
  for (let key of domainKeys) {
    setBaseKeyedSeriesDomainForChanges(startDomainObject, endDomainObject, key);
  }
}

function setBaseKeyedSeriesDomainForChanges(startDomainObject: SeriesDomainObject, endDomainObject: SeriesDomainObject, valueKey: string): void {
  setBaseDomainForChanges(startDomainObject[valueKey], endDomainObject[valueKey]);
}
