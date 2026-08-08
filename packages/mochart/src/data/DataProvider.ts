import type { DataProvider, DataRow } from '../types/data';
import { getCategoryValueKey } from './CategoryValue';

/**
 * Snapshots the category values and the row set at construction and on
 * `refresh()`; the chart handle's `refresh` re-indexes, so rows added to or
 * removed from the source array in place are seen after a refresh. Series
 * values are read off the indexed rows live.
 */
export class ArrayOfObjectsDataProvider<
  TRow extends DataRow = DataRow,
  TCategoryProperty extends keyof TRow & string = keyof TRow & string
> implements DataProvider<TRow[TCategoryProperty]> {
  private categoryValues!: TRow[TCategoryProperty][];
  private rowsByCategoryValue!: Record<string, TRow>;
  private error: string | undefined;

  constructor(private readonly data: readonly TRow[], private readonly categoryProperty: TCategoryProperty) {
    this.refresh();
  }

  /** Rebuild the category snapshot and row index from the current source array. */
  refresh(): void {
    this.categoryValues = this.data.map(row => row[this.categoryProperty]);
    this.rowsByCategoryValue = Object.create(null); // null proto: keyed by user data category values
    for (const row of this.data) {
      this.rowsByCategoryValue[getCategoryValueKey(row[this.categoryProperty])] = row;
    }
    // all-undefined is the wrong-property signature: the index above would silently collapse every row onto one key
    this.error = this.data.length > 0 && this.categoryValues.every(value => value === undefined)
      ? 'no category values found for property: ' + this.categoryProperty
      : undefined;
  }

  getError(): string | undefined {
    return this.error;
  }

  getCategoryValues(): readonly TRow[TCategoryProperty][] {
    return this.categoryValues;
  }

  getCategoryProperty(): TCategoryProperty {
    return this.categoryProperty;
  }

  getSeriesValue(categoryValue: TRow[TCategoryProperty], _categoryIndex: number, seriesProperty: string): unknown {
    return this.rowsByCategoryValue[getCategoryValueKey(categoryValue)]?.[seriesProperty];
  }
}

type ColumnData = Record<string, readonly unknown[]>;

/**
 * Holds the supplied column object and reads series columns live: in-place
 * column mutations (including rows pushed onto every column) are visible on
 * the next read. Only the category column's array identity is captured —
 * `refresh()` re-captures it, so even a reassigned `data[categoryProperty]`
 * array is seen after the chart handle's `refresh`.
 */
export class ObjectOfArraysDataProvider<
  TData extends ColumnData = ColumnData,
  TCategoryProperty extends keyof TData & string = keyof TData & string
> implements DataProvider<TData[TCategoryProperty][number]> {
  private categoryValues!: TData[TCategoryProperty];
  private error: string | undefined;

  constructor(private readonly data: TData, private readonly categoryProperty: TCategoryProperty) {
    this.refresh();
  }

  /** Re-capture the category column from the current source object. */
  refresh(): void {
    const categoryValues = this.data[this.categoryProperty];
    this.categoryValues = categoryValues;
    if (!Array.isArray(categoryValues)) {
      this.error = 'no category column found for property: ' + this.categoryProperty;
    }
    else if (categoryValues.length > 0 && categoryValues.every(value => value === undefined)) {
      this.error = 'no category values found for property: ' + this.categoryProperty;
    }
    else {
      this.error = undefined;
    }
  }

  getError(): string | undefined {
    return this.error;
  }

  getCategoryValues(): TData[TCategoryProperty] {
    return this.categoryValues;
  }

  getCategoryProperty(): TCategoryProperty {
    return this.categoryProperty;
  }

  getSeriesValue(_categoryValue: TData[TCategoryProperty][number], categoryIndex: number, seriesProperty: string): unknown {
    // a property absent from the data reads as missing, like the row provider
    return this.data[seriesProperty]?.[categoryIndex];
  }
}
