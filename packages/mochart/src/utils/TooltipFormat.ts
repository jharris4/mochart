import { NONE } from '../config/core/constants';
import { getSeriesLabel } from './SeriesTitle';
import type { TooltipConfig, SeriesConfig } from '../types/config';
import type { ChartData, SeriesDomainObjects, SeriesValueObject } from '../types/data';
import type { ValueKey } from '../data/constants';
import type { ValueFormatter } from './ValueFormat';

type GroupSeriesValueObject = Partial<Record<ValueKey, number | null | undefined>>;
interface GroupSeriesSlice {
  axisBases: Record<string, number | null>;
  raw: { values: Record<string, GroupSeriesValueObject>; domains: SeriesDomainObjects };
  filtered: { values: Record<string, GroupSeriesValueObject>; domains: SeriesDomainObjects };
}

function getSuppressedValueText(tooltipConfig: TooltipConfig, defaultValueText: string): string {
  let seriesValueText: string;
  if (tooltipConfig.suppressedValueText !== NONE) {
    seriesValueText = tooltipConfig.suppressedValueText;
  }
  else if (tooltipConfig.suppressedValueCharacter !== NONE) {
    let suppressedCharacter = tooltipConfig.suppressedValueCharacter;
    let characterCount = defaultValueText.length;
    seriesValueText = '';
    for (let i = 0; i < characterCount; i++) {
      seriesValueText+= suppressedCharacter;
    }
  }
  else {
    seriesValueText = defaultValueText;
  }
  return seriesValueText;
}

function getValueText(tooltipConfig: TooltipConfig, seriesConfig: SeriesConfig, adjustForSuppression: boolean, valueFormat: ValueFormatter, series: GroupSeriesSlice, key: ValueKey): string | null {
  const { raw, filtered, axisBases } = series;
  const seriesId = seriesConfig.id;
  const seriesValueObject = raw.values[seriesId];
  const filterValueObject = filtered.values[seriesId];
  const hasFilterValue = filterValueObject[key] !== null;

  let seriesValueText = null;
  if (seriesValueObject[key] !== undefined) {
    if (adjustForSuppression && tooltipConfig.adjustForSuppression) {
      if (hasFilterValue) {
        seriesValueText = String(valueFormat(filterValueObject[key]!));
      }
      else {
        seriesValueText = getSuppressedValueText(tooltipConfig, String(valueFormat(axisBases[seriesConfig.seriesAxisConfig.id]!)));
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
      seriesValueText = getSuppressedValueText(tooltipConfig, tooltipConfig.missingValueText);
    }
  }
  return seriesValueText;
}

export function getSeriesText(tooltipConfig: TooltipConfig, seriesConfig: SeriesConfig, valueFormat: ValueFormatter, series: GroupSeriesSlice, adjustForSuppression: boolean) {
  const labelText = getSeriesLabel(seriesConfig);

  if (seriesConfig.tooltipProperty !== NONE) {
    return {
      labelText,
      valueText: getValueText(tooltipConfig, seriesConfig, adjustForSuppression, valueFormat, series, 'tooltip')
    };
  }

  // Mirror the shape's skip semantics (see getSeriesPositionData): with
  // skipPartialRange a ranged group missing either value is wholly missing,
  // and skipMissing omits missing groups from the shape — and from the
  // tooltip, instead of a dangling "value – N/A" row. This is the
  // direction-split idiom (waterfall, candlestick, OHLC), where the missing
  // side means "not this series' direction", not "no data". A plain follower
  // series (followSeries — e.g. a direction-split volume bar) is part of the
  // same idiom, so its missing groups hide the same way.
  if (seriesConfig.skipMissing && seriesConfig.stack === NONE) {
    const rawValueObject = series.raw.values[seriesConfig.id];
    if (seriesConfig.rangeProperty !== NONE && seriesConfig.skipPartialRange &&
      (rawValueObject.plain === undefined || rawValueObject.range === undefined)) {
      return { labelText, valueText: null };
    }
    if (seriesConfig.rangeProperty === NONE && seriesConfig.followSeries !== NONE && rawValueObject.plain === undefined) {
      return { labelText, valueText: null };
    }
  }

  const seriesValueText = getValueText(tooltipConfig, seriesConfig, adjustForSuppression, valueFormat, series, 'plain');
  const rangeSeriesValueText = seriesConfig.rangeProperty !== NONE ? getValueText(tooltipConfig, seriesConfig, adjustForSuppression, valueFormat, series, 'range') : null;
  const markerSeriesValueText = seriesConfig.markerProperty !== NONE ? getValueText(tooltipConfig, seriesConfig, adjustForSuppression, valueFormat, series, 'marker') : null;
  // An undefined error bound is a legitimate one-sided error bar, not missing
  // data, so it renders nothing rather than the missingValueText.
  const rawValueObject = series.raw.values[seriesConfig.id];
  const errorLowValueText = seriesConfig.errorLowProperty !== NONE && rawValueObject.errorLow !== undefined ?
    getValueText(tooltipConfig, seriesConfig, adjustForSuppression, valueFormat, series, 'errorLow') : null;
  const errorHighValueText = seriesConfig.errorHighProperty !== NONE && rawValueObject.errorHigh !== undefined ?
    getValueText(tooltipConfig, seriesConfig, adjustForSuppression, valueFormat, series, 'errorHigh') : null;

  let valueText = null;
  if (seriesValueText !== null && rangeSeriesValueText !== null) {
    // A range whose two ends format identically collapses to the single value,
    // e.g. an OHLC open/close tick whose property and rangeProperty match.
    valueText = rangeSeriesValueText === seriesValueText ? seriesValueText : rangeSeriesValueText + tooltipConfig.rangeValueText + seriesValueText;
  }
  else if (seriesValueText !== null) {
    valueText = seriesValueText;
  }
  else if (rangeSeriesValueText != null) {
    valueText = rangeSeriesValueText;
  }
  const errorValueText = errorLowValueText !== null && errorHighValueText !== null ?
    errorLowValueText + tooltipConfig.rangeValueText + errorHighValueText :
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

export function getSuppressedValue(chartData: ChartData, seriesConfig: SeriesConfig, valueObject: SeriesValueObject): SeriesValueObject {
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
    let base = chartData.seriesData.axisBases[seriesConfig.seriesAxisConfig.id];
    newValueObject.plain = chartData.groupData.values.raw.map(groupValue => groupValue !== undefined ? (base ?? undefined) : undefined);
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
      newValueObject.marker = chartData.groupData.values.raw.map(groupValue => groupValue !== undefined ? (base ?? undefined) : undefined);
    }
    if (seriesConfig.tooltipProperty !== NONE && newValueObject.tooltip === null) {
      base = chartData.seriesData.raw.domains[seriesConfig.id]['tooltip'][0];
      newValueObject.tooltip = chartData.groupData.values.raw.map(groupValue => groupValue !== undefined ? (base ?? undefined) : undefined);
    }
  }
  return newValueObject
}
