import { NONE, PIE_LABEL_TYPE_PERCENT, MISSING_VALUES_CONNECT } from '../config/core/constants';
import { getSeriesLabel } from './SeriesTitle';
import { formatPieLabelType, pieLabelTypeUsesPercent } from '../data/PieLabel';
import type { PieTooltipLabelType } from '../config/core/constants';
import type { TooltipConfig } from '../types/config';
import type { EnhancedSeriesConfig } from '../types/enhanced';
import type { ChartData, SeriesDomainObjects, SeriesValueObject } from '../types/data';
import type { ValueKey } from '../data/constants';
import type { ValueFormatter } from './ValueFormat';

type CategorySeriesValueObject = Partial<Record<ValueKey, number | null | undefined>>;
interface CategorySeriesSlice {
  axisBases: Record<string, number | null>;
  raw: { values: Record<string, CategorySeriesValueObject>; domains: SeriesDomainObjects };
  filtered: { values: Record<string, CategorySeriesValueObject>; domains: SeriesDomainObjects };
}

function getFilteredValueText(tooltipConfig: TooltipConfig, defaultValueText: string): string {
  let seriesValueText: string;
  if (tooltipConfig.filteredValueText !== NONE) {
    seriesValueText = tooltipConfig.filteredValueText;
  }
  else if (tooltipConfig.filteredValueCharacter !== NONE) {
    const filteredCharacter = tooltipConfig.filteredValueCharacter;
    const characterCount = defaultValueText.length;
    seriesValueText = '';
    for (let i = 0; i < characterCount; i++) {
      seriesValueText+= filteredCharacter;
    }
  }
  else {
    seriesValueText = defaultValueText;
  }
  return seriesValueText;
}

function getValueText(tooltipConfig: TooltipConfig, seriesConfig: EnhancedSeriesConfig, adjustForFiltering: boolean, valueFormat: ValueFormatter, series: CategorySeriesSlice, key: ValueKey): string | null {
  const { raw, filtered, axisBases } = series;
  const seriesId = seriesConfig.id;
  const seriesValueObject = raw.values[seriesId];
  const filterValueObject = filtered.values[seriesId];
  const hasFilterValue = filterValueObject[key] !== null;

  let seriesValueText = null;
  if (seriesValueObject[key] !== undefined) {
    if (adjustForFiltering && tooltipConfig.adjustForFiltering) {
      if (hasFilterValue) {
        seriesValueText = String(valueFormat(filterValueObject[key]!));
      }
      else {
        seriesValueText = getFilteredValueText(tooltipConfig, String(valueFormat(axisBases[seriesConfig.valueAxisConfig.id]!)));
      }
    }
    else {
      seriesValueText = String(valueFormat(seriesValueObject[key]!));
    }
  }
  else if (tooltipConfig.showMissingValues) {
    if (hasFilterValue) {
      seriesValueText = tooltipConfig.missingValueText;
    }
    else {
      seriesValueText = getFilteredValueText(tooltipConfig, tooltipConfig.missingValueText);
    }
  }
  return seriesValueText;
}

/**
 * What a pie slice's tooltip value needs beyond its value: the content type,
 * the percent formatter and the slice's fraction. The caller picks the fraction
 * from the filtered or raw values (see TooltipContent), so the value and the
 * percentage in a combined value always come from the same snapshot.
 */
export interface PieTooltipValues {
  tooltipValues: PieTooltipLabelType;
  percentFormat: (fraction: number) => string;
  /** The slice's fraction, already chosen from the filtered or raw values. */
  fraction: number;
  /** The slice's fraction of the full total, sizing a filtered placeholder. */
  rawFraction: number;
  /**
   * Whether the slice is filtered. A percentage is derived rather than stored
   * per value key, so this comes from the row's filtered flag instead of the
   * null filtered value getValueText tests.
   */
  filtered: boolean;
}

function getPieValueText(tooltipConfig: TooltipConfig, seriesConfig: EnhancedSeriesConfig, adjustForFiltering: boolean,
  valueFormat: ValueFormatter, series: CategorySeriesSlice, pieValues: PieTooltipValues): string | null {
  const { tooltipValues, percentFormat, fraction, rawFraction, filtered } = pieValues;

  // No value means no row, whichever parts the type asks for — a bare "0.0%"
  // for a slice that has no value would read as a real zero share.
  const valueText = getValueText(tooltipConfig, seriesConfig, adjustForFiltering, valueFormat, series, 'plain');
  if (valueText === null) {
    return null;
  }

  // A filtered slice's filtered fraction is 0, so show the same placeholder
  // the values use, sized from the slice's share of the full total.
  const percentText = adjustForFiltering && tooltipConfig.adjustForFiltering && filtered ?
    getFilteredValueText(tooltipConfig, percentFormat(rawFraction)) : percentFormat(fraction);

  if (tooltipValues === PIE_LABEL_TYPE_PERCENT) {
    return percentText;
  }
  return formatPieLabelType(tooltipValues, { title: getSeriesLabel(seriesConfig), value: valueText, percent: percentText });
}

export function getSeriesText(tooltipConfig: TooltipConfig, seriesConfig: EnhancedSeriesConfig, valueFormat: ValueFormatter, series: CategorySeriesSlice,
  adjustForFiltering: boolean, pieValues?: PieTooltipValues) {
  const labelText = getSeriesLabel(seriesConfig);

  if (seriesConfig.tooltipProperty !== NONE) {
    return {
      labelText,
      valueText: getValueText(tooltipConfig, seriesConfig, adjustForFiltering, valueFormat, series, 'tooltip')
    };
  }

  // Pie slices are plain values, so the percentage-bearing types short-circuit
  // the range/marker/error composition below, which cannot apply to them. An
  // explicit per-series tooltipProperty still wins (above).
  if (pieValues !== undefined && pieLabelTypeUsesPercent(pieValues.tooltipValues)) {
    return { labelText, valueText: getPieValueText(tooltipConfig, seriesConfig, adjustForFiltering, valueFormat, series, pieValues) };
  }

  // Mirror the shape's skip semantics (see getSeriesPositionData): with
  // partialRangeIsMissing a ranged group missing either value is wholly missing,
  // and missingValues "connect" omits missing groups from the shape — and from the
  // tooltip, instead of a dangling "value – N/A" row. This is the
  // direction-split idiom (waterfall, candlestick, OHLC), where the missing
  // side means "not this series' direction", not "no data". A plain follower
  // series (followSeries — e.g. a direction-split volume bar) is part of the
  // same idiom, so its missing groups hide the same way.
  if (seriesConfig.missingValues === MISSING_VALUES_CONNECT && seriesConfig.stack === NONE) {
    const rawValueObject = series.raw.values[seriesConfig.id];
    if (seriesConfig.rangeProperty !== NONE && seriesConfig.partialRangeIsMissing &&
      (rawValueObject.plain === undefined || rawValueObject.range === undefined)) {
      return { labelText, valueText: null };
    }
    if (seriesConfig.rangeProperty === NONE && seriesConfig.followSeries !== NONE && rawValueObject.plain === undefined) {
      return { labelText, valueText: null };
    }
  }

  const seriesValueText = getValueText(tooltipConfig, seriesConfig, adjustForFiltering, valueFormat, series, 'plain');
  const rangeSeriesValueText = seriesConfig.rangeProperty !== NONE ? getValueText(tooltipConfig, seriesConfig, adjustForFiltering, valueFormat, series, 'range') : null;
  const markerSeriesValueText = seriesConfig.markerProperty !== NONE ? getValueText(tooltipConfig, seriesConfig, adjustForFiltering, valueFormat, series, 'marker') : null;
  // An undefined error bound is a legitimate one-sided error bar, not missing
  // data, so it renders nothing rather than the missingValueText.
  const rawValueObject = series.raw.values[seriesConfig.id];
  const errorLowValueText = seriesConfig.errorLowProperty !== NONE && rawValueObject.errorLow !== undefined ?
    getValueText(tooltipConfig, seriesConfig, adjustForFiltering, valueFormat, series, 'errorLow') : null;
  const errorHighValueText = seriesConfig.errorHighProperty !== NONE && rawValueObject.errorHigh !== undefined ?
    getValueText(tooltipConfig, seriesConfig, adjustForFiltering, valueFormat, series, 'errorHigh') : null;

  let valueText = null;
  if (seriesValueText !== null && rangeSeriesValueText !== null) {
    // A range whose two ends format identically collapses to the single value,
    // e.g. an OHLC open/close tick whose property and rangeProperty match.
    valueText = rangeSeriesValueText === seriesValueText ? seriesValueText : rangeSeriesValueText + tooltipConfig.rangeValueSeparator + seriesValueText;
  }
  else if (seriesValueText !== null) {
    valueText = seriesValueText;
  }
  else if (rangeSeriesValueText != null) {
    valueText = rangeSeriesValueText;
  }
  const errorValueText = errorLowValueText !== null && errorHighValueText !== null ?
    errorLowValueText + tooltipConfig.rangeValueSeparator + errorHighValueText :
    (errorLowValueText ?? errorHighValueText);
  if (errorValueText !== null) {
    valueText = valueText === null ? '(' + errorValueText + ')' : valueText + ' (' + errorValueText + ')';
  }
  if (valueText === null && markerSeriesValueText !== null) {
    valueText = '(' + markerSeriesValueText + ')';
  }
  else if (valueText !== null && markerSeriesValueText !== null) {
    valueText = valueText + ' (' + markerSeriesValueText + ')';
  }
  return {
    labelText,
    valueText
  };
}

export function getFilteredValue(chartData: ChartData, seriesConfig: EnhancedSeriesConfig, valueObject: SeriesValueObject): SeriesValueObject {
  let newValueObject = valueObject;
  if (newValueObject.plain === null) {
    newValueObject = {
      plain: null,
      range: null,
      errorLow: null,
      errorHigh: null,
      stack: null,
      prior: null,
      marker: null,
      label: null,
      color: null,
      tooltip: null,
      markerCopyKey: null,
      labelCopyKey: null,
      colorCopyKey: null,
      tooltipCopyKey: null,
      min: null,
      max: null
    };
    let base = chartData.seriesData.axisBases[seriesConfig.valueAxisConfig.id];
    newValueObject.plain = chartData.categoryData.values.raw.map(categoryValue => categoryValue !== undefined ? (base ?? undefined) : undefined);
    if (seriesConfig.rangeProperty !== NONE && newValueObject.range === null) {
      newValueObject.range = newValueObject.plain;
    }
    if (seriesConfig.errorLowProperty !== NONE && newValueObject.errorLow === null) {
      newValueObject.errorLow = newValueObject.plain;
    }
    if (seriesConfig.errorHighProperty !== NONE && newValueObject.errorHigh === null) {
      newValueObject.errorHigh = newValueObject.plain;
    }
    if (seriesConfig.markerProperty !== NONE&& newValueObject.marker === null) {
      base = chartData.seriesData.raw.domains[seriesConfig.id]['marker'][0];
      newValueObject.marker = chartData.categoryData.values.raw.map(categoryValue => categoryValue !== undefined ? (base ?? undefined) : undefined);
    }
    if (seriesConfig.tooltipProperty !== NONE && newValueObject.tooltip === null) {
      base = chartData.seriesData.raw.domains[seriesConfig.id]['tooltip'][0];
      newValueObject.tooltip = chartData.categoryData.values.raw.map(categoryValue => categoryValue !== undefined ? (base ?? undefined) : undefined);
    }
  }
  return newValueObject
}
