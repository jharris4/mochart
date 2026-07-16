import { getChartDataWithSeriesData, getChartDataGroupCount } from '../data/ChartData';

import { getSeriesDataWithSeriesCounts, getSeriesDataWithFilteredFlags } from '../data/SeriesData';

import { getInitialGroupDeltaData, getGroupDeltaData } from './GroupAnimationData';

import { emptyAxisDeltaData, getTransitionAxisExpansionData, getTransitionAxisCollapseData } from './DomainAnimationData';

import { getInitialValueChangeData, getFilterDeltaData, getTransitionValueChangeData } from './SeriesAnimationData';

/**
 *
 * Main animation logic functions
 *
 **/

export function getChartAnimationData(mochartConfig, oldChartData, newChartData) {
  let groupDeltaData, axisExpansionData, valueChangeData, axisCollapseData;

  const initialAnimation = getChartDataGroupCount(oldChartData) === 0;

  if (initialAnimation) {
    groupDeltaData = getInitialGroupDeltaData(mochartConfig.groupAxisConfig, newChartData.groupData);
    axisExpansionData = emptyAxisDeltaData;
    valueChangeData = getInitialValueChangeData(mochartConfig, newChartData);
    axisCollapseData = emptyAxisDeltaData;
  }
  else {
    groupDeltaData = getGroupDeltaData(mochartConfig.groupAxisConfig, oldChartData.groupData, newChartData.groupData);
    let filterDeltaData = getFilterDeltaData(mochartConfig, oldChartData.seriesData, newChartData.seriesData);
    let startSeriesData = getSeriesDataWithSeriesCounts(oldChartData.seriesData, filterDeltaData.axisSeriesCounts, filterDeltaData.stackSeriesCounts, filterDeltaData.groupSeriesCounts);
    startSeriesData = getSeriesDataWithFilteredFlags(startSeriesData, newChartData.seriesData.filteredFlags);
    let startChartData = getChartDataWithSeriesData(oldChartData, startSeriesData);
    axisExpansionData = getTransitionAxisExpansionData(mochartConfig, startChartData, newChartData, groupDeltaData);
    valueChangeData = getTransitionValueChangeData(mochartConfig, axisExpansionData.final, newChartData, groupDeltaData);
    axisCollapseData = getTransitionAxisCollapseData(mochartConfig, valueChangeData.final, newChartData, groupDeltaData);
  }

  return {
    initialAnimation,
    groupDeltaData,
    axisExpansionData,
    valueChangeData,
    axisCollapseData
  }
}

export function getStartChartData(chartAnimationData) {
  let { valueChangeData } = chartAnimationData;
  return valueChangeData.start;
}

export function getEndChartData(chartAnimationData) {
  let { valueChangeData } = chartAnimationData;
  return valueChangeData.end;
}