import validators from '@mochart/movalid';
import { isDataProviderValid, getMissingDataProviderMembers } from './ChartData';
import { getCategoryValueKey } from './CategoryValue';
import { NONE, TYPE_DATE, TYPE_NUMBER, SCALE_LINEAR, RENDERER_LINE, RENDERER_AREA } from '../config/core/constants';
import type { CategoryAxisConfig, MochartConfig } from '../types/config';
import type { DataProvider, CategoryValue, DataValue } from '../types/data';

function getDuplicates(categoryAxisConfig: CategoryAxisConfig, values: readonly CategoryValue[]): CategoryValue[] {
  const valueMap: Record<string, number> = Object.create(null); // null proto: keyed by user data category values
  for (const value of values) {
    const key = getCategoryValueKey(categoryAxisConfig, value);
    valueMap[key] = (valueMap[key] ?? 0) + 1;
  }
  const duplicates: CategoryValue[] = [];
  for (const value of values) {
    const key = getCategoryValueKey(categoryAxisConfig, value);
    if (valueMap[key] > 1) {
      duplicates.push(value);
      valueMap[key] = 1; // only push duplicates once
    }
  }
  return duplicates;
}

/** Values breaking the sequence's overall direction (equal neighbours are the duplicate check's job). */
function getOutOfOrderValues(isDate: boolean, categoryValues: readonly CategoryValue[]): CategoryValue[] {
  const numeric = categoryValues.map(value => isDate
    ? (value instanceof Date ? value.getTime() : new Date(value as string | number).getTime())
    : value as number);
  let direction = Math.sign(numeric[numeric.length - 1] - numeric[0]);
  if (direction === 0) {
    direction = 1;
  }
  const outOfOrder: CategoryValue[] = [];
  for (let i = 1; i < numeric.length; i++) {
    const step = Math.sign(numeric[i] - numeric[i - 1]);
    if (step !== 0 && step !== direction) {
      outOfOrder.push(categoryValues[i]);
    }
  }
  return outOfOrder;
}

/** An absent property, misaligned values, and wrong-length category values each get their own error. */
function checkPropertyValues(dataErrors: string[], values: readonly DataValue[] | undefined, categoryCount: number, property: string): values is readonly DataValue[] {
  if (values === undefined) {
    dataErrors.push('no values found for property: ' + property);
    return false;
  }
  if (values.length !== categoryCount) {
    dataErrors.push('property ' + property + ' has ' + values.length + ' values but there are ' + categoryCount + ' categories');
    return false;
  }
  return true;
}

/** Series values must be numeric; null, undefined and NaN all read as missing. categoryAxis.displayProperty is checked against the axis type instead. */
function checkSeriesProperty(dataErrors: string[], dataProvider: DataProvider, categoryCount: number, property: string, allowAbsentDataProperties: boolean): void {
  const values = dataProvider.getPropertyValues(property);
  if (values === undefined && allowAbsentDataProperties) {
    return; // the series reads as all-missing values
  }
  if (checkPropertyValues(dataErrors, values, categoryCount, property)) {
    const numberValidator = validators.number().orOneOf([undefined, null, NaN]);
    if (values.some(value => !numberValidator(value))) {
      dataErrors.push('series values must be numeric or missing for property: ' + property);
    }
  }
}

export function getDataErrors(mochartConfig: MochartConfig, dataProvider: DataProvider | null | undefined): string[] {
  const dataErrors: string[] = [];
  if (!mochartConfig.validation.valid || dataProvider == null) {
    return dataErrors;
  }
  const missingMembers = getMissingDataProviderMembers(dataProvider);
  if (missingMembers.length > 0) {
    // reported here rather than left to throw later inside getChartData
    dataErrors.push('data provider must implement: ' + missingMembers.join(', '));
    return dataErrors;
  }
  if (isDataProviderValid(dataProvider)) {
    const { categoryAxis: categoryAxisConfig, series: seriesConfigs } = mochartConfig;

    const categoryPropertyValues = dataProvider.getPropertyValues(categoryAxisConfig.property!);
    if (categoryPropertyValues === undefined) {
      // the category property values define the category count, so nothing else is checkable without them
      dataErrors.push('no category values found for property: ' + categoryAxisConfig.property);
      return dataErrors;
    }
    const categoryCount = categoryPropertyValues.length;
    const categoryValues = categoryPropertyValues as readonly CategoryValue[];

    const numberValidator = validators.number();
    const stringValidator = validators.string();
    // the values the axis type check applies to: the display values when a displayProperty is configured
    let typedCategoryValues: readonly DataValue[] | null = categoryPropertyValues;
    if (categoryAxisConfig.displayProperty !== NONE) {
      if (categoryPropertyValues.some(g => !(stringValidator(g) || numberValidator(g)))) {
        dataErrors.push('raw category values must be number or string when display property is set');
      }
      const displayValues = dataProvider.getPropertyValues(categoryAxisConfig.displayProperty);
      typedCategoryValues = checkPropertyValues(dataErrors, displayValues, categoryCount, categoryAxisConfig.displayProperty) ? displayValues : null;
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
    if (typedCategoryValues !== null && typedCategoryValues.some(value => !validator(value))) {
      dataErrors.push(categoryAxisConfig.displayProperty !== NONE
        ? 'display category values must all match the specified type for property: ' + categoryAxisConfig.displayProperty
        : 'category values must all match the specified type');
    }
    if (dataErrors.length === 0) { // duplicate matching needs all the values to be primitives...
      const duplicates = getDuplicates(categoryAxisConfig, categoryValues);
      if (duplicates.length > 0) {
        dataErrors.push('category values must be unique, duplicates: ' + duplicates.join(', '));
      }
    }
    // Only line/area paths zigzag on out-of-order data, so bar/none charts are not flagged.
    // Nor are displayProperty configs: display values may legitimately fold back (DST repeated hour).
    if (dataErrors.length === 0 && categoryAxisConfig.scale === SCALE_LINEAR
      && categoryAxisConfig.displayProperty === NONE
      && seriesConfigs.some(({ renderer }) => renderer === RENDERER_LINE || renderer === RENDERER_AREA)) {
      const outOfOrder = getOutOfOrderValues(categoryAxisConfig.type === TYPE_DATE, categoryValues);
      if (outOfOrder.length > 0) {
        dataErrors.push('category values must be in order on a linear category scale, out-of-order values: ' + outOfOrder.join(', '));
      }
    }
    for (const seriesConfig of seriesConfigs) {
      const { allowAbsentDataProperties } = seriesConfig;
      checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.property!, allowAbsentDataProperties);
      if (seriesConfig.rangeProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.rangeProperty, allowAbsentDataProperties);
      }
      if (seriesConfig.errorLowProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.errorLowProperty, allowAbsentDataProperties);
      }
      if (seriesConfig.errorHighProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.errorHighProperty, allowAbsentDataProperties);
      }
      if (seriesConfig.markerProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.markerProperty, allowAbsentDataProperties);
      }
      if (seriesConfig.colorProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.colorProperty, allowAbsentDataProperties);
      }
      if (seriesConfig.labelProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.labelProperty, allowAbsentDataProperties);
      }
      if (seriesConfig.tooltipProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.tooltipProperty, allowAbsentDataProperties);
      }
    }
  }

  return dataErrors;
}
