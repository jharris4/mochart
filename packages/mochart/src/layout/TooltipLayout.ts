import { getWithMutations } from '../utils/WithMutations';
import type { Bounds, Size } from '../types/geometry';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { ChartLayoutInfo } from '../types/layout';

const defaultLayout: Bounds = { x: 0, y: 0, width: 50, height: 50 };

export function getTooltipLayoutInfo(mochartConfig: EnhancedMochartConfig, tooltipBounds: null): Bounds;
export function getTooltipLayoutInfo(mochartConfig: EnhancedMochartConfig, tooltipBounds: Size, layoutInfo: ChartLayoutInfo, categoryValueData: { positions: number[] }, focusedCategoryIndex: number,
                                     tooltipCategoryPercentage: number, tooltipSeriesPercentage: number): Bounds;
export function getTooltipLayoutInfo(mochartConfig: EnhancedMochartConfig, tooltipBounds: Size | null, layoutInfo?: ChartLayoutInfo, categoryValueData?: { positions: number[] }, focusedCategoryIndex = -1,
                                     tooltipCategoryPercentage = 0, tooltipSeriesPercentage = 0): Bounds {
  if (tooltipBounds === null) {
    return defaultLayout;
  }
  const { tooltip: tooltipConfig, plot: plotConfig } = mochartConfig;
  const { chartContentLayoutInfo, seriesLayoutInfo, containerLayoutInfo } = layoutInfo!;
  let { width, height } = tooltipBounds;
  // A null border width leaves the css unset, so the border occupies nothing.
  const borderWidth = tooltipConfig.backgroundStyle.strokeWidth ?? 0;
  const { padding } = tooltipConfig;
  width += 2 * borderWidth + padding.left + padding.right;
  height += 2 * borderWidth + padding.top + padding.bottom;
  const categoryOffset = tooltipConfig.snapToCategory ? categoryValueData!.positions[focusedCategoryIndex] : tooltipCategoryPercentage * seriesLayoutInfo.categoryExtent;
  const seriesOffset = tooltipSeriesPercentage * seriesLayoutInfo.valueExtent;

  let tooltipLayoutInfo = {
    x: chartContentLayoutInfo.x + seriesLayoutInfo.x + (plotConfig.inverted ? seriesOffset : categoryOffset) - width / 2.0,
    y: chartContentLayoutInfo.y + seriesLayoutInfo.y + (plotConfig.inverted ? categoryOffset : seriesOffset) - height / 2.0,
    width,
    height
  };

  if (tooltipConfig.keepInside) {
    tooltipLayoutInfo = fitRectangleWithinRectangle(
      {
        ...seriesLayoutInfo,
        x: chartContentLayoutInfo.x + seriesLayoutInfo.x,
        y: chartContentLayoutInfo.x + seriesLayoutInfo.y
      },
      tooltipLayoutInfo);
  }
  else {
    tooltipLayoutInfo = fitRectangleWithinRectangle(containerLayoutInfo, tooltipLayoutInfo);
  }

  return tooltipLayoutInfo;
}

export function fitRectangleWithinRectangle({x: bx, y: by, width: bwidth, height: bheight}: Bounds, { x, y, width, height }: Bounds): Bounds {
  if (x < bx) {
    x = bx;
  }
  if (x + width > bx + bwidth) {
    x = bx + bwidth - width;
  }
  if (y < by) {
    y = by;
  }
  if (y + height > by + bheight) {
    y = by + bheight - height;
  }
  return { x, y, width, height };
}

export function getTooltipLayoutInfoWithMutations(oldTooltipLayoutInfo: Bounds | null, newTooltipLayoutInfo: Bounds): Bounds {
  return getWithMutations(oldTooltipLayoutInfo, newTooltipLayoutInfo);
}
