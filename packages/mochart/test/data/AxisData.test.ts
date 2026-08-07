import { describe, it, expect } from 'vitest';
import { scaleTime, scaleLinear } from 'd3-scale';
import { getCategorySpacingInfo, getCategoryAxisTickData } from '../../src/data/AxisData';
import { makeConfig } from './fixtures';
import type { CategoryAxisConfig } from '../../src/types/config';
import type { AxisScale, CategoryAxisDomain } from '../../src/types/data';
import type { CategoryAxisLayoutInfo } from '../../src/types/layout';

// getCategorySpacingInfo turns a category axis domain + pixel extent into the pixel
// range, per-category extent and offset used to place category values. Only a few
// config fields participate; build small partials.
const axis = (over: Partial<CategoryAxisConfig>): CategoryAxisConfig => ({
  categoryCountPadding: 0,
  minCategoryValueExtent: 0,
  categoryPaddingFraction: { outer: 0 },
  ...over
}) as CategoryAxisConfig;

describe('getCategorySpacingInfo', () => {
  it('spans the full extent when the domain is a single point and there is no padding', () => {
    const info = getCategorySpacingInfo(axis({}), [5, 5] as CategoryAxisDomain, 200);
    expect(info.categoryRange).toEqual([0, 200]);
    expect(info.categoryValueExtent).toBe(200);
    expect(info.categoryValueOffset).toBe(100);
  });

  it('divides the extent evenly across the domain when there is no padding', () => {
    // domain extent 4, pixel extent 200 => 50px per unit
    const info = getCategorySpacingInfo(axis({}), [0, 4] as CategoryAxisDomain, 200);
    expect(info.categoryValueExtent).toBe(50);
    expect(info.categoryRange).toEqual([0, 200]);
  });

  it('reserves half a slot on each end when categoryCountPadding is set', () => {
    // extent / (domainExtent + padding) = 200 / (4 + 1) = 40; range shrinks by 20 each side
    const info = getCategorySpacingInfo(axis({ categoryCountPadding: 1 }), [0, 4] as CategoryAxisDomain, 200);
    expect(info.categoryValueExtent).toBe(40);
    expect(info.categoryRange).toEqual([20, 180]);
  });

  it('shrinks the category value extent by the outer padding fraction', () => {
    // 50px per unit, 20% outer padding => floor(50 * 0.8) = 40
    const info = getCategorySpacingInfo(axis({ categoryPaddingFraction: { outer: 0.2 } as CategoryAxisConfig['categoryPaddingFraction'] }), [0, 4] as CategoryAxisDomain, 200);
    expect(info.categoryValueExtent).toBe(40);
  });

  it('never drops below the configured minimum category value extent', () => {
    const info = getCategorySpacingInfo(axis({ minCategoryValueExtent: 30 }), [0, 100] as CategoryAxisDomain, 200);
    expect(info.categoryValueExtent).toBe(30);
  });

  it('treats a null domain bound as a zero extent', () => {
    const info = getCategorySpacingInfo(axis({}), [null, null] as CategoryAxisDomain, 120);
    expect(info.categoryValueExtent).toBe(120);
  });
});

describe('getCategoryAxisTickData', () => {
  const layout = { tickLabelParallel: false } as CategoryAxisLayoutInfo;

  // Regression: domain() on a d3 time scale returns fresh Date objects, so the
  // old reference comparison drew two identical overlapping ticks.
  it('draws a single tick for a single-category linear date axis', () => {
    const config = makeConfig({ categoryAxis: { property: 'when', type: 'date', scale: 'linear' } });
    const date = new Date('2026-08-07T00:00:00Z');
    const axisScale = scaleTime().domain([date, date]).range([0, 200]) as unknown as AxisScale;
    const ticks = getCategoryAxisTickData(config.categoryAxis, layout, axisScale, [date, date] as CategoryAxisDomain, [date], [100]);
    expect(ticks).toHaveLength(1);
  });

  it('draws a single tick for a single-category linear number axis', () => {
    const config = makeConfig({ categoryAxis: { property: 'x', type: 'number', scale: 'linear' } });
    const axisScale = scaleLinear().domain([5, 5]).range([0, 200]) as unknown as AxisScale;
    const ticks = getCategoryAxisTickData(config.categoryAxis, layout, axisScale, [5, 5] as CategoryAxisDomain, [5], [100]);
    expect(ticks).toHaveLength(1);
  });
});
