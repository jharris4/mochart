import { NONE } from '../config/core/constants';

function normalizePriorPositions(seriesPositions, seriesPriorPositions, seriesBasePosition, inverted) {
  let temp, i, length = seriesPositions.length;
  if (seriesPriorPositions !== null) {
    for (i = 0; i < length; i++) {
      if (seriesPositions[i] === void 0) {
        if (seriesPriorPositions[i] !== void 0) {
          seriesPositions[i] = seriesPriorPositions[i];
        }
        else {
          seriesPriorPositions[i] = seriesBasePosition;
        }
      }
      else if (seriesPriorPositions[i] === void 0) {
        seriesPriorPositions[i] = seriesPositions[i];
      }
      else {
        let swapPosition = inverted ? seriesPositions[i] < seriesPriorPositions[i] : seriesPositions[i] > seriesPriorPositions[i]
        if(swapPosition) {
          temp = seriesPositions[i];
          seriesPositions[i] = seriesPriorPositions[i];
          seriesPriorPositions[i] = temp;
        }
      }
    }
  }
}

export function getSeriesPositionData(groupAxisConfig, seriesConfig, groupValueData, seriesAxisScale, valueObject, seriesLayoutInfo) {
  const { seriesAxisConfig, seriesGroupConfig, showMissingAtBase, skipMissing, group, stack, rangeProperty } = seriesConfig;
  const { spacingInfo, positions: groupPositions } = groupValueData;
  const { base } = seriesAxisConfig;
  const { max, min } = valueObject; // max is the array of seriesValues and min is optionally the array of priorSeriesValues
  const { inverted } = seriesLayoutInfo;

  let seriesBasePosition = seriesAxisScale.range()[0];
  if (base !== NONE) {
    if (base < seriesAxisScale.domain()[0]) {
      seriesBasePosition = seriesAxisScale.range()[0];
    }
    else if (base > seriesAxisScale.domain()[1]) {
      seriesBasePosition = seriesAxisScale.range()[1];
    }
    else {
      seriesBasePosition = seriesAxisScale(base);
    }
  }

  const missingPosition = showMissingAtBase ? seriesBasePosition : void 0;
  const skip = !showMissingAtBase && skipMissing; // skipMissing has no effect when showMissingAtBase is true

  const seriesPositions = [];
  let seriesPriorPositions = null;

  let groupDefinedPositions = null;
  let seriesDefinedPositions = null;
  let seriesPriorDefinedPositions = null;

  let { groupValueExtent, groupValueOffset } = spacingInfo;
  groupValueOffset*= -1;
  if (group !== NONE) {
    let groupExtentAndMargins = groupValueExtent / seriesGroupConfig.seriesConfigs.length;
    groupValueExtent = groupExtentAndMargins * (1.0 - groupAxisConfig.groupPadding.inner);
    groupValueOffset = groupValueOffset + (seriesGroupConfig.seriesConfigIndicesById[seriesConfig.id] * groupExtentAndMargins) + ((groupExtentAndMargins - groupValueExtent) / 2.0);
  }

  let i, length = groupPositions.length;
  let position;
  for (i=0; i<length; i++) {
    if (max[i] !== void 0) {
      position = Math.floor(seriesAxisScale(max[i]));
      seriesPositions.push(position);
    }
    else {
      seriesPositions.push(missingPosition);
    }
  }
  if (min !== null) {
    seriesPriorPositions = [];
    for (i=0; i<length; i++) {
      if (min[i] !== void 0) {
        position = Math.floor(seriesAxisScale(min[i]));
        seriesPriorPositions.push(position);
      }
      else {
        seriesPriorPositions.push(missingPosition);
      }
    }
  }

  if (stack === NONE || skip) {
    normalizePriorPositions(seriesPositions, seriesPriorPositions, seriesBasePosition, inverted); // if there are prior positions, normalize and sort them per group value
  }

  const skipGroupIndexMap = {};
  if (skip) {
    groupDefinedPositions = [];
    seriesDefinedPositions = [];
    if (seriesPriorPositions !== null) {
      seriesPriorDefinedPositions = [];
      let seriesPosition;
      let iSkip = 0;
      for (i = 0; i < length; i++) {
        seriesPosition = seriesPositions[i];
        if (seriesPosition !== void 0) {
          groupDefinedPositions.push(groupPositions[i]);
          seriesDefinedPositions.push(seriesPosition);
          seriesPriorDefinedPositions.push(seriesPriorPositions[i] || seriesPosition); // rely on the fact that prior has been normalized
          skipGroupIndexMap[iSkip++] = i;
        }
      }
    }
    else {
      let iSkip = 0;
      for (i = 0; i < length; i++) {
        if (seriesPositions[i] !== void 0) {
          groupDefinedPositions.push(groupPositions[i]);
          seriesDefinedPositions.push(seriesPositions[i]);
          skipGroupIndexMap[iSkip++] = i;
        }
      }
    }
  }

  const gp = skip ? groupDefinedPositions : groupPositions;
  const sp = skip ? seriesDefinedPositions : seriesPositions;
  const spp = skip ? seriesPriorDefinedPositions : seriesPriorPositions;

  length = gp.length;
  // The d parameters in the following functions are unused, just present because that's what d3's generators expect
  const getDefined = skip ? () => true : (d, i) => seriesPositions[i] !== void 0;
  const getGroupPosition = (d, i) => gp[i];
  const getOffsetGroupPosition = (d, i) => gp[i] + groupValueOffset;
  const getSeriesPosition = (d, i) => sp[i];

  let getCurrentSeriesPosition = skip ? getSeriesPosition : (d, i) => sp[i] !== void 0 ? sp[i] : seriesBasePosition;
  let getPriorSeriesPosition = (d, i) => seriesBasePosition;
  if (spp !== null) {
    if (stack !== NONE) {
      // using defined for stacked needs investigation
      if (skip) {
        getCurrentSeriesPosition = (d, i) => {
          return sp[i];
        };
        getPriorSeriesPosition = (d, i) => {
          return spp[i];
        };
      }
      else {
        getCurrentSeriesPosition = (d, i) => {
          return sp[i] !== void 0 ? sp[i] : seriesBasePosition;
        };
        getPriorSeriesPosition = (d, i) => {
          return spp[i] !== void 0 ? spp[i] : seriesBasePosition;
        }
      }
    }
    else if (rangeProperty !== NONE) {
      getCurrentSeriesPosition = (d, i) => sp[i];
      getPriorSeriesPosition = (d, i) => spp[i];
    }
  }
  if (base !== NONE && spp === null) {
    if (skip) {
      getCurrentSeriesPosition = (d, i) => sp[i] < seriesBasePosition ? sp[i] : seriesBasePosition;
      getPriorSeriesPosition = (d, i) => sp[i] < seriesBasePosition ? seriesBasePosition : sp[i];
    }
    else {
      getCurrentSeriesPosition = (d, i) => sp[i] !== void 0 ? (sp[i] < seriesBasePosition ? sp[i] : seriesBasePosition) : void 0;
      getPriorSeriesPosition = (d, i) => sp[i] !== void 0 && sp[i] < seriesBasePosition ? seriesBasePosition : sp[i];
    }
    if (inverted) {
      let temp = getCurrentSeriesPosition;
      getCurrentSeriesPosition = getPriorSeriesPosition;
      getPriorSeriesPosition = temp;
    }
  }
  let getSeriesExtent = (d, i) => Math.abs(getCurrentSeriesPosition(null, i) - getPriorSeriesPosition(null, i));

  return {
    length, // the generators expect an array, but we don't need one, so fake it...
    skipGroupIndexMap,
    getDefined,
    groupPositions,
    groupDefinedPositions,
    getGroupPosition,
    getOffsetGroupPosition,
    groupValueExtent,
    groupValueOffset,
    seriesPositions,
    seriesDefinedPositions,
    seriesPriorPositions,
    seriesPriorDefinedPositions,
    getSeriesPosition,
    getCurrentSeriesPosition,
    getPriorSeriesPosition,
    getSeriesExtent
  };
}