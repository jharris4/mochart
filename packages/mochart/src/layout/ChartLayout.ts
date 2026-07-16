import { getWithMutations } from '../utils/WithMutations';
import { POSITION_TOP } from '../config/core/constants';
import { createSpacingLayoutInfo, getSpacingInnerBounds } from './SpacingLayoutInfo';
import { getTitleHeight, getTitleLayoutInfo } from './TitleLayout';
import { getLegendHeight, getLegendLayoutInfo } from './LegendLayout';
import { getPlotWidthAndX, getPlotHeight, getPlotLayoutInfo } from './PlotLayout';

const emptyMarginPadding = { top: 0, right: 0, bottom: 0, left: 0 };

export function getChartLayoutInfo(mochartConfig, chartData, chartTextBoundsData, width, height, standalone) {
  const { chartConfig } = mochartConfig;
  const { margin, padding } = chartConfig;

  standalone = false; // TODO - trace this back to source


  const chartMargin = standalone ? emptyMarginPadding : margin;
  const chartPadding = standalone ? emptyMarginPadding : padding;
  const bounds = { x: 0, y: 0, width, height };

  const chartContentLayoutInfo = createSpacingLayoutInfo(bounds, chartMargin, chartPadding);
  const containerLayoutInfo = createSpacingLayoutInfo(bounds);
  const layoutInfo = getChartContentLayoutInfo(mochartConfig, chartData, chartTextBoundsData, chartContentLayoutInfo.paddingBounds);

  return {
    ...layoutInfo,
    chartContentLayoutInfo,
    containerLayoutInfo
  }
}

function getChartContentLayoutInfo(mochartConfig, chartData, chartTextBoundsData, contentBounds) {
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

export function getChartLayoutInfoWithMutations(oldLayoutInfo, newLayoutInfo) {
  return getWithMutations(oldLayoutInfo, newLayoutInfo);
}
