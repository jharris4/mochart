import { describe, it, expect } from 'vitest';
import { getChartData } from '../../src/data/ChartData';
import {
  getChartAnimationData,
  getStartChartData,
  getEndChartData
} from '../../src/animation/ChartAnimationData';
import { getChartDataForValueDelta, getChartDataForAxisDelta } from '../../src/animation/ChartAnimation';
import { oldIndexForNewIndex, newIndexForOldIndex, newIndexForMergedIndex } from '../../src/animation/GroupAnimationData';
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

describe('getChartDataForValueDelta with an undefined hole', () => {
  // group 1 animates from a defined 0 to an undefined (missing) value
  const cad = getChartAnimationData(
    config,
    chartDataFor([{ g: 0, a: 0 }, { g: 1, a: 0 }]),
    chartDataFor([{ g: 0, a: 10 }, { g: 1 }])
  );

  it('interpolates the defined point and holds the vanishing point at its start', () => {
    // group 0 tweens 0 -> 10 as usual; group 1 has no end value, so its delta
    // is zero and it holds at the start value rather than becoming undefined
    expect(plain(getChartDataForValueDelta(config, cad, 0))).toEqual([0, 0]);
    expect(plain(getChartDataForValueDelta(config, cad, 0.5))).toEqual([5, 0]);
    expect(plain(getChartDataForValueDelta(config, cad, 1))).toEqual([10, 0]);
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

describe('getChartDataForValueDelta (range channel with an undefined hole)', () => {
  const rangeConfig: MochartConfig = makeConfig({
    groupAxisConfig: { property: 'g', type: 'number', scale: 'ordinal' },
    seriesConfigs: [{ property: 'a', rangeProperty: 'hi', renderer: 'bar' }]
  });
  const rangeSeriesId = rangeConfig.seriesConfigs[0].id;

  function rangeChartData(rows: Record<string, number>[]): AnimationChartData {
    return getChartData(rangeConfig, new ArrayOfObjectsDataProvider(rows, 'g'), {});
  }

  // group 1's range value (hi) disappears at the end while its plain value stays
  const cad = getChartAnimationData(
    rangeConfig,
    rangeChartData([{ g: 0, a: 0, hi: 0 }, { g: 1, a: 0, hi: 0 }]),
    rangeChartData([{ g: 0, a: 10, hi: 15 }, { g: 1, a: 20 }])
  );

  it('tweens the plain channel while holding the vanishing range point', () => {
    const mid = getChartDataForValueDelta(rangeConfig, cad, 0.5).seriesData.raw.values[rangeSeriesId];
    const end = getChartDataForValueDelta(rangeConfig, cad, 1).seriesData.raw.values[rangeSeriesId];
    // plain animates on both groups; range animates on group 0 but the missing
    // group-1 range has a zero delta and holds at its start value. The ranged
    // series' plain/range keys share one duration (each key at proportional
    // speed) so the shape's edges arrive together — hence range is at half its
    // journey at the midpoint, like plain, rather than ahead of it.
    expect(mid.plain).toEqual([5, 10]);
    expect(mid.range).toEqual([7.5, 0]);
    expect(end.plain).toEqual([10, 20]);
    expect(end.range).toEqual([15, 0]);
  });
});

describe('getChartDataForValueDelta (a point entering from undefined)', () => {
  // group 1 starts undefined (absent) and animates in to a defined end value
  const cad = getChartAnimationData(
    config,
    chartDataFor([{ g: 0, a: 10 }, { g: 1 }]),
    chartDataFor([{ g: 0, a: 10 }, { g: 1, a: 20 }])
  );

  it('animates the entering point from a defined baseline up to its end value', () => {
    const at0 = plain(getChartDataForValueDelta(config, cad, 0))!;
    const at05 = plain(getChartDataForValueDelta(config, cad, 0.5))!;
    const at1 = plain(getChartDataForValueDelta(config, cad, 1))!;

    // the stable neighbour is unaffected throughout
    expect(at0[0]).toBe(10);
    expect(at05[0]).toBe(10);
    expect(at1[0]).toBe(10);

    // the entering point is a real number at the start (never undefined),
    // increases monotonically, and lands exactly on the end value
    expect(typeof at0[1]).toBe('number');
    expect(at0[1]!).toBeLessThan(20);
    expect(at05[1]!).toBeGreaterThan(at0[1]!);
    expect(at05[1]!).toBeLessThan(20);
    expect(at1[1]).toBe(20);
  });
});

// Regression: the group index maps used indexOf, which compares Date group
// values by identity, so date charts lost their mid-animation focus remap.
describe('group index maps with Date group values', () => {
  const dateConfig = makeConfig({
    groupAxisConfig: { property: 'g', type: 'date', scale: 'ordinal' },
    seriesConfigs: [{ property: 'a', renderer: 'bar' }]
  });
  const dateRows = (offset: number) => [
    { g: new Date(2026, 0, 1), a: 1 + offset },
    { g: new Date(2026, 1, 1), a: 2 + offset }
  ];

  it('maps indices by value across fresh Date instances', () => {
    const cad = getChartAnimationData(
      dateConfig,
      getChartData(dateConfig, new ArrayOfObjectsDataProvider(dateRows(0), 'g'), {}),
      getChartData(dateConfig, new ArrayOfObjectsDataProvider(dateRows(5), 'g'), {})
    );
    expect(oldIndexForNewIndex(cad.groupDeltaData, 1)).toBe(1);
    expect(newIndexForOldIndex(cad.groupDeltaData, 0)).toBe(0);
    expect(newIndexForMergedIndex(cad.groupDeltaData, 1)).toBe(1);
  });
});
