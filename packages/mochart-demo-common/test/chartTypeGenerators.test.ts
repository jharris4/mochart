import { describe, it, expect } from 'vitest';

import { enhanceConfig, getDataErrors } from '@mochart/core';
import type { DataProvider } from '@mochart/core';

import { buildChartTypeDemoSnapshots, chartTypeGenerators, generateChartTypeDataProvider, generateDemoDataProvider } from '../src/chartTypeGenerators';

import type { DemoDataProvider, RandomConfig } from '../src/types';

const random = {
  series: { missing: { probability: 0.1 } }
} as RandomConfig;

const snapshots = buildChartTypeDemoSnapshots();

function toDataProvider(provider: DemoDataProvider): DataProvider {
  return provider as unknown as DataProvider;
}

describe('chart-type demo snapshots', () => {
  for (const snapshot of snapshots) {
    it(`${snapshot.id}: config is valid and the baked data has no errors`, () => {
      const mochartConfig = enhanceConfig(snapshot.config);
      expect(mochartConfig.validation.valid).toBe(true);
      expect(mochartConfig.validation.warnings).toEqual([]);
      const groupProperty = mochartConfig.groupAxisConfig.property!;
      const provider = {
        getGroupValues: () => snapshot.data.map(row => row[groupProperty]),
        getSeriesValue: (_g: unknown, index: number, property: string) => snapshot.data[index][property]
      } as unknown as DemoDataProvider;
      expect(getDataErrors(mochartConfig, toDataProvider(provider))).toEqual([]);
    });
  }
});

describe('generateChartTypeDataProvider', () => {
  for (const snapshot of snapshots) {
    const mochartConfig = enhanceConfig(snapshot.config);

    it(`${snapshot.id}: generated data satisfies the demo config across steps`, () => {
      for (const randomId of [0, 1, 2, 7, 23]) {
        const provider = generateChartTypeDataProvider(snapshot.id, mochartConfig, random, randomId);
        expect(provider.getGroupValues().length).toBeGreaterThan(0);
        expect(getDataErrors(mochartConfig, toDataProvider(provider))).toEqual([]);
      }
    });

    it(`${snapshot.id}: the same randomId reproduces the same data`, () => {
      const first = generateChartTypeDataProvider(snapshot.id, mochartConfig, random, 5);
      const second = generateChartTypeDataProvider(snapshot.id, mochartConfig, random, 5);
      expect(second.groupValues).toEqual(first.groupValues);
      expect(second.seriesValues).toEqual(first.seriesValues);
    });

    it(`${snapshot.id}: consecutive steps share most group values`, () => {
      const a = generateChartTypeDataProvider(snapshot.id, mochartConfig, random, 3).getGroupValues();
      const b = new Set(generateChartTypeDataProvider(snapshot.id, mochartConfig, random, 4).getGroupValues());
      const shared = a.filter(value => b.has(value)).length;
      expect(shared / a.length).toBeGreaterThan(0.5);
    });
  }

  it('heatmap keeps every row on the color extents baked into the config', () => {
    const heatmap = snapshots.find(snapshot => snapshot.id === 'heatmap')!;
    const mochartConfig = enhanceConfig(heatmap.config);
    const provider = generateChartTypeDataProvider('heatmap', mochartConfig, random, 11);
    const baseline = generateChartTypeDataProvider('heatmap', mochartConfig, random, 12);
    for (const rowIndex of [0, 1, 2, 3, 4, 5, 6]) {
      const property = 'row' + rowIndex + 'Value';
      const extent = (values: (number | undefined)[]) => {
        const present = values.filter((value): value is number => value !== undefined && value !== null);
        return [Math.min(...present), Math.max(...present)];
      };
      expect(extent(provider.seriesValues![property])).toEqual(extent(baseline.seriesValues![property]));
    }
  });

  it('candlestick candles stay coherent: low ≤ open/close ≤ high, one direction per day', () => {
    const candlestick = snapshots.find(snapshot => snapshot.id === 'candlestick')!;
    const mochartConfig = enhanceConfig(candlestick.config);
    const provider = generateChartTypeDataProvider('candlestick', mochartConfig, random, 6);
    const { seriesValues, groupValues } = provider;
    groupValues!.forEach((_label, index) => {
      const open = seriesValues!['open'][index]!;
      const close = seriesValues!['close'][index]!;
      const high = seriesValues!['high'][index]!;
      const low = seriesValues!['low'][index]!;
      expect(low).toBeLessThanOrEqual(Math.min(open, close));
      expect(high).toBeGreaterThanOrEqual(Math.max(open, close));
      const up = seriesValues!['up'][index];
      const down = seriesValues!['down'][index];
      // the close lands under exactly one direction, with the high mirrored
      expect(up !== undefined && down !== undefined).toBe(false);
      expect(up ?? down).toBe(close);
      expect(up !== undefined ? seriesValues!['upHigh'][index] : seriesValues!['downHigh'][index]).toBe(high);
    });
  });

  it('ohlc bars stay coherent: low ≤ open/close ≤ high, one direction per day with open/high mirrored', () => {
    const ohlc = snapshots.find(snapshot => snapshot.id === 'ohlc')!;
    const mochartConfig = enhanceConfig(ohlc.config);
    const provider = generateChartTypeDataProvider('ohlc', mochartConfig, random, 6);
    const { seriesValues, groupValues } = provider;
    groupValues!.forEach((_label, index) => {
      const open = seriesValues!['open'][index]!;
      const close = seriesValues!['close'][index]!;
      const high = seriesValues!['high'][index]!;
      const low = seriesValues!['low'][index]!;
      expect(low).toBeLessThanOrEqual(Math.min(open, close));
      expect(high).toBeGreaterThanOrEqual(Math.max(open, close));
      const up = seriesValues!['up'][index];
      const down = seriesValues!['down'][index];
      // the close lands under exactly one direction, with the high and open mirrored
      expect(up !== undefined && down !== undefined).toBe(false);
      expect(up ?? down).toBe(close);
      expect(up !== undefined ? seriesValues!['upHigh'][index] : seriesValues!['downHigh'][index]).toBe(high);
      expect(up !== undefined ? seriesValues!['upOpen'][index] : seriesValues!['downOpen'][index]).toBe(open);
    });
  });

  it('error bars stay coherent: low ≤ value ≤ high for every series and step', () => {
    const errorBars = snapshots.find(snapshot => snapshot.id === 'error-bars')!;
    const mochartConfig = enhanceConfig(errorBars.config);
    for (const randomId of [0, 6, 13]) {
      const provider = generateChartTypeDataProvider('error-bars', mochartConfig, random, randomId);
      const { seriesValues, groupValues } = provider;
      groupValues!.forEach((_label, index) => {
        for (const property of ['a', 'b', 'target']) {
          const value = seriesValues![property][index]!;
          expect(seriesValues![property + 'Low'][index]!).toBeLessThanOrEqual(value);
          expect(seriesValues![property + 'High'][index]!).toBeGreaterThanOrEqual(value);
        }
      });
    }
  });

  it('waterfall bars always connect: each delta starts at the running total', () => {
    const waterfall = snapshots.find(snapshot => snapshot.id === 'waterfall')!;
    const mochartConfig = enhanceConfig(waterfall.config);
    const provider = generateChartTypeDataProvider('waterfall', mochartConfig, random, 9);
    const { seriesValues, groupValues } = provider;
    let running = 0;
    groupValues!.forEach((_label, index) => {
      const start = seriesValues!['start'][index]!;
      const direction = (seriesValues!['direction'] as unknown as string[])[index];
      if (direction === 'total') {
        expect(start).toBe(0);
      }
      else {
        expect(start).toBe(running);
      }
      running = seriesValues!['cumulative'][index]!;
    });
  });

  it('pie rows keep every slice property from the baked config, absent slices as 0', () => {
    const pie = snapshots.find(snapshot => snapshot.id === 'pie')!;
    const mochartConfig = enhanceConfig(pie.config);
    const bakedProperties = (pie.config.seriesConfigs as { property: string }[]).map(seriesConfig => seriesConfig.property);
    for (const randomId of [0, 1, 5, 11]) {
      const provider = generateChartTypeDataProvider('pie', mochartConfig, random, randomId);
      expect(provider.getGroupValues()).toHaveLength(1);
      for (const property of bakedProperties) {
        const value = provider.seriesValues![property][0];
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('donut percent columns always reflect the generated slice values', () => {
    const donut = snapshots.find(snapshot => snapshot.id === 'donut')!;
    const mochartConfig = enhanceConfig(donut.config);
    const provider = generateChartTypeDataProvider('donut', mochartConfig, random, 6);
    const sliceProperties = (donut.config.seriesConfigs as { property: string }[]).map(seriesConfig => seriesConfig.property);
    const total = sliceProperties.reduce((sum: number, property) => sum + provider.seriesValues![property][0]!, 0);
    expect(total).toBeGreaterThan(0);
    for (const property of sliceProperties) {
      const percent = provider.seriesValues![property + 'Percent'][0]!;
      expect(percent).toBeCloseTo((provider.seriesValues![property][0]! / total) * 100, 0);
    }
  });
});

describe('generateDemoDataProvider', () => {
  it('dispatches to the chart-type generator for known generator ids', () => {
    const heatmap = snapshots.find(snapshot => snapshot.id === 'heatmap')!;
    const mochartConfig = enhanceConfig(heatmap.config);
    const direct = generateChartTypeDataProvider('heatmap', mochartConfig, random, 2);
    const dispatched = generateDemoDataProvider('heatmap', mochartConfig, random, 2);
    expect(dispatched.groupValues).toEqual(direct.groupValues);
  });

  it('exposes the generator ids', () => {
    expect(chartTypeGenerators).toEqual(['histogram', 'waterfall', 'heatmap', 'candlestick', 'candlestick-hollow', 'ohlc', 'error-bars', 'pie', 'donut', 'gauge']);
  });
});
