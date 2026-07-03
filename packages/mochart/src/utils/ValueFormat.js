import { format, formatSpecifier } from 'd3-format';
import { timeFormat, utcFormat } from 'd3-time-format';
import { scaleLinear } from 'd3-scale';

import { arrayToMap, idAccessor } from './utils';
import { NONE, AUTO, TYPE_DATE, TYPE_NUMBER } from '../config/core/constants';

const autoValueFormatNumber = ".2s";
const autoGroupFormatNumber = '.2s';
const autoGroupFormatDate = '%c';

export function getGroupFormat(groupAxisConfig) {
  let groupFormat = (group) => group;
  if (groupAxisConfig.type === TYPE_DATE) {
    if (groupAxisConfig.dateUTC) {
      groupFormat = (group) => group.toUTCString();
    }
    else {
      groupFormat = (group) => group.toString();
    }
  }
  if (groupAxisConfig.valueFormat !== NONE) {
    let timeFormatter = groupAxisConfig.dateUTC ? utcFormat : timeFormat;
    if (groupAxisConfig.valueFormat === AUTO) {
      if (groupAxisConfig.tickLabelFormat !== NONE) {
        if (groupAxisConfig.tickLabelFormat === AUTO) {
          if (groupAxisConfig.type === TYPE_DATE) {
            groupFormat = timeFormatter(autoGroupFormatDate);
          }
          else if (groupAxisConfig.type === TYPE_NUMBER) {
            groupFormat = format(autoGroupFormatNumber);
          }
        }
        else {
          if (groupAxisConfig.type === TYPE_DATE) {
            groupFormat = timeFormatter(groupAxisConfig.tickLabelFormat);
          }
          else if (groupAxisConfig.type === TYPE_NUMBER) {
            groupFormat = format(groupAxisConfig.tickLabelFormat);
          }
        }
      }
    }
    else {
      if (groupAxisConfig.type === TYPE_DATE) {
        groupFormat = timeFormatter(groupAxisConfig.valueFormat);
      }
      else if (groupAxisConfig.type === TYPE_NUMBER) {
        groupFormat = format(groupAxisConfig.valueFormat);
      }
    }
  }
  groupFormat = applyPrefixAndSuffix(groupAxisConfig, groupFormat);
  return groupFormat;
}

export function getSeriesFormats(seriesConfigs, seriesAxisConfigs, seriesAxisDomains) {
  let seriesAxisScales = arrayToMap(seriesAxisConfigs, idAccessor, seriesAxisConfig => scaleLinear().domain(seriesAxisDomains[seriesAxisConfig.id]));
  return arrayToMap(seriesConfigs, idAccessor, seriesConfig =>
    getSeriesFormat(seriesConfig, seriesConfig.seriesAxisConfig, seriesAxisScales[seriesConfig.seriesAxisConfig.id]));
}

export function getSeriesFormat(seriesConfig, seriesAxisConfig, seriesAxisScale) {
  let valueFormat = (value) => value;
  if (seriesConfig.valueFormat !== NONE) {
    if (seriesConfig.valueFormat === AUTO) {
      let formatSpecifier = seriesAxisConfig.tickLabelFormat === AUTO ? autoValueFormatNumber : seriesAxisConfig.tickLabelFormat;
      valueFormat = seriesAxisScale.tickFormat(10, formatSpecifier);
    }
    else {
      valueFormat = format(seriesConfig.valueFormat);
    }
  }
  valueFormat = applyPrefixAndSuffix(seriesConfig, valueFormat);
  return valueFormat;
}

export function getSeriesLabelFormat(seriesConfig, seriesAxisConfig, seriesAxisScale) {
  let valueFormat = (value) => value;
  if (seriesConfig.labelFormat !== NONE) {
    if (seriesConfig.labelFormat === AUTO) {
      return getSeriesFormat(seriesConfig, seriesAxisConfig, seriesAxisScale);
    }
    else {
      valueFormat = format(seriesConfig.labelFormat);
    }
  }
  return valueFormat;
}

function applyPrefixAndSuffix(formatConfig, oldFormat) {
  if (formatConfig.valuePrefix !== NONE || formatConfig.valueSuffix !== NONE) {
    if (formatConfig.valuePrefix !== NONE && formatConfig.valueSuffix !== NONE) {
      return (value) => (formatConfig.valuePrefix + oldFormat(value) + formatConfig.valueSuffix);
    }
    else if (formatConfig.valuePrefix !== NONE) {
      return (value) => (formatConfig.valuePrefix + oldFormat(value));
    }
    else if (formatConfig.valueSuffix !== NONE) {
      return (value) => (oldFormat(value) + formatConfig.valueSuffix);
    }
  }
  else {
    return oldFormat;
  }
}