import { describe, it, expect } from 'vitest';
import { ArrayOfObjectsDataProvider, ObjectOfArraysDataProvider } from '../../src/data/DataProvider';
import { readAlignedColumn, readCategoryColumn, readNumericColumn } from '../../src/data/ColumnData';
import type { DataProvider } from '../../src/types/data';

describe('ArrayOfObjectsDataProvider', () => {
  const rows = [
    { month: 'Jan', sales: 10, costs: 4 },
    { month: 'Feb', sales: 20, costs: 8 },
    { month: 'Mar', sales: 30, costs: 12 }
  ];

  it('returns any property as a column in row order', () => {
    const provider = new ArrayOfObjectsDataProvider(rows);
    expect(provider.getPropertyValues('month')).toEqual(['Jan', 'Feb', 'Mar']);
    expect(provider.getPropertyValues('sales')).toEqual([10, 20, 30]);
    expect(provider.getPropertyValues('costs')).toEqual([4, 8, 12]);
  });

  it('returns undefined for a property absent from every row', () => {
    const provider = new ArrayOfObjectsDataProvider(rows);
    expect(provider.getPropertyValues('vlaue')).toBeUndefined();
  });

  // partial gaps are legitimate holey data, not an absent column
  it('returns a column with holes for a property present on only some rows', () => {
    const partial: Array<Record<string, unknown>> = [{ month: 'Jan', sales: 1 }, { month: 'Feb' }];
    expect(new ArrayOfObjectsDataProvider(partial).getPropertyValues('sales')).toEqual([1, undefined]);
  });

  it('returns an empty column for any property of an empty dataset', () => {
    const provider = new ArrayOfObjectsDataProvider([] as Array<Record<string, unknown>>);
    expect(provider.getPropertyValues('anything')).toEqual([]);
  });

  it('returns non-numeric cells unchanged', () => {
    const instant = new Date('2020-01-01T00:00:00.000Z');
    const dateRows = [{ id: 1, at: instant, note: null }];
    const provider = new ArrayOfObjectsDataProvider(dateRows);
    expect(provider.getPropertyValues('at')![0]).toBe(instant);
    expect(provider.getPropertyValues('note')).toEqual([null]);
  });

  it('is stateless: in-place row mutations are seen on the next read', () => {
    const mutable = [
      { month: 'Jan', sales: 10 },
      { month: 'Feb', sales: 20 }
    ];
    const provider = new ArrayOfObjectsDataProvider(mutable);
    expect(provider.getPropertyValues('month')).toEqual(['Jan', 'Feb']);

    mutable.push({ month: 'Mar', sales: 30 });
    mutable[0] = { month: 'Jan', sales: 11 };
    expect(provider.getPropertyValues('month')).toEqual(['Jan', 'Feb', 'Mar']);
    expect(provider.getPropertyValues('sales')).toEqual([11, 20, 30]);

    mutable.pop();
    expect(provider.getPropertyValues('sales')).toEqual([11, 20]);
  });

  it('keeps duplicate category values distinct', () => {
    const dupes = [
      { month: 'Jan', sales: 10 },
      { month: 'Jan', sales: 99 }
    ];
    const provider = new ArrayOfObjectsDataProvider(dupes);
    expect(provider.getPropertyValues('month')).toEqual(['Jan', 'Jan']);
    expect(provider.getPropertyValues('sales')).toEqual([10, 99]);
  });
});

describe('ObjectOfArraysDataProvider', () => {
  const data = {
    month: ['Jan', 'Feb', 'Mar'],
    sales: [10, 20, 30],
    costs: [4, 8, 12]
  };

  it('returns the stored column itself, zero-copy', () => {
    const provider = new ObjectOfArraysDataProvider(data);
    expect(provider.getPropertyValues('month')).toBe(data.month);
    expect(provider.getPropertyValues('sales')).toBe(data.sales);
  });

  it('returns undefined for an absent column', () => {
    const provider = new ObjectOfArraysDataProvider(data);
    expect(provider.getPropertyValues('vlaue')).toBeUndefined();
  });

  it('returns undefined for a non-array value', () => {
    const bad: Record<string, readonly unknown[]> = { month: 'Jan' as unknown as readonly unknown[] };
    expect(new ObjectOfArraysDataProvider(bad).getPropertyValues('month')).toBeUndefined();
  });

  it('is stateless: mutated and reassigned columns are seen on the next read', () => {
    const mutable: Record<string, readonly unknown[]> = { month: ['Jan', 'Feb'], sales: [10, 20] };
    const provider = new ObjectOfArraysDataProvider(mutable);

    mutable.month = ['Jan', 'Feb', 'Mar'];
    (mutable.sales as unknown[]).push(30);
    expect(provider.getPropertyValues('month')).toEqual(['Jan', 'Feb', 'Mar']);
    expect(provider.getPropertyValues('sales')).toEqual([10, 20, 30]);
  });
});

// The chart-side readers: alignment carries the index, and null normalizes to
// undefined at this boundary so the chart keeps a single missing sentinel.
describe('column readers', () => {
  const provider: DataProvider = new ObjectOfArraysDataProvider({
    month: ['Jan', 'Feb', 'Mar'],
    sales: [10, null, 30],
    short: [1]
  } as Record<string, readonly unknown[]>);

  it('readCategoryColumn reads an absent column as no categories', () => {
    expect(readCategoryColumn(provider, 'month')).toEqual(['Jan', 'Feb', 'Mar']);
    expect(readCategoryColumn(provider, 'missing')).toEqual([]);
  });

  it('readNumericColumn normalizes null cells to undefined', () => {
    expect(readNumericColumn(provider, 'sales', 3)).toEqual([10, undefined, 30]);
  });

  it('readNumericColumn reads an absent column as all-missing', () => {
    expect(readNumericColumn(provider, 'missing', 3)).toEqual([undefined, undefined, undefined]);
  });

  it('readAlignedColumn snapshots exactly categoryCount cells', () => {
    // a short column pads with missing; extra cells are never read (getDataErrors flags the mismatch)
    expect(readAlignedColumn(provider, 'short', 3)).toEqual([1, undefined, undefined]);
    expect(readAlignedColumn(provider, 'month', 2)).toEqual(['Jan', 'Feb']);
  });
});
