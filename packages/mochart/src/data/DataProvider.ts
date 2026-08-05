import type { DataProvider, DataRow } from '../types/data';

/**
 * Snapshots the category values and the row set at construction: rows added
 * to or removed from the source array afterwards are not seen — build a new
 * provider (or use the chart handle's `refresh`) after such a mutation.
 * Series values are read off the captured rows live.
 */
export class ArrayOfObjectsDataProvider<
  TRow extends DataRow = DataRow,
  TCategoryProperty extends keyof TRow & string = keyof TRow & string
> implements DataProvider<TRow[TCategoryProperty]> {
  private readonly categoryValues: TRow[TCategoryProperty][];
  private readonly rowsByCategoryValue: Record<string, TRow>;

  constructor(data: readonly TRow[], categoryProperty: TCategoryProperty) {
    this.categoryValues = data.map(row => row[categoryProperty]);
    this.rowsByCategoryValue = Object.create(null); // null proto: keyed by user data category values
    for (const row of data) {
      this.rowsByCategoryValue[String(row[categoryProperty])] = row;
    }
  }

  getCategoryValues(): readonly TRow[TCategoryProperty][] {
    return this.categoryValues;
  }

  getSeriesValue(categoryValue: TRow[TCategoryProperty], _categoryIndex: number, seriesProperty: string): unknown {
    return this.rowsByCategoryValue[String(categoryValue)]?.[seriesProperty];
  }
}

type ColumnData = Record<string, readonly unknown[]>;

export class ObjectOfArraysDataProvider<
  TData extends ColumnData = ColumnData,
  TCategoryProperty extends keyof TData & string = keyof TData & string
> implements DataProvider<TData[TCategoryProperty][number]> {
  private readonly categoryValues: TData[TCategoryProperty];

  constructor(private readonly data: TData, categoryProperty: TCategoryProperty) {
    this.categoryValues = data[categoryProperty];
  }

  getCategoryValues(): TData[TCategoryProperty] {
    return this.categoryValues;
  }

  getSeriesValue(_categoryValue: TData[TCategoryProperty][number], categoryIndex: number, seriesProperty: string): unknown {
    // a property absent from the data reads as missing, like the row provider
    return this.data[seriesProperty]?.[categoryIndex];
  }
}
