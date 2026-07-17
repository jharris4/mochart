import { describe, it, expect } from 'vitest';
import {
  isDataProviderValid,
  getChartData,
  getChartDataWithGroupData,
  getChartDataWithSeriesData,
  getChartDataWithData,
  getGroupSeriesValueObject,
  getChartDataGroupCount
} from '../../src/data/ChartData';
import { makeConfig, ArrayOfObjectsDataProvider } from './fixtures';
import type { DataProvider } from '../../src/types/data';

const rows = [
  { month: 'Jan', sales: 10 },
  { month: 'Feb', sales: 20 },
  { month: 'Mar', sales: 30 }
];

function makeChartData() {
  const config = makeConfig({
    groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
    seriesConfigs: [{ property: 'sales' }]
  });
  const provider = new ArrayOfObjectsDataProvider(rows, 'month');
  return { config, chartData: getChartData(config, provider, {}) };
}

describe('isDataProviderValid', () => {
  it('is false for null or undefined', () => {
    expect(isDataProviderValid(null)).toBe(false);
    expect(isDataProviderValid(undefined)).toBe(false);
  });

  it('is true for a provider with no getError', () => {
    const provider = new ArrayOfObjectsDataProvider(rows, 'month');
    expect(isDataProviderValid(provider)).toBe(true);
  });

  it('is true for a provider whose getError returns falsy', () => {
    const provider = { getGroupValues: () => [], getSeriesValue: () => 0, getError: () => null } as unknown as DataProvider;
    expect(isDataProviderValid(provider)).toBe(true);
  });

  it('is false for a provider whose getError returns a message', () => {
    const provider = { getGroupValues: () => [], getSeriesValue: () => 0, getError: () => 'boom' } as unknown as DataProvider;
    expect(isDataProviderValid(provider)).toBe(false);
  });
});

describe('getChartData', () => {
  it('builds group and series data from a provider', () => {
    const { chartData } = makeChartData();
    expect(chartData.groupData.values.raw).toEqual(['Jan', 'Feb', 'Mar']);
    expect(chartData).toHaveProperty('seriesData');
  });
});

describe('getChartDataWith* merge helpers', () => {
  it('replaces only groupData and returns a new object', () => {
    const { chartData } = makeChartData();
    const other = makeChartData().chartData;
    const merged = getChartDataWithGroupData(chartData, other.groupData);
    expect(merged).not.toBe(chartData);
    expect(merged.groupData).toBe(other.groupData);
    expect(merged.seriesData).toBe(chartData.seriesData);
  });

  it('replaces only seriesData and returns a new object', () => {
    const { chartData } = makeChartData();
    const other = makeChartData().chartData;
    const merged = getChartDataWithSeriesData(chartData, other.seriesData);
    expect(merged).not.toBe(chartData);
    expect(merged.seriesData).toBe(other.seriesData);
    expect(merged.groupData).toBe(chartData.groupData);
  });

  it('replaces both group and series data', () => {
    const { chartData } = makeChartData();
    const other = makeChartData().chartData;
    const merged = getChartDataWithData(chartData, other.groupData, other.seriesData);
    expect(merged.groupData).toBe(other.groupData);
    expect(merged.seriesData).toBe(other.seriesData);
  });
});

describe('getChartDataGroupCount', () => {
  it('returns 0 for null chart data', () => {
    expect(getChartDataGroupCount(null)).toBe(0);
  });

  it('returns the number of raw group values', () => {
    const { chartData } = makeChartData();
    expect(getChartDataGroupCount(chartData)).toBe(3);
  });
});

describe('getGroupSeriesValueObject', () => {
  it('exposes the group and series values at an index', () => {
    const { chartData } = makeChartData();
    const obj = getGroupSeriesValueObject(chartData, 1);
    expect(obj.group.values.raw).toBe('Feb');
    expect(obj).toHaveProperty('series');
  });
});

describe('undefined series values', () => {
  function makeHoledChartData() {
    const config = makeConfig({
      groupAxisConfig: { property: 'g', type: 'number', scale: 'ordinal' },
      seriesConfigs: [{ property: 'a' }]
    });
    // group 1 has no value for property "a"
    const provider = new ArrayOfObjectsDataProvider([{ g: 0, a: 10 }, { g: 1 }, { g: 2, a: 30 }], 'g');
    const seriesId = config.seriesConfigs[0].id;
    return { chartData: getChartData(config, provider, {}), seriesId };
  }

  it('carries a missing value through as an undefined hole (not null or 0)', () => {
    const { chartData, seriesId } = makeHoledChartData();
    const plain = chartData.seriesData.raw.values[seriesId].plain!;
    expect(plain).toEqual([10, undefined, 30]);
    // the slot exists but holds undefined
    expect(1 in plain).toBe(true);
    expect(plain[1]).toBeUndefined();
  });

  it('excludes the undefined hole from the series domain', () => {
    const { chartData, seriesId } = makeHoledChartData();
    expect(chartData.seriesData.raw.domains[seriesId].plain).toEqual([10, 30]);
  });
});
