import validators from '@mochart/movalid';
import { isDataProviderValid, getMissingDataProviderMembers } from './ChartData';
import { getCategoryValueKey } from './CategoryValue';
import { NONE, TYPE_DATE, TYPE_NUMBER, SCALE_LINEAR, RENDERER_LINE, RENDERER_AREA } from '../config/core/constants';
import type { MochartConfig } from '../types/config';
import type { DataProvider, CategoryValue } from '../types/data';

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

/** Series properties are the numeric half of getSeriesValue's contract; categoryAxis.displayProperty is checked against the axis type instead. */
function checkProperty(dataErrors: string[], dataProvider: DataProvider, categoryValues: readonly CategoryValue[], property: string): void {
  const numberValidator = validators.number().orEqual(undefined);
  if (categoryValues.some((g, i) => !numberValidator(dataProvider.getSeriesValue(g, i, property)))) {
    dataErrors.push('series values must be numeric or undefined for property: ' + property);
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

    if (dataProvider.getCategoryProperty !== undefined) {
      const providerCategoryProperty = dataProvider.getCategoryProperty();
      if (providerCategoryProperty !== categoryAxisConfig.property) {
        dataErrors.push('categoryAxis.property (' + categoryAxisConfig.property + ') does not match the data provider category property (' + providerCategoryProperty + ')');
      }
    }

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
      // the display case names its property: getSeriesValue serves it too, and its values are typed like category values, not like series values
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
