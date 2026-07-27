import { NONE } from '../config/core/constants';
import type { GroupAxisConfig, SeriesConfig } from '../types/config';
import type { AxisScale, GroupAxisData, SeriesPosition, SeriesPositionAccessor, SeriesPositionData, SeriesValueObject } from '../types/data';
import type { LayoutInfo } from '../types/layout';

function normalizePriorPositions(seriesPositions: SeriesPosition[], seriesPriorPositions: SeriesPosition[] | null, seriesBasePosition: number, inverted: boolean): void {
  let temp, i, length = seriesPositions.length;
  if (seriesPriorPositions !== null) {
    for (i = 0; i < length; i++) {
      if (seriesPositions[i] === undefined) {
        if (seriesPriorPositions[i] !== undefined) {
          seriesPositions[i] = seriesPriorPositions[i];
        }
        else {
          seriesPriorPositions[i] = seriesBasePosition;
        }
      }
      else if (seriesPriorPositions[i] === undefined) {
        seriesPriorPositions[i] = seriesPositions[i];
      }
      else {
        let swapPosition = inverted ? seriesPositions[i]! < seriesPriorPositions[i]! : seriesPositions[i]! > seriesPriorPositions[i]!
        if(swapPosition) {
          temp = seriesPositions[i];
          seriesPositions[i] = seriesPriorPositions[i];
          seriesPriorPositions[i] = temp;
        }
      }
    }
  }
}

export function getSeriesPositionData(groupAxisConfig: GroupAxisConfig, seriesConfig: SeriesConfig, groupValueData: GroupAxisData['valueData'], seriesAxisScale: AxisScale, valueObject: SeriesValueObject, seriesLayoutInfo: LayoutInfo): SeriesPositionData {
  const { seriesAxisConfig, seriesGroupConfig, showMissingAtBase, skipMissing, skipPartialRange, group, stack, rangeProperty } = seriesConfig;
  const { spacingInfo, positions: groupPositions } = groupValueData;
  const { base } = seriesAxisConfig;
  const { min } = valueObject;
  const max = valueObject.max!; // max is the array of seriesValues and min is optionally the array of priorSeriesValues
  const { inverted } = seriesLayoutInfo;

  let seriesBasePosition = seriesAxisScale.range()[0]!;
  const seriesAxisDomain = seriesAxisScale.domain() as number[];
  if (base !== NONE) {
    if (base < seriesAxisDomain[0]!) {
      seriesBasePosition = seriesAxisScale.range()[0]!;
    }
    else if (base > seriesAxisDomain[1]!) {
      seriesBasePosition = seriesAxisScale.range()[1]!;
    }
    else {
      seriesBasePosition = seriesAxisScale(base);
    }
  }

  const missingPosition = showMissingAtBase ? seriesBasePosition : undefined;
  const skip = !showMissingAtBase && skipMissing; // skipMissing has no effect when showMissingAtBase is true

  const seriesPositions: SeriesPosition[] = [];
  let seriesPriorPositions: SeriesPosition[] | null = null;

  let groupDefinedPositions: number[] | null = null;
  let seriesDefinedPositions: number[] | null = null;
  let seriesPriorDefinedPositions: number[] | null = null;

  let { groupValueExtent, groupValueOffset } = spacingInfo;
  groupValueOffset*= -1;
  if (group !== NONE) {
    let groupExtentAndMargins = groupValueExtent / seriesGroupConfig!.seriesConfigs!.length;
    groupValueExtent = groupExtentAndMargins * (1.0 - groupAxisConfig.groupPadding.inner);
    groupValueOffset = groupValueOffset + (seriesGroupConfig!.seriesConfigIndicesById![seriesConfig.id]! * groupExtentAndMargins) + ((groupExtentAndMargins - groupValueExtent) / 2.0);
  }

  // With skipPartialRange, a ranged group missing either of its two values is
  // treated as wholly missing here, before normalizePriorPositions can back-fill
  // the absent side and collapse the group to a zero-extent span. Stacked series
  // are exempt: their min holds stack priors, not range values.
  const requireBothValues = skipPartialRange && rangeProperty !== NONE && stack === NONE && min !== null;

  let i, length = groupPositions.length;
  let position;
  for (i=0; i<length; i++) {
    if (max[i] !== undefined && (!requireBothValues || min![i] !== undefined)) {
      position = Math.floor(seriesAxisScale(max[i]!));
      seriesPositions.push(position);
    }
    else {
      seriesPositions.push(missingPosition);
    }
  }
  if (min !== null) {
    seriesPriorPositions = [];
    for (i=0; i<length; i++) {
      if (min[i] !== undefined && (!requireBothValues || max[i] !== undefined)) {
        position = Math.floor(seriesAxisScale(min[i]!));
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

  const skipGroupIndexMap: Record<number, number> = {};
  if (skip) {
    groupDefinedPositions = [];
    seriesDefinedPositions = [];
    if (seriesPriorPositions !== null) {
      seriesPriorDefinedPositions = [];
      let seriesPosition;
      let iSkip = 0;
      for (i = 0; i < length; i++) {
        seriesPosition = seriesPositions[i];
        if (seriesPosition !== undefined) {
          groupDefinedPositions.push(groupPositions[i]!);
          seriesDefinedPositions.push(seriesPosition);
          seriesPriorDefinedPositions.push(seriesPriorPositions[i] || seriesPosition); // rely on the fact that prior has been normalized
          skipGroupIndexMap[iSkip++] = i;
        }
      }
    }
    else {
      let iSkip = 0;
      for (i = 0; i < length; i++) {
        if (seriesPositions[i] !== undefined) {
          groupDefinedPositions.push(groupPositions[i]!);
          seriesDefinedPositions.push(seriesPositions[i]!);
          skipGroupIndexMap[iSkip++] = i;
        }
      }
    }
  }

  const gp = (skip ? groupDefinedPositions : groupPositions)!;
  const sp = (skip ? seriesDefinedPositions : seriesPositions)!;
  const spp = skip ? seriesPriorDefinedPositions : seriesPriorPositions;

  length = gp.length;
  // The d parameters in the following functions are unused, just present because that's what d3's generators expect
  const getDefined = skip ? () => true : (_d: unknown, i: number) => seriesPositions[i] !== undefined;
  const getGroupPosition: SeriesPositionAccessor = (_d, i) => gp[i];
  const getOffsetGroupPosition: SeriesPositionAccessor = (_d, i) => gp[i] + groupValueOffset;
  const getSeriesPosition: SeriesPositionAccessor = (_d, i) => sp[i];

  let getCurrentSeriesPosition: SeriesPositionAccessor = skip ? getSeriesPosition : (_d, i) => sp[i] !== undefined ? sp[i] : seriesBasePosition;
  let getPriorSeriesPosition: SeriesPositionAccessor = () => seriesBasePosition;
  if (spp !== null) {
    if (stack !== NONE) {
      // using defined for stacked needs investigation
      if (skip) {
        getCurrentSeriesPosition = (_d, i) => {
          return sp[i];
        };
        getPriorSeriesPosition = (_d, i) => {
          return spp[i];
        };
      }
      else {
        getCurrentSeriesPosition = (_d, i) => {
          return sp[i] !== undefined ? sp[i] : seriesBasePosition;
        };
        getPriorSeriesPosition = (_d, i) => {
          return spp[i] !== undefined ? spp[i] : seriesBasePosition;
        }
      }
    }
    else if (rangeProperty !== NONE) {
      getCurrentSeriesPosition = (_d, i) => sp[i];
      getPriorSeriesPosition = (_d, i) => spp[i];
    }
  }
  if (base !== NONE && spp === null) {
    if (skip) {
      getCurrentSeriesPosition = (_d, i) => sp[i]! < seriesBasePosition ? sp[i] : seriesBasePosition;
      getPriorSeriesPosition = (_d, i) => sp[i]! < seriesBasePosition ? seriesBasePosition : sp[i];
    }
    else {
      getCurrentSeriesPosition = (_d, i) => sp[i] !== undefined ? (sp[i]! < seriesBasePosition ? sp[i] : seriesBasePosition) : undefined;
      getPriorSeriesPosition = (_d, i) => sp[i] !== undefined && sp[i]! < seriesBasePosition ? seriesBasePosition : sp[i];
    }
    if (inverted) {
      let temp = getCurrentSeriesPosition;
      getCurrentSeriesPosition = getPriorSeriesPosition;
      getPriorSeriesPosition = temp;
    }
  }
  const getSeriesExtent = (_d: unknown, i: number) => Math.abs(getCurrentSeriesPosition(null, i)! - getPriorSeriesPosition(null, i)!);

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
