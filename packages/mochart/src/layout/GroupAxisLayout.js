import { setExtraAxisInfo, getAxisSize, getRotatedTickBounds } from './PlotLayout';
import { createInnerOuterSpacingLayoutInfo } from './SpacingLayoutInfo';

function getGroupAxisSizeConsumption(axisConfig, axisSize, isBefore) {
  if (axisConfig.collapsed === false && axisConfig.before === isBefore) {
    return axisSize;
  }
  else {
    return 0;
  }
}

export function getGroupAxisBeforeAfter(axisConfig, axisSize) {
  return {
    before: getGroupAxisSizeConsumption(axisConfig, axisSize, true),
    after: getGroupAxisSizeConsumption(axisConfig, axisSize, false)
  }
}

export function getGroupAxisSize(axisConfig, rotatedTickBounds, titleBounds, vertical) {
  if (axisConfig.visible) {
    return getAxisSize(axisConfig, rotatedTickBounds, titleBounds, vertical);
  }
  else {
    return 0;
  }
}

export function getGroupAxisRotatedTickBounds(mochartConfig, chartTextBoundsData, axisTickInfos) {
  const { groupAxisConfig } = mochartConfig;
  const { groupAxisTickBounds } = chartTextBoundsData;
  const { groupAxisTickInfo } = axisTickInfos;
  return getRotatedTickBounds(groupAxisConfig, groupAxisTickBounds, groupAxisTickInfo);
}

export function createGroupAxisLayoutInfo(mochartConfig, chartTextBoundsData, groupAxisRotatedTickBounds, axisTickInfos, groupY, seriesY, groupInnerExtent, seriesInnerExtent, groupAxesOffset, groupAxisSize) {
  const { plotConfig, groupAxisConfig } = mochartConfig;
  const { groupAxisTitleBounds, groupAxisTickBounds, groupAxisSizeTickBounds, groupAxisThresholdTitleBounds } = chartTextBoundsData;
  const { groupAxisTickInfo } = axisTickInfos;
  const { inverted } = plotConfig;
  const vertical = inverted;
  const { before, collapsed, marginInner, marginOuter, paddingInner, paddingOuter } = groupAxisConfig;
  const groupAxisOffset = before ? 0 : (collapsed ? seriesInnerExtent - groupAxisSize : seriesInnerExtent);

  let groupAxisLayoutInfo = createInnerOuterSpacingLayoutInfo({
      x: inverted ? seriesY + groupAxisOffset : groupY + groupAxesOffset.before,
      y: inverted ? groupY + groupAxesOffset.before : seriesY + groupAxisOffset,
      width: inverted ? groupAxisSize : groupInnerExtent,
      height: inverted ? groupInnerExtent : groupAxisSize
    },
    vertical, inverted, before, marginInner, marginOuter, paddingInner, paddingOuter);
  setExtraAxisInfo(groupAxisLayoutInfo, groupAxisConfig, groupAxisTickInfo, groupAxisTickBounds, groupAxisRotatedTickBounds, groupAxisTitleBounds, groupAxisThresholdTitleBounds, vertical, inverted);
  groupAxisLayoutInfo.position = groupY;
  groupAxisLayoutInfo.before = groupAxesOffset.before;
  groupAxisLayoutInfo.after = groupAxesOffset.after;
  groupAxisLayoutInfo.minTickSize = groupAxisSizeTickBounds.width;
  return groupAxisLayoutInfo;
}
