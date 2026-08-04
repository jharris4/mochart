import { describe, it, expect } from 'vitest';
import { getChartData } from '../../src/data/ChartData';
import {
  getChartAnimationData,
  getStartChartData,
  getEndChartData
} from '../../src/animation/ChartAnimationData';
import { getChartDataForValueDelta, getChartDataForAxisDelta } from '../../src/animation/ChartAnimation';
import { oldIndexForNewIndex, newIndexForOldIndex, newIndexForMergedIndex } from '../../src/animation/CategoryAnimationData';
import { makeConfig, ArrayOfObjectsDataProvider } from '../data/fixtures';

import type { AnimationChartData } from '../../src/types/animation';
import type { EnhancedMochartConfig } from '../../src/types/enhanced';

const config: EnhancedMochartConfig = makeConfig({
  categoryAxis: { property: 'g', type: 'number', scale: 'ordinal' },
  series: [{ property: 'a', renderer: 'bar' }]
});
const seriesId = config.series[0].id;

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
    expect(getChartDataForAxisDelta(config, cad, true, 0).categoryData.axisDomain).toEqual([0, 1]);
    expect(getChartDataForAxisDelta(config, cad, true, 1).categoryData.axisDomain).toEqual([0, 2]);
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
  const rangeConfig: EnhancedMochartConfig = makeConfig({
    categoryAxis: { property: 'g', type: 'number', scale: 'ordinal' },
    series: [{ property: 'a', rangeProperty: 'hi', renderer: 'bar' }]
  });
  const rangeSeriesId = rangeConfig.series[0].id;

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
    categoryAxis: { property: 'g', type: 'date', scale: 'ordinal' },
    series: [{ property: 'a', renderer: 'bar' }]
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
    expect(oldIndexForNewIndex(cad.categoryDeltaData, 1)).toBe(1);
    expect(newIndexForOldIndex(cad.categoryDeltaData, 0)).toBe(0);
    expect(newIndexForMergedIndex(cad.categoryDeltaData, 1)).toBe(1);
  });
});

// Regression: filteredSeriesDomainDeltas was omitted from the overall phase
// delta max, so a filtered-series transition paced its per-series domain
// tween at a fraction of the phase and snapped on the final frame.
describe('filtered series-domain deltas drive the phase pacing', () => {
  it('includes the filtered map in the overall delta and keeps factors >= 1', () => {
    const filteredConfig = makeConfig({
      categoryAxis: { property: 'g', type: 'number', scale: 'ordinal' },
      valueAxes: [{ adjustForFiltering: false }],
      series: [{ property: 'a', renderer: 'bar' }, { property: 'b', renderer: 'bar' }]
    });
    const dataFor = (rows: Record<string, number>[]) =>
      getChartData(filteredConfig, new ArrayOfObjectsDataProvider(rows, 'g'), { S0: true });
    const cad = getChartAnimationData(
      filteredConfig,
      dataFor([{ g: 0, a: 100, b: 5 }, { g: 1, a: 80, b: 10 }]),
      dataFor([{ g: 0, a: 100, b: 25 }, { g: 1, a: 80, b: 50 }])
    ) as any;

    for (const phase of [cad.axisExpansionData, cad.axisContractionData]) {
      const filtered = phase.deltas.domain.series.filtered;
      expect(phase.deltaPercentage).toBeGreaterThanOrEqual(filtered.deltaPercentage);
      expect(filtered.deltas.S1.deltaPercentage).toBeGreaterThan(0);
      expect(filtered.deltas.S1.deltaFactor).toBeGreaterThanOrEqual(1);
    }
  });
});

// Regression: getMaxDeltaPercentage omitted the tooltip key, so tooltip-value
// changes never counted toward the phase pacing -- a tooltip-only transition
// degraded to a 0-duration jump and mixed transitions under-interpolated the
// hovered values before snapping on the final frame.
describe('tooltip value deltas drive the phase pacing', () => {
  it('counts a tooltip-only change and keeps its factor >= 1', () => {
    const tooltipConfig = makeConfig({
      categoryAxis: { property: 'g', type: 'number', scale: 'ordinal' },
      series: [{ property: 'a', tooltipProperty: 'info', renderer: 'bar' }]
    });
    const dataFor = (rows: Record<string, number>[]) =>
      getChartData(tooltipConfig, new ArrayOfObjectsDataProvider(rows, 'g'), {});
    const cad = getChartAnimationData(
      tooltipConfig,
      dataFor([{ g: 0, a: 10, info: 100 }, { g: 1, a: 20, info: 200 }]),
      dataFor([{ g: 0, a: 10, info: 900 }, { g: 1, a: 20, info: 50 }])
    ) as any;

    const raw = cad.valueChangeData.deltas.raw;
    expect(raw.deltas.S0.tooltip.deltaPercentage).toBeGreaterThan(0);
    expect(raw.deltaPercentage).toBeGreaterThanOrEqual(raw.deltas.S0.tooltip.deltaPercentage);
    expect(raw.deltas.S0.tooltip.deltaFactor).toBeGreaterThanOrEqual(1);
  });
});

// Regression: a series being unfiltered carries a filtered-domain delta (null
// -> full extent) that paced a dead axis-expansion phase ahead of the value
// phase, so restoring a series via the legend lagged while filtering it was
// instant. Hidden series render nothing, so they must not stretch phase
// durations -- but their deltas stay in the map so end/final domains still
// cover them (the value phase renders the returning series against them).
describe('hidden series are excluded from axis phase pacing', () => {
  const pacingConfig = makeConfig({
    categoryAxis: { property: 'g', type: 'number', scale: 'ordinal' },
    series: [{ property: 'a', renderer: 'bar' }, { property: 'b', renderer: 'bar' }]
  });
  const bId = pacingConfig.series[1].id;
  // b stays inside a's extent so toggling it never changes any axis domain
  const rows = [{ g: 0, a: 0, b: 10 }, { g: 1, a: 100, b: 90 }];
  const dataFor = (filtered: Record<string, boolean>) =>
    getChartData(pacingConfig, new ArrayOfObjectsDataProvider(rows, 'g'), filtered);

  it('unfiltering starts the value phase immediately (no dead expansion phase)', () => {
    const cad = getChartAnimationData(pacingConfig, dataFor({ [bId]: true }), dataFor({})) as any;
    expect(cad.axisExpansionData.deltaPercentage).toBe(0);
    expect(cad.valueChangeData.deltaPercentage).toBeGreaterThan(0);
    // domain bookkeeping still lands the returning series' scale for the value phase
    expect(cad.axisExpansionData.final.seriesData.filtered.domains[bId].domain).toEqual([10, 90]);
  });

  it('filtering has no dead contraction tail', () => {
    const cad = getChartAnimationData(pacingConfig, dataFor({}), dataFor({ [bId]: true })) as any;
    expect(cad.axisContractionData.deltaPercentage).toBe(0);
    expect(cad.valueChangeData.deltaPercentage).toBeGreaterThan(0);
  });
});
