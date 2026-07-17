import { scaleLinear, scaleTime, scaleUtc } from 'd3-scale';
import { format } from 'd3-format';
import { timeFormat, utcFormat } from 'd3-time-format';

import { getWithMutations } from '../utils/WithMutations';
import { areArraysAndEqual, arrayToMap, idAccessor } from '../utils/utils';
import { AUTO, NONE, SCALE_ORDINAL, SCALE_LINEAR, TYPE_DATE, TYPE_NUMBER, ANCHOR_START, ANCHOR_END, ANCHOR_MIDDLE } from '../config/core/constants';
import type { AxisConfigBase, GroupAxisConfig, MochartConfig, PlotConfig, SeriesAxisConfig } from '../types/config';
import type { AxisData, AxisScale, AxisTick, AxisValue, ChartData, GroupAxisData, GroupAxisDomain, GroupSpacingInfo, GroupValue, GroupValues, NullableDomain, SeriesAxisData, TickLabelFormatter } from '../types/data';
import type { AxisLayoutInfo, ChartLayoutInfo, GroupAxisLayoutInfo } from '../types/layout';

const autoTickLabelFormatNumber = 's';
const autoTickLabelFormatDate = '%c';

const enableOrdinalExperimentalMode = true;

export function getAxisData(mochartConfig: MochartConfig, chartLayoutInfo: ChartLayoutInfo, chartData: ChartData | null): AxisData {

  const groupAxisData = getGroupAxisData(mochartConfig.groupAxisConfig, chartLayoutInfo.groupAxisLayoutInfo, chartData);
  const seriesAxisData = getSeriesAxisData(mochartConfig.plotConfig, mochartConfig.seriesAxisConfigs, chartLayoutInfo.seriesAxisLayoutInfos, chartData);

  return {
    group: groupAxisData,
    series: seriesAxisData
  };
}

function isScaleFunction(value: unknown): value is AxisScale {
  return typeof value === 'function' && 'domain' in value && 'range' in value;
}

function scaleMutator(oldValue: unknown, newValue: unknown): unknown {
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

export function getAxisDataWithMutations(axisData: AxisData | null, mochartConfig: MochartConfig, chartLayoutInfo: ChartLayoutInfo, chartData: ChartData | null): AxisData {
  return getWithMutations(axisData, getAxisData(mochartConfig, chartLayoutInfo, chartData), scaleMutator);
}

export function getAxisDataForGroupChange(axisData: AxisData, mochartConfig: MochartConfig, chartLayoutInfo: ChartLayoutInfo, chartData: ChartData | null): AxisData {
  let groupAxisData = getGroupAxisData(mochartConfig.groupAxisConfig, chartLayoutInfo.groupAxisLayoutInfo, chartData);
  return getWithMutations(axisData, Object.assign({}, axisData, { group: groupAxisData }), scaleMutator);
}

export function getAxisDataForSeriesChange(axisData: AxisData, mochartConfig: MochartConfig, chartLayoutInfo: ChartLayoutInfo, chartData: ChartData | null): AxisData {
  let seriesAxisData = getSeriesAxisData(mochartConfig.plotConfig, mochartConfig.seriesAxisConfigs, chartLayoutInfo.seriesAxisLayoutInfos, chartData);
  return getWithMutations(axisData, Object.assign({}, axisData, { series: seriesAxisData }), scaleMutator);
}

function getGroupAxisData(groupAxisConfig: GroupAxisConfig, axisLayoutInfo: GroupAxisLayoutInfo, chartData: ChartData | null): GroupAxisData | null {
  let groupAxisData: GroupAxisData | null = null;
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

function getSeriesAxisData(plotConfig: PlotConfig, seriesAxisConfigs: SeriesAxisConfig[], axisLayoutInfoArray: ChartLayoutInfo['seriesAxisLayoutInfos'], chartData: ChartData | null): SeriesAxisData | null {
  let seriesAxisData: SeriesAxisData | null = null;
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

export function getGroupSpacingInfo(groupAxisConfig: GroupAxisConfig, groupAxisDomain: GroupAxisDomain, groupAxisExtent: number): GroupSpacingInfo {
  let minPosition = 0;
  let maxPosition = groupAxisExtent;
  let groupAxisDomainExtent = groupAxisDomain[0] === null || groupAxisDomain[1] === null ? 0 : Math.abs(+groupAxisDomain[1] - +groupAxisDomain[0]);
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
    groupRange: [minPosition, maxPosition] as [number, number],
    groupValueExtent,
    groupValueOffset
  };
}

function getGroupValuePositions(groupAxisConfig: GroupAxisConfig, scale: AxisScale, valueData: GroupValues): number[] {
  let positions: number[] = [];
  let values = groupAxisConfig.scale === SCALE_ORDINAL ? valueData.numeric : valueData.parsed;
  let i, count = values.length;
  for (i=0; i<count; i++) {
    positions.push(scale(values[i] as number | Date));
  }
  return positions;
}

function getGroupAxisScale(axisConfig: GroupAxisConfig, axisDomain: GroupAxisDomain, groupSpacingInfo: GroupSpacingInfo): AxisScale {
  let axisScale = (axisConfig.type === TYPE_DATE && axisConfig.scale === SCALE_LINEAR) ? (axisConfig.dateUTC ? scaleUtc() : scaleTime()) : scaleLinear();
  axisScale.domain(axisDomain);
  axisScale.range(groupSpacingInfo.groupRange);
  return axisScale;
}

function getSeriesAxisScales(seriesAxisConfigs: SeriesAxisConfig[], rawAxisDomainArray: Record<string, NullableDomain>, filteredAxisDomainArray: Record<string, NullableDomain>, axisLayountInfoArray: ChartLayoutInfo['seriesAxisLayoutInfos'], vertical: boolean): Record<string, AxisScale> {
  return arrayToMap(seriesAxisConfigs, idAccessor, seriesAxisConfig => {
    let axisId = seriesAxisConfig.id;
    return getSeriesAxisScale(seriesAxisConfig, rawAxisDomainArray[axisId], filteredAxisDomainArray[axisId], axisLayountInfoArray[axisId] as AxisLayoutInfo, vertical);
  });
}

function getSeriesAxisScale(axisConfig: SeriesAxisConfig, rawAxisDomain: NullableDomain, filteredAxisDomain: NullableDomain, axisLayoutInfo: AxisLayoutInfo, vertical: boolean): AxisScale {
  return getSeriesAxisScaleForDomain(axisConfig, axisLayoutInfo, axisConfig.adjustForSuppression ? filteredAxisDomain : rawAxisDomain, vertical);
}

function getSeriesAxisScaleForDomain(_axisConfig: SeriesAxisConfig, axisLayoutInfo: AxisLayoutInfo, axisDomain: NullableDomain, vertical: boolean): AxisScale {
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

function createLinearTickObject(scaleTickValue: AxisValue, axisScale: AxisScale, tickLabelFormatter: TickLabelFormatter, isHidden: (tick: Omit<AxisTick, 'hidden'>) => boolean): AxisTick {
  const tickObjectWithoutHidden: Omit<AxisTick, 'hidden'> = {
    label: tickLabelFormatter(scaleTickValue),
    position: axisScale(scaleTickValue),
    value: scaleTickValue
  };
  return { ...tickObjectWithoutHidden, hidden: isHidden(tickObjectWithoutHidden) };
}

function createOrdinalTickObject(scaleTickValue: number, groupValues: readonly GroupValue[], groupPositions: number[], tickLabelFormatter: TickLabelFormatter, isHidden: (tick: Omit<AxisTick, 'hidden'>) => boolean): AxisTick {
  const tickObjectWithoutHidden: Omit<AxisTick, 'hidden'> = {
    label: tickLabelFormatter(groupValues[scaleTickValue]),
    position: groupPositions[scaleTickValue],
    value: groupValues[scaleTickValue]
  };
  return { ...tickObjectWithoutHidden, hidden: isHidden(tickObjectWithoutHidden) };
}

function getGroupAxisTickData(axisConfig: GroupAxisConfig, axisLayoutInfo: GroupAxisLayoutInfo, axisScale: AxisScale, axisDomain: GroupAxisDomain, groupValues: readonly GroupValue[], groupPositions: number[]): AxisTick[] {
  let ticks: AxisTick[] = [];
  let groupAxisRangeExtent = axisScale.range()[1] - axisScale.range()[0]; // different because of bar offset??
  let groupAxisDomainExtent = +axisScale.domain()[1] - +axisScale.domain()[0];

  if (groupValues.length > 0) {
    let scaleTicks: AxisValue[];
    let tickCount: number;

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
          scaleTicks = [groupValues[0] as AxisValue];
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
          scaleTicks = [groupValues[0] as AxisValue];
        }
      }
      else {
        if (axisConfig.scale === SCALE_ORDINAL) {
          scaleTicks = groupValues.map((_v, i) => i);
        }
        else {
          scaleTicks = axisScale.ticks(tickCount);
        }
      }
    }
    let tickLabelFormatter: TickLabelFormatter;
    if (axisConfig.scale === SCALE_ORDINAL) {
      tickLabelFormatter = getOrdinalScaleTickLabelFormatter(axisConfig, axisScale, scaleTicks.length, groupValues);
    }
    else {
      tickLabelFormatter = getLinearScaleTickLabelFormatter(axisConfig, axisScale, scaleTicks.length);
    }
    if (axisConfig.scale === SCALE_ORDINAL) {
      let tickInterval = Math.ceil(groupValues.length / tickCount);
      if (axisConfig.tickLabelTruncationEnabled && axisLayoutInfo.tickLabelParallel) {
        ticks = scaleTicks.map((scaleTick, i) => createOrdinalTickObject(scaleTick as number, groupValues, groupPositions, tickLabelFormatter, () => i % tickInterval !== 0));
      }
      else {
        if (axisLayoutInfo.tickLabelParallel) {
          const { before, after, groupExtent, tickLabelSpace, tickLabelAnchor } = axisLayoutInfo;

          const beforeOffset = tickLabelAnchor === ANCHOR_START ? 0 : (tickLabelAnchor === ANCHOR_MIDDLE ? Math.ceil(tickLabelSpace / 2.0) : tickLabelSpace);
          const afterOffset = tickLabelAnchor === ANCHOR_START ? tickLabelSpace : (tickLabelAnchor === ANCHOR_MIDDLE ? Math.ceil(tickLabelSpace / 2.0) : 0);

          const minPosition = beforeOffset - before;
          const maxPosition = groupExtent + after - afterOffset;

          ticks = scaleTicks.map((scaleTick, i) => createOrdinalTickObject(scaleTick as number, groupValues, groupPositions, tickLabelFormatter, ({ position }) => i % tickInterval !== 0 || position < minPosition || position > maxPosition ));
          if (groupValues.length > 0) {
            const singleIndex = tickLabelAnchor === ANCHOR_START ? 0 : (tickLabelAnchor === ANCHOR_END ? groupValues.length-1 : Math.floor(groupValues.length / 2));
            ticks.push(createOrdinalTickObject(singleIndex, groupValues, groupPositions, tickLabelFormatter, () => ticks.some(tick => tick.hidden === false)));
          }
        }
        else {
          ticks = scaleTicks.map((scaleTick, i) => createOrdinalTickObject(scaleTick as number, groupValues, groupPositions, tickLabelFormatter, () => i % tickInterval !== 0));
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
          const singleValue = tickLabelAnchor === ANCHOR_START ? axisDomain[0]! : (tickLabelAnchor === ANCHOR_END ? axisDomain[1]! : +axisDomain[0]! + (+axisDomain[1]! - +axisDomain[0]!) / 2);
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

function getMaxTickLabelLength(_groupAxisConfig: GroupAxisConfig, groupValues: readonly GroupValue[], axisTickData: AxisTick[], spacingInfo: GroupSpacingInfo): number {
  return groupValues.length / axisTickData.reduce((count, tick) => count + (tick.hidden ? 0 : 1), 0) * spacingInfo.groupValueExtent;
}

function getSeriesAxisTickData(axisConfigArray: SeriesAxisConfig[], axisLayoutInfoArray: ChartLayoutInfo['seriesAxisLayoutInfos'], rawAxisDomainArray: Record<string, NullableDomain>, filteredAxisDomainArray: Record<string, NullableDomain>, filteredSeriesCountArray: Record<string, number>, axisScaleArray: Record<string, AxisScale>, vertical: boolean): Record<string, AxisTick[]> {
  return arrayToMap(axisConfigArray, idAccessor, axisConfig => {
    let axisId = axisConfig.id;
    return getSeriesAxisTickDataObject(axisConfig, axisLayoutInfoArray[axisId] as AxisLayoutInfo, rawAxisDomainArray[axisId], filteredAxisDomainArray[axisId], filteredSeriesCountArray[axisId], axisScaleArray[axisId], vertical);
  });
}

function getSeriesAxisTickDataObject(axisConfig: SeriesAxisConfig, axisLayoutInfo: AxisLayoutInfo, rawSeriesAxisDomain: NullableDomain, filteredSeriesAxisDomain: NullableDomain, filteredSeriesCount: number, axisScale: AxisScale, vertical: boolean): AxisTick[] {
  let ticks: AxisTick[] = [];
  if (axisConfig.alwaysVisible || filteredSeriesCount > 0) {
    let tickCount = axisConfig.tickCount;
    let scaleTicks: AxisValue[];
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
      let seriesAxisDomainExtent = seriesAxisDomain[1]! - seriesAxisDomain[0]!;
      tickCount = getTickCount(axisConfig, axisLayoutInfo.seriesExtent, seriesAxisDomainExtent, axisLayoutInfo.tickLabelSpace);
      if (tickCount === 1) {
        scaleTicks = [seriesAxisDomain[0]!];
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

function getLinearAxisExtraTicks(axisDomain: GroupAxisDomain, _axisScale: AxisScale, scaleTicks: AxisValue[]): { preTicks: AxisValue[]; postTicks: AxisValue[] } {
  let preTicks: AxisValue[] = [];
  let postTicks: AxisValue[] = [];
  if (scaleTicks.length > 1) {
    let minTickValue = scaleTicks[0];
    let maxTickValue = scaleTicks[scaleTicks.length - 1];
    if (axisDomain[0] !== null && +axisDomain[0] < +minTickValue) {
      preTicks.push(axisDomain[0]);
    }
    else if (axisDomain[0] !== null && +axisDomain[0] > +maxTickValue) {
      postTicks.push(axisDomain[0]);
    }
    if (axisDomain[1] !== null && +axisDomain[1] < +minTickValue) {
      preTicks.push(axisDomain[1]);
    }
    else if (axisDomain[1] !== null && +axisDomain[1] > +maxTickValue) {
      postTicks.push(axisDomain[1]);
    }
  }
  else if (scaleTicks.length === 1) {
    if (axisDomain[0] !== null && axisDomain[1] !== null && +axisDomain[0] === +axisDomain[1]) {
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
      if (axisDomain[0] !== null && +scaleTicks[0] > +axisDomain[0]) {
        preTicks.push(axisDomain[0]);
      }
      if (axisDomain[1] !== null && +scaleTicks[0] < +axisDomain[1]) {
        postTicks.push(axisDomain[1]);
      }
    }
  }
  else {
    if (axisDomain[0] !== null) {
      if (axisDomain[1] !== null && +axisDomain[0] === +axisDomain[1]) {
        preTicks.push(axisDomain[0]);
      }
      else {
        preTicks.push(axisDomain[0]);
        if (axisDomain[1] !== null) preTicks.push(axisDomain[1]);
      }
    }
  }
  return { preTicks, postTicks };
}

function getTickCount(axisConfig: AxisConfigBase, axisRangeExtent: number, axisDomainExtent: number, tickLabelSpace: number): number {
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

function getLinearScaleTickLabelFormatter(axisConfig: GroupAxisConfig | SeriesAxisConfig, axisScale: AxisScale, tickCount: number): TickLabelFormatter {
  let tickLabelFormatter: TickLabelFormatter = tick => tick;
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
        let timeFormatter = 'dateUTC' in axisConfig && axisConfig.dateUTC ? utcFormat : timeFormat;
        if (axisConfig.tickLabelFormat === AUTO) {
          const formatter = timeFormatter(autoTickLabelFormatDate);
          tickLabelFormatter = tick => formatter(tick as Date);
        }
        else {
          const formatter = timeFormatter(axisConfig.tickLabelFormat);
          tickLabelFormatter = tick => formatter(tick as Date);
        }
      }
    }
  }
  return getTickLabelFormatterForPrefixAndSuffix(axisConfig, tickLabelFormatter);
}

function getDomainForValues(values: readonly GroupValue[]): [AxisValue, AxisValue] {
  let min: AxisValue | null = null;
  let max: AxisValue | null = null;
  let i, count = values.length;
  for (i=0; i<count; i++) {
    const value = values[i] as AxisValue;
    if (max === null || +value > +max) {
      max = value;
    }
    if (min === null || +value < +min) {
      min = value;
    }
  }
  return [min!, max!];
}

function getOrdinalScaleTickLabelFormatter(axisConfig: GroupAxisConfig, axisScale: AxisScale, tickCount: number, values: readonly GroupValue[]): TickLabelFormatter {
  if (tickCount <= 1) {
    return getLinearScaleTickLabelFormatter(axisConfig, axisScale, tickCount);
  }
  else {
    let tickLabelFormatter: TickLabelFormatter = tick => tick;
    if (axisConfig.tickLabelFormat !== NONE) {
      if (axisConfig.type === TYPE_NUMBER) {
        let formatSpecifier = axisConfig.tickLabelFormat === AUTO ? autoTickLabelFormatNumber : axisConfig.tickLabelFormat;
        // Experimental code to try to create a nice uniform tick format for ordinal number scales. may need work...
        if (enableOrdinalExperimentalMode) {
          tickLabelFormatter = scaleLinear().domain(getDomainForValues(values)).tickFormat(tickCount, formatSpecifier);
        }
        else {
          const formatter = format(formatSpecifier);
          tickLabelFormatter = tick => formatter(tick as number);
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
            const formatter = timeFormatter(autoTickLabelFormatDate);
            tickLabelFormatter = tick => formatter(tick as Date);
          }
        }
        else {
          const formatter = timeFormatter(axisConfig.tickLabelFormat);
          tickLabelFormatter = tick => formatter(tick as Date);
        }
      }
    }
    return getTickLabelFormatterForPrefixAndSuffix(axisConfig, tickLabelFormatter);
  }
}

function getTickLabelFormatterForPrefixAndSuffix(axisConfig: AxisConfigBase, tickLabelFormatter: TickLabelFormatter): TickLabelFormatter {
  if (axisConfig.tickLabelPrefix !== NONE || axisConfig.tickLabelSuffix !== NONE) {
    let oldTickLabelFormatter = tickLabelFormatter;
    if (axisConfig.tickLabelPrefix !== NONE && axisConfig.tickLabelSuffix !== NONE) {
      const prefix = axisConfig.tickLabelPrefix!;
      const suffix = axisConfig.tickLabelSuffix!;
      tickLabelFormatter = (tick: GroupValue) => (prefix + oldTickLabelFormatter(tick) + suffix);
    }
    else if (axisConfig.tickLabelPrefix !== NONE) {
      const prefix = axisConfig.tickLabelPrefix!;
      tickLabelFormatter = (tick: GroupValue) => (prefix + oldTickLabelFormatter(tick));
    }
    else if (axisConfig.tickLabelSuffix !== NONE) {
      const suffix = axisConfig.tickLabelSuffix!;
      tickLabelFormatter = (tick: GroupValue) => (oldTickLabelFormatter(tick) + suffix);
    }
  }
  return tickLabelFormatter;
}
