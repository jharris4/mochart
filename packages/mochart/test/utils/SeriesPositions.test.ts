import { describe, it, expect } from 'vitest';
import { getSeriesPositionData } from '../../src/utils/SeriesPositions';
import { enhanceConfig } from '../../src';
import type { MochartInputConfig } from '../../src';
import type { AxisScale, SeriesValueObject } from '../../src/types/data';
import type { LayoutInfo } from '../../src/types/layout';
import type { EnhancedMochartConfig } from '../../src/types/enhanced';

// Horizontal-waterfall shape: ranged bars with the skip flags createWaterfall
// emits, series axis based at the domain minimum.
const config = enhanceConfig({
  version: '1.0.0',
  plot: { inverted: true },
  categoryAxis: { property: 'step', type: 'string', scale: 'ordinal' },
  valueAxes: [{ base: 0 }],
  series: [{ property: 'end', rangeProperty: 'start', renderer: 'bar', skipMissing: true, skipPartialRange: true }]
} as unknown as MochartInputConfig) as unknown as EnhancedMochartConfig;

// An inverted series axis ranges [0, extent], so the domain minimum maps to
// pixel 0 exactly - the value the old || fallback treated as missing.
const scale = Object.assign((value: unknown) => (value as number) * 10, {
  domain: () => [0, 30],
  range: () => [0, 300]
}) as unknown as AxisScale;

const categoryValueData = {
  spacingInfo: { categoryRange: [0, 300] as [number, number], categoryValueExtent: 40, categoryValueOffset: 0 },
  positions: [0, 100, 200]
};

const valueObject = { min: [0, 10, 20], max: [10, 20, 30] } as unknown as SeriesValueObject;
const layoutInfo = { inverted: true } as unknown as LayoutInfo;

describe('getSeriesPositionData with a pixel-0 prior position', () => {
  const positionData = getSeriesPositionData(config.categoryAxis, config.series[0],
    categoryValueData, scale, valueObject, layoutInfo);

  it('keeps the first bar spanning from pixel 0 instead of collapsing it', () => {
    expect(positionData.getPriorSeriesPosition(null, 0)).toBe(0);
    expect(positionData.getCurrentSeriesPosition(null, 0)).toBe(100);
    expect(positionData.getSeriesExtent(null, 0)).toBe(100);
  });

  it('leaves bars with nonzero priors untouched', () => {
    expect(positionData.getPriorSeriesPosition(null, 1)).toBe(100);
    expect(positionData.getSeriesExtent(null, 1)).toBe(100);
    expect(positionData.getSeriesExtent(null, 2)).toBe(100);
  });
});
