import { describe, it, expect } from 'vitest';
import { ArrayOfObjectsDataProvider, ObjectOfArraysDataProvider } from '../../src/data/DataProvider';

describe('ArrayOfObjectsDataProvider', () => {
  const rows = [
    { month: 'Jan', sales: 10, costs: 4 },
    { month: 'Feb', sales: 20, costs: 8 },
    { month: 'Mar', sales: 30, costs: 12 }
  ];

  it('returns category values in row order', () => {
    const provider = new ArrayOfObjectsDataProvider(rows, 'month');
    expect(provider.getCategoryValues()).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('looks up a series value by category value regardless of index', () => {
    const provider = new ArrayOfObjectsDataProvider(rows, 'month');
    // the index argument is ignored: lookup is keyed on the category value
    expect(provider.getSeriesValue('Feb', 0, 'sales')).toBe(20);
    expect(provider.getSeriesValue('Feb', 99, 'costs')).toBe(8);
  });

  it('coerces non-string category values to string keys', () => {
    const numericRows = [
      { year: 2020, value: 1 },
      { year: 2021, value: 2 }
    ];
    const provider = new ArrayOfObjectsDataProvider(numericRows, 'year');
    expect(provider.getCategoryValues()).toEqual([2020, 2021]);
    expect(provider.getSeriesValue(2021, 1, 'value')).toBe(2);
  });

  it('distinguishes Date category values that differ only in milliseconds', () => {
    const dateRows = [
      { instant: new Date('2020-01-01T00:00:00.000Z'), value: 1 },
      { instant: new Date('2020-01-01T00:00:00.500Z'), value: 2 }
    ];
    const provider = new ArrayOfObjectsDataProvider(dateRows, 'instant');

    // Fresh Date instances also resolve by time value rather than identity.
    expect(provider.getSeriesValue(new Date('2020-01-01T00:00:00.000Z'), 99, 'value')).toBe(1);
    expect(provider.getSeriesValue(new Date('2020-01-01T00:00:00.500Z'), 99, 'value')).toBe(2);
  });

  it('keeps the last row when category values collide', () => {
    const dupes = [
      { month: 'Jan', sales: 10 },
      { month: 'Jan', sales: 99 }
    ];
    const provider = new ArrayOfObjectsDataProvider(dupes, 'month');
    // getCategoryValues preserves every raw value...
    expect(provider.getCategoryValues()).toEqual(['Jan', 'Jan']);
    // ...but the row map is keyed by category value, so the later row wins
    expect(provider.getSeriesValue('Jan', 0, 'sales')).toBe(99);
  });

  it('re-indexes added, removed, and replaced rows on refresh', () => {
    const mutable = [
      { month: 'Jan', sales: 10 },
      { month: 'Feb', sales: 20 }
    ];
    const provider = new ArrayOfObjectsDataProvider(mutable, 'month');

    mutable.push({ month: 'Mar', sales: 30 });
    mutable[0] = { month: 'Jan', sales: 11 };
    expect(provider.getCategoryValues()).toEqual(['Jan', 'Feb']); // snapshot until refresh
    expect(provider.getSeriesValue('Jan', 0, 'sales')).toBe(10);

    provider.refresh();
    expect(provider.getCategoryValues()).toEqual(['Jan', 'Feb', 'Mar']);
    expect(provider.getSeriesValue('Jan', 0, 'sales')).toBe(11);
    expect(provider.getSeriesValue('Mar', 2, 'sales')).toBe(30);

    mutable.pop();
    provider.refresh();
    expect(provider.getCategoryValues()).toEqual(['Jan', 'Feb']);
  });
});

describe('ObjectOfArraysDataProvider', () => {
  const data = {
    month: ['Jan', 'Feb', 'Mar'],
    sales: [10, 20, 30],
    costs: [4, 8, 12]
  };

  it('returns the category column as category values', () => {
    const provider = new ObjectOfArraysDataProvider(data, 'month');
    expect(provider.getCategoryValues()).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('looks up a series value by category index', () => {
    const provider = new ObjectOfArraysDataProvider(data, 'month');
    // this provider keys on the index argument, not the category value
    expect(provider.getSeriesValue('Feb', 1, 'sales')).toBe(20);
    expect(provider.getSeriesValue('ignored', 2, 'costs')).toBe(12);
  });

  it('re-captures a reassigned category column on refresh', () => {
    const mutable: Record<string, readonly unknown[]> = { month: ['Jan', 'Feb'], sales: [10, 20] };
    const provider = new ObjectOfArraysDataProvider(mutable, 'month');

    mutable.month = ['Jan', 'Feb', 'Mar'];
    mutable.sales = [10, 20, 30];
    expect(provider.getCategoryValues()).toEqual(['Jan', 'Feb']); // captured array until refresh
    expect(provider.getSeriesValue('ignored', 2, 'sales')).toBe(30); // series columns read live

    provider.refresh();
    expect(provider.getCategoryValues()).toEqual(['Jan', 'Feb', 'Mar']);
  });
});

// Regression: a configured property absent from the data threw a TypeError
// (crashing getDataErrors, the API meant to report it) instead of reading as
// missing like the row provider.
describe('missing properties and categories', () => {
  const data = { month: ['Jan', 'Feb'], sales: [10, 20] };
  const rows = [{ month: 'Jan', sales: 10 }, { month: 'Feb', sales: 20 }];

  it('reads an unknown property as undefined in both providers', () => {
    expect(new ObjectOfArraysDataProvider(data, 'month').getSeriesValue('Jan', 0, 'vlaue')).toBeUndefined();
    expect(new ArrayOfObjectsDataProvider(rows, 'month').getSeriesValue('Jan', 0, 'vlaue')).toBeUndefined();
  });

  it('reads an unknown category value as undefined in the row provider', () => {
    expect(new ArrayOfObjectsDataProvider(rows, 'month').getSeriesValue('Apr', 0, 'sales')).toBeUndefined();
  });
});

// getSeriesValue is the contract's one property accessor: the chart reads
// categoryAxis.displayProperty through it as well as the series properties, so
// both built-ins must return non-numeric cells unchanged.
describe('display property values', () => {
  const rows = [{ id: 1, label: 'Jan', sales: 10 }, { id: 2, label: 'Feb', sales: 20 }];
  const columns = { id: [1, 2], label: ['Jan', 'Feb'], sales: [10, 20] };

  it('returns a string display value from both providers', () => {
    expect(new ArrayOfObjectsDataProvider(rows, 'id').getSeriesValue(2, 1, 'label')).toBe('Feb');
    expect(new ObjectOfArraysDataProvider(columns, 'id').getSeriesValue(2, 1, 'label')).toBe('Feb');
  });

  it('returns a Date display value unconverted', () => {
    const instant = new Date('2020-01-01T00:00:00.000Z');
    const dateRows = [{ id: 1, at: instant }];
    expect(new ArrayOfObjectsDataProvider(dateRows, 'id').getSeriesValue(1, 0, 'at')).toBe(instant);
  });
});

// Regression: a category property absent from every row collapsed the whole
// row index onto the "undefined" key — every category silently rendered the
// last row's values. Both providers now report the mistake through getError.
describe('wrong category property guard', () => {
  const rows: Array<Record<string, unknown>> = [{ month: 'Jan', sales: 10 }, { month: 'Feb', sales: 20 }];
  const columns: Record<string, readonly unknown[]> = { month: ['Jan', 'Feb'], sales: [10, 20] };

  it('reports no error for a present category property', () => {
    expect(new ArrayOfObjectsDataProvider(rows, 'month').getError()).toBeUndefined();
    expect(new ObjectOfArraysDataProvider(columns, 'month').getError()).toBeUndefined();
  });

  it('reports a category property absent from every row', () => {
    expect(new ArrayOfObjectsDataProvider(rows, 'category').getError())
      .toBe('no category values found for property: category');
  });

  it('reports a missing category column', () => {
    expect(new ObjectOfArraysDataProvider(columns, 'category').getError())
      .toBe('no category column found for property: category');
  });

  it('reports a category column holding only undefined values', () => {
    const holey: Record<string, readonly unknown[]> = { month: [undefined, undefined], sales: [10, 20] };
    expect(new ObjectOfArraysDataProvider(holey, 'month').getError())
      .toBe('no category values found for property: month');
  });

  it('does not flag empty datasets', () => {
    expect(new ArrayOfObjectsDataProvider([] as Array<Record<string, unknown>>, 'month').getError()).toBeUndefined();
    expect(new ObjectOfArraysDataProvider({ month: [], sales: [] }, 'month').getError()).toBeUndefined();
  });

  // partial gaps are legitimate holey data; flagging them is getDataErrors' job
  it('does not flag a property present on only some rows', () => {
    const partial: Array<Record<string, unknown>> = [{ month: 'Jan', sales: 1 }, { sales: 2 }];
    expect(new ArrayOfObjectsDataProvider(partial, 'month').getError()).toBeUndefined();
  });

  it('clears the error when a refresh finds the property', () => {
    const mutableRows: Array<Record<string, unknown>> = [{ sales: 10 }];
    const rowProvider = new ArrayOfObjectsDataProvider(mutableRows, 'month');
    expect(rowProvider.getError()).toBe('no category values found for property: month');
    mutableRows[0] = { month: 'Jan', sales: 10 };
    rowProvider.refresh();
    expect(rowProvider.getError()).toBeUndefined();

    const mutableColumns: Record<string, readonly unknown[]> = { sales: [10] };
    const columnProvider = new ObjectOfArraysDataProvider(mutableColumns, 'month');
    expect(columnProvider.getError()).toBe('no category column found for property: month');
    mutableColumns.month = ['Jan'];
    columnProvider.refresh();
    expect(columnProvider.getError()).toBeUndefined();
  });
});
