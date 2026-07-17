import { describe, it, expect } from 'vitest';
import {
  getGroupData,
  getGroupDataFromValues,
  getGroupDataWithAxisDomain,
  getGroupDataWithNumericValues,
  getNumericGroupValues,
  getGroupValueObject
} from '../../src/data/GroupData';
import { ordinalConfig, makeConfig, ArrayOfObjectsDataProvider } from './fixtures';
import type { GroupValue } from '../../src/types/data';

describe('getGroupData', () => {
  it('reads raw group values from the provider', () => {
    const config = ordinalConfig();
    const provider = new ArrayOfObjectsDataProvider(
      [{ month: 'Jan' }, { month: 'Feb' }, { month: 'Mar' }],
      'month'
    );
    const groupData = getGroupData(config.groupAxisConfig, provider);
    expect(groupData.values.raw).toEqual(['Jan', 'Feb', 'Mar']);
    // ordinal display defaults to the raw values
    expect(groupData.values.display).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('resolves display values through a display property', () => {
    const config = ordinalConfig({ displayProperty: 'label' });
    const provider = new ArrayOfObjectsDataProvider(
      [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' }
      ],
      'id'
    );
    const groupData = getGroupData(config.groupAxisConfig, provider);
    expect(groupData.values.raw).toEqual(['a', 'b']);
    expect(groupData.values.display).toEqual(['Alpha', 'Beta']);
  });
});

describe('getNumericGroupValues', () => {
  it('numbers ordinal values by their index', () => {
    const config = ordinalConfig();
    expect(getNumericGroupValues(config.groupAxisConfig, ['a', 'b', 'c'])).toEqual([0, 1, 2]);
  });

  it('subtracts per-index offsets when provided', () => {
    const config = ordinalConfig();
    expect(getNumericGroupValues(config.groupAxisConfig, ['a', 'b', 'c'], [0, 0.5, 1])).toEqual([0, 0.5, 1]);
  });

  it('uses timestamps for date axes', () => {
    const config = makeConfig({
      groupAxisConfig: { property: 'day', type: 'date', scale: 'linear' }
    });
    const a = new Date('2020-01-01T00:00:00Z');
    const b = new Date('2020-01-02T00:00:00Z');
    expect(getNumericGroupValues(config.groupAxisConfig, [a, b])).toEqual([a.getTime(), b.getTime()]);
  });

  it('coerces linear numeric values with Number()', () => {
    const config = makeConfig({
      groupAxisConfig: { property: 'x', type: 'number', scale: 'linear' }
    });
    expect(getNumericGroupValues(config.groupAxisConfig, [1, 2, 3] as GroupValue[])).toEqual([1, 2, 3]);
    expect(getNumericGroupValues(config.groupAxisConfig, ['4', '5'] as unknown as GroupValue[])).toEqual([4, 5]);
  });
});

describe('getGroupDataFromValues', () => {
  it('builds an ordinal axis domain spanning the value indices', () => {
    const config = ordinalConfig();
    const groupData = getGroupDataFromValues(config.groupAxisConfig, ['a', 'b', 'c'], ['a', 'b', 'c']);
    expect(groupData.axisDomain).toEqual([0, 2]);
    expect(groupData.values.numeric).toEqual([0, 1, 2]);
  });

  it('produces a [0, 0] ordinal domain for empty values', () => {
    const config = ordinalConfig();
    const groupData = getGroupDataFromValues(config.groupAxisConfig, [], []);
    expect(groupData.axisDomain).toEqual([0, 0]);
  });
});

describe('getGroupDataWithAxisDomain / getGroupDataWithNumericValues', () => {
  it('replaces the axis domain immutably', () => {
    const config = ordinalConfig();
    const groupData = getGroupDataFromValues(config.groupAxisConfig, ['a', 'b'], ['a', 'b']);
    const updated = getGroupDataWithAxisDomain(groupData, [1, 5]);
    expect(updated).not.toBe(groupData);
    expect(updated.axisDomain).toEqual([1, 5]);
    expect(updated.values).toBe(groupData.values);
  });

  it('replaces the numeric values immutably', () => {
    const config = ordinalConfig();
    const groupData = getGroupDataFromValues(config.groupAxisConfig, ['a', 'b'], ['a', 'b']);
    const updated = getGroupDataWithNumericValues(groupData, [10, 20]);
    expect(updated).not.toBe(groupData);
    expect(updated.values.numeric).toEqual([10, 20]);
    expect(updated.values.raw).toBe(groupData.values.raw);
  });
});

describe('getGroupValueObject', () => {
  it('slices out the values at a single index', () => {
    const config = ordinalConfig();
    const groupData = getGroupDataFromValues(config.groupAxisConfig, ['a', 'b', 'c'], ['A', 'B', 'C']);
    const obj = getGroupValueObject(groupData, 1);
    // parsed values derive from the display values (identity for string axes)
    expect(obj.values).toEqual({ raw: 'b', display: 'B', parsed: 'B', numeric: 1 });
    expect(obj.axisDomain).toEqual(groupData.axisDomain);
  });
});
