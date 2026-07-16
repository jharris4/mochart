import { line, area, curveMonotoneX, curveMonotoneY, curveBasis, curveCardinal,
  curveCatmullRom, curveNatural, curveStep, curveStepBefore, curveStepAfter } from 'd3-shape';
import { path } from 'd3-path';

import { NONE, CAP_TYPE_POINT, CAP_TYPE_CURVE, CAP_TYPE_ROUND } from '../config/core/constants';

// 'linear', 'monotoneX', 'monotoneY', 'basis', 'bundle', 'cardinal', 'catmullRom', 'natural', 'step', 'stepBefore', 'stepAfter'
const curveTypeToCurveMap = {
  linear: null, // this is the default, so no need to assign it!
  monotoneX: curveMonotoneX,
  monotoneY: curveMonotoneY,
  basis: curveBasis,
  cardinal: curveCardinal,
  catmullRom: curveCatmullRom,
  natural: curveNatural,
  step: curveStep,
  stepBefore: curveStepBefore,
  stepAfter: curveStepAfter
};

const curveTypeToParamFunctionMap = {
  linear: null,
  monotoneX: null,
  monotoneY: null,
  basis: null,
  cardinal: 'tension',
  catmullRom: 'alpha',
  natural: null,
  step: null,
  stepBefore: null,
  stepAfter: null
};

function applyCurve(generator, curveOption) {
  let curve = curveTypeToCurveMap[curveOption.type];
  if (curve !== null) {
    if (curveOption.param !== void 0) {
      let curveParamFunction = curveTypeToParamFunctionMap[curveOption.type];
      if (curveParamFunction !== null) {
        curve = curve[curveParamFunction](curveOption.param);
      }
    }
    generator = generator.curve(curve);
  }
  return generator;
}

export function getLineGenerator(seriesConfig, seriesPositionData, inverted) {
  let lineGenerator = applyCurve(line().defined(seriesPositionData.getDefined), seriesConfig.curve);
  if (inverted) {
    lineGenerator.x(seriesPositionData.getSeriesPosition).y(seriesPositionData.getGroupPosition);
  }
  else {
    lineGenerator.x(seriesPositionData.getGroupPosition).y(seriesPositionData.getSeriesPosition);
  }
  return () => lineGenerator(seriesPositionData);
}

export function getAreaGenerator(seriesConfig, seriesPositionData, inverted) {
  let areaGenerator = applyCurve(area().defined(seriesPositionData.getDefined), seriesConfig.curve);
  if (inverted) {
    areaGenerator.y(seriesPositionData.getGroupPosition).x1(seriesPositionData.getCurrentSeriesPosition).x0(seriesPositionData.getPriorSeriesPosition);
  }
  else {
    areaGenerator.x(seriesPositionData.getGroupPosition).y1(seriesPositionData.getCurrentSeriesPosition).y0(seriesPositionData.getPriorSeriesPosition);
  }
  return () => areaGenerator(seriesPositionData);
}

const minColumnSize = 1;
const minFlatForRounded = 4;

/*
 * x1 - the outer x (cap when capped)
 * y1 - the top y
 * x2 - the inner x (base when capped)
 * yExtent - the height
 *
 * x - the base x for the cap
 * y - the top y for the cap
 * yOffset - the height of the base of the cap
 */
function getXYOffsetInverted(x1, y1, x2, yExtent, offsetSign, offset, expand, size) {
  let x = x2;
  let y = y1;
  let yOffset = yExtent;
  if (size >= offset) {
    x = x1 - offsetSign * offset;
  }
  else if (!expand) {
    yOffset = yExtent * (size / offset);
    y = y1 + (yExtent - yOffset) / 2;
  }
  return { x, y, yOffset };
}

/*
 * y1 - the outer y (cap when capped)
 * y2 - the inner y (base when capped)
 * x1 - the left x
 * xExtent - the width
 *
 * x - the left x for the cap
 * y - the base y for the cap
 * xOffset - the width of the base of the cap
 */
function getXYOffset(x1, y1, y2, xExtent, offsetSign, offset, expand, size) {
  let x = x1;
  let y = y2;
  let xOffset = xExtent;
  if (size >= offset) {
    y = y1 + offsetSign * offset;
  }
  else if (!expand) {
    xOffset = xExtent * (size / offset);
    x = x1 + (xExtent - xOffset) / 2;
  }
  return { x, y, xOffset };
}

function connectPointInverted(pathGenerator, y1, x1, x2, yExtent, offsetSign, offset, expand, size) {
  let { x, y, yOffset } = getXYOffsetInverted(x1, y1, x2, yExtent, offsetSign, offset, expand, size);
  pathGenerator.moveTo(x, y);

  pathGenerator.lineTo(x1, y + yOffset / 2);
  pathGenerator.lineTo(x, y + yOffset);

  if (size >= offset) {
    pathGenerator.lineTo(x2, y + yExtent);
    pathGenerator.lineTo(x2, y);
  }
  pathGenerator.closePath();
}

function connectPoint(pathGenerator, x1, y1, y2, xExtent, offsetSign, offset, expand, size) {
  let { x, y, xOffset } = getXYOffset(x1, y1, y2, xExtent, offsetSign, offset, expand, size);
  pathGenerator.moveTo(x, y);

  pathGenerator.lineTo(x + xOffset / 2, y1);
  pathGenerator.lineTo(x + xOffset, y);

  if (size >= offset) {
    pathGenerator.lineTo(x1 + xExtent, y2);
    pathGenerator.lineTo(x1, y2);
  }
  pathGenerator.closePath();
}

function connectCurveInverted(pathGenerator, y1, x1, x2, yExtent, offsetSign, offset, expand, size) {
  let { x, y, yOffset } = getXYOffsetInverted(x1, y1, x2, yExtent, offsetSign, offset, expand, size);
  pathGenerator.moveTo(x, y);

  pathGenerator.quadraticCurveTo(x1 + offsetSign * Math.min(offset, size), y + yOffset / 2, x, y + yOffset);

  if (size >= offset) {
    pathGenerator.lineTo(x2, y1 + yExtent);
    pathGenerator.lineTo(x2, y1);
  }
  pathGenerator.closePath();
}

function connectCurve(pathGenerator, x1, y1, y2, xExtent, offsetSign, offset, expand, size) {
  let { x, y, xOffset } = getXYOffset(x1, y1, y2, xExtent, offsetSign, offset, expand, size);
  pathGenerator.moveTo(x, y);

  pathGenerator.quadraticCurveTo(x + xOffset / 2, y1 - offsetSign * Math.min(offset, size), x + xOffset, y);

  if (size >= offset) {
    pathGenerator.lineTo(x1 + xExtent, y2);
    pathGenerator.lineTo(x1, y2);
  }
  pathGenerator.closePath();
}

function connectRoundInverted(pathGenerator, y1, x1, x2, yExtent, offsetSign, offset, expand, size) {
  if (yExtent <= minFlatForRounded) {
    connectNoneInverted(pathGenerator, y1, x1, x2, yExtent, offsetSign, offset, expand, size);
    return;
  }
  let x = x2;
  let y = y1;
  let yOffset = yExtent;

  let radius = Math.min(offset, (yExtent - minFlatForRounded) / 2, Math.abs(x1 - x2));
  if (size < offset && !expand) {
    let diff = Math.min(offset - size, (yExtent - minFlatForRounded) / 2);
    y = y1 + diff / 2;
    yOffset = yExtent - diff;
  }
  let y2 = y + yOffset;
  pathGenerator.moveTo(x, y);
  pathGenerator.arcTo(x1, y1, x1, y + radius, radius);
  pathGenerator.lineTo(x1, y2 - radius);
  pathGenerator.arcTo(x1, y2, x, y2, radius);

  if (size >= radius) {
    pathGenerator.lineTo(x2, y1 + yExtent);
    pathGenerator.lineTo(x2, y1);
  }
  pathGenerator.closePath();
}

function connectRound(pathGenerator, x1, y1, y2, xExtent, offsetSign, offset, expand, size) {
  if (xExtent <= minFlatForRounded) {
    connectNone(pathGenerator, x1, y1, y2, xExtent, offsetSign, offset, expand, size);
    return;
  }
  let x = x1;
  let y = y2;
  let xOffset = xExtent;

  let radius = Math.min(offset, (xExtent - minFlatForRounded) / 2, Math.abs(y1 - y2));
  if (size < offset && !expand) {
    let diff = Math.min(offset - size, (xExtent - minFlatForRounded) / 2);
    x = x1 + diff / 2;
    xOffset = xExtent - diff;
  }
  let x2 = x + xOffset;
  pathGenerator.moveTo(x, y);
  pathGenerator.arcTo(x, y1, x + radius, y1, radius);
  pathGenerator.lineTo(x2 - radius, y1);
  pathGenerator.arcTo(x2, y1, x2, y, radius);

  if (size >= radius) {
    pathGenerator.lineTo(x1 + xExtent, y2);
    pathGenerator.lineTo(x1, y2);
  }
  pathGenerator.closePath();
}

function connectNoneInverted(pathGenerator, y1, x1, x2, yExtent, offsetSign, offset, expand, size) {
  pathGenerator.rect(Math.min(x1, x2), y1, Math.abs(x1 - x2), yExtent);
}

function connectNone(pathGenerator, x1, y1, y2, xExtent, offsetSign, offset, expand, size) {
  pathGenerator.rect(x1, Math.min(y1, y2), xExtent, Math.abs(y1 - y2));
}

function getConnector(capType, inverted) {
  switch (capType) {
    case CAP_TYPE_POINT:
      return inverted ? connectPointInverted : connectPoint;
    case CAP_TYPE_CURVE:
      return inverted ? connectCurveInverted : connectCurve;
    case CAP_TYPE_ROUND:
      return inverted ? connectRoundInverted : connectRound;
    default:
      return inverted ? connectNoneInverted : connectNone;
  }
}

export function getColumnGenerator(seriesConfig, seriesPositionData, inverted, stackData) {
  let columnGenerator;
  let pathGenerator;
  let groupValueExtent = Math.max(minColumnSize, seriesPositionData.groupValueExtent);

  const { id, stack, capType, capSize, capExpand, capOnlyStackOuter, seriesStackConfig } = seriesConfig;
  const { outerCapType, outerCapSize, outerCapExpand } = seriesStackConfig ? seriesStackConfig : {};
  const stackPositiveIds = stack ? stackData.filteredOuterPositiveSeriesIds[stack] : null;
  const stackNegativeIds = stack ? stackData.filteredOuterNegativeSeriesIds[stack] : null;

  const columnCapType = capType !== NONE ? capType : outerCapType ? outerCapType : NONE;
  const columnCapSize = capType !== NONE ? capSize : outerCapType ? outerCapSize : 0;
  const columnCapExpand = capType !== NONE ? capExpand : outerCapType ? outerCapExpand : false;
  const applyStackOuter = stack && (capType !== NONE && capOnlyStackOuter) || (capType === NONE && outerCapType && outerCapType !== NONE);

  let connector = getConnector(columnCapType, inverted);
  let columnCapConnector = columnCapType === CAP_TYPE_POINT ? connectPointInverted : columnCapType === CAP_TYPE_CURVE ? connectCurveInverted : connectRoundInverted;

  let groupPosition;
  let seriesValueExtent;
  let seriesPosition;
  let seriesPriorPosition;
  let seriesCurrentPosition;
  let tempPosition, barCapSizeSign, barCapConnector;
  columnGenerator = (i) => {
    pathGenerator = path();
    groupPosition = seriesPositionData.getOffsetGroupPosition(null, i);
    seriesValueExtent = Math.max(minColumnSize, seriesPositionData.getSeriesExtent(null, i));
    seriesPosition = seriesPositionData.getSeriesPosition(null, i);
    seriesPriorPosition = seriesPositionData.getPriorSeriesPosition(null, i);
    seriesCurrentPosition = seriesPositionData.getCurrentSeriesPosition(null, i);

    barCapSizeSign = 1;
    barCapConnector = connector;
    if (applyStackOuter) {
      barCapConnector = (stackPositiveIds[i] === id || stackNegativeIds[i] === id) ? connector : inverted ? connectNoneInverted : connectNone;
    }
    if (seriesPriorPosition === seriesPosition) {
      tempPosition = seriesPriorPosition;
      seriesPriorPosition = seriesCurrentPosition;
      seriesCurrentPosition = tempPosition;
      barCapSizeSign = -1;
    }
    else if (!inverted && seriesPriorPosition < seriesCurrentPosition) {
      barCapSizeSign = -1;
    }
    else if (inverted && seriesPriorPosition > seriesCurrentPosition) {
      barCapSizeSign = -1;
    }
    barCapConnector(pathGenerator, groupPosition, seriesCurrentPosition, seriesPriorPosition, groupValueExtent, barCapSizeSign, columnCapSize, columnCapExpand, seriesValueExtent);
    return "" + pathGenerator;
  }
  return columnGenerator;
}