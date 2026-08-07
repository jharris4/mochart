import { getCategoryData, getCategoryDataWithAxisDomain, getCategoryValueObject } from './CategoryData';
import { getSeriesData, getSeriesDataWithAxisDomains, getSeriesDataWithDomains, getSeriesDataWithSeriesValues, getSeriesValueObjects } from './SeriesData';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { AxisDomains, ChartData, DataProvider, CategoryAxisDomain, CategoryData, SeriesData, SeriesDomainObjects, SeriesValueObjects } from '../types/data';

export function isDataProviderValid(dataProvider: DataProvider | null | undefined): boolean {
  // '' and 0 count as errors, matching the error prop; only null/undefined don't
  const dataProviderError = dataProvider && dataProvider.getError instanceof Function ? dataProvider.getError() : undefined;
  return !!dataProvider && dataProviderError == null;
}

export function getChartData(mochartConfig: EnhancedMochartConfig, dataProvider: DataProvider, filteredSeriesMap: Record<string, unknown>): ChartData {
  const categoryData = getCategoryData(mochartConfig.categoryAxis, dataProvider);
  const seriesData = getSeriesData(mochartConfig, dataProvider, filteredSeriesMap, categoryData);

  return {
    categoryData,
    seriesData
  };
}

export function getChartDataWithCategoryData(chartData: ChartData, categoryData: CategoryData): ChartData {
  return Object.assign({}, chartData, { categoryData });
}

export function getChartDataWithSeriesData(chartData: ChartData, seriesData: SeriesData): ChartData {
  return Object.assign({}, chartData, { seriesData });
}

export function getChartDataWithData(chartData: ChartData, categoryData: CategoryData, seriesData: SeriesData): ChartData {
  return Object.assign({}, chartData, { categoryData, seriesData });
}

export function getChartDataWithAxisDomains(chartData: ChartData, categoryAxisDomain: CategoryAxisDomain, rawValueAxisDomains: AxisDomains, filteredValueAxisDomains: AxisDomains): ChartData {
  return getChartDataWithData(chartData, getCategoryDataWithAxisDomain(chartData.categoryData, categoryAxisDomain),
    getSeriesDataWithAxisDomains(chartData.seriesData, rawValueAxisDomains, filteredValueAxisDomains));
}

export function getChartDataWithSeriesDomains(chartData: ChartData, rawSeriesDomains: SeriesDomainObjects, filteredSeriesDomains: SeriesDomainObjects): ChartData {
  return getChartDataWithSeriesData(chartData, getSeriesDataWithDomains(chartData.seriesData, rawSeriesDomains, filteredSeriesDomains));
}

export function getChartDataWithValues(chartData: ChartData, values: SeriesValueObjects, filteredValues: SeriesValueObjects): ChartData {
  return getChartDataWithSeriesData(chartData, getSeriesDataWithSeriesValues(chartData.seriesData, values, filteredValues));
}

export function getCategorySeriesValueObject(chartData: ChartData, categoryIndex: number) {
  const { categoryData, seriesData } = chartData;

  return {
    category: getCategoryValueObject(categoryData, categoryIndex),
    series: getSeriesValueObjects(seriesData, categoryIndex),
  }
}

export type CategorySeriesValueObject = ReturnType<typeof getCategorySeriesValueObject>;

export function getChartDataCategoryCount(chartData: ChartData | null): number {
  return chartData ? chartData.categoryData.values.raw.length : 0;
}
