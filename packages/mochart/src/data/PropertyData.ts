import type { CategoryValue, DataProvider, DataValue, NumericValues } from '../types/data';

const emptyValues: readonly CategoryValue[] = [];

/** The config's category property values, which define the category count; an absent property reads as no categories (getDataErrors diagnoses it). */
export function readCategoryValues(dataProvider: DataProvider, categoryProperty: string): readonly CategoryValue[] {
  // the cast trusts the values getDataErrors checks against the axis type
  return (dataProvider.getPropertyValues(categoryProperty) ?? emptyValues) as readonly CategoryValue[];
}

/** One snapshot of exactly categoryCount of a property's values; null reads as undefined so the chart keeps a single missing sentinel. */
export function readAlignedValues(dataProvider: DataProvider, property: string, categoryCount: number): Exclude<DataValue, null>[] {
  const propertyValues = dataProvider.getPropertyValues(property);
  const values: Exclude<DataValue, null>[] = [];
  for (let categoryIndex = 0; categoryIndex < categoryCount; categoryIndex++) {
    const value = propertyValues?.[categoryIndex];
    values.push(value === null ? undefined : value);
  }
  return values;
}

/** The numeric read for series properties: the cast trusts the values getDataErrors checks with its numeric validator. */
export function readNumericValues(dataProvider: DataProvider, property: string, categoryCount: number): NumericValues {
  return readAlignedValues(dataProvider, property, categoryCount) as NumericValues;
}
