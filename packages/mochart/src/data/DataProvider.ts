import type { DataProvider, DataRow } from '../types/data';

export class ArrayOfObjectsDataProvider<
  TRow extends DataRow = DataRow,
  TGroupProperty extends keyof TRow & string = keyof TRow & string
> implements DataProvider<TRow[TGroupProperty]> {
  private readonly groupValues: TRow[TGroupProperty][];
  private readonly rowsByGroupValue: Record<string, TRow>;

  constructor(data: readonly TRow[], groupProperty: TGroupProperty) {
    this.groupValues = data.map(row => row[groupProperty]);
    this.rowsByGroupValue = {};
    for (const row of data) {
      this.rowsByGroupValue[String(row[groupProperty])] = row;
    }
  }

  getGroupValues(): readonly TRow[TGroupProperty][] {
    return this.groupValues;
  }

  getSeriesValue(groupValue: TRow[TGroupProperty], _groupIndex: number, seriesProperty: string): unknown {
    return this.rowsByGroupValue[String(groupValue)][seriesProperty];
  }
}

type ColumnData = Record<string, readonly unknown[]>;

export class ObjectOfArraysDataProvider<
  TData extends ColumnData = ColumnData,
  TGroupProperty extends keyof TData & string = keyof TData & string
> implements DataProvider<TData[TGroupProperty][number]> {
  private readonly groupValues: TData[TGroupProperty];

  constructor(private readonly data: TData, groupProperty: TGroupProperty) {
    this.groupValues = data[groupProperty];
  }

  getGroupValues(): TData[TGroupProperty] {
    return this.groupValues;
  }

  getSeriesValue(_groupValue: TData[TGroupProperty][number], groupIndex: number, seriesProperty: string): unknown {
    return this.data[seriesProperty][groupIndex];
  }
}
