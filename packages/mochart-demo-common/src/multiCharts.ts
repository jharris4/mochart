import { ArrayOfObjectsDataProvider } from '@mochart/core';
import type { MochartConfig } from '@mochart/core';

import type { DataRow, ChartDataProviderLike } from './types';

export function getChartDataCount(data: DataRow[], currentDataCount: number, i: number): number {
  const dataCount = data.length;
  let chartDataCount = (dataCount + currentDataCount - i) % dataCount;
  if (chartDataCount === 0) {
    chartDataCount = dataCount;
  }
  return chartDataCount;
}

export function getDataProvidersForDataCount(mochartConfig: MochartConfig, data: DataRow[], chartCount: number, currentDataCount: number): ChartDataProviderLike[] {
  const dataProviders: ChartDataProviderLike[] = [];
  let i, chartDataCount;
  const groupProperty = mochartConfig.groupAxisConfig.property ?? '';
  for (i = 0; i < chartCount; i++) {
    chartDataCount = getChartDataCount(data, currentDataCount, i);
    dataProviders.push(new ArrayOfObjectsDataProvider(data.slice(0, chartDataCount), groupProperty));
  }
  return dataProviders;
}
