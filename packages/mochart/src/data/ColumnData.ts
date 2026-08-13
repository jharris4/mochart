import type { CategoryValue, DataProvider, DataValue, NumericValues } from '../types/data';

const emptyColumn: readonly CategoryValue[] = [];

/** The config's category column, which defines the category count; an absent column reads as no categories (getDataErrors diagnoses it). */
export function readCategoryColumn(dataProvider: DataProvider, categoryProperty: string): readonly CategoryValue[] {
  // the cast trusts the values getDataErrors checks against the axis type
  return (dataProvider.getPropertyValues(categoryProperty) ?? emptyColumn) as readonly CategoryValue[];
}

/** One column snapshot of exactly categoryCount cells; null reads as undefined so the chart keeps a single missing sentinel. */
export function readAlignedColumn(dataProvider: DataProvider, property: string, categoryCount: number): Exclude<DataValue, null>[] {
  const column = dataProvider.getPropertyValues(property);
  const values: Exclude<DataValue, null>[] = [];
  for (let categoryIndex = 0; categoryIndex < categoryCount; categoryIndex++) {
    const value = column?.[categoryIndex];
    values.push(value === null ? undefined : value);
  }
  return values;
}

/** The numeric read for series columns: the cast trusts the values getDataErrors checks with its numeric validator. */
export function readNumericColumn(dataProvider: DataProvider, property: string, categoryCount: number): NumericValues {
  return readAlignedColumn(dataProvider, property, categoryCount) as NumericValues;
}
