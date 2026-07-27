import { arrayToMap, idAccessor } from '../utils/utils';
import { getAxisSize, setExtraAxisInfo, getRotatedTickBounds } from './PlotLayout';
import { createInnerOuterSpacingLayoutInfo } from './SpacingLayoutInfo';
import type { Bounds, TextBounds } from '../types/geometry';
import type { MochartConfig, SeriesAxisConfig } from '../types/config';
import type { AxisLayoutInfo, AxisTickInfos, BeforeAfter, ChartDataForLayout, ChartTextBoundsData } from '../types/layout';

export const emptyLayoutInfo: Bounds = {
  x: 0, y: 0, width: 0, height: 0
};

function getSeriesAxisSizeConsumption(axisConfigs: SeriesAxisConfig[], axisSizes: Record<string, number>, isBefore: boolean): number {
  let totalSize = 0;
  for (let axisConfig of axisConfigs) {
    if (axisConfig.collapsed === false && axisConfig.before === isBefore) {
      totalSize+= axisSizes[axisConfig.id];
    }
  }
  return Math.ceil(totalSize);
}

export function getSeriesAxisBeforeAfter(axisConfigs: SeriesAxisConfig[], axisSizes: Record<string, number>): BeforeAfter {
  return {
    before: getSeriesAxisSizeConsumption(axisConfigs, axisSizes, true),
    after: getSeriesAxisSizeConsumption(axisConfigs, axisSizes, false)
  };
}

export function getSeriesAxisSizes(axisConfigs: SeriesAxisConfig[], axisDataCounts: Record<string, number>, rotatedTickBoundsMap: Record<string, Bounds>, titleBoundsMap: Record<string, TextBounds>, vertical: boolean): Record<string, number> {
  return arrayToMap(axisConfigs, idAccessor, axisConfig => {
    if (axisConfig.visible && (axisConfig.alwaysVisible || axisDataCounts[axisConfig.id] > 0)) {
      return getAxisSize(axisConfig, rotatedTickBoundsMap[axisConfig.id], titleBoundsMap[axisConfig.id], vertical);
    }
    else {
      return 0;
    }
  });
}

export function createSeriesAxisLayoutInfos(mochartConfig: MochartConfig, chartTextBoundsData: ChartTextBoundsData, _chartData: ChartDataForLayout | null, seriesAxisRotatedTickBounds: Record<string, Bounds>, axisTickInfos: AxisTickInfos, groupY: number, seriesY: number, groupInnerExtent: number, seriesInnerExtent: number, groupAxesOffset: BeforeAfter, seriesAxesOffset: BeforeAfter, seriesAxisSizes: Record<string, number>, _seriesAxisFilteredSeriesCounts: Record<string, number>, seriesAxesCollapsedAfter: number): Record<string, AxisLayoutInfo> {
  const { plotConfig, seriesAxisConfigs } = mochartConfig;
  const { seriesAxisTitleBounds, seriesAxisTickBounds, seriesAxisThresholdTitleBounds } = chartTextBoundsData;
  const { seriesAxisTickInfos } = axisTickInfos;
  const { inverted } = plotConfig;
  const vertical = !inverted;
  let currentSeriesOffsetBefore = 0;
  let currentSeriesOffsetAfter = 0;
  let currentSeriesCollapsedOffsetBefore = 0;
  let currentSeriesCollapsedOffsetAfter = 0;
  return arrayToMap<SeriesAxisConfig, AxisLayoutInfo>(seriesAxisConfigs, idAccessor, seriesAxisConfig => {
    const { id, before, collapsed, marginInner, marginOuter, paddingInner, paddingOuter } = seriesAxisConfig;
    // Hidden/suppressed axes still get a full layout info — their size is
    // already 0 (getSeriesAxisSizes) so they consume no space, but the scales
    // for their series need the seriesExtent set by setExtraAxisInfo.
    let seriesAxisOffset = groupY;
    if (collapsed) {
      seriesAxisOffset += groupAxesOffset.before + (before ? currentSeriesCollapsedOffsetBefore : currentSeriesCollapsedOffsetAfter + groupInnerExtent - seriesAxesCollapsedAfter);
    }
    else {
      seriesAxisOffset += (before ? currentSeriesOffsetBefore : currentSeriesOffsetAfter + groupAxesOffset.before + groupInnerExtent);
    }
    let seriesAxisSize = seriesAxisSizes[id];
    let seriesAxisLayoutInfo = createInnerOuterSpacingLayoutInfo({
      x: inverted ? seriesY + seriesAxesOffset.before : seriesAxisOffset,
      y: inverted ? seriesAxisOffset : seriesY + seriesAxesOffset.before,
      width: inverted ? seriesInnerExtent : seriesAxisSize,
      height: inverted ? seriesAxisSize : seriesInnerExtent
    },
      vertical, inverted, before, marginInner, marginOuter, paddingInner, paddingOuter) as AxisLayoutInfo;
    setExtraAxisInfo(seriesAxisLayoutInfo, seriesAxisConfig, seriesAxisTickInfos[id], seriesAxisTickBounds[id], seriesAxisRotatedTickBounds[id], seriesAxisTitleBounds[id], seriesAxisThresholdTitleBounds[id], vertical, inverted);
    if (collapsed) {
      currentSeriesCollapsedOffsetBefore += before === true ? seriesAxisSize : 0;
      currentSeriesCollapsedOffsetAfter += before === false ? seriesAxisSize : 0;
    }
    else {
      currentSeriesOffsetBefore += before === true ? seriesAxisSize : 0;
      currentSeriesOffsetAfter += before === false ? seriesAxisSize : 0;
    }
    return seriesAxisLayoutInfo;
  });
}

export function getSeriesAxisRotatedTickBounds(mochartConfig: MochartConfig, chartTextBoundsData: ChartTextBoundsData, axisTickInfos: AxisTickInfos): Record<string, Bounds> {
  const { seriesAxisConfigs } = mochartConfig;
  const { seriesAxisTickBounds } = chartTextBoundsData;
  const { seriesAxisTickInfos } = axisTickInfos;
  return arrayToMap(seriesAxisConfigs, idAccessor,
    seriesAxisConfig => getRotatedTickBounds(seriesAxisConfig, seriesAxisTickBounds[seriesAxisConfig.id], seriesAxisTickInfos[seriesAxisConfig.id]));
}
