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

  it('looks up a series value by caetgory value regardless of index', () => {
    const provider = new ArrayOfObjectsDataProvider(rows, 'month');
    // the index argument is ignored: lookup is keyed on the caetgory value
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
