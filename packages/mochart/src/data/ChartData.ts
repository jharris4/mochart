import { getGroupData, getGroupDataWithAxisDomain, getGroupValueObject } from './GroupData';
import { getSeriesData, getSeriesDataWithAxisDomains, getSeriesDataWithDomains, getSeriesDataWithSeriesValues, getSeriesValueObjects } from './SeriesData';
import type { MochartConfig } from '../types/config';
import type { AxisDomains, ChartData, DataProvider, GroupAxisDomain, GroupData, SeriesData, SeriesDomainObjects, SeriesValueObjects } from '../types/data';

export function isDataProviderValid(dataProvider: DataProvider | null | undefined): boolean {
  const dataProviderError = dataProvider && dataProvider.getError && dataProvider.getError instanceof Function && dataProvider.getError();
  return !!dataProvider && !dataProviderError;
}

export function getChartData(mochartConfig: MochartConfig, dataProvider: DataProvider, filteredSeriesMap: Record<string, unknown>): ChartData {
  const groupData = getGroupData(mochartConfig.groupAxisConfig, dataProvider);
  const seriesData = getSeriesData(mochartConfig, dataProvider, filteredSeriesMap, groupData);

  return {
    groupData,
    seriesData
  };
}

export function getChartDataWithGroupData(chartData: ChartData, groupData: GroupData): ChartData {
  return Object.assign({}, chartData, { groupData });
}

export function getChartDataWithSeriesData(chartData: ChartData, seriesData: SeriesData): ChartData {
  return Object.assign({}, chartData, { seriesData });
}

export function getChartDataWithData(chartData: ChartData, groupData: GroupData, seriesData: SeriesData): ChartData {
  return Object.assign({}, chartData, { groupData, seriesData });
}

export function getChartDataWithAxisDomains(chartData: ChartData, groupAxisDomain: GroupAxisDomain, rawSeriesAxisDomains: AxisDomains, filteredSeriesAxisDomains: AxisDomains): ChartData {
  return getChartDataWithData(chartData, getGroupDataWithAxisDomain(chartData.groupData, groupAxisDomain),
    getSeriesDataWithAxisDomains(chartData.seriesData, rawSeriesAxisDomains, filteredSeriesAxisDomains));
}

export function getChartDataWithSeriesDomains(chartData: ChartData, rawSeriesDomains: SeriesDomainObjects, filteredSeriesDomains: SeriesDomainObjects): ChartData {
  return getChartDataWithSeriesData(chartData, getSeriesDataWithDomains(chartData.seriesData, rawSeriesDomains, filteredSeriesDomains));
}

export function getChartDataWithValues(chartData: ChartData, values: SeriesValueObjects, filteredValues: SeriesValueObjects): ChartData {
  return getChartDataWithSeriesData(chartData, getSeriesDataWithSeriesValues(chartData.seriesData, values, filteredValues));
}

export function getGroupSeriesValueObject(chartData: ChartData, groupIndex: number) {
  const { groupData, seriesData } = chartData;

  return {
    group: getGroupValueObject(groupData, groupIndex),
    series: getSeriesValueObjects(seriesData, groupIndex),
  }
}

export type GroupSeriesValueObject = ReturnType<typeof getGroupSeriesValueObject>;

export function getChartDataGroupCount(chartData: ChartData | null): number {
  return chartData ? chartData.groupData.values.raw.length : 0;
}
