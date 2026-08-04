import { NONE, MISSING_VALUES_BASE, MISSING_VALUES_CONNECT } from '../config/core/constants';
import type { CategoryAxisConfig } from '../types/config';
import type { EnhancedSeriesConfig } from '../types/enhanced';
import type { AxisScale, CategoryAxisData, SeriesPosition, SeriesPositionAccessor, SeriesPositionData, SeriesValueObject } from '../types/data';
import type { LayoutInfo } from '../types/layout';

function normalizePriorPositions(seriesPositions: SeriesPosition[], seriesPriorPositions: SeriesPosition[] | null, seriesBasePosition: number, inverted: boolean): void {
  const length = seriesPositions.length;
  if (seriesPriorPositions !== null) {
    for (let i = 0; i < length; i++) {
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
        const swapPosition = inverted ? seriesPositions[i]! < seriesPriorPositions[i]! : seriesPositions[i]! > seriesPriorPositions[i]!
        if(swapPosition) {
          const temp = seriesPositions[i];
          seriesPositions[i] = seriesPriorPositions[i];
          seriesPriorPositions[i] = temp;
        }
      }
    }
  }
}

export function getSeriesPositionData(categoryAxisConfig: CategoryAxisConfig, seriesConfig: EnhancedSeriesConfig, categoryValueData: CategoryAxisData['valueData'], valueAxisScale: AxisScale, valueObject: SeriesValueObject, seriesLayoutInfo: LayoutInfo): SeriesPositionData {
  const { valueAxisConfig, seriesGroupConfig, missingValues, partialRangeIsMissing, group, stack, rangeProperty, barWidthFraction, barAlignFraction } = seriesConfig;
  const { spacingInfo, positions: categoryPositions } = categoryValueData;
  const { base } = valueAxisConfig;
  const { min } = valueObject;
  const max = valueObject.max!; // max is the array of seriesValues and min is optionally the array of priorSeriesValues
  const { inverted } = seriesLayoutInfo;

  let seriesBasePosition = valueAxisScale.range()[0]!;
  const valueAxisDomain = valueAxisScale.domain() as number[];
  if (base !== NONE) {
    if (base < valueAxisDomain[0]!) {
      seriesBasePosition = valueAxisScale.range()[0]!;
    }
    else if (base > valueAxisDomain[1]!) {
      seriesBasePosition = valueAxisScale.range()[1]!;
    }
    else {
      seriesBasePosition = valueAxisScale(base);
    }
  }

  const missingPosition = missingValues === MISSING_VALUES_BASE ? seriesBasePosition : undefined;
  const skip = missingValues === MISSING_VALUES_CONNECT;

  const seriesPositions: SeriesPosition[] = [];
  let seriesPriorPositions: SeriesPosition[] | null = null;

  let categoryDefinedPositions: number[] | null = null;
  let seriesDefinedPositions: number[] | null = null;
  let seriesPriorDefinedPositions: number[] | null = null;

  let { categoryValueExtent, categoryValueOffset } = spacingInfo;
  categoryValueOffset*= -1;
  if (group !== NONE) {
    const categoryExtentAndMargins = categoryValueExtent / seriesGroupConfig!.seriesConfigs!.length;
    categoryValueExtent = categoryExtentAndMargins * (1.0 - categoryAxisConfig.categoryPaddingFraction.inner);
    categoryValueOffset = categoryValueOffset + (seriesGroupConfig!.seriesConfigIndicesById![seriesConfig.id]! * categoryExtentAndMargins) + ((categoryExtentAndMargins - categoryValueExtent) / 2.0);
  }
  if (barWidthFraction !== 1) {
    const fullValueExtent = categoryValueExtent;
    categoryValueExtent = fullValueExtent * barWidthFraction;
    categoryValueOffset += (fullValueExtent - categoryValueExtent) * barAlignFraction;
  }

  // With partialRangeIsMissing, a ranged group missing either of its two values is
  // treated as wholly missing here, before normalizePriorPositions can back-fill
  // the absent side and collapse the group to a zero-extent span. Stacked series
  // are exempt: their min holds stack priors, not range values.
  const requireBothValues = partialRangeIsMissing && rangeProperty !== NONE && stack === NONE && min !== null;

  let i, length = categoryPositions.length;
  let position;
  for (i=0; i<length; i++) {
    if (max[i] !== undefined && (!requireBothValues || min![i] !== undefined)) {
      position = Math.floor(valueAxisScale(max[i]!));
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
        position = Math.floor(valueAxisScale(min[i]!));
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

  const skipCategoryIndexMap: Record<number, number> = {};
  if (skip) {
    categoryDefinedPositions = [];
    seriesDefinedPositions = [];
    if (seriesPriorPositions !== null) {
      seriesPriorDefinedPositions = [];
      let seriesPosition;
      let iSkip = 0;
      for (i = 0; i < length; i++) {
        seriesPosition = seriesPositions[i];
        if (seriesPosition !== undefined) {
          categoryDefinedPositions.push(categoryPositions[i]!);
          seriesDefinedPositions.push(seriesPosition);
          seriesPriorDefinedPositions.push(seriesPriorPositions[i] ?? seriesPosition); // pixel 0 is a valid prior; only undefined falls back
          skipCategoryIndexMap[iSkip++] = i;
        }
      }
    }
    else {
      let iSkip = 0;
      for (i = 0; i < length; i++) {
        if (seriesPositions[i] !== undefined) {
          categoryDefinedPositions.push(categoryPositions[i]!);
          seriesDefinedPositions.push(seriesPositions[i]!);
          skipCategoryIndexMap[iSkip++] = i;
        }
      }
    }
  }

  const gp = (skip ? categoryDefinedPositions : categoryPositions)!;
  const sp = (skip ? seriesDefinedPositions : seriesPositions)!;
  const spp = skip ? seriesPriorDefinedPositions : seriesPriorPositions;

  length = gp.length;
  // The d parameters in the following functions are unused, just present because that's what d3's generators expect
  const getDefined = skip ? () => true : (_d: unknown, i: number) => seriesPositions[i] !== undefined;
  const getCategoryPosition: SeriesPositionAccessor = (_d, i) => gp[i];
  const getOffsetCategoryPosition: SeriesPositionAccessor = (_d, i) => gp[i] + categoryValueOffset;
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
      const temp = getCurrentSeriesPosition;
      getCurrentSeriesPosition = getPriorSeriesPosition;
      getPriorSeriesPosition = temp;
    }
  }
  const getSeriesExtent = (_d: unknown, i: number) => Math.abs(getCurrentSeriesPosition(null, i)! - getPriorSeriesPosition(null, i)!);

  return {
    length, // the generators expect an array, but we don't need one, so fake it...
    skipped: skip,
    skipCategoryIndexMap,
    getDefined,
    categoryPositions,
    categoryDefinedPositions,
    getCategoryPosition,
    getOffsetCategoryPosition,
    categoryValueExtent,
    categoryValueOffset,
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
