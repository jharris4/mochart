import { describe, it, expect } from 'vitest';
import { getStackData, getStackDataWithMutations } from '../../src/data/StackData';
import { getChartData } from '../../src/data/ChartData';
import { makeConfig, ArrayOfObjectsDataProvider } from './fixtures';

function stackedSetup(rows: Record<string, number>[]) {
  const config = makeConfig({
    categoryAxis: { property: 'c', type: 'number', scale: 'ordinal' },
    series: [
      { stack: 'SS0', property: 'a', renderer: 'bar' },
      { stack: 'SS0', property: 'b', renderer: 'bar' }
    ],
    seriesStacks: [{ id: 'SS0' }]
  });
  const chartData = getChartData(config, new ArrayOfObjectsDataProvider(rows), {});
  return { config, chartData };
}

describe('getStackData', () => {
  it('records the outermost positive and negative series per category', () => {
    // category 0: both series positive -> S1 is the outer (last-stacked) positive
    // category 1: both series negative -> S1 is the outer negative
    const { config, chartData } = stackedSetup([
      { c: 0, a: 5, b: 3 },
      { c: 1, a: -2, b: -4 }
    ]);
    const stackData = getStackData(config, chartData);
    expect(stackData.outerPositiveSeriesIds).toEqual({ SS0: ['S1', undefined] });
    expect(stackData.outerNegativeSeriesIds).toEqual({ SS0: [undefined, 'S1'] });
  });

  it('classifies by cumulative stack value and leaves holes for absent signs', () => {
    // category 0: a=4 (cumulative 4), b=0 (cumulative still 4) -> both cumulative
    //          totals are positive, so the outer positive is S1; no negatives.
    // category 1: everything is zero -> neither sign contributes, all holes.
    const { config, chartData } = stackedSetup([
      { c: 0, a: 4, b: 0 },
      { c: 1, a: 0, b: 0 }
    ]);
    const stackData = getStackData(config, chartData);
    expect(stackData.outerPositiveSeriesIds.SS0).toEqual(['S1', undefined]);
    expect(stackData.outerNegativeSeriesIds.SS0).toEqual([undefined, undefined]);
  });

  it('skips undefined stack values via the positive/negative guards', () => {
    // category 0: only a (S0) has a value -> S0 is the outer positive, b is a hole
    // category 1: only b (S1) has a value -> S1 is the outer positive, a is a hole
    const { config, chartData } = stackedSetup([
      { c: 0, a: 5 },
      { c: 1, b: 3 }
    ]);
    const stackData = getStackData(config, chartData);
    expect(stackData.outerPositiveSeriesIds.SS0).toEqual(['S0', 'S1']);
    // no negative contributors anywhere
    expect(stackData.outerNegativeSeriesIds.SS0).toEqual([undefined, undefined]);
  });

  it('mirrors raw ids into the filtered ids when nothing is filtered', () => {
    const { config, chartData } = stackedSetup([
      { c: 0, a: 5, b: 3 }
    ]);
    const stackData = getStackData(config, chartData);
    expect(stackData.filteredOuterPositiveSeriesIds).toEqual(stackData.outerPositiveSeriesIds);
    expect(stackData.filteredOuterNegativeSeriesIds).toEqual(stackData.outerNegativeSeriesIds);
  });
});

describe('getStackDataWithMutations', () => {
  it('produces stack data equal to a fresh computation', () => {
    const { config, chartData } = stackedSetup([
      { c: 0, a: 5, b: 3 },
      { c: 1, a: -2, b: -4 }
    ]);
    const fresh = getStackData(config, chartData);
    const mutated = getStackDataWithMutations(null, config, chartData);
    expect(mutated).toEqual(fresh);
  });
});
