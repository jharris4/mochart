import { NONE, POSITION_TOP, ALIGN_LEFT, ALIGN_CENTER, ALIGN_RIGHT } from '../config/core/constants';
import { getSpacingOuterHeight, createSpacingLayoutInfo, getSpacingLeft, getSpacingRight, getSpacingWidth, getSpacingTop, getSpacingHeight } from './SpacingLayoutInfo';

export function getLegendHeight(mochartConfig, chartTextBoundsData, contentBounds, plotWidthAndX) {
  const { chartConfig, plotConfig, legendConfig, seriesConfigs } = mochartConfig;
  if (legendConfig.visible === true && seriesConfigs.length > 0) {
    const { margin, padding, itemMargin, itemPadding, alignedToAxes, align, iconSize, iconSpacerSize } = legendConfig;
    const { legendItemTextRawBounds, legendItemMaxTextBounds } = chartTextBoundsData;
    const { width } = contentBounds;

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
    let maxX = x;
    let maxY = y;
    let textWidth, itemWidth;
    for (let itemTextBounds of legendItemTextRawBounds) {
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

export function getLegendLayoutInfo(mochartConfig, chartTextBoundsData, contentBounds, seriesLayoutInfo, legendHeight, legendY) {
  const { chartConfig, plotConfig, legendConfig, seriesConfigs } = mochartConfig;
  if (legendConfig.visible === true && seriesConfigs.length > 0) {
    const { margin, padding, itemMargin, itemPadding, alignedToAxes, align, iconSize, iconSpacerSize } = legendConfig;
    const { legendItemTextRawBounds, legendItemMaxTextBounds } = chartTextBoundsData;
    const hasDefaultBounds = legendItemTextRawBounds.default || legendItemMaxTextBounds.default;
    const { width } = contentBounds;

    const legendSpacingLeft = getSpacingLeft(margin, padding);
    const legendSpacingTop = getSpacingTop(margin, padding);
    const legendSpacingWidth = getSpacingWidth(margin, padding);
    const legendSpacingHeight = getSpacingHeight(margin, padding);

    const itemSpacingLeft = getSpacingLeft(itemMargin, itemPadding);
    const itemSpacingTop = getSpacingTop(itemMargin, itemPadding);
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

    const legendItemLayoutInfos = [];
    const legendItemRawLayoutInfos = [];
    let x = legendMinSpacingX;
    let y = legendSpacingTop;
    let maxX = x;
    let textWidth, itemWidth, itemRawWidth;
    for (let itemTextBounds of legendItemTextRawBounds) {
      textWidth = Math.min(itemTextBounds.width, itemTextMaxWidth);
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
    const legendItemTextWidth = legendWidth - legendSpacingWidth - itemSpacingWidth - iconWidth;

    let legendX = legendMinX;
    if (align !== ALIGN_LEFT && legendWidth < legendMaxWidth) {
      const extraWidth = legendMaxWidth - legendWidth;
      legendX += (align === ALIGN_CENTER ? (extraWidth / 2.0) : extraWidth);
    }

    const legendLayoutInfo = createSpacingLayoutInfo({ x: legendX, y: legendY, width: legendWidth, height: legendHeight, default: hasDefaultBounds }, margin, padding);
    const legendItemTextLayoutInfo = createSpacingLayoutInfo({ x: itemSpacingLeft + iconWidth, y: 0, width: legendItemTextWidth, height: itemTextHeight }, itemMargin, itemPadding);
    const legendItemTextRawLayoutInfo = createSpacingLayoutInfo({ x: itemSpacingLeft + iconWidth, y: 0, width: itemTextWidth, height: itemTextHeight }, itemMargin, itemPadding);

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
