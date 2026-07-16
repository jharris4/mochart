import { scaleLinear, scaleTime, scaleUtc } from 'd3-scale';
import { format } from 'd3-format';
import { timeFormat, utcFormat } from 'd3-time-format';

import { getWithMutations } from '../utils/WithMutations';
import { areArraysAndEqual, arrayToMap, idAccessor } from '../utils/utils';
import { AUTO, NONE, SCALE_ORDINAL, SCALE_LINEAR, TYPE_DATE, TYPE_NUMBER, ANCHOR_START, ANCHOR_END, ANCHOR_MIDDLE } from '../config/core/constants';

const autoTickLabelFormatNumber = 's';
const autoTickLabelFormatDate = '%c';

const enableOrdinalExperimentalMode = true;

export function getAxisData(mochartConfig, chartLayoutInfo, chartData) {

  const groupAxisData = getGroupAxisData(mochartConfig.groupAxisConfig, chartLayoutInfo.groupAxisLayoutInfo, chartData);
  const seriesAxisData = getSeriesAxisData(mochartConfig.plotConfig, mochartConfig.seriesAxisConfigs, chartLayoutInfo.seriesAxisLayoutInfos, chartData);

  return {
    group: groupAxisData,
    series: seriesAxisData
  };
}

function isScaleFunction(value) {
  return typeof value === 'function' && value.domain !== void 0 && value.range !== void 0;
}

function scaleMutator(oldValue, newValue) {
  if (isScaleFunction(oldValue) && isScaleFunction(newValue)) {
    if (areArraysAndEqual(oldValue.domain(), newValue.domain()) && areArraysAndEqual(oldValue.range(), newValue.range())) {
      return oldValue;
    }
    else {
      return newValue;
    }
  }
  else {
    return newValue;
  }
}

export function getAxisDataWithMutations(axisData, mochartConfig, chartLayoutInfo, chartData) {
  return getWithMutations(axisData, getAxisData(mochartConfig, chartLayoutInfo, chartData), scaleMutator);
}

export function getAxisDataForGroupChange(axisData, mochartConfig, chartLayoutInfo, chartData) {
  let groupAxisData = getGroupAxisData(mochartConfig.groupAxisConfig, chartLayoutInfo.groupAxisLayoutInfo, chartData);
  return getWithMutations(axisData, Object.assign({}, axisData, { group: groupAxisData }), scaleMutator);
}

export function getAxisDataForSeriesChange(axisData, mochartConfig, chartLayoutInfo, chartData) {
  let seriesAxisData = getSeriesAxisData(mochartConfig.plotConfig, mochartConfig.seriesAxisConfigs, chartLayoutInfo.seriesAxisLayoutInfos, chartData);
  return getWithMutations(axisData, Object.assign({}, axisData, { series: seriesAxisData }), scaleMutator);
}

function getGroupAxisData(groupAxisConfig, axisLayoutInfo, chartData) {
  let groupAxisData = null;
  if (chartData) {
    const { groupData } = chartData;
    const spacingInfo = getGroupSpacingInfo(groupAxisConfig, groupData.axisDomain, axisLayoutInfo.groupExtent);
    const axisScale = getGroupAxisScale(groupAxisConfig, groupData.axisDomain, spacingInfo);
    const positions = getGroupValuePositions(groupAxisConfig, axisScale, groupData.values);
    const axisTickData = getGroupAxisTickData(groupAxisConfig, axisLayoutInfo, axisScale, groupData.axisDomain, groupData.values.parsed, positions);
    const maxTickLabelLength = getMaxTickLabelLength(groupAxisConfig, groupData.values.parsed, axisTickData, spacingInfo);

    groupAxisData = {
      axisScale, axisTickData, maxTickLabelLength, valueData: { spacingInfo, positions }
    };
  }
  return groupAxisData;
}

function getSeriesAxisData(plotConfig, seriesAxisConfigs, axisLayoutInfoArray, chartData) {
  let seriesAxisData = null;
  if (chartData) {
    const vertical = !plotConfig.inverted;
    const { seriesData } = chartData;
    const axisScales = getSeriesAxisScales(seriesAxisConfigs, seriesData.raw.axisDomains, seriesData.filtered.axisDomains, axisLayoutInfoArray, vertical);
    const axisTickData = getSeriesAxisTickData(seriesAxisConfigs, axisLayoutInfoArray, seriesData.raw.axisDomains, seriesData.filtered.axisDomains, seriesData.axisSeriesCounts, axisScales, vertical);

    seriesAxisData = {
      axisScales, axisTickData
    };
  }
  return seriesAxisData;
}

export function getGroupSpacingInfo(groupAxisConfig, groupAxisDomain, groupAxisExtent) {
  let minPosition = 0;
  let maxPosition = groupAxisExtent;
  let groupAxisDomainExtent = Math.abs(groupAxisDomain[1] - groupAxisDomain[0]);
  let groupCountPadding = groupAxisConfig.groupCountPadding;
  let groupValueExtent;
  if (groupAxisDomainExtent === 0 && groupCountPadding === 0) {
    groupValueExtent = maxPosition;
  }
  else if (groupCountPadding > 0) {
    groupValueExtent = maxPosition / (groupAxisDomainExtent + groupCountPadding); // group extent is smaller, ex: to allow for bar widths
    minPosition+= groupValueExtent / 2.0; // shift the visual range of the scale, ex: so the first and last bars aren't sliced in half
    maxPosition-= groupValueExtent / 2.0;
  }
  else {
    groupValueExtent = maxPosition / groupAxisDomainExtent;
  }
  groupValueExtent =  Math.max(groupAxisConfig.minGroupValueExtent, Math.floor(groupValueExtent * (1.0 - groupAxisConfig.groupPadding.outer)));
  let groupValueOffset = Math.floor(groupValueExtent / 2.0);
  return {
    groupRange: [minPosition, maxPosition],
    groupValueExtent,
    groupValueOffset
  };
}

function getGroupValuePositions(groupAxisConfig, scale, valueData) {
  let positions = [];
  let values = groupAxisConfig.scale === SCALE_ORDINAL ? valueData.numeric : valueData.parsed;
  let i, count = values.length;
  for (i=0; i<count; i++) {
    positions.push(scale(values[i]));
  }
  return positions;
}

function getGroupAxisScale(axisConfig, axisDomain, groupSpacingInfo) {
  let axisScale = (axisConfig.type === TYPE_DATE && axisConfig.scale === SCALE_LINEAR) ? (axisConfig.dateUTC ? scaleUtc() : scaleTime()) : scaleLinear();
  axisScale.domain(axisDomain);
  axisScale.range(groupSpacingInfo.groupRange);
  return axisScale;
}

function getSeriesAxisScales(seriesAxisConfigs, rawAxisDomainArray, filteredAxisDomainArray, axisLayountInfoArray, vertical) {
  return arrayToMap(seriesAxisConfigs, idAccessor, seriesAxisConfig => {
    let axisId = seriesAxisConfig.id;
    return getSeriesAxisScale(seriesAxisConfig, rawAxisDomainArray[axisId], filteredAxisDomainArray[axisId], axisLayountInfoArray[axisId], vertical);
  });
}

function getSeriesAxisScale(axisConfig, rawAxisDomain, filteredAxisDomain, axisLayoutInfo, vertical) {
  return getSeriesAxisScaleForDomain(axisConfig, axisLayoutInfo, axisConfig.adjustForSuppression ? filteredAxisDomain : rawAxisDomain, vertical);
}

function getSeriesAxisScaleForDomain(axisConfig, axisLayoutInfo, axisDomain, vertical) {
  let axisScale = scaleLinear();
  axisScale.domain(axisDomain);
  if (vertical) {
    axisScale.range([axisLayoutInfo.seriesExtent, 0]);
  }
  else {
    axisScale.range([0, axisLayoutInfo.seriesExtent]);
  }
  return axisScale;
}

function createLinearTickObject(scaleTickValue, axisScale, tickLabelFormatter, isHidden) {
  const tickObject: any = {
    label: tickLabelFormatter(scaleTickValue),
    position: axisScale(scaleTickValue),
    value: scaleTickValue
  };
  tickObject.hidden = isHidden(tickObject);
  return tickObject;
}

function createOrdinalTickObject(scaleTickValue, groupValues, groupPositions, tickLabelFormatter, isHidden) {
  const tickObject: any = {
    label: tickLabelFormatter(groupValues[scaleTickValue]),
    position: groupPositions[scaleTickValue],
    value: groupValues[scaleTickValue]
  };
  tickObject.hidden = isHidden(tickObject);
  return tickObject;
}

function getGroupAxisTickData(axisConfig, axisLayoutInfo, axisScale, axisDomain, groupValues, groupPositions) {
  let ticks = [];
  let groupAxisRangeExtent = axisScale.range()[1] - axisScale.range()[0]; // different because of bar offset??
  let groupAxisDomainExtent = axisScale.domain()[1] - axisScale.domain()[0];

  if (groupValues.length > 0) {
    let scaleTicks;
    let tickCount;

    if (groupValues.length === 1) {
      if (axisConfig.scale === SCALE_ORDINAL) {
        scaleTicks = [0];
      }
      else {
        let axisMin = axisScale.domain()[0];
        let axisMax = axisScale.domain()[1];
        if (axisMin !== axisMax) {
          scaleTicks = [axisMin, axisMax];
        }
        else {
          scaleTicks = [groupValues[0]];
        }
      }
      tickCount = scaleTicks.length;
    }
    else {
      let tickLabelSpace = axisLayoutInfo.tickLabelSpace;
      if (axisConfig.scale === SCALE_ORDINAL && axisConfig.tickLabelTruncationEnabled && axisLayoutInfo.tickLabelParallel) {
        tickLabelSpace = axisLayoutInfo.minTickSize;
      }
      tickCount = Math.max(1, getTickCount(axisConfig, groupAxisRangeExtent, groupAxisDomainExtent, tickLabelSpace));

      if (axisConfig.scale === SCALE_ORDINAL && tickCount > groupValues.length) {
        tickCount = groupValues.length;
      }

      if (tickCount === 1) {
        if (axisConfig.scale === SCALE_ORDINAL) {
          scaleTicks = [0];
        }
        else {
          scaleTicks = [groupValues[0]];
        }
      }
      else {
        if (axisConfig.scale === SCALE_ORDINAL) {
          scaleTicks = groupValues.map((v, i) => i);
        }
        else {
          scaleTicks = axisScale.ticks(tickCount);
        }
      }
    }
    let tickLabelFormatter;
    if (axisConfig.scale === SCALE_ORDINAL) {
      tickLabelFormatter = getOrdinalScaleTickLabelFormatter(axisConfig, axisScale, scaleTicks.length, groupValues);
    }
    else {
      tickLabelFormatter = getLinearScaleTickLabelFormatter(axisConfig, axisScale, scaleTicks.length);
    }
    if (axisConfig.scale === SCALE_ORDINAL) {
      let tickInterval = Math.ceil(groupValues.length / tickCount);
      if (axisConfig.tickLabelTruncationEnabled && axisLayoutInfo.tickLabelParallel) {
        ticks = scaleTicks.map((scaleTick, i) => createOrdinalTickObject(scaleTick, groupValues, groupPositions, tickLabelFormatter, () => i % tickInterval !== 0));
      }
      else {
        if (axisLayoutInfo.tickLabelParallel) {
          const { before, after, groupExtent, tickLabelSpace, tickLabelAnchor } = axisLayoutInfo;

          const beforeOffset = tickLabelAnchor === ANCHOR_START ? 0 : (tickLabelAnchor === ANCHOR_MIDDLE ? Math.ceil(tickLabelSpace / 2.0) : tickLabelSpace);
          const afterOffset = tickLabelAnchor === ANCHOR_START ? tickLabelSpace : (tickLabelAnchor === ANCHOR_MIDDLE ? Math.ceil(tickLabelSpace / 2.0) : 0);

          const minPosition = beforeOffset - before;
          const maxPosition = groupExtent + after - afterOffset;

          ticks = scaleTicks.map((scaleTick, i) => createOrdinalTickObject(scaleTick, groupValues, groupPositions, tickLabelFormatter, ({ position }) => i % tickInterval !== 0 || position < minPosition || position > maxPosition ));
          if (groupValues.length > 0) {
            const singleIndex = tickLabelAnchor === ANCHOR_START ? 0 : (tickLabelAnchor === ANCHOR_END ? groupValues.length-1 : Math.floor(groupValues.length / 2));
            ticks.push(createOrdinalTickObject(singleIndex, groupValues, groupPositions, tickLabelFormatter, () => ticks.some(tick => tick.hidden === false)));
          }
        }
        else {
          ticks = scaleTicks.map((scaleTick, i) => createOrdinalTickObject(scaleTick, groupValues, groupPositions, tickLabelFormatter, () => i % tickInterval !== 0));
        }
      }
    }
    else {
      let { preTicks, postTicks } = getLinearAxisExtraTicks(axisDomain, axisScale, scaleTicks);
      let tickInterval = scaleTicks.length > tickCount ? 2 : 1

      if (axisLayoutInfo.tickLabelParallel) {
        const { before, after, groupExtent, tickLabelSpace, tickLabelAnchor } = axisLayoutInfo;

        const beforeOffset = tickLabelAnchor === ANCHOR_START ? 0 : (tickLabelAnchor === ANCHOR_MIDDLE ? Math.ceil(tickLabelSpace / 2.0) : tickLabelSpace);
        const afterOffset = tickLabelAnchor === ANCHOR_START ? tickLabelSpace : (tickLabelAnchor === ANCHOR_MIDDLE ? Math.ceil(tickLabelSpace / 2.0) : 0);

        const minPosition = beforeOffset - before;
        const maxPosition = groupExtent + after - afterOffset;

        ticks = scaleTicks.map((scaleTick, i) => createLinearTickObject(scaleTick, axisScale, tickLabelFormatter, ({ position }) => i % tickInterval !== 0 || position < minPosition || position > maxPosition));
        if (groupValues.length > 0) {
          const singleValue = tickLabelAnchor === ANCHOR_START ? axisDomain[0] : (tickLabelAnchor === ANCHOR_END ? axisDomain[1] : +axisDomain[0] + (axisDomain[1] - axisDomain[0]) / 2);
          const singleTickValue = axisConfig.type === TYPE_DATE ? new Date(singleValue) : singleValue;
          ticks.push(createLinearTickObject(singleTickValue, axisScale, tickLabelFormatter, () => ticks.some(tick => tick.hidden === false)));
        }
      }
      else {
        ticks = scaleTicks.map((scaleTick, i) => createLinearTickObject(scaleTick, axisScale, tickLabelFormatter, () => i % tickInterval !== 0));
      }

      if (preTicks.length > 0) {
        ticks = preTicks.map(preTick => createLinearTickObject(preTick, axisScale, tickLabelFormatter, () => true)).concat(ticks);
      }
      if (postTicks.length > 0) {
        ticks = ticks.concat(postTicks.map(postTick => createLinearTickObject(postTick, axisScale, tickLabelFormatter, () => true)));
      }
    }
  }

  return ticks;
}

function getMaxTickLabelLength(groupAxisConfig, groupValues, axisTickData, spacingInfo) {
  return groupValues.length / axisTickData.reduce((count, tick) => count + (tick.hidden ? 0 : 1), 0) * spacingInfo.groupValueExtent;
}

function getSeriesAxisTickData(axisConfigArray, axisLayoutInfoArray, rawAxisDomainArray, filteredAxisDomainArray, filteredSeriesCountArray, axisScaleArray, vertical) {
  return arrayToMap(axisConfigArray, idAccessor, axisConfig => {
    let axisId = axisConfig.id;
    return getSeriesAxisTickDataObject(axisConfig, axisLayoutInfoArray[axisId], rawAxisDomainArray[axisId], filteredAxisDomainArray[axisId], filteredSeriesCountArray[axisId], axisScaleArray[axisId], vertical);
  });
}

function getSeriesAxisTickDataObject(axisConfig, axisLayoutInfo, rawSeriesAxisDomain, filteredSeriesAxisDomain, filteredSeriesCount, axisScale, vertical) {
  let ticks = [];
  if (axisConfig.alwaysVisible || filteredSeriesCount > 0) {
    let tickCount = axisConfig.tickCount;
    let scaleTicks;
    const adjustForSuppression = axisConfig.adjustForSuppression;
    const adjustTickLabelsForSuppression = adjustForSuppression && axisConfig.adjustTickLabelSizeForSuppression;
    let seriesAxisDomain = adjustForSuppression ? filteredSeriesAxisDomain : rawSeriesAxisDomain;
    const tickBoundsSeriesAxisDomain = adjustTickLabelsForSuppression ? filteredSeriesAxisDomain : rawSeriesAxisDomain;
    if (seriesAxisDomain[0] === seriesAxisDomain[1]) {
      if (seriesAxisDomain[0] === null) {
        tickCount = 0;
        scaleTicks = [];
      }
      else {
        tickCount = 1;
        scaleTicks = [seriesAxisDomain[0]];
      }
    }
    else {
      let seriesAxisDomainExtent = seriesAxisDomain[1] - seriesAxisDomain[0];
      tickCount = getTickCount(axisConfig, axisLayoutInfo.seriesExtent, seriesAxisDomainExtent, axisLayoutInfo.tickLabelSpace);
      if (tickCount === 1) {
        scaleTicks = [seriesAxisDomain[0]];
      }
      else {
        scaleTicks = axisScale.ticks(tickCount);
      }
    }
    const formatAxisScale = adjustTickLabelsForSuppression ? axisScale : getSeriesAxisScaleForDomain(axisConfig, axisLayoutInfo, rawSeriesAxisDomain, vertical);
    let tickLabelFormatter = getLinearScaleTickLabelFormatter(axisConfig, formatAxisScale, scaleTicks.length);
    let { preTicks, postTicks } = getLinearAxisExtraTicks(tickBoundsSeriesAxisDomain, axisScale, scaleTicks);
    let tickInterval = scaleTicks.length > tickCount ? 2 : 1
    ticks = scaleTicks.map((scaleTick, i) => createLinearTickObject(scaleTick, axisScale, tickLabelFormatter, () => i % tickInterval !== 0));
    if (preTicks.length > 0) {
      ticks = preTicks.map(preTick => createLinearTickObject(preTick, axisScale, tickLabelFormatter, () => true)).concat(ticks);
    }
    if (postTicks.length > 0) {
      ticks = ticks.concat(postTicks.map(postTick => createLinearTickObject(postTick, axisScale, tickLabelFormatter, () => true)));
    }
  }
  return ticks;
}

function getLinearAxisExtraTicks(axisDomain, axisScale, scaleTicks) {
  let preTicks = [];
  let postTicks = [];
  if (scaleTicks.length > 1) {
    let minTickValue = scaleTicks[0];
    let maxTickValue = scaleTicks[scaleTicks.length - 1];
    if (axisDomain[0] < minTickValue) {
      preTicks.push(axisDomain[0]);
    }
    else if (axisDomain[0] > maxTickValue) {
      postTicks.push(axisDomain[0]);
    }
    if (axisDomain[1] < minTickValue) {
      preTicks.push(axisDomain[1]);
    }
    else if (axisDomain[1] > maxTickValue) {
      postTicks.push(axisDomain[1]);
    }
  }
  else if (scaleTicks.length === 1) {
    if (+axisDomain[0] === +axisDomain[1]) {
      if (+scaleTicks[0] !== +axisDomain[0]) {
        if (+scaleTicks[0] < +axisDomain[0]) {
          postTicks.push(axisDomain[0]);
        }
        else {
          preTicks.push(axisDomain[0]);
        }
      }
    }
    else {
      if (scaleTicks[0] > axisDomain[0]) {
        preTicks.push(axisDomain[0]);
      }
      if (scaleTicks[0] < axisDomain[1]) {
        postTicks.push(axisDomain[1]);
      }
    }
  }
  else {
    if (axisDomain[0] !== null) {
      if (+axisDomain[0] === +axisDomain[1]) {
        preTicks.push(axisDomain[0]);
      }
      else {
        preTicks.push(axisDomain[0]);
        preTicks.push(axisDomain[1]);
      }
    }
  }
  return { preTicks, postTicks };
}

function getTickCount(axisConfig, axisRangeExtent, axisDomainExtent, tickLabelSpace) {
  const { tickCount, maxTickCount, minTickSpacing, minTickInterval } = axisConfig;
  let count;
  if (tickCount === AUTO) {
    count = Math.max(1, Math.floor((axisRangeExtent + minTickSpacing) / (tickLabelSpace + minTickSpacing)));
    if (minTickInterval > 0) {
      let intervalCount = Math.max(1, Math.floor(axisDomainExtent / minTickInterval) + 1);
      count = Math.min(intervalCount, count);
    }
    if (maxTickCount > 0) {
      count = Math.min(maxTickCount, count);
    }
  }
  else {
    count = tickCount;
  }
  return count;
}

function getLinearScaleTickLabelFormatter(axisConfig, axisScale, tickCount) {
  let tickLabelFormatter = (tick) => tick;
  if (axisConfig.tickLabelFormat !== NONE) {
    if (axisConfig.type === TYPE_NUMBER) {
      tickCount = Math.max(1, tickCount); // axisScale.tickFormat expects > 0 ...
      if (axisConfig.tickLabelFormat === AUTO) {
        tickLabelFormatter = axisScale.tickFormat(tickCount, autoTickLabelFormatNumber);
      }
      else {
        tickLabelFormatter = axisScale.tickFormat(tickCount, axisConfig.tickLabelFormat);
      }
    }
    else if (axisConfig.type === TYPE_DATE) {
      if (axisConfig.tickLabelFormat === AUTO && tickCount > 1) {
        tickLabelFormatter = axisScale.tickFormat();
      }
      else {
        let timeFormatter = axisConfig.dateUTC ? utcFormat : timeFormat;
        if (axisConfig.tickLabelFormat === AUTO) {
          tickLabelFormatter = timeFormatter(autoTickLabelFormatDate);
        }
        else {
          tickLabelFormatter = timeFormatter(axisConfig.tickLabelFormat);
        }
      }
    }
  }
  return getTickLabelFormatterForPrefixAndSuffix(axisConfig, tickLabelFormatter);
}

function getDomainForValues(values) {
  let min = null;
  let max = null;
  let i, count = values.length;
  for (i=0; i<count; i++) {
    if (max === null || values[i] > max) {
      max = values[i];
    }
    if (min === null || values[i] < min) {
      min = values[i];
    }
  }
  return [min, max];
}

function getOrdinalScaleTickLabelFormatter(axisConfig, axisScale, tickCount, values) {
  if (tickCount <= 1) {
    return getLinearScaleTickLabelFormatter(axisConfig, axisScale, tickCount);
  }
  else {
    let tickLabelFormatter = (tick) => tick;
    if (axisConfig.tickLabelFormat !== NONE) {
      if (axisConfig.type === TYPE_NUMBER) {
        let formatSpecifier = axisConfig.tickLabelFormat === AUTO ? autoTickLabelFormatNumber : axisConfig.tickLabelFormat;
        // Experimental code to try to create a nice uniform tick format for ordinal number scales. may need work...
        if (enableOrdinalExperimentalMode) {
          tickLabelFormatter = scaleLinear().domain(getDomainForValues(values)).tickFormat(tickCount, formatSpecifier);
        }
        else {
          tickLabelFormatter = format(formatSpecifier);
        }
      }
      else if (axisConfig.type === TYPE_DATE) {
        let timeFormatter = axisConfig.dateUTC ? utcFormat : timeFormat;
        if (axisConfig.tickLabelFormat === AUTO) {
          // Experimental code to try to create a nice uniform tick format for ordinal date scales. needs work...
          if (enableOrdinalExperimentalMode) {
            tickLabelFormatter = (axisConfig.dateUTC ? scaleUtc() : scaleTime()).domain(getDomainForValues(values)).tickFormat();
          }
          else {
            tickLabelFormatter = timeFormatter(autoTickLabelFormatDate);
          }
        }
        else {
          tickLabelFormatter = timeFormatter(axisConfig.tickLabelFormat);
        }
      }
    }
    return getTickLabelFormatterForPrefixAndSuffix(axisConfig, tickLabelFormatter);
  }
}

function getTickLabelFormatterForPrefixAndSuffix(axisConfig, tickLabelFormatter) {
  if (axisConfig.tickLabelPrefix !== NONE || axisConfig.tickLabelSuffix !== NONE) {
    let oldTickLabelFormatter = tickLabelFormatter;
    if (axisConfig.tickLabelPrefix !== NONE && axisConfig.tickLabelSuffix !== NONE) {
      tickLabelFormatter = (tick) => (axisConfig.tickLabelPrefix + oldTickLabelFormatter(tick) + axisConfig.tickLabelSuffix);
    }
    else if (axisConfig.tickLabelPrefix !== NONE) {
      tickLabelFormatter = (tick) => (axisConfig.tickLabelPrefix + oldTickLabelFormatter(tick));
    }
    else if (axisConfig.tickLabelSuffix !== NONE) {
      tickLabelFormatter = (tick) => (oldTickLabelFormatter(tick) + axisConfig.tickLabelSuffix);
    }
  }
  return tickLabelFormatter;
}
