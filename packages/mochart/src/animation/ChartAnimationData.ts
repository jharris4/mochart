import { getChartDataWithSeriesData, getChartDataGroupCount } from '../data/ChartData';

import { getSeriesDataWithSeriesCounts, getSeriesDataWithFilteredFlags } from '../data/SeriesData';

import { getInitialGroupDeltaData, getGroupDeltaData } from './GroupAnimationData';

import { emptyAxisDeltaData, getTransitionAxisExpansionData, getTransitionAxisCollapseData } from './DomainAnimationData';

import { getInitialValueChangeData, getFilterDeltaData, getTransitionValueChangeData } from './SeriesAnimationData';

import type { MochartConfig } from '../types/config';
import type {
  AnimationChartData,
  AxisTransitionData,
  ChartAnimationData,
  EmptyAxisDeltaData,
  ValueChangeData
} from '../types/animation';

/**
 *
 * Main animation logic functions
 *
 **/

export function getChartAnimationData(
  mochartConfig: MochartConfig,
  oldChartData: AnimationChartData | null,
  newChartData: AnimationChartData
): ChartAnimationData {
  let groupDeltaData: unknown;
  let axisExpansionData: AxisTransitionData;
  let valueChangeData: ValueChangeData;
  let axisCollapseData: AxisTransitionData;

  const initialAnimation = getChartDataGroupCount(oldChartData) === 0;

  if (initialAnimation) {
    groupDeltaData = getInitialGroupDeltaData(mochartConfig.groupAxisConfig, newChartData.groupData);
    axisExpansionData = emptyAxisDeltaData as EmptyAxisDeltaData;
    valueChangeData = getInitialValueChangeData(mochartConfig, newChartData) as ValueChangeData;
    axisCollapseData = emptyAxisDeltaData as EmptyAxisDeltaData;
  }
  else {
    if (oldChartData === null) {
      throw new Error('A previous chart data value is required for a transition animation');
    }
    groupDeltaData = getGroupDeltaData(mochartConfig.groupAxisConfig, oldChartData.groupData, newChartData.groupData);
    const filterDeltaData = getFilterDeltaData(mochartConfig, oldChartData.seriesData, newChartData.seriesData);
    let startSeriesData = getSeriesDataWithSeriesCounts(oldChartData.seriesData, filterDeltaData.axisSeriesCounts, filterDeltaData.stackSeriesCounts, filterDeltaData.groupSeriesCounts);
    startSeriesData = getSeriesDataWithFilteredFlags(startSeriesData, newChartData.seriesData.filteredFlags);
    let startChartData = getChartDataWithSeriesData(oldChartData, startSeriesData);
    axisExpansionData = getTransitionAxisExpansionData(mochartConfig, startChartData, newChartData, groupDeltaData) as AxisTransitionData;
    if (axisExpansionData.final === null || axisExpansionData.final === undefined) {
      throw new Error('Axis expansion did not produce final chart data');
    }
    valueChangeData = getTransitionValueChangeData(mochartConfig, axisExpansionData.final, newChartData, groupDeltaData) as ValueChangeData;
    axisCollapseData = getTransitionAxisCollapseData(mochartConfig, valueChangeData.final, newChartData, groupDeltaData) as AxisTransitionData;
  }

  return {
    initialAnimation,
    groupDeltaData,
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
