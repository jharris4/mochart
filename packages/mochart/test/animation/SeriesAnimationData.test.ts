import { describe, it, expect } from 'vitest';
import { getChartData } from '../../src/data/ChartData';
import { getChartAnimationData } from '../../src/animation/ChartAnimationData';
import { getChartDataForValueDelta } from '../../src/animation/ChartAnimation';
import { getCategoryDeltaData } from '../../src/animation/CategoryAnimationData';
import { getInitialValueChangeData, getTransitionValueChangeData } from '../../src/animation/SeriesAnimationData';
import { makeConfig, ArrayOfObjectsDataProvider } from '../data/fixtures';
import type { ChartData } from '../../src/types/data';

// Regression: filtered series shared one module-level null value object, so a stack-prior write
// leaked into every other filtered series and crashed the initial delta computation.
describe('getInitialValueChangeData with filtered series', () => {
  const rows = [
    { g: 0, a: 5, b: 3, c: 2 },
    { g: 1, a: 4, b: 6, c: 1 }
  ];

  function stackedPlusUnstackedConfig() {
    return makeConfig({
      categoryAxis: { property: 'g', type: 'number', scale: 'ordinal' },
      series: [
        { stack: 'SS0', property: 'a', renderer: 'bar' },
        { stack: 'SS0', property: 'b', renderer: 'bar' },
        { property: 'c', renderer: 'bar' }
      ],
      seriesStacks: [{ id: 'SS0' }]
    });
  }

  it('handles a filtered stacked series alongside a filtered unstacked series', () => {
    const config = stackedPlusUnstackedConfig();
    const chartData = getChartData(config, new ArrayOfObjectsDataProvider(rows), { S1: true, S2: true });
    expect(() => getChartAnimationData(config, null, chartData)).not.toThrow();
  });

  it('does not leak stack priors into later charts', () => {
    const stackedConfig = stackedPlusUnstackedConfig();
    const stackedData = getChartData(stackedConfig, new ArrayOfObjectsDataProvider(rows), { S1: true });
    getChartAnimationData(stackedConfig, null, stackedData);

    const plainConfig = makeConfig({
      categoryAxis: { property: 'g', type: 'number', scale: 'ordinal' },
      series: [
        { property: 'a', renderer: 'bar' },
        { property: 'b', renderer: 'bar' }
      ]
    });
    const plainData = getChartData(plainConfig, new ArrayOfObjectsDataProvider(rows), { S1: true });
    expect(() => getChartAnimationData(plainConfig, null, plainData)).not.toThrow();
  });

  // Regression: the filtered map shallow-copied only the map, so the filtered
  // stack/prior writes mutated the raw side's value objects in place.
  it('keeps raw priors intact when a stacked series is filtered at mount', () => {
    const config = makeConfig({
      categoryAxis: { property: 'g', type: 'number', scale: 'ordinal' },
      series: [
        { stack: 'SS0', property: 'a', renderer: 'bar' },
        { stack: 'SS0', property: 'b', renderer: 'bar' },
        { stack: 'SS0', property: 'c', renderer: 'bar' }
      ],
      seriesStacks: [{ id: 'SS0' }]
    });
    const chartData = getChartData(config, new ArrayOfObjectsDataProvider(rows), { S0: true });
    const changeData = getInitialValueChangeData(config, chartData);
    const raw = changeData.start.seriesData.raw.values;
    const filtered = changeData.start.seriesData.filtered.values;

    // raw ignores filtering: S1 stacks on S0, so its prior is a real array
    expect(raw['S1'].prior).not.toBeNull();
    // filtered: S0 is gone, so S1 has no prior and S2's prior is S1's stack
    expect(filtered['S1'].prior).toBeNull();
    expect(filtered['S2'].prior).toBe(filtered['S1'].stack);
    expect(raw['S2'].prior).not.toBe(filtered['S2'].prior);
  });
});

// Legend toggle of a stacked series between two chart datas: the filtered start/end value objects
// and their deltas come from getFilteredSeriesValueObjectsWithChanges + setStackBaseValuesForChanges.
describe('getTransitionValueChangeData for a stacked series legend toggle', () => {
  const config = makeConfig({
    categoryAxis: { property: 'g', type: 'number', scale: 'ordinal' },
    series: [
      { stack: 'SS0', property: 'a', renderer: 'bar' },
      { stack: 'SS0', property: 'b', renderer: 'bar' },
      { stack: 'SS0', property: 'c', renderer: 'bar' }
    ],
    seriesStacks: [{ id: 'SS0' }]
  });
  const rows = [
    { g: 0, a: 5, b: 3, c: 2 },
    { g: 1, a: 4, b: 6, c: 1 }
  ];
  const changedRows = [
    { g: 0, a: 1, b: 3, c: 9 },
    { g: 1, a: 8, b: 6, c: 1 }
  ];
  const dataFor = (r: Record<string, number>[], filtered: Record<string, boolean>) =>
    getChartData(config, new ArrayOfObjectsDataProvider(r), filtered);
  const transition = (prev: ChartData, next: ChartData) =>
    getTransitionValueChangeData(config, prev, next, getCategoryDeltaData(config.categoryAxis, prev.categoryData, next.categoryData));

  it('filtering the middle series collapses it onto its prior and drops the series above it', () => {
    const vcd = transition(dataFor(rows, {}), dataFor(rows, { S1: true }));
    const start = vcd.start.seriesData.filtered.values;
    const end = vcd.end.seriesData.filtered.values;

    // start is the unfiltered stack
    expect(start['S1'].stack).toEqual([8, 10]);
    expect(start['S1'].prior).toEqual([5, 4]);
    expect(start['S2'].prior).toEqual([8, 10]);
    // end: S1 keeps its slot but has zero height, S2 sits directly on S0
    expect(end['S1'].prior).toEqual([5, 4]);
    expect(end['S1'].stack).toEqual([5, 4]);
    expect(end['S1'].plain).toEqual([0, 0]);
    expect(end['S2'].prior).toEqual([5, 4]);
    expect(end['S2'].stack).toEqual([7, 5]);
    // the data did not change, so the raw side has nothing to animate
    expect(vcd.deltas.raw.deltaPercentage).toBe(0);

    const filtered = vcd.deltas.filtered.deltas as any;
    // S0 sits below the toggled series and stays a copy of the raw values
    expect(filtered.S0.deltaCopied).toBe(true);
    expect(filtered.S1.stack.deltas).toEqual([-3, -6]);
    expect(filtered.S1.prior.deltaPercentage).toBe(0);
    expect(filtered.S2.stack.deltas).toEqual([-3, -6]);
    expect(filtered.S2.prior.deltas).toEqual([-3, -6]);
  });

  it('unfiltering grows the returning series out of its prior', () => {
    const vcd = transition(dataFor(rows, { S1: true }), dataFor(rows, {}));
    const start = vcd.start.seriesData.filtered.values;
    const end = vcd.end.seriesData.filtered.values;

    expect(start['S1'].stack).toEqual([5, 4]);
    expect(start['S1'].stack).toEqual(start['S1'].prior);
    expect(start['S2'].prior).toEqual([5, 4]);
    expect(end['S1'].stack).toEqual([8, 10]);
    expect(end['S1'].prior).toEqual([5, 4]);
    expect(end['S2'].prior).toEqual([8, 10]);
    expect(end['S2'].stack).toEqual([10, 11]);
    expect(vcd.deltas.raw.deltaPercentage).toBe(0);

    const filtered = vcd.deltas.filtered.deltas as any;
    expect(filtered.S1.stack.deltas).toEqual([3, 6]);
    expect(filtered.S2.prior.deltas).toEqual([3, 6]);
    expect(filtered.S2.stack.deltas).toEqual([3, 6]);
  });

  it('paces the collapsing series and the series above it as one stack', () => {
    const vcd = transition(dataFor(rows, {}), dataFor(changedRows, { S1: true }));
    const filtered = vcd.deltas.filtered.deltas as any;
    const stackPercentages = [filtered.S1.stack, filtered.S1.prior, filtered.S2.stack, filtered.S2.prior]
      .map(d => d.deltaPercentage);
    // the biggest stack edge move sets the shared percentage
    expect(stackPercentages[0]).toBeGreaterThan(0);
    for (const percentage of stackPercentages) {
      expect(percentage).toBe(stackPercentages[0]);
    }
    for (const delta of [filtered.S1.stack, filtered.S1.prior, filtered.S2.stack, filtered.S2.prior]) {
      expect(delta.deltaFactor).toBeGreaterThanOrEqual(1);
    }
    expect(vcd.deltaPercentage).toBeGreaterThanOrEqual(vcd.deltas.filtered.deltaPercentage);
    // both edges of the collapsing series land on the new stack
    const end = vcd.end.seriesData.filtered.values;
    expect(end['S1'].prior).toEqual([1, 8]);
    expect(end['S1'].stack).toEqual([1, 8]);
    expect(end['S2'].prior).toEqual([1, 8]);
    expect(end['S2'].stack).toEqual([10, 9]);
  });

  it('fills an added category from the priors when filtering', () => {
    const addedRows = [...rows, { g: 2, a: 2, b: 2, c: 7 }];
    const vcd = transition(dataFor(rows, {}), dataFor(addedRows, { S1: true }));
    const start = vcd.start.seriesData.filtered.values;
    const end = vcd.end.seriesData.filtered.values;

    // the new category starts as a zero-height stack and grows into place
    expect(start['S0'].stack).toEqual([5, 4, 0]);
    expect(start['S1'].prior).toEqual([5, 4, 0]);
    expect(start['S1'].stack).toEqual([8, 10, 0]);
    expect(start['S2'].prior).toEqual([8, 10, 0]);
    expect(start['S2'].stack).toEqual([10, 11, 0]);
    expect(end['S1'].prior).toEqual([5, 4, 2]);
    expect(end['S1'].stack).toEqual([5, 4, 2]);
    expect(end['S2'].prior).toEqual([5, 4, 2]);
    expect(end['S2'].stack).toEqual([7, 5, 9]);
    for (const seriesId of ['S0', 'S1', 'S2']) {
      for (const values of [start[seriesId].stack, start[seriesId].prior, end[seriesId].stack, end[seriesId].prior]) {
        expect(values!.some(Number.isNaN)).toBe(false);
      }
    }
  });

  describe('mid-tween stack contiguity', () => {
    const tweenFor = (percentage: number) => {
      const cad = getChartAnimationData(config, dataFor(rows, {}), dataFor(changedRows, { S1: true }));
      return getChartDataForValueDelta(config, cad, percentage).seriesData.filtered.values;
    };

    it('keeps the series above the collapsing one glued to its top edge', () => {
      for (const percentage of [0.25, 0.5, 0.75]) {
        const values = tweenFor(percentage);
        expect(values['S2'].prior).toEqual(values['S1'].stack);
      }
    });

    // Regression: S0's filtered stack is a raw copy paced by the raw stack sync while S1's prior was
    // paced by the filtered one, so the collapsing bar detached from the bar below it.
    it('keeps the collapsing series glued to the top edge of the series below it', () => {
      for (const percentage of [0.25, 0.5, 0.75]) {
        const values = tweenFor(percentage);
        expect(values['S1'].prior).toEqual(values['S0'].stack);
      }
    });
  });
});
