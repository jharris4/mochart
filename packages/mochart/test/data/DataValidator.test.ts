import { describe, it, expect } from 'vitest';
import { getDataErrors } from '../../src/data/DataValidator';
import { makeConfig, ArrayOfObjectsDataProvider } from './fixtures';
import { ObjectOfArraysDataProvider } from '../../src/data/DataProvider';
import type { DataProvider } from '../../src/types/data';

function stringConfig() {
  return makeConfig({
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'sales' }]
  });
}

describe('getDataErrors', () => {
  it('returns no errors for well-formed data', () => {
    const config = stringConfig();
    const provider = new ArrayOfObjectsDataProvider(
      [
        { month: 'Jan', sales: 10 },
        { month: 'Feb', sales: 20 }
      ],
      'month'
    );
    expect(getDataErrors(config, provider)).toEqual([]);
  });

  it('returns no errors when the config itself is invalid', () => {
    const invalid = makeConfig({});
    expect(invalid.validation.valid).toBe(false);
    const provider = new ArrayOfObjectsDataProvider([{ month: 'Jan', sales: 10 }], 'month');
    expect(getDataErrors(invalid, provider)).toEqual([]);
  });

  it('returns no errors for a null data provider', () => {
    expect(getDataErrors(stringConfig(), null)).toEqual([]);
  });

  it('flags non-numeric series values', () => {
    const config = stringConfig();
    const provider = new ArrayOfObjectsDataProvider(
      [
        { month: 'Jan', sales: 10 },
        { month: 'Feb', sales: 'oops' }
      ],
      'month'
    );
    expect(getDataErrors(config, provider)).toEqual([
      'series values must be numeric or undefined for property: sales'
    ]);
  });

  it('allows undefined series values', () => {
    const config = stringConfig();
    const provider = new ArrayOfObjectsDataProvider(
      [
        { month: 'Jan', sales: 10 },
        { month: 'Feb' } // sales is undefined
      ],
      'month'
    );
    expect(getDataErrors(config, provider)).toEqual([]);
  });

  it('flags duplicate group values', () => {
    const config = stringConfig();
    const provider = new ArrayOfObjectsDataProvider(
      [
        { month: 'Jan', sales: 10 },
        { month: 'Jan', sales: 20 }
      ],
      'month'
    );
    expect(getDataErrors(config, provider)).toEqual(['group values must be unique, duplicates: Jan']);
  });

  it('flags group values that do not match a numeric axis type', () => {
    const config = makeConfig({
      categoryAxis: { property: 'x', type: 'number', scale: 'linear' },
      series: [{ property: 'y' }]
    });
    const provider = new ArrayOfObjectsDataProvider(
      [
        { x: 1, y: 5 },
        { x: 'not-a-number', y: 6 }
      ],
      'x'
    );
    expect(getDataErrors(config, provider)).toEqual(['group values must all match the specified type']);
  });

  it('validates extra series properties (range, marker, color, label)', () => {
    const config = makeConfig({
      categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
      series: [
        { property: 'sales', rangeProperty: 'high', markerProperty: 'mk', colorProperty: 'c', labelProperty: 'lbl' }
      ]
    });
    const provider = new ArrayOfObjectsDataProvider(
      [
        { month: 'Jan', sales: 10, high: 12, mk: 1, c: 2, lbl: 'bad' }
      ],
      'month'
    );
    expect(getDataErrors(config, provider)).toEqual([
      'series values must be numeric or undefined for property: lbl'
    ]);
  });

  it('validates error bound properties', () => {
    const config = makeConfig({
      categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
      series: [
        { property: 'sales', errorLowProperty: 'lo', errorHighProperty: 'hi' }
      ]
    });
    const provider = new ArrayOfObjectsDataProvider(
      [
        { month: 'Jan', sales: 10, lo: 'bad', hi: 12 }
      ],
      'month'
    );
    expect(getDataErrors(config, provider)).toEqual([
      'series values must be numeric or undefined for property: lo'
    ]);
  });

  it('accepts date group values on a date axis', () => {
    const config = makeConfig({
      categoryAxis: { property: 'd', type: 'date', scale: 'linear' },
      series: [{ property: 'y' }]
    });
    const provider = new ArrayOfObjectsDataProvider(
      [
        { d: '2020-01-01', y: 5 },
        { d: '2020-02-01', y: 6 }
      ],
      'd'
    );
    expect(getDataErrors(config, provider)).toEqual([]);
  });

  it('flags non-date group values on a date axis', () => {
    const config = makeConfig({
      categoryAxis: { property: 'd', type: 'date', scale: 'linear' },
      series: [{ property: 'y' }]
    });
    const provider = new ArrayOfObjectsDataProvider(
      [
        { d: '2020-01-01', y: 5 },
        { d: 'not-a-date', y: 6 }
      ],
      'd'
    );
    expect(getDataErrors(config, provider)).toEqual(['group values must all match the specified type']);
  });

  it('validates the display property values against the axis type', () => {
    const config = makeConfig({
      categoryAxis: { property: 'id', displayProperty: 'label', type: 'string', scale: 'ordinal' },
      series: [{ property: 'y' }]
    });
    // raw group ids are numbers (valid), but one display label is not a string
    const provider = new ArrayOfObjectsDataProvider(
      [
        { id: 1, label: 'Jan', y: 5 },
        { id: 2, label: 99, y: 6 }
      ],
      'id'
    );
    expect(getDataErrors(config, provider)).toEqual(['display group values must all match the specified type']);
  });

  it('accepts valid display property values', () => {
    const config = makeConfig({
      categoryAxis: { property: 'id', displayProperty: 'label', type: 'string', scale: 'ordinal' },
      series: [{ property: 'y' }]
    });
    const provider = new ArrayOfObjectsDataProvider(
      [
        { id: 1, label: 'Jan', y: 5 },
        { id: 2, label: 'Feb', y: 6 }
      ],
      'id'
    );
    expect(getDataErrors(config, provider)).toEqual([]);
  });

  it('returns no errors for an invalid (errored) data provider', () => {
    const config = stringConfig();
    const errored = {
      getCategoryValues: () => ['Jan'],
      getSeriesValue: () => 'x',
      getError: () => 'broken'
    } as unknown as DataProvider;
    expect(getDataErrors(config, errored)).toEqual([]);
  });
});

// Regression: getDataErrors crashed inside checkProperty for a mistyped
// property on an ObjectOfArraysDataProvider instead of treating it as missing
// data, diverging from the row provider.
describe('getDataErrors with a mistyped property', () => {
  it('reports identically for both providers instead of throwing', () => {
    const config = makeConfig({
      categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
      series: [{ property: 'vlaue' }]
    });
    const columns = new ObjectOfArraysDataProvider({ month: ['Jan', 'Feb'], value: [1, 2] }, 'month');
    const rows = new ArrayOfObjectsDataProvider([{ month: 'Jan', value: 1 }, { month: 'Feb', value: 2 }], 'month');
    let columnErrors: string[] = [];
    expect(() => { columnErrors = getDataErrors(config, columns as never); }).not.toThrow();
    expect(columnErrors).toEqual(getDataErrors(config, rows as never));
  });
});
