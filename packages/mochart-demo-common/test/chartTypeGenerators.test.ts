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
    expect(chartTypeGenerators).toEqual(['histogram', 'waterfall', 'heatmap']);
  });
});
