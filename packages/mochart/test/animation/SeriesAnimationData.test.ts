import { describe, it, expect } from 'vitest';
import { getChartData } from '../../src/data/ChartData';
import { getChartAnimationData } from '../../src/animation/ChartAnimationData';
import { getInitialValueChangeData } from '../../src/animation/SeriesAnimationData';
import { makeConfig, ArrayOfObjectsDataProvider } from '../data/fixtures';

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
