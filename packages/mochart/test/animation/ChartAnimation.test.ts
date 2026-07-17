import { describe, it, expect } from 'vitest';
import { getChartData } from '../../src/data/ChartData';
import {
  getChartAnimationData,
  getStartChartData,
  getEndChartData
} from '../../src/animation/ChartAnimationData';
import { getChartDataForValueDelta, getChartDataForAxisDelta } from '../../src/animation/ChartAnimation';
import { makeConfig, ArrayOfObjectsDataProvider } from '../data/fixtures';
import type { MochartConfig } from '../../src/types/config';
import type { AnimationChartData } from '../../src/types/animation';

const config: MochartConfig = makeConfig({
  groupAxisConfig: { property: 'g', type: 'number', scale: 'ordinal' },
  seriesConfigs: [{ property: 'a', renderer: 'bar' }]
});
const seriesId = config.seriesConfigs[0].id;

function chartDataFor(rows: Record<string, number>[]): AnimationChartData {
  return getChartData(config, new ArrayOfObjectsDataProvider(rows, 'g'), {});
}

function plain(chartData: AnimationChartData): (number | undefined)[] | null {
  return chartData.seriesData.raw.values[seriesId].plain;
}

describe('getChartAnimationData', () => {
  it('marks the first animation (no prior data) as initial', () => {
    const cad = getChartAnimationData(config, null, chartDataFor([{ g: 0, a: 5 }]));
    expect(cad.initialAnimation).toBe(true);
  });

  it('is a transition (not initial) when prior data exists', () => {
    const cad = getChartAnimationData(config, chartDataFor([{ g: 0, a: 5 }]), chartDataFor([{ g: 0, a: 9 }]));
    expect(cad.initialAnimation).toBe(false);
  });
});

describe('getChartDataForValueDelta', () => {
  const cad = getChartAnimationData(
    config,
    chartDataFor([{ g: 0, a: 0 }, { g: 1, a: 0 }]),
    chartDataFor([{ g: 0, a: 10 }, { g: 1, a: 20 }])
  );

  it('returns the start values at percentage 0', () => {
    expect(plain(getChartDataForValueDelta(config, cad, 0))).toEqual([0, 0]);
  });

  it('returns the end values at percentage 1', () => {
    expect(plain(getChartDataForValueDelta(config, cad, 1))).toEqual([10, 20]);
  });

  it('interpolates linearly at the midpoint', () => {
    expect(plain(getChartDataForValueDelta(config, cad, 0.5))).toEqual([5, 10]);
  });

  it('produces values between start and end for an intermediate percentage', () => {
    const values = plain(getChartDataForValueDelta(config, cad, 0.25))!;
    expect(values[0]!).toBeGreaterThan(0);
    expect(values[0]!).toBeLessThan(10);
    expect(values[1]!).toBeGreaterThan(0);
    expect(values[1]!).toBeLessThan(20);
  });
});

describe('getChartDataForAxisDelta (group added)', () => {
  const cad = getChartAnimationData(
    config,
    chartDataFor([{ g: 0, a: 10 }, { g: 1, a: 20 }]),
    chartDataFor([{ g: 0, a: 10 }, { g: 1, a: 20 }, { g: 2, a: 30 }])
  );

  it('expands the ordinal group domain from the start to the end span', () => {
    expect(getChartDataForAxisDelta(config, cad, true, 0).groupData.axisDomain).toEqual([0, 1]);
    expect(getChartDataForAxisDelta(config, cad, true, 1).groupData.axisDomain).toEqual([0, 2]);
  });
});

describe('getStartChartData / getEndChartData', () => {
  it('exposes the value-change transition endpoints', () => {
    const cad = getChartAnimationData(
      config,
      chartDataFor([{ g: 0, a: 1 }]),
      chartDataFor([{ g: 0, a: 2 }])
    );
    expect(getStartChartData(cad)).toBe(cad.valueChangeData.start);
    expect(getEndChartData(cad)).toBe(cad.valueChangeData.end);
  });
});
