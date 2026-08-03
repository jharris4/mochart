import { describe, it, expect } from 'vitest';
import { getChartData } from '../../src/data/ChartData';
import { getChartAnimationData } from '../../src/animation/ChartAnimationData';
import { makeConfig, ArrayOfObjectsDataProvider } from '../data/fixtures';

// Regression: filtered series shared one module-level null value object, so a
// stack-prior write for one filtered series leaked into every other filtered
// series (and later charts), crashing the initial delta computation.
describe('getInitialValueChangeData with filtered series', () => {
  const rows = [
    { g: 0, a: 5, b: 3, c: 2 },
    { g: 1, a: 4, b: 6, c: 1 }
  ];

  function stackedPlusUnstackedConfig() {
    return makeConfig({
      groupAxisConfig: { property: 'g', type: 'number', scale: 'ordinal' },
      seriesConfigs: [
        { stack: 'SS0', property: 'a', renderer: 'bar' },
        { stack: 'SS0', property: 'b', renderer: 'bar' },
        { property: 'c', renderer: 'bar' }
      ],
      seriesStackConfigs: [{ id: 'SS0' }]
    });
  }

  it('handles a filtered stacked series alongside a filtered unstacked series', () => {
    const config = stackedPlusUnstackedConfig();
    const chartData = getChartData(config, new ArrayOfObjectsDataProvider(rows, 'g'), { S1: true, S2: true });
    expect(() => getChartAnimationData(config, null, chartData)).not.toThrow();
  });

  it('does not leak stack priors into later charts', () => {
    const stackedConfig = stackedPlusUnstackedConfig();
    const stackedData = getChartData(stackedConfig, new ArrayOfObjectsDataProvider(rows, 'g'), { S1: true });
    getChartAnimationData(stackedConfig, null, stackedData);

    const plainConfig = makeConfig({
      groupAxisConfig: { property: 'g', type: 'number', scale: 'ordinal' },
      seriesConfigs: [
        { property: 'a', renderer: 'bar' },
        { property: 'b', renderer: 'bar' }
      ]
    });
    const plainData = getChartData(plainConfig, new ArrayOfObjectsDataProvider(rows, 'g'), { S1: true });
    expect(() => getChartAnimationData(plainConfig, null, plainData)).not.toThrow();
  });
});
