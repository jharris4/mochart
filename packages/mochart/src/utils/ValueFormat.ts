import { format, formatSpecifier } from 'd3-format';
import { timeFormat, utcFormat } from 'd3-time-format';
import { scaleLinear } from 'd3-scale';

import { arrayToMap, idAccessor } from './utils';
import { NONE, AUTO, TYPE_DATE, TYPE_NUMBER } from '../config/core/constants';
import type { GroupAxisConfig, SeriesAxisConfig, SeriesConfig } from '../types/config';
import type { AxisDomains, AxisScale, GroupValue } from '../types/data';

export type ValueFormatter = (value: number | Date) => GroupValue;

const autoValueFormatNumber = ".2s";
const autoGroupFormatNumber = '.2s';
const autoGroupFormatDate = '%c';

export function getGroupFormat(groupAxisConfig: GroupAxisConfig): (group: GroupValue) => GroupValue {
  let groupFormat = (group: GroupValue): GroupValue => group;
  if (groupAxisConfig.type === TYPE_DATE) {
    if (groupAxisConfig.dateUTC) {
      groupFormat = (group: GroupValue) => (group as Date).toUTCString();
    }
    else {
      groupFormat = (group: GroupValue) => group.toString();
    }
  }
  if (groupAxisConfig.valueFormat !== NONE) {
    let timeFormatter = groupAxisConfig.dateUTC ? utcFormat : timeFormat;
    if (groupAxisConfig.valueFormat === AUTO) {
      if (groupAxisConfig.tickLabelFormat !== NONE) {
        if (groupAxisConfig.tickLabelFormat === AUTO) {
          if (groupAxisConfig.type === TYPE_DATE) {
            const formatter = timeFormatter(autoGroupFormatDate);
            groupFormat = group => formatter(group as Date);
          }
          else if (groupAxisConfig.type === TYPE_NUMBER) {
            const formatter = format(autoGroupFormatNumber);
            groupFormat = group => formatter(group as number);
          }
        }
        else {
          if (groupAxisConfig.type === TYPE_DATE) {
            const formatter = timeFormatter(groupAxisConfig.tickLabelFormat);
            groupFormat = group => formatter(group as Date);
          }
          else if (groupAxisConfig.type === TYPE_NUMBER) {
            const formatter = format(groupAxisConfig.tickLabelFormat);
            groupFormat = group => formatter(group as number);
          }
        }
      }
    }
    else {
      if (groupAxisConfig.type === TYPE_DATE) {
        const formatter = timeFormatter(groupAxisConfig.valueFormat);
        groupFormat = group => formatter(group as Date);
      }
      else if (groupAxisConfig.type === TYPE_NUMBER) {
        const formatter = format(groupAxisConfig.valueFormat);
        groupFormat = group => formatter(group as number);
      }
    }
  }
  groupFormat = applyPrefixAndSuffix(groupAxisConfig, groupFormat);
  return groupFormat;
}

export function getSeriesFormats(seriesConfigs: SeriesConfig[], seriesAxisConfigs: SeriesAxisConfig[], seriesAxisDomains: AxisDomains): Record<string, ValueFormatter> {
  let seriesAxisScales = arrayToMap(seriesAxisConfigs, idAccessor, seriesAxisConfig => scaleLinear().domain(seriesAxisDomains[seriesAxisConfig.id]));
  return arrayToMap(seriesConfigs, idAccessor, seriesConfig =>
    getSeriesFormat(seriesConfig, seriesConfig.seriesAxisConfig, seriesAxisScales[seriesConfig.seriesAxisConfig.id]));
}

export function getSeriesFormat(seriesConfig: SeriesConfig, seriesAxisConfig: SeriesAxisConfig, seriesAxisScale: AxisScale): ValueFormatter {
  let valueFormat: ValueFormatter = value => value;
  if (seriesConfig.valueFormat !== NONE) {
    if (seriesConfig.valueFormat === AUTO) {
      let formatSpecifier = seriesAxisConfig.tickLabelFormat === AUTO ? autoValueFormatNumber : seriesAxisConfig.tickLabelFormat;
      valueFormat = seriesAxisScale.tickFormat(10, formatSpecifier);
    }
    else {
      const formatter = format(seriesConfig.valueFormat);
      valueFormat = value => formatter(value as number);
    }
  }
  valueFormat = applyPrefixAndSuffix(seriesConfig, valueFormat);
  return valueFormat;
}

export function getSeriesLabelFormat(seriesConfig: SeriesConfig, seriesAxisConfig: SeriesAxisConfig, seriesAxisScale: AxisScale): ValueFormatter {
  let valueFormat: ValueFormatter = value => value;
  if (seriesConfig.labelFormat !== NONE) {
    if (seriesConfig.labelFormat === AUTO) {
      return getSeriesFormat(seriesConfig, seriesAxisConfig, seriesAxisScale);
    }
    else {
      const formatter = format(seriesConfig.labelFormat);
      valueFormat = value => formatter(value as number);
    }
  }
  return valueFormat;
}

function applyPrefixAndSuffix<T>(formatConfig: Pick<GroupAxisConfig | SeriesConfig, 'valuePrefix' | 'valueSuffix'>, oldFormat: (value: T) => GroupValue): (value: T) => GroupValue {
  if (formatConfig.valuePrefix !== NONE || formatConfig.valueSuffix !== NONE) {
    if (formatConfig.valuePrefix !== NONE && formatConfig.valueSuffix !== NONE) {
      return value => (formatConfig.valuePrefix! + oldFormat(value) + formatConfig.valueSuffix!);
    }
    else if (formatConfig.valuePrefix !== NONE) {
      return value => (formatConfig.valuePrefix! + oldFormat(value));
    }
    else if (formatConfig.valueSuffix !== NONE) {
      return value => (oldFormat(value) + formatConfig.valueSuffix!);
    }
  }
  else {
    return oldFormat;
  }
  return oldFormat;
}
