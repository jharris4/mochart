import { setExtraAxisInfo, getAxisSize, getRotatedTickBounds } from './PlotLayout';
import { createInnerOuterSpacingLayoutInfo } from './SpacingLayoutInfo';
import type { Bounds, TextBounds } from '../types/geometry';
import type { GroupAxisConfig, MochartConfig } from '../types/config';
import type { AxisTickInfos, BeforeAfter, ChartTextBoundsData, GroupAxisLayoutInfo } from '../types/layout';

function getGroupAxisSizeConsumption(axisConfig: GroupAxisConfig, axisSize: number, isBefore: boolean): number {
  if (axisConfig.collapsed === false && axisConfig.before === isBefore) {
    return axisSize;
  }
  else {
    return 0;
  }
}

export function getGroupAxisBeforeAfter(axisConfig: GroupAxisConfig, axisSize: number): BeforeAfter {
  return {
    before: getGroupAxisSizeConsumption(axisConfig, axisSize, true),
    after: getGroupAxisSizeConsumption(axisConfig, axisSize, false)
  }
}

export function getGroupAxisSize(axisConfig: GroupAxisConfig, rotatedTickBounds: Bounds, titleBounds: TextBounds, vertical: boolean): number {
  if (axisConfig.visible) {
    return getAxisSize(axisConfig, rotatedTickBounds, titleBounds, vertical);
  }
  else {
    return 0;
  }
}

export function getGroupAxisRotatedTickBounds(mochartConfig: MochartConfig, chartTextBoundsData: ChartTextBoundsData, axisTickInfos: AxisTickInfos): Bounds {
  const { groupAxisConfig } = mochartConfig;
  const { groupAxisTickBounds } = chartTextBoundsData;
  const { groupAxisTickInfo } = axisTickInfos;
  return getRotatedTickBounds(groupAxisConfig, groupAxisTickBounds, groupAxisTickInfo);
}

export function createGroupAxisLayoutInfo(mochartConfig: MochartConfig, chartTextBoundsData: ChartTextBoundsData, groupAxisRotatedTickBounds: Bounds, axisTickInfos: AxisTickInfos, groupY: number, seriesY: number, groupInnerExtent: number, seriesInnerExtent: number, groupAxesOffset: BeforeAfter, groupAxisSize: number): GroupAxisLayoutInfo {
  const { plotConfig, groupAxisConfig } = mochartConfig;
  const { groupAxisTitleBounds, groupAxisTickBounds, groupAxisSizeTickBounds, groupAxisThresholdTitleBounds } = chartTextBoundsData;
  const { groupAxisTickInfo } = axisTickInfos;
  const { inverted } = plotConfig;
  const vertical = inverted;
  const { before, collapsed, marginInner, marginOuter, paddingInner, paddingOuter } = groupAxisConfig;
  const groupAxisOffset = before ? 0 : (collapsed ? seriesInnerExtent - groupAxisSize : seriesInnerExtent);

  const groupAxisLayoutInfo = createInnerOuterSpacingLayoutInfo({
      x: inverted ? seriesY + groupAxisOffset : groupY + groupAxesOffset.before,
      y: inverted ? groupY + groupAxesOffset.before : seriesY + groupAxisOffset,
      width: inverted ? groupAxisSize : groupInnerExtent,
      height: inverted ? groupInnerExtent : groupAxisSize
    },
    vertical, inverted, before, marginInner, marginOuter, paddingInner, paddingOuter) as GroupAxisLayoutInfo;
  setExtraAxisInfo(groupAxisLayoutInfo, groupAxisConfig, groupAxisTickInfo, groupAxisTickBounds, groupAxisRotatedTickBounds, groupAxisTitleBounds, groupAxisThresholdTitleBounds, vertical, inverted);
  groupAxisLayoutInfo.position = groupY;
  groupAxisLayoutInfo.before = groupAxesOffset.before;
  groupAxisLayoutInfo.after = groupAxesOffset.after;
  groupAxisLayoutInfo.minTickSize = groupAxisSizeTickBounds.width;
  return groupAxisLayoutInfo;
}
