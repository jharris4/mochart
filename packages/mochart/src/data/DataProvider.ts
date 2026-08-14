import type { DataProvider, DataRow, DataValue } from '../types/data';

/**
 * Stateless per-property reads over an array of row objects. Rows added,
 * removed, or edited in place are seen whenever the chart re-reads; the chart
 * handle's `refresh` triggers that re-read.
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

type PropertyArrays = Record<string, readonly unknown[]>;

/**
 * Stateless zero-copy reads over an object holding one array per property.
 * In-place mutations and reassigned arrays alike are seen whenever the chart
 * re-reads; the chart handle's `refresh` triggers that re-read.
 */
export class ObjectOfArraysDataProvider<TData extends PropertyArrays = PropertyArrays> implements DataProvider {
  constructor(private readonly data: TData) {
  }

  getPropertyValues(property: string): readonly DataValue[] | undefined {
    const values = this.data[property];
    return Array.isArray(values) ? values as readonly DataValue[] : undefined;
  }
}
