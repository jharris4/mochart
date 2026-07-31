import type { Bounds, Size } from '../types/geometry';
import type { LayoutInfo } from '../types/layout';

export function createLayoutInfo(groupPosition: number, seriesPosition: number, groupExtent: number, seriesExtent: number, inverted: boolean): LayoutInfo {
  const layoutInfo = {
    groupPosition,
    seriesPosition,
    groupExtent,
    seriesExtent,
    inverted
  } as LayoutInfo;
  if (inverted) {
    layoutInfo.x = seriesPosition;
    layoutInfo.y = groupPosition;
    layoutInfo.width = seriesExtent;
    layoutInfo.height = groupExtent;
  }
  else {
    layoutInfo.x = groupPosition;
    layoutInfo.y = seriesPosition;
    layoutInfo.width = groupExtent;
    layoutInfo.height = seriesExtent;
  }
  return layoutInfo;
}

export function createBoundsLayoutInfo(bounds: Bounds, inverted: boolean): LayoutInfo {
  const { x, y, width, height } = bounds;
  return createLayoutInfo(inverted ? y : x, inverted ? x : y, inverted ? height : width, inverted ? width : height, inverted);
}

export function layoutInfoExtentChanged(oldLayoutInfo: Size | null, newLayoutInfo: Size | null): boolean {
  if (oldLayoutInfo === newLayoutInfo) {
    return false;
  }
  else if (oldLayoutInfo === null || newLayoutInfo === null) {
    return true;
  }
  else {
    return oldLayoutInfo.width !== newLayoutInfo.width ||
           oldLayoutInfo.height !== newLayoutInfo.height;
  }
}
