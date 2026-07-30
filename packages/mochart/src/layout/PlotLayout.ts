import { NONE, AUTO, ANCHOR_START, ANCHOR_END, ANCHOR_MIDDLE } from '../config/core/constants';
import type { Anchor } from '../config/core/constants';
import { arrayToMap, idAccessor } from '../utils/utils';
import { createLayoutInfo } from './LayoutInfo';
import { getRotatedBounds, getRotatedZeroBounds } from './RotatedLayoutInfo';
import { createGroupAxisLayoutInfo, getGroupAxisRotatedTickBounds, getGroupAxisBeforeAfter, getGroupAxisSize } from './GroupAxisLayout';
import { createSeriesAxisLayoutInfos, getSeriesAxisRotatedTickBounds, getSeriesAxisBeforeAfter, getSeriesAxisSizes, emptyLayoutInfo } from './SeriesAxisLayoutInfo';
import { createInvertedSpacingLayoutInfo, getSpacingWidth, getSpacingHeight, getSpacingLeft, getSpacingTop, createInnerOuterSpacingLayoutInfo, createSpacingLayoutInfo } from './SpacingLayoutInfo';
import type { Bounds, Size, TextBounds } from '../types/geometry';
import type { AxisConfigBase, GroupAxisConfig, MochartConfig, PlotConfig, SeriesAxisConfig } from '../types/config';
import type { AxisLayoutInfo, AxisTickInfo, AxisTickInfos, ChartDataForLayout, ChartTextBoundsData, PlotLayoutResult } from '../types/layout';

export function getRotatedTickBounds(axisConfig: AxisConfigBase, tickBounds: TextBounds, axisTickInfo: AxisTickInfo): Bounds {
  const rotatedTickBounds = axisConfig.tickLabelRotation !== 0
    ? getRotatedBounds(tickBounds, axisConfig.tickLabelRotation, axisTickInfo.tickLabelAnchor)
    : getRotatedZeroBounds(tickBounds, axisTickInfo.tickLabelAnchor);
  rotatedTickBounds.x = Math.floor(rotatedTickBounds.x);
  rotatedTickBounds.y = Math.floor(rotatedTickBounds.y);
  rotatedTickBounds.width = Math.ceil(rotatedTickBounds.width);
  rotatedTickBounds.height = Math.ceil(rotatedTickBounds.height);
  return rotatedTickBounds;
}

function getCollapsedAfterSizeConsumption(axisConfigs: SeriesAxisConfig[], axisSizeArray: Record<string, number>): number {
  let totalSize = 0;
  for (let axisConfig of axisConfigs) {
    if (axisConfig.collapsed === true && axisConfig.before === false) {
      totalSize += axisSizeArray[axisConfig.id];
    }
  }
  return Math.ceil(totalSize);
}

function getAxisTickInfos(plotConfig: PlotConfig, groupAxisConfig: GroupAxisConfig, seriesAxisConfigs: SeriesAxisConfig[]): AxisTickInfos {
  const { inverted } = plotConfig;
  const groupAxisTickInfo = getAxisTickInfo(groupAxisConfig, inverted);
  const seriesAxisTickInfos = arrayToMap(seriesAxisConfigs, idAccessor, seriesAxisConfig =>
    getAxisTickInfo(seriesAxisConfig, !inverted)
  );
  return {
    groupAxisTickInfo,
    seriesAxisTickInfos
  };
}

function getAxisTickInfo(axisConfig: AxisConfigBase, vertical: boolean): AxisTickInfo {
  const tickLabelRotation = Math.abs(axisConfig.tickLabelRotation);
  const tickLabelParallel = vertical ? tickLabelRotation > 70 : tickLabelRotation < 20;
  const tickLabelAnchor = getTickLabelAnchor(axisConfig, vertical, tickLabelParallel);
  return {
    tickLabelParallel,
    tickLabelAnchor
  };
}

function getAxisTotalTickLabelSize(axisConfig: AxisConfigBase, rotatedTickBounds: Size, vertical: boolean): number {
  const tickLabelSize = axisConfig.tickLabelSize === AUTO
    ? (vertical ? rotatedTickBounds.width : rotatedTickBounds.height)
    : axisConfig.tickLabelSize;
  return axisConfig.tickLabelMarginInner + axisConfig.tickLabelPaddingInner + tickLabelSize + axisConfig.tickLabelMarginOuter + axisConfig.tickLabelPaddingOuter;
}

function getAxisTitleSize(axisConfig: AxisConfigBase, titleBounds: Size): number {
  let titleSize = 0;
  if (axisConfig.title !== NONE) {
    titleSize = axisConfig.titleSize === AUTO ? titleBounds.height : axisConfig.titleSize;
  }
  return titleSize;
}

function getAxisTotalTitleSize(axisConfig: AxisConfigBase, titleBounds: Size): number {
  let titleSize = 0;
  if (axisConfig.title !== NONE) {
    titleSize = axisConfig.titleMarginInner + axisConfig.titlePaddingInner + getAxisTitleSize(axisConfig, titleBounds) + axisConfig.titleMarginOuter + axisConfig.titlePaddingOuter;
  }
  return titleSize;
}

export function getAxisSize(axisConfig: AxisConfigBase, rotatedTickBounds: Size, titleBounds: Size, vertical: boolean): number {
  let axisSize = 0;
  if (axisConfig.visible) {
    axisSize = axisConfig.marginInner + axisConfig.paddingInner +
      getAxisTotalTickLabelSize(axisConfig, rotatedTickBounds, vertical) +
      getAxisTotalTitleSize(axisConfig, titleBounds) + axisConfig.marginOuter + axisConfig.paddingOuter;
  }
  return Math.ceil(axisSize);
}

export function getPlotHeight(innerHeight: number, titleHeight: number, legendHeight: number): number {
  return innerHeight - titleHeight - legendHeight;
}

export function setExtraAxisInfo(axisLayoutInfo: AxisLayoutInfo, axisConfig: AxisConfigBase, axisTickInfo: AxisTickInfo, tickBounds: TextBounds, rotatedTickBounds: Bounds, titleBounds: TextBounds, thresholdTitleBounds: TextBounds, vertical: boolean, inverted: boolean): void {
  const { before, collapsed, titleMarginInner, titleMarginOuter, titlePaddingInner, titlePaddingOuter, tickLabelMarginInner, tickLabelMarginOuter, tickLabelPaddingInner, tickLabelPaddingOuter,
    thresholdTitleMargin, thresholdTitlePadding, title, threshold, thresholdTitle } = axisConfig;
  const notAfter = (before && !collapsed) || (!before && collapsed);

  axisLayoutInfo.tickLabelParallel = axisTickInfo.tickLabelParallel;
  axisLayoutInfo.tickLabelSizeOffset = vertical ? tickBounds.width / 2.0 : tickBounds.height / 2.0;
  axisLayoutInfo.tickLabelSize = vertical ? rotatedTickBounds.width : rotatedTickBounds.height;
  axisLayoutInfo.tickLabelSpace = axisTickInfo.tickLabelParallel ? tickBounds.width : tickBounds.height;
  axisLayoutInfo.titleSize = getAxisTitleSize(axisConfig, titleBounds);
  axisLayoutInfo.totalTickLabelSize = getAxisTotalTickLabelSize(axisConfig, rotatedTickBounds, vertical);
  axisLayoutInfo.totalTitleSize = getAxisTotalTitleSize(axisConfig, titleBounds);
  axisLayoutInfo.tickHeight = tickBounds.height;
  axisLayoutInfo.vertical = vertical;
  axisLayoutInfo.tickLabelAnchor = axisTickInfo.tickLabelAnchor;

  let { tickLabelSize } = axisConfig;
  if (tickLabelSize === AUTO) {
    tickLabelSize = axisLayoutInfo.tickLabelSize;
  }
  let { tickLabelSizeOffset, tickLabelParallel } = axisLayoutInfo;
  if (!vertical && notAfter && !tickLabelParallel) {
    // AxisTickInfo never defines tickTextAnchor (only tickLabelAnchor), so this is always
    // undefined and the else branch always runs; preserved as-is while adding types.
    if ((axisTickInfo as AxisTickInfo & { tickTextAnchor?: Anchor }).tickTextAnchor === ANCHOR_MIDDLE) {
      tickLabelSizeOffset = tickLabelSize / 2.0;
    }
    else {
      tickLabelSizeOffset = tickLabelSize;
    }
  }
  const tickLabelAnchorOffset = axisTickInfo.tickLabelAnchor === ANCHOR_MIDDLE ? tickLabelSize / 2.0 : axisTickInfo.tickLabelAnchor === ANCHOR_START ? 0 : tickLabelSize;

  const { totalTickLabelSize, totalTitleSize, width, height } = axisLayoutInfo;

  let titleTextX = 0;
  let titleTextY = 0;
  let titleTextAngle = 0;
  const theTitleOffset = notAfter ? totalTitleSize : 0;
  const tickMarginOffset = notAfter ? tickLabelMarginOuter + tickLabelPaddingOuter : tickLabelMarginInner + tickLabelPaddingInner;
  const tickOffset = theTitleOffset + tickMarginOffset;

  const tickTextX = vertical ? tickOffset + tickLabelAnchorOffset : 0;
  const tickTextY = vertical ? 0 : tickOffset + tickLabelSizeOffset;

  axisLayoutInfo.tickTextX = tickTextX;
  axisLayoutInfo.tickTextY = tickTextY;

  // both boxes are offset across the axis (x when vertical, y when horizontal)
  // and always span its full length along it. The outer side comes first in the
  // axis' local coordinates, so the title leads for a notAfter axis and the tick
  // labels lead otherwise - matching tickOffset/titleOffset for the text itself.
  const titleBoxOffset = notAfter ? 0 : totalTickLabelSize;
  const tickLabelBoxOffset = notAfter ? totalTitleSize : 0;

  const titleLayoutInfo = axisLayoutInfo.titleLayoutInfo = title === NONE ? emptyLayoutInfo : createInnerOuterSpacingLayoutInfo({
    x: vertical ? titleBoxOffset : 0,
    y: vertical ? 0 : titleBoxOffset,
    width: vertical ? totalTitleSize : width,
    height: vertical ? height : totalTitleSize,
  }, vertical, inverted, before, titleMarginInner, titleMarginOuter, titlePaddingInner, titlePaddingOuter);

  const tickLabelLayoutInfo = axisLayoutInfo.tickLabelLayoutInfo = createInnerOuterSpacingLayoutInfo({
    x: vertical ? tickLabelBoxOffset : 0,
    y: vertical ? 0 : tickLabelBoxOffset,
    width: vertical ? totalTickLabelSize : width,
    height: vertical ? height : totalTickLabelSize,
  }, vertical, inverted, before, tickLabelMarginInner, tickLabelMarginOuter, tickLabelPaddingInner, tickLabelPaddingOuter);

  const { focusRangeApplyToTitle } = axisConfig;
  const focusRangeTitle = focusRangeApplyToTitle && title !== NONE;
  const focusMarginInner = tickLabelMarginInner;
  const focusMarginOuter = focusRangeApplyToTitle ? titleMarginOuter : tickLabelMarginOuter;
  const focusPaddingInner = tickLabelPaddingInner;
  const focusPaddingOuter = focusRangeApplyToTitle ? titlePaddingOuter : tickLabelPaddingOuter;
  axisLayoutInfo.focusRangeLayoutInfo = axisConfig.focusRange === false ? emptyLayoutInfo : createInnerOuterSpacingLayoutInfo({
    x: focusRangeTitle ? Math.min(titleLayoutInfo.x, tickLabelLayoutInfo.x) : tickLabelLayoutInfo.x,
    y: focusRangeTitle ? Math.min(titleLayoutInfo.y, tickLabelLayoutInfo.y) : tickLabelLayoutInfo.y,
    width: vertical ? (focusRangeApplyToTitle ? titleLayoutInfo.width + tickLabelLayoutInfo.width : tickLabelLayoutInfo.width) : width,
    height: !vertical ? (focusRangeApplyToTitle ? titleLayoutInfo.height + tickLabelLayoutInfo.height : tickLabelLayoutInfo.height) : height,
  }, vertical, inverted, before, focusMarginInner, focusMarginOuter, focusPaddingInner, focusPaddingOuter);

  if (title !== NONE) {
    const titleOffset = notAfter ? titleMarginOuter + titlePaddingOuter + axisLayoutInfo.titleSize / 2.0 : (totalTickLabelSize + totalTitleSize - titleMarginOuter - titlePaddingOuter - axisLayoutInfo.titleSize / 2.0);
    titleTextX = vertical ? titleOffset : width / 2.0;
    titleTextY = vertical ? height / 2.0 : titleOffset;
    titleTextAngle = vertical ? (notAfter ? 90 : 270) : 0;
  }
  axisLayoutInfo.thresholdTitleLayoutInfo = !(threshold !== NONE && thresholdTitle !== NONE) ? emptyLayoutInfo : createSpacingLayoutInfo({x: 0, y: 0, ...thresholdTitleBounds}, thresholdTitleMargin, thresholdTitlePadding, false);

  axisLayoutInfo.titleTextX = titleTextX;
  axisLayoutInfo.titleTextY = titleTextY;
  axisLayoutInfo.titleTextAngle = titleTextAngle;

  let tickMarkX1 = 0;
  let tickMarkY1 = 0;
  let tickMarkX2 = 0;
  let tickMarkY2 = 0;
  if (axisConfig.tickMarks) {
    const { tickMarkMargin, tickMarkSize } = axisConfig;
    const tickMarkOffset = notAfter ? (vertical ? width : height) - tickMarkMargin : tickMarkMargin;
    tickMarkX1 = vertical ? tickMarkOffset : 0;
    tickMarkX2 = vertical ? (notAfter ? tickMarkX1 - tickMarkSize : tickMarkX1 + tickMarkSize) : 0;
    tickMarkY1 = vertical ? 0 : tickMarkOffset;
    tickMarkY2 = vertical ? 0 : (notAfter ? tickMarkY1 - tickMarkSize : tickMarkY1 + tickMarkSize);
  }
  axisLayoutInfo.tickMarkX1 = tickMarkX1;
  axisLayoutInfo.tickMarkY1 = tickMarkY1;
  axisLayoutInfo.tickMarkX2 = tickMarkX2;
  axisLayoutInfo.tickMarkY2 = tickMarkY2;

  let focusTickMarkX1 = 0;
  let focusTickMarkY1 = 0;
  let focusTickMarkX2 = 0;
  let focusTickMarkY2 = 0;
  if (axisConfig.focusTickMarks) {
    const { focusTickMarkMargin, focusTickMarkSize } = axisConfig;
    const focusTickMarkOffset = notAfter ? (vertical ? width : height) - focusTickMarkMargin : focusTickMarkMargin;
    focusTickMarkX1 = vertical ? focusTickMarkOffset : 0;
    focusTickMarkX2 = vertical ? (notAfter ? focusTickMarkX1 - focusTickMarkSize : focusTickMarkX1 + focusTickMarkSize) : 0;
    focusTickMarkY1 = vertical ? 0 : focusTickMarkOffset;
    focusTickMarkY2 = vertical ? 0 : (notAfter ? focusTickMarkY1 - focusTickMarkSize : focusTickMarkY1 + focusTickMarkSize);
  }
  axisLayoutInfo.focusTickMarkX1 = focusTickMarkX1;
  axisLayoutInfo.focusTickMarkY1 = focusTickMarkY1;
  axisLayoutInfo.focusTickMarkX2 = focusTickMarkX2;
  axisLayoutInfo.focusTickMarkY2 = focusTickMarkY2;

  let axisLineX1 = 0;
  let axisLineY1 = 0;
  let axisLineX2 = 0;
  let axisLineY2 = 0;
  if (axisConfig.axisLine === true) {
    const { axisLineMargin } = axisConfig;
    const axisLineOffset = notAfter ? (vertical ? width : height) - axisLineMargin : axisLineMargin;
    axisLineX1 = vertical ? axisLineOffset : 0;
    axisLineY1 = vertical ? 0 : axisLineOffset;
    axisLineX2 = vertical ? axisLineX1 : axisLineX1 + width;
    axisLineY2 = vertical ? axisLineY1 + height : axisLineY1;
  }

  axisLayoutInfo.axisLineX1 = axisLineX1;
  axisLayoutInfo.axisLineY1 = axisLineY1;
  axisLayoutInfo.axisLineX2 = axisLineX2;
  axisLayoutInfo.axisLineY2 = axisLineY2;

  let titleBoundsX = 0;
  let titleBoundsY = 0;
  let titleBoundsWidth = 0;
  let titleBoundsHeight = 0;
  // TODO - check axisConfig.visible higher up...
  if (axisConfig.visible && axisConfig.title !== NONE && axisConfig.titleTruncationEnabled) {
    let { tickLabelSize } = axisConfig;
    if (tickLabelSize === AUTO) {
      tickLabelSize = axisLayoutInfo.tickLabelSize;
    }

    const titleOffset = notAfter ? axisConfig.titleMarginOuter + axisConfig.titlePaddingOuter : totalTickLabelSize + axisConfig.titleMarginInner + axisConfig.titlePaddingInner;

    titleBoundsX = vertical ? titleOffset : 0;
    titleBoundsY = vertical ? 0 : titleOffset;
    titleBoundsWidth = vertical ? axisLayoutInfo.titleSize : width;
    titleBoundsHeight = vertical ? height : axisLayoutInfo.titleSize;
  }

  axisLayoutInfo.titleBoundsX = titleBoundsX;
  axisLayoutInfo.titleBoundsY = titleBoundsY;
  axisLayoutInfo.titleBoundsWidth = titleBoundsWidth;
  axisLayoutInfo.titleBoundsHeight = titleBoundsHeight;
}

function getTickLabelAnchor(axisConfig: AxisConfigBase, vertical: boolean, tickLabelParallel: boolean): Anchor {
  if (axisConfig.tickLabelAnchor === AUTO) {
    if (!tickLabelParallel) {
      const { before, collapsed, tickLabelRotation } = axisConfig;
      const notAfter = (before && !collapsed) || (!before && collapsed);
      if (vertical) {
        return notAfter ? ANCHOR_END : ANCHOR_START;
      }
      else {
        return notAfter ? (tickLabelRotation >= 0 ? ANCHOR_END : ANCHOR_START) : (tickLabelRotation >= 0 ? ANCHOR_START : ANCHOR_END);
      }
    }
    else {
      return ANCHOR_MIDDLE;
    }
  }
  else {
    return axisConfig.tickLabelAnchor;
  }
}

export function getPlotWidthAndX(mochartConfig: MochartConfig, chartTextBoundsData: ChartTextBoundsData, chartData: ChartDataForLayout | null, contentBounds: Bounds): { x: number; width: number } {
  const { plotConfig, groupAxisConfig, seriesAxisConfigs } = mochartConfig;
  const { groupAxisTitleBounds, seriesAxisTitleBounds } = chartTextBoundsData;
  const seriesAxisFilteredSeriesCounts = chartData ? chartData.seriesData.axisSeriesCounts : {};
  const { x: contentX, width: contentWidth } = contentBounds;
  const { inverted, margin, padding } = plotConfig;
  const spacingLeft = getSpacingLeft(margin, padding);
  const plotSpacingWidth = contentWidth - getSpacingWidth(margin, padding);
  const plotSpacingX = contentX + spacingLeft;
  const groupExtent = inverted ? 0 : plotSpacingWidth;
  const seriesExtent = inverted ? plotSpacingWidth : 0;
  const groupY = inverted ? 0 : plotSpacingX;
  const seriesY = inverted ? plotSpacingX : 0;

  const axisTickInfos = getAxisTickInfos(plotConfig, groupAxisConfig, seriesAxisConfigs);

  const groupAxisRotatedTickBounds = getGroupAxisRotatedTickBounds(mochartConfig, chartTextBoundsData, axisTickInfos);
  const seriesAxisRotatedTickBounds = getSeriesAxisRotatedTickBounds(mochartConfig, chartTextBoundsData, axisTickInfos)

  const groupAxisSize = getGroupAxisSize(groupAxisConfig, groupAxisRotatedTickBounds, groupAxisTitleBounds, inverted);
  const seriesAxisSizes = getSeriesAxisSizes(seriesAxisConfigs, seriesAxisFilteredSeriesCounts, seriesAxisRotatedTickBounds, seriesAxisTitleBounds, !inverted);

  const seriesAxesOffset = getGroupAxisBeforeAfter(groupAxisConfig, groupAxisSize);
  const groupAxesOffset = getSeriesAxisBeforeAfter(seriesAxisConfigs, seriesAxisSizes);

  const groupInnerExtent = Math.max(groupExtent - groupAxesOffset.before - groupAxesOffset.after, 1);
  const seriesInnerExtent = Math.max(seriesExtent - seriesAxesOffset.before - seriesAxesOffset.after, 1);

  const x = inverted ? seriesY + seriesAxesOffset.before : groupY + groupAxesOffset.before;
  const width = inverted ? seriesInnerExtent : groupInnerExtent;

  return {
    x,
    width
  };
}

export function getPlotLayoutInfo(mochartConfig: MochartConfig, chartTextBoundsData: ChartTextBoundsData, chartData: ChartDataForLayout | null, contentBounds: Bounds, plotHeight: number, plotY: number): PlotLayoutResult {
  const { plotConfig, groupAxisConfig, seriesAxisConfigs } = mochartConfig;
  const { groupAxisTitleBounds, seriesAxisTitleBounds } = chartTextBoundsData;
  const seriesAxisFilteredSeriesCounts = chartData ? chartData.seriesData.axisSeriesCounts : {};
  const { x, width } = contentBounds;
  const { inverted, margin, padding } = plotConfig;
  const spacingTop = getSpacingTop(margin, padding);
  const spacingLeft = getSpacingLeft(margin, padding);
  const plotSpacingHeight = plotHeight - getSpacingHeight(margin, padding);
  const plotSpacingWidth = width - getSpacingWidth(margin, padding);
  const plotSpacingX = x + spacingLeft;
  const plotSpacingY = plotY + spacingTop;
  const groupExtent = inverted ? plotSpacingHeight : plotSpacingWidth;
  const seriesExtent = inverted ? plotSpacingWidth : plotSpacingHeight;
  const groupY = inverted ? plotSpacingY : plotSpacingX;
  const seriesY = inverted ? plotSpacingX : plotSpacingY;

  const axisTickInfos = getAxisTickInfos(plotConfig, groupAxisConfig, seriesAxisConfigs);

  const groupAxisRotatedTickBounds = getGroupAxisRotatedTickBounds(mochartConfig, chartTextBoundsData, axisTickInfos);
  const seriesAxisRotatedTickBounds = getSeriesAxisRotatedTickBounds(mochartConfig, chartTextBoundsData, axisTickInfos)

  const groupAxisSize = getGroupAxisSize(groupAxisConfig, groupAxisRotatedTickBounds, groupAxisTitleBounds, inverted);
  const seriesAxisSizes = getSeriesAxisSizes(seriesAxisConfigs, seriesAxisFilteredSeriesCounts, seriesAxisRotatedTickBounds, seriesAxisTitleBounds, !inverted);

  const seriesAxesOffset = getGroupAxisBeforeAfter(groupAxisConfig, groupAxisSize);
  const groupAxesOffset = getSeriesAxisBeforeAfter(seriesAxisConfigs, seriesAxisSizes);

  const seriesAxesCollapsedAfter = getCollapsedAfterSizeConsumption(seriesAxisConfigs, seriesAxisSizes);
  const groupInnerExtent = Math.max(groupExtent - groupAxesOffset.before - groupAxesOffset.after, 1);
  const seriesInnerExtent = Math.max(seriesExtent - seriesAxesOffset.before - seriesAxesOffset.after , 1);

  const seriesLayoutInfo = createLayoutInfo(groupY + groupAxesOffset.before,
    seriesY + seriesAxesOffset.before, groupInnerExtent, seriesInnerExtent, inverted);

  const groupAxisLayoutInfo = createGroupAxisLayoutInfo(mochartConfig, chartTextBoundsData, groupAxisRotatedTickBounds, axisTickInfos, groupY, seriesY, groupInnerExtent, seriesInnerExtent, groupAxesOffset, groupAxisSize);
  const seriesAxisLayoutInfos = createSeriesAxisLayoutInfos(mochartConfig, chartTextBoundsData, chartData, seriesAxisRotatedTickBounds, axisTickInfos, groupY, seriesY, groupInnerExtent, seriesInnerExtent, groupAxesOffset, seriesAxesOffset, seriesAxisSizes, seriesAxisFilteredSeriesCounts, seriesAxesCollapsedAfter);

  const plotLayoutInfo = createInvertedSpacingLayoutInfo({ x, y: plotY, width, height: plotHeight }, inverted, margin, padding);

  return {
    plotLayoutInfo,
    groupAxisLayoutInfo,
    seriesLayoutInfo,
    seriesAxisLayoutInfos
  };
}

// TODO - possibly split into the following:
/*
axisTickMarkLayout: {
  vertical, x1, x2, y1, y2
}

axisTickLabelLayout: {
  vertical, anchor, x, y
}

axisTitleLayout: {
  x, y, angle
}

axisLineLayout: {
  x1, x2, y1, y2
}

axisTitleClipLayout {
  x, y, width, height
}
*/
