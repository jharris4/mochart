import validators from '@mochart/movalid';
import { isDataProviderValid } from './ChartData';
import { NONE, TYPE_DATE, TYPE_NUMBER } from '../config/core/constants';
import type { MochartConfig } from '../types/config';
import type { DataProvider, CategoryValue } from '../types/data';

function getDuplicates(values: readonly CategoryValue[]): CategoryValue[] {
  const valueMap: Record<string, number> = Object.create(null); // null proto: keyed by user data category values
  for (const value of values) {
    const key = String(value);
    valueMap[key] = (valueMap[key] ?? 0) + 1;
  }
  const duplicates: CategoryValue[] = [];
  for (const value of values) {
    const key = String(value);
    if (valueMap[key] > 1) {
      duplicates.push(value);
      valueMap[key] = 1; // only push duplicates once
    }
  }
  return duplicates;
}

function checkProperty(dataErrors: string[], dataProvider: DataProvider, categoryValues: readonly CategoryValue[], property: string): void {
  const numberValidator = validators.number().orEqual(undefined);
  if (categoryValues.some((g, i) => !numberValidator(dataProvider.getSeriesValue(g, i, property)))) {
    dataErrors.push('series values must be numeric or undefined for property: ' + property);
  }
}

export function getDataErrors(mochartConfig: MochartConfig, dataProvider: DataProvider | null | undefined): string[] {
  const dataErrors: string[] = [];
  if (mochartConfig.validation.valid && dataProvider != null && isDataProviderValid(dataProvider)) {
    const { categoryAxis: categoryAxisConfig, series: seriesConfigs } = mochartConfig;

    const categoryValues = dataProvider.getCategoryValues();
    const numberValidator = validators.number();
    const stringValidator = validators.string();
    let getCategoryValue: (index: number) => unknown;
    if (categoryAxisConfig.displayProperty !== NONE) {
      if (categoryValues.some(g => !(stringValidator(g) || numberValidator(g)))) {
        dataErrors.push('raw category values must be number or string when display property is set');
      }
      const displayProperty = categoryAxisConfig.displayProperty;
      getCategoryValue = i => dataProvider.getSeriesValue(categoryValues[i], i, displayProperty);
    }
    else {
      getCategoryValue = i => categoryValues[i];
    }
    let validator;
    if (categoryAxisConfig.type === TYPE_DATE) {
      validator = validators.dateAny();
    }
    else if (categoryAxisConfig.type === TYPE_NUMBER) {
      validator = validators.number();
    }
    else {
      validator = validators.string();
    }
    if(categoryValues.some((_g, i) => !validator(getCategoryValue(i)))) {
      dataErrors.push((categoryAxisConfig.displayProperty !== NONE ? 'display ' : '') + 'category values must all match the specified type');
    }
    if (dataErrors.length === 0) { // duplicate matching needs all the values to be primitives...
      const duplicates = getDuplicates(categoryValues);
      if (duplicates.length > 0) {
        dataErrors.push('category values must be unique, duplicates: ' + duplicates.join(', '));
      }
    }
    for (const seriesConfig of seriesConfigs) {
      checkProperty(dataErrors, dataProvider, categoryValues, seriesConfig.property!);
      if (seriesConfig.rangeProperty !== NONE) {
        checkProperty(dataErrors, dataProvider, categoryValues, seriesConfig.rangeProperty);
      }
      if (seriesConfig.errorLowProperty !== NONE) {
        checkProperty(dataErrors, dataProvider, categoryValues, seriesConfig.errorLowProperty);
      }
      if (seriesConfig.errorHighProperty !== NONE) {
        checkProperty(dataErrors, dataProvider, categoryValues, seriesConfig.errorHighProperty);
      }
      if (seriesConfig.markerProperty !== NONE) {
        checkProperty(dataErrors, dataProvider, categoryValues, seriesConfig.markerProperty);
      }
      if (seriesConfig.colorProperty !== NONE) {
        checkProperty(dataErrors, dataProvider, categoryValues, seriesConfig.colorProperty);
      }
      if (seriesConfig.labelProperty !== NONE) {
        checkProperty(dataErrors, dataProvider, categoryValues, seriesConfig.labelProperty);
      }
      if (seriesConfig.tooltipProperty !== NONE) {
        checkProperty(dataErrors, dataProvider, categoryValues, seriesConfig.tooltipProperty);
      }
    }
  }

  return dataErrors;
}
