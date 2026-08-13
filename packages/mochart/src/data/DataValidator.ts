import validators from '@mochart/movalid';
import { isDataProviderValid, getMissingDataProviderMembers } from './ChartData';
import { getCategoryValueKey } from './CategoryValue';
import { NONE, TYPE_DATE, TYPE_NUMBER, SCALE_LINEAR, RENDERER_LINE, RENDERER_AREA } from '../config/core/constants';
import type { MochartConfig } from '../types/config';
import type { DataProvider, CategoryValue, DataValue } from '../types/data';

function getDuplicates(values: readonly CategoryValue[]): CategoryValue[] {
  const valueMap: Record<string, number> = Object.create(null); // null proto: keyed by user data category values
  for (const value of values) {
    const key = getCategoryValueKey(value);
    valueMap[key] = (valueMap[key] ?? 0) + 1;
  }
  const duplicates: CategoryValue[] = [];
  for (const value of values) {
    const key = getCategoryValueKey(value);
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

/** A missing column, a misaligned column, and a wrong-length category column each get their own error. */
function checkColumn(dataErrors: string[], column: readonly DataValue[] | undefined, categoryCount: number, property: string): column is readonly DataValue[] {
  if (column === undefined) {
    dataErrors.push('no values found for property: ' + property);
    return false;
  }
  if (column.length !== categoryCount) {
    dataErrors.push('property ' + property + ' has ' + column.length + ' values but there are ' + categoryCount + ' categories');
    return false;
  }
  return true;
}

/** Series columns must be numeric; null and undefined both read as missing. categoryAxis.displayProperty is checked against the axis type instead. */
function checkSeriesProperty(dataErrors: string[], dataProvider: DataProvider, categoryCount: number, property: string): void {
  const column = dataProvider.getPropertyValues(property);
  if (checkColumn(dataErrors, column, categoryCount, property)) {
    const numberValidator = validators.number().orEqual(undefined).orEqual(null);
    if (column.some(value => !numberValidator(value))) {
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

    const categoryColumn = dataProvider.getPropertyValues(categoryAxisConfig.property!);
    if (categoryColumn === undefined) {
      // the category column defines the category count, so nothing else is checkable without it
      dataErrors.push('no category values found for property: ' + categoryAxisConfig.property);
      return dataErrors;
    }
    const categoryCount = categoryColumn.length;
    const categoryValues = categoryColumn as readonly CategoryValue[];

    const numberValidator = validators.number();
    const stringValidator = validators.string();
    // the values the axis type check applies to: the display column when one is configured
    let typedCategoryValues: readonly DataValue[] | null = categoryColumn;
    if (categoryAxisConfig.displayProperty !== NONE) {
      if (categoryColumn.some(g => !(stringValidator(g) || numberValidator(g)))) {
        dataErrors.push('raw category values must be number or string when display property is set');
      }
      const displayColumn = dataProvider.getPropertyValues(categoryAxisConfig.displayProperty);
      typedCategoryValues = checkColumn(dataErrors, displayColumn, categoryCount, categoryAxisConfig.displayProperty) ? displayColumn : null;
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
      const duplicates = getDuplicates(categoryValues);
      if (duplicates.length > 0) {
        dataErrors.push('category values must be unique, duplicates: ' + duplicates.join(', '));
      }
    }
    // Only line/area paths zigzag on out-of-order data; bar/none charts render
    // position-correct regardless, so they are deliberately not flagged. Nor are
    // displayProperty configs: display values position the chart there, and may
    // legitimately fold back (the DST repeated-hour idiom).
    if (dataErrors.length === 0 && categoryAxisConfig.scale === SCALE_LINEAR
      && categoryAxisConfig.displayProperty === NONE
      && seriesConfigs.some(({ renderer }) => renderer === RENDERER_LINE || renderer === RENDERER_AREA)) {
      const outOfOrder = getOutOfOrderValues(categoryAxisConfig.type === TYPE_DATE, categoryValues);
      if (outOfOrder.length > 0) {
        dataErrors.push('category values must be in order on a linear category scale, out-of-order values: ' + outOfOrder.join(', '));
      }
    }
    for (const seriesConfig of seriesConfigs) {
      checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.property!);
      if (seriesConfig.rangeProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.rangeProperty);
      }
      if (seriesConfig.errorLowProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.errorLowProperty);
      }
      if (seriesConfig.errorHighProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.errorHighProperty);
      }
      if (seriesConfig.markerProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.markerProperty);
      }
      if (seriesConfig.colorProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.colorProperty);
      }
      if (seriesConfig.labelProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.labelProperty);
      }
      if (seriesConfig.tooltipProperty !== NONE) {
        checkSeriesProperty(dataErrors, dataProvider, categoryCount, seriesConfig.tooltipProperty);
      }
    }
  }

  return dataErrors;
}
