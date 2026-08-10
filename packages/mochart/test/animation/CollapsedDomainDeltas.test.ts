/**
 * ANIM-2 (value-delta half): `getSeriesValuesDeltas` weights a value change as
 * `maxAbsoluteDelta / valueAxisExtent`, gated on `valueAxisExtent > 0`. A collapsed
 * domain (every value equal) has extent 0 and an inverted one (an explicit `min` above
 * the data) has a negative extent, so both zeroed every value delta and the update was
 * applied instantly with no animation at all — silently, whatever the configured duration.
 */
import { describe, it, expect } from 'vitest';
import { getChartAnimationData } from '../../src/animation/ChartAnimationData';
import { getChartData } from '../../src/data/ChartData';
import { makeConfig, ArrayOfObjectsDataProvider } from '../data/fixtures';

type Row = Record<string, number>;

function deltaPercentageFor(valueAxis: Record<string, unknown>, from: Row[], to: Row[]) {
  const config = makeConfig({
    categoryAxis: { property: 'c', type: 'number', scale: 'ordinal' },
    valueAxes: [valueAxis],
    series: [{ property: 'v', renderer: 'bar' }]
  });
  const prev = getChartData(config, new ArrayOfObjectsDataProvider(from, 'c'), {});
  const next = getChartData(config, new ArrayOfObjectsDataProvider(to, 'c'), {});
  return getChartAnimationData(config, prev, next).valueChangeData.deltaPercentage;
}

describe('value deltas on a degenerate value-axis domain', () => {
  it('animates when every value is equal (collapsed domain)', () => {
    const percentage = deltaPercentageFor({},
      [{ c: 0, v: 7 }, { c: 1, v: 7 }],
      [{ c: 0, v: 9 }, { c: 1, v: 9 }]);
    expect(percentage).toBeGreaterThan(0);
  });

  it('animates on a single data point', () => {
    const percentage = deltaPercentageFor({}, [{ c: 0, v: 7 }], [{ c: 0, v: 9 }]);
    expect(percentage).toBeGreaterThan(0);
  });

  it('animates when an explicit min sits above the data (inverted domain)', () => {
    const percentage = deltaPercentageFor({ min: 100 },
      [{ c: 0, v: 10 }, { c: 1, v: 12 }],
      [{ c: 0, v: 20 }, { c: 1, v: 22 }]);
    expect(percentage).toBeGreaterThan(0);
  });

  it('still reports no change when the values are identical', () => {
    const percentage = deltaPercentageFor({},
      [{ c: 0, v: 7 }, { c: 1, v: 7 }],
      [{ c: 0, v: 7 }, { c: 1, v: 7 }]);
    expect(percentage).toBe(0);
  });

  it('leaves an ordinary domain weighting untouched', () => {
    // extent 20 (0..20 before margins), delta 10 -> well under 1 and unchanged by the fix
    const percentage = deltaPercentageFor({ min: 0, max: 20 },
      [{ c: 0, v: 0 }, { c: 1, v: 20 }],
      [{ c: 0, v: 10 }, { c: 1, v: 20 }]);
    expect(percentage).toBeGreaterThan(0);
    expect(percentage).toBeLessThanOrEqual(1);
  });
});
