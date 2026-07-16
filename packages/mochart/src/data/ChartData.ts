import { getGroupData, getGroupDataWithAxisDomain, getGroupValueObject } from './GroupData';
import { getSeriesData, getSeriesDataWithAxisDomains, getSeriesDataWithDomains, getSeriesDataWithSeriesValues, getSeriesValueObjects } from './SeriesData';

export function isDataProviderValid(dataProvider) {
  let dataProviderError = dataProvider && dataProvider.getError && dataProvider.getError instanceof Function && dataProvider.getError();
  return dataProvider && !dataProviderError;
}

export function getChartData(mochartConfig, dataProvider, filteredSeriesMap) {
  let groupData = getGroupData(mochartConfig.groupAxisConfig, dataProvider);
  let seriesData = getSeriesData(mochartConfig, dataProvider, filteredSeriesMap, groupData);

  return {
    groupData,
    seriesData
  };
}

export function getChartDataWithGroupData(chartData, groupData) {
  return Object.assign({}, chartData, { groupData });
}

export function getChartDataWithSeriesData(chartData, seriesData) {
  return Object.assign({}, chartData, { seriesData });
}

export function getChartDataWithData(chartData, groupData, seriesData) {
  return Object.assign({}, chartData, { groupData, seriesData });
}

export function getChartDataWithAxisDomains(chartData, groupAxisDomain, rawSeriesAxisDomains, filteredSeriesAxisDomains) {
  return getChartDataWithData(chartData, getGroupDataWithAxisDomain(chartData.groupData, groupAxisDomain),
    getSeriesDataWithAxisDomains(chartData.seriesData, rawSeriesAxisDomains, filteredSeriesAxisDomains));
}

export function getChartDataWithSeriesDomains(chartData, rawSeriesDomains, filteredSeriesDomains) {
  return getChartDataWithSeriesData(chartData, getSeriesDataWithDomains(chartData.seriesData, rawSeriesDomains, filteredSeriesDomains));
}

export function getChartDataWithValues(chartData, values, filteredValues) {
  return getChartDataWithSeriesData(chartData, getSeriesDataWithSeriesValues(chartData.seriesData, values, filteredValues));
}

export function getGroupSeriesValueObject(chartData, groupIndex) {
  const { groupData, seriesData } = chartData;

  return {
    group: getGroupValueObject(groupData, groupIndex),
    series: getSeriesValueObjects(seriesData, groupIndex),
  }
}

export function getChartDataGroupCount(chartData) {
  return chartData ? chartData.groupData.values.raw.length : 0;
}