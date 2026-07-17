import { getWithMutations } from '../utils/WithMutations';
import { POSITION_TOP } from '../config/core/constants';
import { createSpacingLayoutInfo } from './SpacingLayoutInfo';
import { getTitleHeight, getTitleLayoutInfo } from './TitleLayout';
import { getLegendHeight, getLegendLayoutInfo } from './LegendLayout';
import { getPlotWidthAndX, getPlotHeight, getPlotLayoutInfo } from './PlotLayout';
import type { Bounds } from '../types/geometry';
import type { MochartConfig } from '../types/config';
import type { ChartDataForLayout, ChartLayoutInfo, ChartTextBoundsData, LegendLayoutResult, PlotLayoutResult, TitleLayoutResult } from '../types/layout';

// Margin and padding always apply, including for standalone charts — inherited
// behavior locked in by the golden snapshots (the `standalone` prop's only
// remaining effect is gating config warnings in Chart).
export function getChartLayoutInfo(mochartConfig: MochartConfig, chartData: ChartDataForLayout | null, chartTextBoundsData: ChartTextBoundsData, width: number, height: number): ChartLayoutInfo {
  const { chartConfig } = mochartConfig;
  const { margin, padding } = chartConfig;

  const bounds: Bounds = { x: 0, y: 0, width, height };

  const chartContentLayoutInfo = createSpacingLayoutInfo(bounds, margin, padding);
  const containerLayoutInfo = createSpacingLayoutInfo(bounds);
  const layoutInfo = getChartContentLayoutInfo(mochartConfig, chartData, chartTextBoundsData, chartContentLayoutInfo.paddingBounds);

  return {
    ...layoutInfo,
    chartContentLayoutInfo,
    containerLayoutInfo
  }
}

function getChartContentLayoutInfo(mochartConfig: MochartConfig, chartData: ChartDataForLayout | null, chartTextBoundsData: ChartTextBoundsData, contentBounds: Bounds): TitleLayoutResult & PlotLayoutResult & Partial<LegendLayoutResult> {
  const { plotConfig, titleConfig, legendConfig } = mochartConfig;
  const { y, height } = contentBounds;

  const plotWidthAndX = getPlotWidthAndX(mochartConfig, chartTextBoundsData, chartData, contentBounds);
  const titleHeight = getTitleHeight(mochartConfig, chartTextBoundsData);
  const legendHeight = getLegendHeight(mochartConfig, chartTextBoundsData, contentBounds, plotWidthAndX);
  const plotHeight = getPlotHeight(height, titleHeight, legendHeight);

  let isTitleTop = titleConfig.position === POSITION_TOP;

  let plotY = y;
  let titleY = y;
  let legendY = y;
  if (titleConfig.position === POSITION_TOP) {
    plotY += titleHeight;
  }
  else {
    titleY += plotHeight;
  }
  if (legendConfig.position === POSITION_TOP) {
    plotY += legendHeight;
  }
  else {
    legendY += plotHeight;
  }
  if (titleConfig.position === legendConfig.position || titleConfig.position === POSITION_TOP) {
    legendY += titleHeight;
  }
  else {
    titleY += legendHeight;
  }

  const plotAllLayoutInfo = getPlotLayoutInfo(mochartConfig, chartTextBoundsData, chartData, contentBounds, plotHeight, plotY);
  const { seriesLayoutInfo } = plotAllLayoutInfo;
  const titleAllLayoutInfo = getTitleLayoutInfo(mochartConfig, chartTextBoundsData, contentBounds, seriesLayoutInfo, titleHeight, titleY);
  const legendAllLayoutInfo = getLegendLayoutInfo(mochartConfig, chartTextBoundsData, contentBounds, seriesLayoutInfo, legendHeight, legendY);

  return {
    ...titleAllLayoutInfo,
    ...plotAllLayoutInfo,
    ...legendAllLayoutInfo
  };
}

export function getChartLayoutInfoWithMutations(oldLayoutInfo: ChartLayoutInfo | null, newLayoutInfo: ChartLayoutInfo): ChartLayoutInfo {
  return getWithMutations(oldLayoutInfo, newLayoutInfo);
}
