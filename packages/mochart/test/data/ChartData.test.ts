import { describe, it, expect } from 'vitest';
import {
  isDataProviderValid,
  getChartData,
  getChartDataWithCategoryData,
  getChartDataWithSeriesData,
  getChartDataWithData,
  getCategorySeriesValueObject,
  getChartDataCategoryCount
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
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'sales' }]
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

  it('is true for a provider whose getError returns null or undefined', () => {
    const nullProvider = { getCategoryValues: () => [], getSeriesValue: () => 0, getError: () => null } as unknown as DataProvider;
    expect(isDataProviderValid(nullProvider)).toBe(true);
    const undefinedProvider = { getCategoryValues: () => [], getSeriesValue: () => 0, getError: () => undefined } as unknown as DataProvider;
    expect(isDataProviderValid(undefinedProvider)).toBe(true);
  });

  it('is false for a provider whose getError returns a message', () => {
    const provider = { getCategoryValues: () => [], getSeriesValue: () => 0, getError: () => 'boom' } as unknown as DataProvider;
    expect(isDataProviderValid(provider)).toBe(false);
  });

  // Regression: a provider missing a required accessor used to pass here and throw inside getChartData
  it('is false for a provider missing a required accessor', () => {
    const noCategoryValues = { getSeriesValue: () => 0 } as unknown as DataProvider;
    expect(isDataProviderValid(noCategoryValues)).toBe(false);
    const noSeriesValue = { getCategoryValues: () => [] } as unknown as DataProvider;
    expect(isDataProviderValid(noSeriesValue)).toBe(false);
    // an error-free provider that only reports state is not a provider
    const stateOnly = { getError: () => null, getLoading: () => false } as unknown as DataProvider;
    expect(isDataProviderValid(stateOnly)).toBe(false);
  });

  it('is true for a provider with both accessors and none of the optional members', () => {
    const bare = { getCategoryValues: () => [], getSeriesValue: () => 0 } as unknown as DataProvider;
    expect(isDataProviderValid(bare)).toBe(true);
  });

  // Regression: truthiness let '' and 0 through, though the error prop honors them
  it('is false for a provider whose getError returns a falsy non-null error', () => {
    const emptyStringProvider = { getCategoryValues: () => [], getSeriesValue: () => 0, getError: () => '' } as unknown as DataProvider;
    expect(isDataProviderValid(emptyStringProvider)).toBe(false);
    const zeroProvider = { getCategoryValues: () => [], getSeriesValue: () => 0, getError: () => 0 } as unknown as DataProvider;
    expect(isDataProviderValid(zeroProvider)).toBe(false);
  });
});

describe('getChartData', () => {
  it('builds category and series data from a provider', () => {
    const { chartData } = makeChartData();
    expect(chartData.categoryData.values.raw).toEqual(['Jan', 'Feb', 'Mar']);
    expect(chartData).toHaveProperty('seriesData');
  });
});

describe('getChartDataWith* merge helpers', () => {
  it('replaces only categoryData and returns a new object', () => {
    const { chartData } = makeChartData();
    const other = makeChartData().chartData;
    const merged = getChartDataWithCategoryData(chartData, other.categoryData);
    expect(merged).not.toBe(chartData);
    expect(merged.categoryData).toBe(other.categoryData);
    expect(merged.seriesData).toBe(chartData.seriesData);
  });

  it('replaces only seriesData and returns a new object', () => {
    const { chartData } = makeChartData();
    const other = makeChartData().chartData;
    const merged = getChartDataWithSeriesData(chartData, other.seriesData);
    expect(merged).not.toBe(chartData);
    expect(merged.seriesData).toBe(other.seriesData);
    expect(merged.categoryData).toBe(chartData.categoryData);
  });

  it('replaces both category and series data', () => {
    const { chartData } = makeChartData();
    const other = makeChartData().chartData;
    const merged = getChartDataWithData(chartData, other.categoryData, other.seriesData);
    expect(merged.categoryData).toBe(other.categoryData);
    expect(merged.seriesData).toBe(other.seriesData);
  });
});

describe('getChartDataCategoryCount', () => {
  it('returns 0 for null chart data', () => {
    expect(getChartDataCategoryCount(null)).toBe(0);
  });

  it('returns the number of raw category values', () => {
    const { chartData } = makeChartData();
    expect(getChartDataCategoryCount(chartData)).toBe(3);
  });
});

describe('getCategorySeriesValueObject', () => {
  it('exposes the category and series values at an index', () => {
    const { chartData } = makeChartData();
    const obj = getCategorySeriesValueObject(chartData, 1);
    expect(obj.category.values.raw).toBe('Feb');
    expect(obj).toHaveProperty('series');
  });
});

describe('undefined series values', () => {
  function makeHoledChartData() {
    const config = makeConfig({
      categoryAxis: { property: 'g', type: 'number', scale: 'ordinal' },
      series: [{ property: 'a' }]
    });
    // category 1 has no value for property "a"
    const provider = new ArrayOfObjectsDataProvider([{ g: 0, a: 10 }, { g: 1 }, { g: 2, a: 30 }], 'g');
    const seriesId = config.series[0].id;
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

  it('carries an undefined range value as a hole and excludes it from the range domain', () => {
    const config = makeConfig({
      categoryAxis: { property: 'g', type: 'number', scale: 'ordinal' },
      series: [{ property: 'a', rangeProperty: 'hi' }]
    });
    // category 1 has no "hi" (range) value, but keeps its "a" (plain) value
    const provider = new ArrayOfObjectsDataProvider([{ g: 0, a: 10, hi: 15 }, { g: 1, a: 20 }, { g: 2, a: 30, hi: 35 }], 'g');
    const seriesId = config.series[0].id;
    const chartData = getChartData(config, provider, {});
    expect(chartData.seriesData.raw.values[seriesId].plain).toEqual([10, 20, 30]);
    expect(chartData.seriesData.raw.values[seriesId].range).toEqual([15, undefined, 35]);
    expect(chartData.seriesData.raw.domains[seriesId].range).toEqual([15, 35]);
  });
});

// Regression: the filter map lookup went through Object.prototype, so a series
// with a prototype-member id counted as always-filtered (and __proto__ could never be).
describe('prototype-member series ids', () => {
  const protoRows = [{ month: 'Jan', sales: 10 }, { month: 'Feb', sales: 20 }];

  function makeProtoChartData(id: string, filteredSeriesMap: Record<string, unknown>) {
    const config = makeConfig({
      categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
      series: [{ id, property: 'sales' }]
    });
    return getChartData(config, new ArrayOfObjectsDataProvider(protoRows, 'month'), filteredSeriesMap);
  }

  it('does not treat a series with a prototype-member id as filtered', () => {
    const chartData = makeProtoChartData('constructor', {});
    expect(chartData.seriesData.filteredFlags['constructor']).toBe(false);
    expect(chartData.seriesData.filtered.values['constructor'].plain).toEqual([10, 20]);
  });

  it('filters a series whose id is __proto__', () => {
    const filterMap: Record<string, boolean> = Object.create(null);
    filterMap['__proto__'] = true;
    const chartData = makeProtoChartData('__proto__', filterMap);
    expect(chartData.seriesData.filteredFlags['__proto__']).toBe(true);
    expect(chartData.seriesData.filtered.values['__proto__'].plain).toBe(null);
  });
});
