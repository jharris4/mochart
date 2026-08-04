import { getChartDataWithSeriesData, getChartDataCategoryCount } from '../data/ChartData';

import { getSeriesDataWithSeriesCounts, getSeriesDataWithFilteredFlags } from '../data/SeriesData';

import { getInitialCategoryDeltaData, getCategoryDeltaData } from './CategoryAnimationData';

import { emptyAxisDeltaData, getTransitionAxisExpansionData, getTransitionAxisCollapseData } from './DomainAnimationData';

import { getInitialValueChangeData, getFilterDeltaData, getTransitionValueChangeData } from './SeriesAnimationData';

import type { EnhancedMochartConfig } from '../types/enhanced';
import type {
  AnimationChartData,
  AxisTransitionData,
  ChartAnimationData,
  EmptyAxisDeltaData,
  CategoryDeltaData,
  ValueChangeData
} from '../types/animation';

/**
 *
 * Main animation logic functions
 *
 **/

export function getChartAnimationData(
  mochartConfig: EnhancedMochartConfig,
  oldChartData: AnimationChartData | null,
  newChartData: AnimationChartData
): ChartAnimationData {
  let categoryDeltaData: CategoryDeltaData;
  let axisExpansionData: AxisTransitionData;
  let valueChangeData: ValueChangeData;
  let axisCollapseData: AxisTransitionData;

  const initialAnimation = getChartDataCategoryCount(oldChartData) === 0;

  if (initialAnimation) {
    categoryDeltaData = getInitialCategoryDeltaData(mochartConfig.categoryAxis, newChartData.categoryData);
    axisExpansionData = emptyAxisDeltaData as EmptyAxisDeltaData;
    valueChangeData = getInitialValueChangeData(mochartConfig, newChartData) as ValueChangeData;
    axisCollapseData = emptyAxisDeltaData as EmptyAxisDeltaData;
  }
  else {
    if (oldChartData === null) {
      throw new Error('A previous chart data value is required for a transition animation');
    }
    categoryDeltaData = getCategoryDeltaData(mochartConfig.categoryAxis, oldChartData.categoryData, newChartData.categoryData);
    const filterDeltaData = getFilterDeltaData(mochartConfig, oldChartData.seriesData, newChartData.seriesData);
    let startSeriesData = getSeriesDataWithSeriesCounts(oldChartData.seriesData, filterDeltaData.axisSeriesCounts, filterDeltaData.stackSeriesCounts, filterDeltaData.groupSeriesCounts);
    startSeriesData = getSeriesDataWithFilteredFlags(startSeriesData, newChartData.seriesData.filteredFlags);
    const startChartData = getChartDataWithSeriesData(oldChartData, startSeriesData);
    axisExpansionData = getTransitionAxisExpansionData(mochartConfig, startChartData, newChartData, categoryDeltaData) as AxisTransitionData;
    if (axisExpansionData.final === null || axisExpansionData.final === undefined) {
      throw new Error('Axis expansion did not produce final chart data');
    }
    valueChangeData = getTransitionValueChangeData(mochartConfig, axisExpansionData.final, newChartData, categoryDeltaData) as ValueChangeData;
    axisCollapseData = getTransitionAxisCollapseData(mochartConfig, valueChangeData.final, newChartData, categoryDeltaData) as AxisTransitionData;
  }

  return {
    initialAnimation,
    categoryDeltaData,
    axisExpansionData,
    valueChangeData,
    axisCollapseData
  }
}

export function getStartChartData(chartAnimationData: ChartAnimationData): AnimationChartData {
  const { valueChangeData } = chartAnimationData;
  return valueChangeData.start;
}

export function getEndChartData(chartAnimationData: ChartAnimationData): AnimationChartData {
  const { valueChangeData } = chartAnimationData;
  return valueChangeData.end;
}
