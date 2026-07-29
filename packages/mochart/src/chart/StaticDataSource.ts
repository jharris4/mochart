import { isDataProviderValid, getChartData } from '../data/ChartData';
import { getFocusData, getFocusDataWithMutations } from '../data/FocusData';
import type { ChartData } from '../types/data';
import type { FocusData } from '../types/animation';
import type { ChartDataSource, ChartDataSourceInput, InternalFocus } from './ChartDataSource';

/** Computes chartData/focusData directly, with no animation (was StaticChart). */
export class StaticDataSource implements ChartDataSource {
  readonly animated = false;
  chartData: ChartData | null = null;
  focusData: FocusData | null = null;
  readonly initialAnimationPercentage = null;

  start(input: ChartDataSourceInput): void {
    const { mochartConfig, dataProvider, filteredSeriesIds, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId } = input;
    const error = (mochartConfig && !mochartConfig.validation.valid) || !isDataProviderValid(dataProvider);
    const chartData = (!mochartConfig || error) ? null : getChartData(mochartConfig, dataProvider, filteredSeriesIds);
    this.chartData = chartData;
    this.focusData = chartData ? getFocusData(mochartConfig, chartData, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId) : null;
  }

  update(prevInput: ChartDataSourceInput, input: ChartDataSourceInput): void {
    const { mochartConfig, dataProvider, filteredSeriesIds, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId } = input;
    const configChanged = mochartConfig !== prevInput.mochartConfig;
    const dataChanged = dataProvider !== prevInput.dataProvider || filteredSeriesIds !== prevInput.filteredSeriesIds;
    const focusChanged = focusedGroupIndex !== prevInput.focusedGroupIndex || focusedSeriesAxisId !== prevInput.focusedSeriesAxisId
      || focusedSeriesId !== prevInput.focusedSeriesId;
    if (configChanged || dataChanged || focusChanged) {
      const error = (mochartConfig && !mochartConfig.validation.valid) || !isDataProviderValid(dataProvider);
      const chartData = (!mochartConfig || error) ? null : (configChanged || dataChanged) ? getChartData(mochartConfig, dataProvider, filteredSeriesIds) : this.chartData;
      this.focusData = chartData ? getFocusDataWithMutations(this.focusData!, getFocusData(mochartConfig, chartData, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId)) : null;
      this.chartData = chartData;
    }
  }

  remapFocus(focus: InternalFocus): InternalFocus {
    return focus;
  }

  dispose(): void {}
}
