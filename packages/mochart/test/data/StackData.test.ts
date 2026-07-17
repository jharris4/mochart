import { describe, it, expect } from 'vitest';
import { getStackData, getStackDataWithMutations } from '../../src/data/StackData';
import { getChartData } from '../../src/data/ChartData';
import { makeConfig, ArrayOfObjectsDataProvider } from './fixtures';

function stackedSetup(rows: Record<string, number>[]) {
  const config = makeConfig({
    groupAxisConfig: { property: 'g', type: 'number', scale: 'ordinal' },
    seriesConfigs: [
      { stack: 'SS0', property: 'a', renderer: 'bar' },
      { stack: 'SS0', property: 'b', renderer: 'bar' }
    ],
    seriesStackConfigs: [{ id: 'SS0' }]
  });
  const chartData = getChartData(config, new ArrayOfObjectsDataProvider(rows, 'g'), {});
  return { config, chartData };
}

describe('getStackData', () => {
  it('records the outermost positive and negative series per group', () => {
    // group 0: both series positive -> S1 is the outer (last-stacked) positive
    // group 1: both series negative -> S1 is the outer negative
    const { config, chartData } = stackedSetup([
      { g: 0, a: 5, b: 3 },
      { g: 1, a: -2, b: -4 }
    ]);
    const stackData = getStackData(config, chartData);
    expect(stackData.outerPositiveSeriesIds).toEqual({ SS0: ['S1', undefined] });
    expect(stackData.outerNegativeSeriesIds).toEqual({ SS0: [undefined, 'S1'] });
  });

  it('classifies by cumulative stack value and leaves holes for absent signs', () => {
    // group 0: a=4 (cumulative 4), b=0 (cumulative still 4) -> both cumulative
    //          totals are positive, so the outer positive is S1; no negatives.
    // group 1: everything is zero -> neither sign contributes, all holes.
    const { config, chartData } = stackedSetup([
      { g: 0, a: 4, b: 0 },
      { g: 1, a: 0, b: 0 }
    ]);
    const stackData = getStackData(config, chartData);
    expect(stackData.outerPositiveSeriesIds.SS0).toEqual(['S1', undefined]);
    expect(stackData.outerNegativeSeriesIds.SS0).toEqual([undefined, undefined]);
  });

  it('mirrors raw ids into the filtered ids when nothing is filtered', () => {
    const { config, chartData } = stackedSetup([
      { g: 0, a: 5, b: 3 }
    ]);
    const stackData = getStackData(config, chartData);
    expect(stackData.filteredOuterPositiveSeriesIds).toEqual(stackData.outerPositiveSeriesIds);
    expect(stackData.filteredOuterNegativeSeriesIds).toEqual(stackData.outerNegativeSeriesIds);
  });
});

describe('getStackDataWithMutations', () => {
  it('produces stack data equal to a fresh computation', () => {
    const { config, chartData } = stackedSetup([
      { g: 0, a: 5, b: 3 },
      { g: 1, a: -2, b: -4 }
    ]);
    const fresh = getStackData(config, chartData);
    const mutated = getStackDataWithMutations(null, config, chartData);
    expect(mutated).toEqual(fresh);
  });
});
