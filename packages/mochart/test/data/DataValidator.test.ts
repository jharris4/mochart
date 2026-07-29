import { describe, it, expect } from 'vitest';
import { getDataErrors } from '../../src/data/DataValidator';
import { makeConfig, ArrayOfObjectsDataProvider } from './fixtures';
import type { DataProvider } from '../../src/types/data';

function stringConfig() {
  return makeConfig({
    groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
    seriesConfigs: [{ property: 'sales' }]
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
      groupAxisConfig: { property: 'x', type: 'number', scale: 'linear' },
      seriesConfigs: [{ property: 'y' }]
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
      groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
      seriesConfigs: [
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
      groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
      seriesConfigs: [
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
      groupAxisConfig: { property: 'd', type: 'date', scale: 'linear' },
      seriesConfigs: [{ property: 'y' }]
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
      groupAxisConfig: { property: 'd', type: 'date', scale: 'linear' },
      seriesConfigs: [{ property: 'y' }]
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
      groupAxisConfig: { property: 'id', displayProperty: 'label', type: 'string', scale: 'ordinal' },
      seriesConfigs: [{ property: 'y' }]
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
      groupAxisConfig: { property: 'id', displayProperty: 'label', type: 'string', scale: 'ordinal' },
      seriesConfigs: [{ property: 'y' }]
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
      getGroupValues: () => ['Jan'],
      getSeriesValue: () => 'x',
      getError: () => 'broken'
    } as unknown as DataProvider;
    expect(getDataErrors(config, errored)).toEqual([]);
  });
});
