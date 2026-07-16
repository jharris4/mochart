import { arrayToMap, idAccessor } from '../utils/utils';
import { getAxisSize, setExtraAxisInfo, getRotatedTickBounds } from './PlotLayout';
import { NONE } from '../config/core/constants';
import { createInnerOuterSpacingLayoutInfo } from './SpacingLayoutInfo';

export const emptyLayoutInfo = {
  x: 0, y: 0, width: 0, height: 0
};

function getSeriesAxisSizeConsumption(axisConfigs, axisSizes, isBefore) {
  let totalSize = 0;
  for (let axisConfig of axisConfigs) {
    if (axisConfig.collapsed === false && axisConfig.before === isBefore) {
      totalSize+= axisSizes[axisConfig.id];
    }
  }
  return Math.ceil(totalSize);
}

export function getSeriesAxisBeforeAfter(axisConfigs, axisSizes) {
  return {
    before: getSeriesAxisSizeConsumption(axisConfigs, axisSizes, true),
    after: getSeriesAxisSizeConsumption(axisConfigs, axisSizes, false)
  };
}

export function getSeriesAxisSizes(axisConfigs, axisDataCounts, rotatedTickBoundsMap, titleBoundsMap, vertical) {
  return arrayToMap(axisConfigs, idAccessor, axisConfig => {
    if (axisConfig.visible && (axisConfig.alwaysVisible || axisDataCounts[axisConfig.id] > 0)) {
      return getAxisSize(axisConfig, rotatedTickBoundsMap[axisConfig.id], titleBoundsMap[axisConfig.id], vertical);
    }
    else {
      return 0;
    }
  });
}

export function createSeriesAxisLayoutInfos(mochartConfig, chartTextBoundsData, chartData, seriesAxisRotatedTickBounds, axisTickInfos, groupY, seriesY, groupInnerExtent, seriesInnerExtent, groupAxesOffset, seriesAxesOffset, seriesAxisSizes, seriesAxisFilteredSeriesCounts, seriesAxesCollapsedAfter) {
  const { plotConfig, seriesAxisConfigs } = mochartConfig;
  const { seriesAxisTitleBounds, seriesAxisTickBounds, seriesAxisThresholdTitleBounds } = chartTextBoundsData;
  const { seriesAxisTickInfos } = axisTickInfos;
  const { inverted } = plotConfig;
  const vertical = !inverted;
  let currentSeriesOffsetBefore = 0;
  let currentSeriesOffsetAfter = 0;
  let currentSeriesCollapsedOffsetBefore = 0;
  let currentSeriesCollapsedOffsetAfter = 0;
  return arrayToMap(seriesAxisConfigs, idAccessor, seriesAxisConfig => {
    const { id, before, collapsed, marginInner, marginOuter, paddingInner, paddingOuter } = seriesAxisConfig;
    if (seriesAxisConfig.visible && (seriesAxisConfig.alwaysVisible || seriesAxisFilteredSeriesCounts[id] > 0)) {
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
        vertical, inverted, before, marginInner, marginOuter, paddingInner, paddingOuter);
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
    }
    else {
      return emptyLayoutInfo
    }
  });
}

export function getSeriesAxisRotatedTickBounds(mochartConfig, chartTextBoundsData, axisTickInfos) {
  const { seriesAxisConfigs } = mochartConfig;
  const { seriesAxisTickBounds } = chartTextBoundsData;
  const { seriesAxisTickInfos } = axisTickInfos;
  return arrayToMap(seriesAxisConfigs, idAccessor,
    seriesAxisConfig => getRotatedTickBounds(seriesAxisConfig, seriesAxisTickBounds[seriesAxisConfig.id], seriesAxisTickInfos[seriesAxisConfig.id]));
}