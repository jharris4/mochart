import { getWithMutations } from '../utils/WithMutations';
import type { Bounds, Size } from '../types/geometry';
import type { MochartConfig } from '../types/config';
import type { ChartLayoutInfo } from '../types/layout';

const defaultLayout: Bounds = { x: 0, y: 0, width: 50, height: 50 };

export function getTooltipLayoutInfo(mochartConfig: MochartConfig, tooltipBounds: null): Bounds;
export function getTooltipLayoutInfo(mochartConfig: MochartConfig, tooltipBounds: Size, layoutInfo: ChartLayoutInfo, groupValueData: { positions: number[] }, focusedGroupIndex: number,
                                     tooltipGroupPercentage: number, tooltipSeriesPercentage: number): Bounds;
export function getTooltipLayoutInfo(mochartConfig: MochartConfig, tooltipBounds: Size | null, layoutInfo?: ChartLayoutInfo, groupValueData?: { positions: number[] }, focusedGroupIndex = -1,
                                     tooltipGroupPercentage = 0, tooltipSeriesPercentage = 0): Bounds {
  if (tooltipBounds === null) {
    return defaultLayout;
  }
  const { tooltipConfig, plotConfig } = mochartConfig;
  const { chartContentLayoutInfo, seriesLayoutInfo, containerLayoutInfo } = layoutInfo!;
  let { width, height } = tooltipBounds;
  const extraWidth = 2 * (tooltipConfig.borderWidth + tooltipConfig.padding);
  width+= extraWidth;
  height+= extraWidth;
  const groupOffset = tooltipConfig.snapToGroup ? groupValueData!.positions[focusedGroupIndex] : tooltipGroupPercentage * seriesLayoutInfo.groupExtent;
  const seriesOffset = tooltipSeriesPercentage * seriesLayoutInfo.seriesExtent;

  let tooltipLayoutInfo = {
    x: chartContentLayoutInfo.x + seriesLayoutInfo.x + (plotConfig.inverted ? seriesOffset : groupOffset) - width / 2.0,
    y: chartContentLayoutInfo.y + seriesLayoutInfo.y + (plotConfig.inverted ? groupOffset : seriesOffset) - height / 2.0,
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
