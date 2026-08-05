import { getDomainExtents, getMaxDomain, copyDomain } from '../data/DomainData';

import { getCategoryDataWithAxisDomain, getCategoryDataWithNumericValues } from '../data/CategoryData';

import { getChartDataWithData, getChartDataWithAxisDomains, getChartDataWithSeriesData } from '../data/ChartData';

import { getSeriesDataWithAxisDomains, getSeriesDataWithAxisBases, getSeriesDataWithDomains, getValueAxisBases } from '../data/SeriesData';

import { domainKeys } from '../data/constants';

import { hasCategoryAdditions, getExpansionCategoryValueDeltaData, getContractionCategoryValueDeltaData } from './CategoryAnimationData';

import { mapMap } from '../utils/utils';

import { SCALE_ORDINAL } from '../config/core/constants';
import type { AxisDomains, ChartData, CategoryAxisDomain, NullableDomain, SeriesDomainObject, SeriesDomainObjects, SeriesValueObjects } from '../types/data';
import type { EnhancedMochartConfig, EnhancedSeriesConfig, EnhancedValueAxisConfig } from '../types/enhanced';
import type {
  AxisDeltaData, CompleteNumericArrayDelta, DomainDelta, DomainDeltaMap, CategoryDeltaData,
  NumericDomain, SeriesDomainDelta, SeriesDomainDeltaMap
} from '../types/animation';

/**
 *
 * Various constants
 *
 **/

const emptyCategoryAxisDomainDelta = {
  deltaPercentage: 0,
  delta: null
};

const emptyValueAxisDomainDelta = {
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
  const domainDelta: NumericDomain = [0,0];
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
    const domainDeltaExtent = Math.abs(domainDelta[0]) + domainDelta[1];
    return domainDeltaExtent / (domainDeltaExtent + domainExtent);
  }
  else {
    return 0;
  }
}

function getDomainExtentWithValueGetter(domain: CategoryAxisDomain, getValue: (value: CategoryAxisDomain[number]) => number): number {
  return getValue(domain[1]) - getValue(domain[0]);
}

export function getMaxAxisDomains(domains: AxisDomains, otherDomains: AxisDomains): AxisDomains {
  const maxDomains: AxisDomains = Object.create(null);
  const axisIds = Object.keys(domains);
  for (const axisId of axisIds) {
    maxDomains[axisId] = getMaxDomain(domains[axisId], otherDomains[axisId]);
  }
  return maxDomains;
}

function getMaxSeriesDomain(domainObject: SeriesDomainObject, otherDomainObject: SeriesDomainObject): SeriesDomainObject {
  const newDomainObject: SeriesDomainObject = {};
  for (const key of domainKeys) {
    newDomainObject[key] = getMaxDomain(domainObject[key], otherDomainObject[key]);
  }
  return newDomainObject;
}

function getMaxSeriesDomains(domainObjects: SeriesDomainObjects, otherDomainObjects: SeriesDomainObjects): SeriesDomainObjects {
  const newDomainObjects: SeriesDomainObjects = Object.create(null);
  const seriesIds = Object.keys(domainObjects);
  for (const seriesId of seriesIds) {
    newDomainObjects[seriesId] = getMaxSeriesDomain(domainObjects[seriesId], otherDomainObjects[seriesId]);
  }
  return newDomainObjects;
}

function copyValueAxisDomains(valueAxisDomains: AxisDomains): AxisDomains {
  return mapMap<NullableDomain, NullableDomain>(valueAxisDomains, x => copyDomain(x));
}

function copySeriesDomains(seriesDomainObjects: SeriesDomainObjects): SeriesDomainObjects {
  return mapMap(seriesDomainObjects, x => copySeriesDomain(x));
}

function copySeriesDomain(seriesDomainObject: SeriesDomainObject): SeriesDomainObject {
  const domainObject: SeriesDomainObject = {};
  for (const key of domainKeys) {
    domainObject[key] = copyDomain(seriesDomainObject[key]);
  }
  return domainObject;
}

/**
 *
 * Main axis/domain animation functions
 *
 **/

export function getTransitionAxisExpansionData(mochartConfig: EnhancedMochartConfig, prevChartData: ChartData, newChartData: ChartData, categoryDeltaData: CategoryDeltaData): AxisDeltaData {
  let finalChartData = prevChartData;
  let endChartData = prevChartData;
  let finalCategoryData = prevChartData.categoryData;
  let endCategoryData = prevChartData.categoryData;
  let finalCategoryAxisDomain = prevChartData.categoryData.axisDomain;

  let categoryValueDeltaData: CompleteNumericArrayDelta | null = null;

  let startCategoryAxisDomain: CategoryAxisDomain, endCategoryAxisDomain: CategoryAxisDomain;

  const { categoryAxis: categoryAxisConfig, valueAxes: valueAxisConfigs, series: seriesConfigs } = mochartConfig;

  if (categoryAxisConfig.scale === SCALE_ORDINAL) {
    if (hasCategoryAdditions(categoryDeltaData)) {
      startCategoryAxisDomain = prevChartData.categoryData.axisDomain;
      endCategoryAxisDomain = [0, (categoryDeltaData.indices.old.length + categoryDeltaData.indices.added.length) - 1];
    }
    else {
      startCategoryAxisDomain = prevChartData.categoryData.axisDomain;
      endCategoryAxisDomain = prevChartData.categoryData.axisDomain;
    }
  }
  else {
    startCategoryAxisDomain = copyDomain(prevChartData.categoryData.axisDomain);
    endCategoryAxisDomain = getMaxDomain(prevChartData.categoryData.axisDomain, newChartData.categoryData.axisDomain);
    setBaseDomainForChanges(startCategoryAxisDomain, endCategoryAxisDomain);
  }

  const categoryAxisDomainDelta = getCategoryAxisDomainDelta(startCategoryAxisDomain, endCategoryAxisDomain);
  if (categoryAxisDomainDelta.deltaPercentage !== 0) {
    finalCategoryAxisDomain = endCategoryAxisDomain;
    categoryValueDeltaData = getExpansionCategoryValueDeltaData(categoryAxisConfig, categoryDeltaData, prevChartData, newChartData, endCategoryAxisDomain);

    endCategoryData = getCategoryDataWithAxisDomain(prevChartData.categoryData, endCategoryAxisDomain);
    finalCategoryData = getCategoryDataWithAxisDomain(prevChartData.categoryData, finalCategoryAxisDomain);

    if (categoryValueDeltaData !== null) {
      endCategoryData = getCategoryDataWithNumericValues(endCategoryData, categoryValueDeltaData.end);
      finalCategoryData = getCategoryDataWithNumericValues(finalCategoryData, categoryValueDeltaData.end);
    }
  }

  let finalSeriesData = prevChartData.seriesData;
  let endSeriesData = prevChartData.seriesData;
  let finalRawValueAxisDomains = prevChartData.seriesData.raw.axisDomains;
  let finalFilteredValueAxisDomains = prevChartData.seriesData.filtered.axisDomains;
  let finalValueAxisBases = prevChartData.seriesData.axisBases;

  const startRawValueAxisDomains = copyValueAxisDomains(prevChartData.seriesData.raw.axisDomains);
  const startFilteredValueAxisDomains = copyValueAxisDomains(prevChartData.seriesData.filtered.axisDomains);
  let endRawValueAxisDomains = copyValueAxisDomains(newChartData.seriesData.raw.axisDomains);
  let endFilteredValueAxisDomains = copyValueAxisDomains(newChartData.seriesData.filtered.axisDomains);
  setAllBaseAxisDomainsForChanges(startRawValueAxisDomains, endRawValueAxisDomains);
  setAllBaseAxisDomainsForChanges(startFilteredValueAxisDomains, endFilteredValueAxisDomains);

  const rawValueAxisExtents = getDomainExtents(startRawValueAxisDomains);
  const filteredValueAxisExtents = getDomainExtents(startFilteredValueAxisDomains);
  const rawValueAxisDomainDeltas = getValueAxisDomainDeltas(startRawValueAxisDomains, endRawValueAxisDomains, rawValueAxisExtents);
  const filteredValueAxisDomainDeltas = getValueAxisDomainDeltas(startFilteredValueAxisDomains, endFilteredValueAxisDomains, filteredValueAxisExtents);

  if (rawValueAxisDomainDeltas.deltaPercentage !== 0) {
    endRawValueAxisDomains = getMaxAxisDomains(startRawValueAxisDomains, endRawValueAxisDomains);
    finalRawValueAxisDomains = getMaxAxisDomains(prevChartData.seriesData.raw.axisDomains, newChartData.seriesData.raw.axisDomains);
  }
  else {
    endRawValueAxisDomains = startRawValueAxisDomains;
  }
  if (filteredValueAxisDomainDeltas.deltaPercentage !== 0) {
    endFilteredValueAxisDomains = getMaxAxisDomains(startFilteredValueAxisDomains, endFilteredValueAxisDomains);
    finalFilteredValueAxisDomains = getMaxAxisDomains(prevChartData.seriesData.filtered.axisDomains, newChartData.seriesData.filtered.axisDomains);
    finalValueAxisBases = getValueAxisBases(valueAxisConfigs, finalRawValueAxisDomains, finalFilteredValueAxisDomains);
  }
  else {
    endFilteredValueAxisDomains = startFilteredValueAxisDomains;
  }

  let finalRawSeriesDomains = prevChartData.seriesData.raw.domains;
  let finalFilteredSeriesDomains = prevChartData.seriesData.filtered.domains;

  const startRawSeriesDomains = copySeriesDomains(prevChartData.seriesData.raw.domains);
  const startFilteredSeriesDomains = copySeriesDomains(prevChartData.seriesData.filtered.domains);
  let endRawSeriesDomains = copySeriesDomains(newChartData.seriesData.raw.domains);
  let endFilteredSeriesDomains = copySeriesDomains(newChartData.seriesData.filtered.domains);
  setAllBaseSeriesDomainsForChanges(startRawSeriesDomains, endRawSeriesDomains);
  setAllBaseSeriesDomainsForChanges(startFilteredSeriesDomains, endFilteredSeriesDomains);

  const rawSeriesDomainDeltas = getSeriesDomainDeltas(seriesConfigs, startRawSeriesDomains, endRawSeriesDomains, rawValueAxisExtents);
  const filteredSeriesDomainDeltas = getSeriesDomainDeltas(seriesConfigs, startFilteredSeriesDomains, endFilteredSeriesDomains, filteredValueAxisExtents);

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

  if (rawValueAxisDomainDeltas.deltaPercentage !== 0 || filteredValueAxisDomainDeltas.deltaPercentage !== 0 ||
      rawSeriesDomainDeltas.deltaPercentage !== 0 || filteredSeriesDomainDeltas.deltaPercentage !== 0) {
    endSeriesData = getSeriesDataWithAxisDomains(endSeriesData, endRawValueAxisDomains, endFilteredValueAxisDomains);
    endSeriesData = getSeriesDataWithDomains(endSeriesData, endRawSeriesDomains, endFilteredSeriesDomains);
    finalSeriesData = getSeriesDataWithAxisDomains(finalSeriesData, finalRawValueAxisDomains, finalFilteredValueAxisDomains);
    finalSeriesData = getSeriesDataWithAxisBases(finalSeriesData, finalValueAxisBases);
    finalSeriesData = getSeriesDataWithDomains(finalSeriesData, finalRawSeriesDomains, finalFilteredSeriesDomains);
  }

  if (categoryAxisDomainDelta.deltaPercentage !== 0 || rawValueAxisDomainDeltas.deltaPercentage !== 0 || filteredValueAxisDomainDeltas.deltaPercentage !== 0 ||
    rawSeriesDomainDeltas.deltaPercentage !== 0 || filteredSeriesDomainDeltas.deltaPercentage !== 0) {
    finalChartData = getChartDataWithData(prevChartData, finalCategoryData, finalSeriesData);
    endChartData = getChartDataWithData(prevChartData, endCategoryData, endSeriesData);
  }

  let startChartData = getChartDataWithAxisDomains(prevChartData, startCategoryAxisDomain, startRawValueAxisDomains, startFilteredValueAxisDomains);
  startChartData = getChartDataWithSeriesData(startChartData, getSeriesDataWithDomains(startChartData.seriesData, startRawSeriesDomains, startFilteredSeriesDomains));

  adjustFilteredAxisDomainDeltas(valueAxisConfigs, rawValueAxisDomainDeltas, filteredValueAxisDomainDeltas);

  // series hidden at the start of the expansion render nothing during it, so they must not stretch its duration
  const filteredSeriesPacingDeltaPercentage = getVisibleSeriesPacingDeltaPercentage(filteredSeriesDomainDeltas, prevChartData.seriesData.filtered.values);

  return createAxisDeltaData(startChartData, endChartData, finalChartData, categoryAxisDomainDelta, rawValueAxisDomainDeltas,
    filteredValueAxisDomainDeltas, rawSeriesDomainDeltas, filteredSeriesDomainDeltas, filteredSeriesPacingDeltaPercentage, categoryValueDeltaData);
}

export function getTransitionAxisContractionData(mochartConfig: EnhancedMochartConfig, prevChartData: ChartData, newChartData: ChartData, categoryDeltaData: CategoryDeltaData): AxisDeltaData {
  let startCategoryData = newChartData.categoryData;
  let endCategoryData = newChartData.categoryData;

  let categoryValueDeltaData: CompleteNumericArrayDelta | null = null;

  const startCategoryAxisDomain = copyDomain(prevChartData.categoryData.axisDomain);
  const endCategoryAxisDomain = copyDomain(newChartData.categoryData.axisDomain);
  setBaseDomainForChanges(startCategoryAxisDomain, endCategoryAxisDomain);

  const { categoryAxis: categoryAxisConfig, valueAxes: valueAxisConfigs, series: seriesConfigs } = mochartConfig;

  const categoryAxisDomainDelta = getCategoryAxisDomainDelta(endCategoryAxisDomain, startCategoryAxisDomain);
  if (categoryAxisDomainDelta.deltaPercentage !== 0) {
    categoryValueDeltaData = getContractionCategoryValueDeltaData(categoryAxisConfig, categoryDeltaData, prevChartData, newChartData, startCategoryAxisDomain);

    startCategoryData = getCategoryDataWithAxisDomain(startCategoryData, startCategoryAxisDomain);
    endCategoryData = getCategoryDataWithAxisDomain(endCategoryData, endCategoryAxisDomain);
  }

  let startSeriesData = newChartData.seriesData;
  let endSeriesData = newChartData.seriesData;

  const startRawValueAxisDomains = copyValueAxisDomains(prevChartData.seriesData.raw.axisDomains);
  const startFilteredValueAxisDomains = copyValueAxisDomains(prevChartData.seriesData.filtered.axisDomains);
  const endRawValueAxisDomains = copyValueAxisDomains(newChartData.seriesData.raw.axisDomains);
  const endFilteredValueAxisDomains = copyValueAxisDomains(newChartData.seriesData.filtered.axisDomains);
  setAllBaseAxisDomainsForChanges(startRawValueAxisDomains, endRawValueAxisDomains);
  setAllBaseAxisDomainsForChanges(startFilteredValueAxisDomains, endFilteredValueAxisDomains);

  const rawValueAxisExtents = getDomainExtents(endRawValueAxisDomains);
  const filteredValueAxisExtents = getDomainExtents(endFilteredValueAxisDomains);
  const rawValueAxisDomainDeltas = getValueAxisDomainDeltas(endRawValueAxisDomains, startRawValueAxisDomains, rawValueAxisExtents);
  const filteredValueAxisDomainDeltas = getValueAxisDomainDeltas(endFilteredValueAxisDomains, startFilteredValueAxisDomains, filteredValueAxisExtents);

  const startRawSeriesDomains = copySeriesDomains(prevChartData.seriesData.raw.domains);
  const startFilteredSeriesDomains = copySeriesDomains(prevChartData.seriesData.filtered.domains);
  const endRawSeriesDomains = copySeriesDomains(newChartData.seriesData.raw.domains);
  const endFilteredSeriesDomains = copySeriesDomains(newChartData.seriesData.filtered.domains);
  setAllBaseSeriesDomainsForChanges(startRawSeriesDomains, endRawSeriesDomains);
  setAllBaseSeriesDomainsForChanges(startFilteredSeriesDomains, endFilteredSeriesDomains);

  const rawSeriesDomainDeltas = getSeriesDomainDeltas(seriesConfigs, endRawSeriesDomains, startRawSeriesDomains, rawValueAxisExtents);
  const filteredSeriesDomainDeltas = getSeriesDomainDeltas(seriesConfigs, endFilteredSeriesDomains, startFilteredSeriesDomains, filteredValueAxisExtents);

  if (rawValueAxisDomainDeltas.deltaPercentage !== 0 || filteredValueAxisDomainDeltas.deltaPercentage !== 0 ||
    rawSeriesDomainDeltas.deltaPercentage !== 0 || filteredSeriesDomainDeltas.deltaPercentage !== 0) {
    startSeriesData = getSeriesDataWithAxisDomains(startSeriesData, startRawValueAxisDomains, startFilteredValueAxisDomains);
    startSeriesData = getSeriesDataWithDomains(startSeriesData, startRawSeriesDomains, startFilteredSeriesDomains);
    endSeriesData = getSeriesDataWithAxisDomains(endSeriesData, endRawValueAxisDomains, endFilteredValueAxisDomains);
    endSeriesData = getSeriesDataWithDomains(endSeriesData, endRawSeriesDomains, endFilteredSeriesDomains);
  }

  const startChartData = getChartDataWithData(newChartData, startCategoryData, startSeriesData);
  const endChartData = getChartDataWithData(newChartData, endCategoryData, endSeriesData);

  adjustFilteredAxisDomainDeltas(valueAxisConfigs, rawValueAxisDomainDeltas, filteredValueAxisDomainDeltas);

  // series hidden at the end of the contraction render nothing during it, so they must not stretch its duration
  const filteredSeriesPacingDeltaPercentage = getVisibleSeriesPacingDeltaPercentage(filteredSeriesDomainDeltas, newChartData.seriesData.filtered.values);

  return invertAxisDeltas(createAxisDeltaData(startChartData, endChartData, newChartData, categoryAxisDomainDelta,
    rawValueAxisDomainDeltas, filteredValueAxisDomainDeltas, rawSeriesDomainDeltas, filteredSeriesDomainDeltas, filteredSeriesPacingDeltaPercentage, categoryValueDeltaData));
}

// pacing max over visible series only; the map keeps every entry so end/final domain bookkeeping still covers hidden series
function getVisibleSeriesPacingDeltaPercentage(seriesDomainDeltas: SeriesDomainDeltaMap, filteredSeriesValues: SeriesValueObjects): number {
  if (seriesDomainDeltas.deltas === null) {
    return 0;
  }
  let pacingDeltaPercentage = 0;
  const seriesIds = Object.keys(seriesDomainDeltas.deltas);
  for (const seriesId of seriesIds) {
    if (filteredSeriesValues[seriesId].plain !== null) {
      pacingDeltaPercentage = Math.max(pacingDeltaPercentage, seriesDomainDeltas.deltas[seriesId].deltaPercentage);
    }
  }
  return pacingDeltaPercentage;
}

function adjustFilteredAxisDomainDeltas(valueAxisConfigs: EnhancedValueAxisConfig[], rawValueAxisDomainDeltas: DomainDeltaMap, filteredValueAxisDomainDeltas: DomainDeltaMap): void {
  if (filteredValueAxisDomainDeltas.deltaPercentage !== 0) {
    const { deltas: rawDeltas } = rawValueAxisDomainDeltas;
    const { deltas: filteredDeltas } = filteredValueAxisDomainDeltas;

    let newDeltaPercentage = 0;
    let filteredDeltaPercentage;

    for (const axisConfig of valueAxisConfigs) {
      filteredDeltaPercentage = filteredDeltas![axisConfig.id]!.deltaPercentage;
      if (filteredDeltaPercentage !== 0 && !axisConfig.adjustForFiltering) {
        filteredDeltaPercentage = filteredDeltas![axisConfig.id]!.deltaPercentage = rawDeltas !== null ? rawDeltas[axisConfig.id]!.deltaPercentage : 0;
      }
      newDeltaPercentage = Math.max(newDeltaPercentage, filteredDeltaPercentage);
    }
    filteredValueAxisDomainDeltas.deltaPercentage = newDeltaPercentage;
  }
}

/**
 *
 * getAxisDeltaData functions
 *
 **/
function getValueAxisDomainDeltas(fromValueAxisDomains: AxisDomains, toValueAxisDomains: AxisDomains, fromValueAxisDomainExtents: Record<string, number>): DomainDeltaMap {
  let deltaPercentage = 0;
  const deltas: Record<string, DomainDelta> = Object.create(null);

  let axisDelta, axisDeltaPercentage;
  const valueAxisIds = Object.keys(fromValueAxisDomains);
  for (const id of valueAxisIds) {
    axisDelta = getPositiveDomainDelta(fromValueAxisDomains[id], toValueAxisDomains[id]);
    axisDeltaPercentage = getPositiveDomainDeltaPercentage(axisDelta, fromValueAxisDomainExtents[id]);
    deltaPercentage = Math.max(deltaPercentage, axisDeltaPercentage);
    deltas[id] = {
      deltaPercentage: axisDeltaPercentage,
      delta: axisDelta
    };
  }
  return deltaPercentage === 0 ? emptyValueAxisDomainDelta : {
    deltaPercentage,
    deltas
  };
}

function getCategoryAxisDomainDelta(fromCategoryAxisDomain: CategoryAxisDomain, toCategoryAxisDomain: CategoryAxisDomain): DomainDelta {
  const delta: NumericDomain = [0, 0];

  const getValue = (categoryValue: CategoryAxisDomain[number]): number => categoryValue === null ? 0 : categoryValue instanceof Date ? categoryValue.getTime() : categoryValue;

  if (getValue(toCategoryAxisDomain[0]) < getValue(fromCategoryAxisDomain[0])) {
    delta[0] = getValue(toCategoryAxisDomain[0]) - getValue(fromCategoryAxisDomain[0]);
  }
  if (getValue(toCategoryAxisDomain[1]) > getValue(fromCategoryAxisDomain[1])) {
    delta[1] = getValue(toCategoryAxisDomain[1]) - getValue(fromCategoryAxisDomain[1]);
  }

  const deltaPercentage = getPositiveDomainDeltaPercentage(delta, getDomainExtentWithValueGetter(fromCategoryAxisDomain, getValue));

  return deltaPercentage === 0 ? emptyCategoryAxisDomainDelta : {
    deltaPercentage,
    delta
  }
}

function getSeriesDomainDeltas(seriesConfigs: EnhancedSeriesConfig[], fromDomainObjects: SeriesDomainObjects, toDomainObjects: SeriesDomainObjects, fromAxisExtents: Record<string, number>): SeriesDomainDeltaMap {
  let deltaPercentage = 0;
  const deltas: Record<string, SeriesDomainDelta> = Object.create(null);
  let domainDelta;
  for (const seriesConfig of seriesConfigs) {
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
  const newDomainObject = {} as SeriesDomainDelta;
  let deltaPercentage = 0;
  let key, domainDelta, domainDeltaPercentage;
  const length = domainKeys.length;
  for (let i=0; i<length; i++) {
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

function createAxisDeltaData(startChartData: ChartData, endChartData: ChartData, finalChartData: ChartData, categoryAxisDomainDelta: DomainDelta, rawValueAxisDomainDeltas: DomainDeltaMap,
                             filteredValueAxisDomainDeltas: DomainDeltaMap, rawSeriesDomainDeltas: SeriesDomainDeltaMap, filteredSeriesDomainDeltas: SeriesDomainDeltaMap,
                             filteredSeriesPacingDeltaPercentage: number, categoryValueDeltaData: CompleteNumericArrayDelta | null): AxisDeltaData {
  const deltaPercentage = Math.max(categoryAxisDomainDelta.deltaPercentage, rawValueAxisDomainDeltas.deltaPercentage,
    filteredValueAxisDomainDeltas.deltaPercentage, rawSeriesDomainDeltas.deltaPercentage, filteredSeriesPacingDeltaPercentage,
    categoryValueDeltaData ? categoryValueDeltaData.deltaPercentage : 0);
  setDeltaFactor(categoryAxisDomainDelta, deltaPercentage);
  setCategoryValueDeltaFactor(categoryValueDeltaData, deltaPercentage);
  setAxisDeltaFactors(rawValueAxisDomainDeltas, deltaPercentage);
  setAxisDeltaFactors(filteredValueAxisDomainDeltas, deltaPercentage);
  setDomainDeltaFactors(rawSeriesDomainDeltas, deltaPercentage);
  setDomainDeltaFactors(filteredSeriesDomainDeltas, deltaPercentage);

  return {
    start: startChartData,
    deltaPercentage,
    deltas: {
      domain: {
        axis: {
          group: categoryAxisDomainDelta,
          series: {
            raw: rawValueAxisDomainDeltas,
            filtered: filteredValueAxisDomainDeltas
          }
        },
        series: {
          raw: rawSeriesDomainDeltas,
          filtered: filteredSeriesDomainDeltas
        }
      },
      values: {
        group: categoryValueDeltaData
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

function setCategoryValueDeltaFactor(deltaObject: CompleteNumericArrayDelta | null, deltaPercentage: number): void {
  if (deltaObject) {
    setDeltaFactor(deltaObject, deltaPercentage);
  }
}

function setAxisDeltaFactors(axisDeltaObjectHolder: DomainDeltaMap, deltaPercentage: number): void {
  if (axisDeltaObjectHolder.deltas !== null) {
    const axisDeltaObjects = axisDeltaObjectHolder.deltas;
    const axisIds = Object.keys(axisDeltaObjects);
    for (const axisId of axisIds) {
      setDeltaFactor(axisDeltaObjects[axisId], deltaPercentage);
    }
  }
}

function setDomainDeltaFactors(domainDeltaObjectHolder: SeriesDomainDeltaMap, deltaPercentage: number): void {
  if (domainDeltaObjectHolder.deltas !== null) {
    const domainDeltaObjects = domainDeltaObjectHolder.deltas;
    const seriesIds = Object.keys(domainDeltaObjects);
    for (const seriesId of seriesIds) {
      setDomainDeltaFactor(domainDeltaObjects[seriesId], deltaPercentage);
    }
  }
}

function setDomainDeltaFactor(domainDeltaObject: SeriesDomainDelta, deltaPercentage: number): void {
  setDeltaFactor(domainDeltaObject, deltaPercentage);
  for (const key of domainKeys) {
    setDeltaFactor(domainDeltaObject[key], deltaPercentage);
  }
}

function invertAxisDeltas(axisDeltaData: AxisDeltaData): AxisDeltaData {
  if (axisDeltaData.deltas.domain.axis.group.delta !== null) {
    invertDomainDeltas(axisDeltaData.deltas.domain.axis.group.delta);
  }
  const rawValueAxisDeltas = axisDeltaData.deltas.domain.axis.series.raw.deltas;
  if (rawValueAxisDeltas !== null) {
    const axisIds = Object.keys(rawValueAxisDeltas);
    for (const axisId of axisIds) {
      invertDomainDeltas(rawValueAxisDeltas[axisId].delta!);
    }
  }
  const filteredValueAxisDeltas = axisDeltaData.deltas.domain.axis.series.filtered.deltas;
  if (filteredValueAxisDeltas !== null) {
    const axisIds = Object.keys(filteredValueAxisDeltas);
    for (const axisId of axisIds) {
      invertDomainDeltas(filteredValueAxisDeltas[axisId].delta!);
    }
  }
  const rawSeriesDomainDeltas = axisDeltaData.deltas.domain.series.raw.deltas;
  if (rawSeriesDomainDeltas !== null) {
    invertSeriesDomainDeltas(rawSeriesDomainDeltas);
  }
  const filteredSeriesDomainDeltas = axisDeltaData.deltas.domain.series.filtered.deltas;
  if (filteredSeriesDomainDeltas !== null) {
    invertSeriesDomainDeltas(filteredSeriesDomainDeltas);
  }
  return axisDeltaData;
}

function invertSeriesDomainDeltas(seriesDomainDeltas: Record<string, SeriesDomainDelta>): void {
  const seriesIds = Object.keys(seriesDomainDeltas);
  for (const seriesId of seriesIds) {
    invertSeriesDomainDeltaObject(seriesDomainDeltas[seriesId]);
  }
}

function invertSeriesDomainDeltaObject(seriesDomainDeltaObject: SeriesDomainDelta): void {
  for (const key of domainKeys) {
    invertDomainDeltas(seriesDomainDeltaObject[key].delta!);
  }
}

function invertDomainDeltas(domainDelta: NumericDomain): void {
  domainDelta[0] = domainDelta[0] === 0 ? 0 : -1 * domainDelta[0];
  domainDelta[1] = domainDelta[1] === 0 ? 0 : -1 * domainDelta[1];
}

function setAllBaseAxisDomainsForChanges(startAxisDomains: AxisDomains, endAxisDomains: AxisDomains): void {
  const axisIds = Object.keys(startAxisDomains);
  for (const axisId of axisIds) {
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
  const seriesIds = Object.keys(startDomainObjects);
  for (const seriesId of seriesIds) {
    setBaseSeriesDomainForChanges(startDomainObjects[seriesId], endDomainObjects[seriesId]);
  }
}

function setBaseSeriesDomainForChanges(startDomainObject: SeriesDomainObject, endDomainObject: SeriesDomainObject): void {
  for (const key of domainKeys) {
    setBaseKeyedSeriesDomainForChanges(startDomainObject, endDomainObject, key);
  }
}

function setBaseKeyedSeriesDomainForChanges(startDomainObject: SeriesDomainObject, endDomainObject: SeriesDomainObject, valueKey: string): void {
  setBaseDomainForChanges(startDomainObject[valueKey], endDomainObject[valueKey]);
}
