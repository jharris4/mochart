import { describe, it, expect } from 'vitest';
import {
  getFocusData,
  getFocusDataWithDomainPercentages,
  getFocusDataWithGroupChanges,
  getFocusDataWithMutations,
  getSeriesConfigsOrderedByFocus
} from '../../src/data/FocusData';
import { getChartData } from '../../src/data/ChartData';
import { makeConfig, ArrayOfObjectsDataProvider } from './fixtures';
import type { GroupDeltaData } from '../../src/types/animation';

// A 3-group / 2-series chart on a single series axis. Series values are chosen
// so the focus-domain percentages are stable and easy to reason about.
function makeChart() {
  const config = makeConfig({
    groupAxisConfig: { property: 'g', type: 'number', scale: 'ordinal' },
    seriesConfigs: [{ property: 'a' }, { property: 'b' }]
  });
  const provider = new ArrayOfObjectsDataProvider(
    [{ g: 0, a: 10, b: 5 }, { g: 1, a: 20, b: 15 }, { g: 2, a: 30, b: 25 }],
    'g'
  );
  const chartData = getChartData(config, provider, {});
  return {
    config,
    chartData,
    s0: config.seriesConfigs[0].id, // 'S0'
    s1: config.seriesConfigs[1].id, // 'S1'
    axisId: config.seriesAxisConfigs[0].id // 'SA0'
  };
}

describe('getFocusData', () => {
  it('leaves everything unfocused when nothing is selected', () => {
    const { config, chartData } = makeChart();
    const fd = getFocusData(config, chartData, -1, null, null);
    expect(fd.groupFocusPercentages).toEqual([null, null, null]);
    expect(Object.values(fd.seriesFocusPercentages)).toEqual([null, null]);
    expect(Object.values(fd.seriesAxisFocusPercentages)).toEqual([null]);
    expect(fd.groupFocusDomainPercentages).toEqual([]);
  });

  it('marks the focused group at +1 and the rest at -1', () => {
    const { config, chartData } = makeChart();
    const fd = getFocusData(config, chartData, 1, null, null);
    expect(fd.groupFocusPercentages).toEqual([-1, 1, -1]);
    // group 1 (numeric value 1) sits at the middle of the [0,2] domain
    expect(fd.groupFocusDomainPercentages).toEqual([0.5]);
  });

  it('marks the focused series at +1 and computes its domain percentages', () => {
    const { config, chartData, s0, s1, axisId } = makeChart();
    const fd = getFocusData(config, chartData, -1, null, s0);
    expect(fd.seriesFocusPercentages).toEqual({ [s0]: 1, [s1]: -1 });
    expect(fd.seriesFocusDomainPercentages).toEqual([0.7727272727272727, 0.045454545454545456]);
    expect(fd.seriesAxisComputedFocusDomainPercentages![axisId]).toEqual(fd.seriesFocusDomainPercentages);
  });

  it('marks the focused series axis at +1 and spans the full axis domain', () => {
    const { config, chartData, axisId } = makeChart();
    const fd = getFocusData(config, chartData, -1, axisId, null);
    expect(fd.seriesAxisFocusPercentages).toEqual({ [axisId]: 1 });
    expect(fd.seriesAxisFocusDomainPercentages).toEqual([1, 0]);
  });

  it('reduces to a single value plus the axis base when a group and series are both focused', () => {
    const { config, chartData, s0 } = makeChart();
    const fd = getFocusData(config, chartData, 1, null, s0);
    // series S0 at group 1 is value 20; paired with the axis base 3.75
    expect(fd.seriesFocusDomainPercentages).toEqual([0.4090909090909091, 1]);
  });

  it('skips domain percentages when computeDomainPercentages is false', () => {
    const { config, chartData } = makeChart();
    const fd = getFocusData(config, chartData, 1, null, null, false);
    expect(fd.groupFocusDomainPercentages).toBeUndefined();
    expect(fd.seriesFocusDomainPercentages).toBeUndefined();
    // the discrete focus percentages are still computed
    expect(fd.groupFocusPercentages).toEqual([-1, 1, -1]);
  });
});

// A candlestick-style chart: a hidden wick series following the body series
// via followSeries, plus an unrelated series, all on one axis. The wick spans
// low→high beyond the body's open→close so the merged focus extent is visible.
function makeFollowerChart() {
  const config = makeConfig({
    groupAxisConfig: { property: 'g', type: 'number', scale: 'ordinal' },
    seriesConfigs: [
      { id: 'wick', property: 'high', rangeProperty: 'low', showInLegend: false, followSeries: 'body' },
      { id: 'body', property: 'close', rangeProperty: 'open' },
      { id: 'other', property: 'x' }
    ]
  });
  const provider = new ArrayOfObjectsDataProvider(
    [
      { g: 0, high: 30, low: 5, open: 10, close: 20, x: 50 },
      { g: 1, high: 40, low: 12, open: 22, close: 25, x: 60 }
    ],
    'g'
  );
  const chartData = getChartData(config, provider, {});
  const axisId = config.seriesAxisConfigs[0].id;
  const domain = chartData.seriesData.raw.axisDomains[axisId] as [number, number];
  // the chart is not inverted, so a value's domain percentage measures down from the max
  const pct = (value: number) => (domain[1] - value) / (domain[1] - domain[0]);
  return { config, chartData, pct };
}

describe('followSeries followers', () => {
  it('shares the leader series focus with its followers', () => {
    const { config, chartData } = makeFollowerChart();
    const fd = getFocusData(config, chartData, -1, null, 'body');
    expect(fd.seriesFocusPercentages).toEqual({ wick: 1, body: 1, other: -1 });
  });

  it('keeps followers with the leader in the focus ordering', () => {
    const { config, chartData } = makeFollowerChart();
    const fd = getFocusData(config, chartData, -1, null, 'body');
    const ordered = getSeriesConfigsOrderedByFocus(config, fd).map(s => s.id);
    // the defocused series first, then the follower under its leader
    expect(ordered).toEqual(['other', 'wick', 'body']);
  });

  it('spans the follower extent in the focused-group domain percentages', () => {
    const { config, chartData, pct } = makeFollowerChart();
    const fd = getFocusData(config, chartData, 0, null, 'body');
    // group 0 spans the wick's low 5 → high 30, wider than the body's 10 → 20
    expect(fd.seriesFocusDomainPercentages).toEqual([pct(30), pct(5)]);
  });

  it('spans the follower extent in the whole-series domain percentages', () => {
    const { config, chartData, pct } = makeFollowerChart();
    const fd = getFocusData(config, chartData, -1, null, 'body');
    // across both groups the candles span low 5 → high 40
    expect(fd.seriesFocusDomainPercentages).toEqual([pct(5), pct(40)]);
  });

  it('leaves single-series focus behavior unchanged', () => {
    const { config, chartData, pct } = makeFollowerChart();
    const fd = getFocusData(config, chartData, -1, null, 'other');
    expect(fd.seriesFocusPercentages).toEqual({ wick: -1, body: -1, other: 1 });
    expect(fd.seriesFocusDomainPercentages).toEqual([pct(50), pct(60)]);
  });
});

describe('getFocusDataWithDomainPercentages', () => {
  it('adds domain percentages to a focus-data object that lacks them', () => {
    const { config, chartData } = makeChart();
    const bare = getFocusData(config, chartData, 1, null, null, false);
    expect(bare.groupFocusDomainPercentages).toBeUndefined();
    const filled = getFocusDataWithDomainPercentages(bare, config, chartData);
    expect(filled.groupFocusDomainPercentages).toEqual([0.5]);
    // discrete percentages are carried over unchanged
    expect(filled.groupFocusPercentages).toEqual(bare.groupFocusPercentages);
  });
});

describe('getFocusDataWithGroupChanges', () => {
  const delta = (over: Record<string, unknown>, indices: Record<string, number[]>): GroupDeltaData =>
    ({ values: { merged: ['x', 'y', 'z'], new: ['x', 'y', 'z'], ...over }, indices } as unknown as GroupDeltaData);

  it('remaps the focused index into the merged array on addition', () => {
    const { config, chartData } = makeChart();
    const base = getFocusData(config, chartData, 1, null, null);
    const result = getFocusDataWithGroupChanges(
      base, config, chartData,
      delta({}, { old: [1, 2], new: [0, 1, 2] }),
      true, true
    );
    expect(result.focusedGroupIndex).toBe(2);
    expect(result.groupFocusPercentages).toEqual([-1, -1, 1]);
  });

  it('clears the focus when the focused group is removed', () => {
    const { config, chartData } = makeChart();
    const base = getFocusData(config, chartData, 1, null, null);
    const result = getFocusDataWithGroupChanges(
      base, config, chartData,
      delta({ merged: ['g0', 'g1', 'g2'], new: ['g0', 'g2'] }, { old: [0, 1, 2], new: [0, 2] }),
      false, true
    );
    expect(result.focusedGroupIndex).toBe(-1);
    expect(result.groupFocusPercentages).toEqual([-1, -1]);
  });

  it('initialises new percentages to null when nothing was focused', () => {
    const { config, chartData } = makeChart();
    const base = getFocusData(config, chartData, -1, null, null);
    const result = getFocusDataWithGroupChanges(
      base, config, chartData,
      delta({}, { old: [1, 2], new: [0, 1, 2] }),
      true, true
    );
    expect(result.focusedGroupIndex).toBe(-1);
    expect(result.groupFocusPercentages).toEqual([null, null, null]);
  });
});

describe('getSeriesConfigsOrderedByFocus', () => {
  it('orders defocused series first and the focused series last', () => {
    const { config, chartData, s0, s1 } = makeChart();
    const fd = getFocusData(config, chartData, -1, null, s0);
    const ordered = getSeriesConfigsOrderedByFocus(config, fd).map(s => s.id);
    expect(ordered).toEqual([s1, s0]);
  });

  it('returns the configured order when nothing is focused', () => {
    const { config, chartData, s0, s1 } = makeChart();
    const fd = getFocusData(config, chartData, -1, null, null);
    const ordered = getSeriesConfigsOrderedByFocus(config, fd).map(s => s.id);
    expect(ordered).toEqual([s0, s1]);
  });
});

describe('getFocusDataWithMutations', () => {
  it('preserves the focus selection when merging identical focus data', () => {
    const { config, chartData } = makeChart();
    const fd = getFocusData(config, chartData, 1, null, null);
    const merged = getFocusDataWithMutations(fd, fd);
    expect(merged.focusedGroupIndex).toBe(1);
    expect(merged.groupFocusPercentages).toEqual([-1, 1, -1]);
  });
});
