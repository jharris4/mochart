import { NONE } from '../config/core/constants';
import { getSeriesLabel } from './SeriesTitle';

function getSuppressedValueText(tooltipConfig, defaultValueText) {
  let seriesValueText;
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

function getValueText(tooltipConfig, seriesConfig, adjustForSuppression, valueFormat, series, key) {
  const { raw, filtered, axisBases } = series;
  const seriesId = seriesConfig.id;
  const seriesValueObject = raw.values[seriesId];
  const filterValueObject = filtered.values[seriesId];
  const hasFilterValue = filterValueObject[key] !== null;

  let seriesValueText = null;
  if (seriesValueObject[key] !== void 0) {
    if (adjustForSuppression && tooltipConfig.adjustForSuppression) {
      if (hasFilterValue) {
        seriesValueText = valueFormat(filterValueObject[key]);
      }
      else {
        seriesValueText = getSuppressedValueText(tooltipConfig, valueFormat(axisBases[seriesConfig.seriesAxisConfig.id]));
      }
    }
    else {
      seriesValueText = valueFormat(seriesValueObject[key]);
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

export function getSeriesText(tooltipConfig, seriesConfig, valueFormat, series, adjustForSuppression) {
  const labelText = getSeriesLabel(seriesConfig);

  const seriesValueText = getValueText(tooltipConfig, seriesConfig, adjustForSuppression, valueFormat, series, 'plain');
  const rangeSeriesValueText = seriesConfig.rangeProperty !== NONE ? getValueText(tooltipConfig, seriesConfig, adjustForSuppression, valueFormat, series, 'range') : null;
  const markerSeriesValueText = seriesConfig.markerProperty !== NONE ? getValueText(tooltipConfig, seriesConfig, adjustForSuppression, valueFormat, series, 'marker') : null;

  let valueText = null;
  if (seriesValueText !== null && rangeSeriesValueText !== null) {
    valueText = rangeSeriesValueText + tooltipConfig.rangeValueText + seriesValueText;
  }
  else if (seriesValueText !== null) {
    valueText = seriesValueText;
  }
  else if (rangeSeriesValueText != null) {
    valueText = rangeSeriesValueText;
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

export function getSuppressedValue(chartData, seriesConfig, valueObject) {
  let newValueObject = valueObject;
  if (newValueObject.plain === null) {
    newValueObject = {
      plain: null,
      range: null,
      marker: null
    };
    let base = chartData.seriesData.axisBases[seriesConfig.seriesAxisConfig.id];
    newValueObject.plain = chartData.groupData.values.raw.map(groupValue => groupValue !== void 0 ? base : groupValue);
    if (seriesConfig.rangeProperty !== NONE && newValueObject.range === null) {
      newValueObject.range = newValueObject.plain;
    }
    if (seriesConfig.markerProperty !== NONE&& newValueObject.marker === null) {
      base = chartData.seriesData.raw.domains[seriesConfig.id]['marker'][0];
      newValueObject.marker = chartData.groupData.values.raw.map(groupValue => groupValue !== void 0 ? base : groupValue);
    }
  }
  return newValueObject
}