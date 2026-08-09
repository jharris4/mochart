import { format } from 'd3-format';
import { timeFormat, utcFormat } from 'd3-time-format';
import { scaleLinear } from 'd3-scale';

import { arrayToMap, idAccessor } from './utils';
import { NONE, AUTO, TYPE_DATE, TYPE_NUMBER } from '../config/core/constants';
import type { CategoryAxisConfig } from '../types/config';
import type { EnhancedSeriesConfig, EnhancedValueAxisConfig } from '../types/enhanced';
import type { AxisDomains, AxisScale, CategoryValue } from '../types/data';

export type ValueFormatter = (value: number | Date) => CategoryValue;

const autoValueFormatNumber = ".2s";
const autoCategoryFormatNumber = '.2s';
const autoCategoryFormatDate = '%c';

export function getCategoryFormat(categoryAxisConfig: CategoryAxisConfig): (category: CategoryValue) => CategoryValue {
  let categoryFormat = (category: CategoryValue): CategoryValue => category;
  if (categoryAxisConfig.type === TYPE_DATE) {
    if (categoryAxisConfig.dateUTC) {
      categoryFormat = (category: CategoryValue) => (category as Date).toUTCString();
    }
    else {
      categoryFormat = (category: CategoryValue) => category.toString();
    }
  }
  if (categoryAxisConfig.valueFormat !== NONE) {
    const timeFormatter = categoryAxisConfig.dateUTC ? utcFormat : timeFormat;
    if (categoryAxisConfig.valueFormat === AUTO) {
      if (categoryAxisConfig.tickLabelFormat !== NONE) {
        if (categoryAxisConfig.tickLabelFormat === AUTO) {
          if (categoryAxisConfig.type === TYPE_DATE) {
            const formatter = timeFormatter(autoCategoryFormatDate);
            categoryFormat = category => formatter(category as Date);
          }
          else if (categoryAxisConfig.type === TYPE_NUMBER) {
            const formatter = format(autoCategoryFormatNumber);
            categoryFormat = category => formatter(category as number);
          }
        }
        else {
          if (categoryAxisConfig.type === TYPE_DATE) {
            const formatter = timeFormatter(categoryAxisConfig.tickLabelFormat);
            categoryFormat = category => formatter(category as Date);
          }
          else if (categoryAxisConfig.type === TYPE_NUMBER) {
            const formatter = format(categoryAxisConfig.tickLabelFormat);
            categoryFormat = category => formatter(category as number);
          }
        }
      }
    }
    else {
      if (categoryAxisConfig.type === TYPE_DATE) {
        const formatter = timeFormatter(categoryAxisConfig.valueFormat);
        categoryFormat = category => formatter(category as Date);
      }
      else if (categoryAxisConfig.type === TYPE_NUMBER) {
        const formatter = format(categoryAxisConfig.valueFormat);
        categoryFormat = category => formatter(category as number);
      }
    }
  }
  categoryFormat = applyPrefixAndSuffix(categoryAxisConfig, categoryFormat);
  return categoryFormat;
}

export function getSeriesFormats(seriesConfigs: EnhancedSeriesConfig[], valueAxisConfigs: EnhancedValueAxisConfig[], valueAxisDomains: AxisDomains): Record<string, ValueFormatter> {
  const valueAxisScales = arrayToMap(valueAxisConfigs, idAccessor, valueAxisConfig => scaleLinear().domain(valueAxisDomains[valueAxisConfig.id]));
  return arrayToMap(seriesConfigs, idAccessor, seriesConfig =>
    getSeriesFormat(seriesConfig, seriesConfig.valueAxisConfig, valueAxisScales[seriesConfig.valueAxisConfig.id]));
}

/** The numeric formatting a series applies to its values, before any prefix/suffix. */
function getSeriesValueFormatter(seriesConfig: EnhancedSeriesConfig, valueAxisConfig: EnhancedValueAxisConfig, valueAxisScale: AxisScale): ValueFormatter {
  if (seriesConfig.valueFormat === NONE) {
    return value => value;
  }
  if (seriesConfig.valueFormat === AUTO) {
    if (valueAxisConfig.tickLabelFormat === NONE) {
      return value => value;
    }
    const formatSpecifier = valueAxisConfig.tickLabelFormat === AUTO ? autoValueFormatNumber : valueAxisConfig.tickLabelFormat;
    return valueAxisScale.tickFormat(10, formatSpecifier);
  }
  const formatter = format(seriesConfig.valueFormat);
  return value => formatter(value as number);
}

export function getSeriesFormat(seriesConfig: EnhancedSeriesConfig, valueAxisConfig: EnhancedValueAxisConfig, valueAxisScale: AxisScale): ValueFormatter {
  // valuePrefix/valueSuffix decorate the series value, which is what the tooltip shows
  return applyPrefixAndSuffix(seriesConfig, getSeriesValueFormatter(seriesConfig, valueAxisConfig, valueAxisScale));
}

export function getSeriesLabelFormat(seriesConfig: EnhancedSeriesConfig, valueAxisConfig: EnhancedValueAxisConfig, valueAxisScale: AxisScale): ValueFormatter {
  if (seriesConfig.labelFormat === NONE) {
    return value => value;
  }
  // auto reuses the numeric formatting alone: labels render labelProperty, which can be
  // a different quantity than the series value valuePrefix/valueSuffix describe
  if (seriesConfig.labelFormat === AUTO) {
    return getSeriesValueFormatter(seriesConfig, valueAxisConfig, valueAxisScale);
  }
  const formatter = format(seriesConfig.labelFormat);
  return value => formatter(value as number);
}

function applyPrefixAndSuffix<T>(formatConfig: Pick<CategoryAxisConfig | EnhancedSeriesConfig, 'valuePrefix' | 'valueSuffix'>, oldFormat: (value: T) => CategoryValue): (value: T) => CategoryValue {
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
