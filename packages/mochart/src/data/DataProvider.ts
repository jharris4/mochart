import type { DataProvider, DataRow, DataValue } from '../types/data';

/**
 * Stateless column reads over an array of row objects. Rows added, removed,
 * or edited in place are seen whenever the chart re-reads; the chart handle's
 * `refresh` triggers that re-read.
 */
export class ArrayOfObjectsDataProvider<TRow extends DataRow = DataRow> implements DataProvider {
  constructor(private readonly data: readonly TRow[]) {
  }

  getPropertyValues(property: string): readonly DataValue[] | undefined {
    // a property in no row is absent, not N missing values
    if (this.data.length > 0 && !this.data.some(row => property in row)) {
      return undefined;
    }
    return this.data.map(row => row[property] as DataValue);
  }
}

type ColumnData = Record<string, readonly unknown[]>;

/**
 * Stateless zero-copy column reads over an object of column arrays. In-place
 * column mutations and reassigned columns alike are seen whenever the chart
 * re-reads; the chart handle's `refresh` triggers that re-read.
 */
export class ObjectOfArraysDataProvider<TData extends ColumnData = ColumnData> implements DataProvider {
  constructor(private readonly data: TData) {
  }

  getPropertyValues(property: string): readonly DataValue[] | undefined {
    const column = this.data[property];
    return Array.isArray(column) ? column as readonly DataValue[] : undefined;
  }
}
