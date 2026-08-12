import { ALIGN_LEFT, ALIGN_CENTER, AUTO } from '../config/core/constants';
import { getLegendItemBoundsList } from '../utils/TextMeasurement';
import { createSpacingLayoutInfo, getSpacingLeft, getSpacingWidth, getSpacingTop, getSpacingHeight } from './SpacingLayoutInfo';
import type { Bounds, TextBounds } from '../types/geometry';
import type { LegendConfig } from '../types/config';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { ChartTextBoundsData, LayoutInfo, LegendLayoutResult, SpacingLayoutInfo } from '../types/layout';

const fallbackLegendIconSize = 14;

// 'auto' tracks the label's font size (like the tooltip's 1em icon), falling back to the measured em box
export function resolveLegendIconSize(legendConfig: LegendConfig, legendTextBounds: TextBounds): number {
  if (legendConfig.iconSize !== AUTO) return legendConfig.iconSize;
  if (legendTextBounds.default || legendTextBounds.height <= 0) return fallbackLegendIconSize;
  const { fontSize } = legendTextBounds;
  return fontSize !== undefined && fontSize > 0 ? Math.round(fontSize) : legendTextBounds.height;
}

export function getLegendHeight(mochartConfig: EnhancedMochartConfig, chartTextBoundsData: ChartTextBoundsData, contentBounds: Bounds, plotWidthAndX: { x: number; width: number }): number {
  const { legend: legendConfig, series: seriesConfigs } = mochartConfig;
  if (legendConfig.visible === true && seriesConfigs.length > 0) {
    const { margin, padding, itemMargin, itemPadding, alignedToAxes, iconSpacerSize } = legendConfig;
    const { legendItemMaxTextBounds } = chartTextBoundsData;
    const legendItemTextRawBounds = getLegendItemBoundsList(mochartConfig, chartTextBoundsData.legendItemTextRawBounds);
    const { width } = contentBounds;
    const iconSize = resolveLegendIconSize(legendConfig, legendItemMaxTextBounds);

    const legendSpacingLeft = getSpacingLeft(margin, padding);
    const legendSpacingTop = getSpacingTop(margin, padding);
    const legendSpacingWidth = getSpacingWidth(margin, padding);
    const legendSpacingHeight = getSpacingHeight(margin, padding);

    const itemSpacingWidth = getSpacingWidth(itemMargin, itemPadding);
    const itemSpacingHeight = getSpacingHeight(itemMargin, itemPadding);

    const iconWidth = iconSize + iconSpacerSize;
    const iconHeight = iconSize;

    const legendMinX = alignedToAxes ? plotWidthAndX.x : 0;
    const legendMaxWidth = alignedToAxes ? plotWidthAndX.width : width;

    const legendMinSpacingX = legendMinX + legendSpacingLeft;
    const legendMaxSpacingWidth = legendMaxWidth - legendSpacingWidth;
    const legendMaxSpacingX = legendMinSpacingX + legendMaxSpacingWidth;

    const itemTextMaxWidth = legendMaxWidth - legendSpacingWidth - itemSpacingWidth - iconWidth;
    const itemTextHeight = legendItemMaxTextBounds.height;

    const itemHeight = Math.max(iconHeight, itemTextHeight) + itemSpacingHeight;

    let x = legendMinSpacingX;
    let y = legendSpacingTop;
    let maxY = y;
    let textWidth: number, itemWidth: number;
    for (const itemTextBounds of legendItemTextRawBounds) {
      textWidth = Math.min(itemTextBounds.width, itemTextMaxWidth);
      itemWidth = textWidth + iconWidth + itemSpacingWidth;
      if (x !== legendMinSpacingX && (x + itemWidth) > legendMaxSpacingX) {
        x = legendMinSpacingX;
        y += itemHeight;
      }
      x += itemWidth;
      maxY = Math.max(maxY, y + itemHeight);
    }

    const legendHeight = maxY - legendSpacingTop + legendSpacingHeight;
    return legendHeight
  }
  return 0;
}

export function getLegendLayoutInfo(mochartConfig: EnhancedMochartConfig, chartTextBoundsData: ChartTextBoundsData, contentBounds: Bounds, seriesLayoutInfo: LayoutInfo, legendHeight: number, legendY: number): Partial<LegendLayoutResult> {
  const { legend: legendConfig, series: seriesConfigs } = mochartConfig;
  if (legendConfig.visible === true && seriesConfigs.length > 0) {
    const { margin, padding, itemMargin, itemPadding, alignedToAxes, align, iconSpacerSize } = legendConfig;
    const { legendItemMaxTextBounds } = chartTextBoundsData;
    const legendItemTextRawBounds = getLegendItemBoundsList(mochartConfig, chartTextBoundsData.legendItemTextRawBounds);
    const iconSize = resolveLegendIconSize(legendConfig, legendItemMaxTextBounds);
    // Carry the placeholder marker into the item layouts so the rendered icon
    // uses the same fallback size as the layout pass.
    const hasDefaultBounds = legendItemTextRawBounds.some(bounds => bounds.default) || legendItemMaxTextBounds.default;
    const { width } = contentBounds;

    const legendSpacingLeft = getSpacingLeft(margin, padding);
    const legendSpacingTop = getSpacingTop(margin, padding);
    const legendSpacingWidth = getSpacingWidth(margin, padding);

    const itemSpacingLeft = getSpacingLeft(itemMargin, itemPadding);
    const itemSpacingWidth = getSpacingWidth(itemMargin, itemPadding);
    const itemSpacingHeight = getSpacingHeight(itemMargin, itemPadding);

    const iconWidth = iconSize + iconSpacerSize;
    const iconHeight = iconSize;

    const legendMinX = alignedToAxes ? seriesLayoutInfo.x : 0;
    const legendMaxWidth = alignedToAxes ? seriesLayoutInfo.width : width;

    const legendMinSpacingX = legendMinX + legendSpacingLeft;
    const legendMaxSpacingWidth = legendMaxWidth - legendSpacingWidth;
    const legendMaxSpacingX = legendMinSpacingX + legendMaxSpacingWidth;

    const itemMaxSpacingWidth = legendMaxSpacingWidth - itemSpacingWidth;
    const itemTextMaxWidth = itemMaxSpacingWidth - iconWidth;
    const itemTextWidth = legendItemMaxTextBounds.width;
    const itemTextHeight = legendItemMaxTextBounds.height;

    const itemHeight = Math.max(iconHeight, itemTextHeight) + itemSpacingHeight;

    const legendItemLayoutInfos: SpacingLayoutInfo[] = [];
    const legendItemRawLayoutInfos: SpacingLayoutInfo[] = [];
    let x = legendMinSpacingX;
    let y = legendSpacingTop;
    let maxX = x;
    let textWidth: number, itemWidth: number, itemRawWidth: number;
    for (const itemTextBounds of legendItemTextRawBounds) {
      textWidth = Math.max(0, Math.min(itemTextBounds.width, itemTextMaxWidth));
      itemWidth = textWidth + iconWidth + itemSpacingWidth;
      itemRawWidth = itemTextBounds.width + iconWidth + itemSpacingWidth;
      if (x !== legendMinSpacingX && (x + itemWidth) > legendMaxSpacingX) {
        x = legendMinSpacingX;
        y+= itemHeight;
      }
      legendItemLayoutInfos.push(createSpacingLayoutInfo({x: x - legendMinX, y, width: itemWidth, height: itemHeight}, itemMargin, itemPadding));
      legendItemRawLayoutInfos.push(createSpacingLayoutInfo({ x: x - legendMinX, y, width: itemRawWidth, height: itemHeight }, itemMargin, itemPadding));
      x+= itemWidth;
      maxX = Math.max(maxX, x);
    }

    const legendWidth = maxX - legendMinSpacingX + legendSpacingWidth;
    // Clamped for the no-item legend (every series showInLegend: false), where
    // the spacing arithmetic would go negative and produce an invalid clip rect.
    const legendItemTextWidth = Math.max(0, legendWidth - legendSpacingWidth - itemSpacingWidth - iconWidth);

    let legendX = legendMinX;
    if (align !== ALIGN_LEFT && legendWidth < legendMaxWidth) {
      const extraWidth = legendMaxWidth - legendWidth;
      legendX += (align === ALIGN_CENTER ? (extraWidth / 2.0) : extraWidth);
    }

    const legendLayoutInfo = createSpacingLayoutInfo({ x: legendX, y: legendY, width: legendWidth, height: legendHeight, default: hasDefaultBounds }, margin, padding);
    // the font size rides along so the rendered icon resolves 'auto' the same way this pass did
    const { fontSize } = legendItemMaxTextBounds;
    const legendItemTextLayoutInfo = createSpacingLayoutInfo({
      x: itemSpacingLeft + iconWidth,
      y: 0,
      width: legendItemTextWidth,
      height: itemTextHeight,
      default: hasDefaultBounds,
      fontSize
    }, itemMargin, itemPadding);
    const legendItemTextRawLayoutInfo = createSpacingLayoutInfo({
      x: itemSpacingLeft + iconWidth,
      y: 0,
      width: itemTextWidth,
      height: itemTextHeight,
      default: hasDefaultBounds,
      fontSize
    }, itemMargin, itemPadding);

    return {
      legendLayoutInfo,
      legendItemTextLayoutInfo,
      legendItemTextRawLayoutInfo,
      legendItemLayoutInfos,
      legendItemRawLayoutInfos
    };
  }

  return {};
}
