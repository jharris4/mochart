export function createLayoutInfo(groupPosition, seriesPosition, groupExtent, seriesExtent, inverted) {
  let layoutInfo = {
    groupPosition,
    seriesPosition,
    groupExtent,
    seriesExtent,
    inverted
  };
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

export function createBoundsLayoutInfo(bounds, inverted) {
  const { x, y, width, height } = bounds;
  return createLayoutInfo(inverted ? y : x, inverted ? x : y, inverted ? height : width, inverted ? width : height, inverted);
}

export function layoutInfoExtentChanged(oldLayoutInfo, newLayoutInfo) {
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