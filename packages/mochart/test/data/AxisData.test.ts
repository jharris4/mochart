import { describe, it, expect } from 'vitest';
import { getCategorySpacingInfo } from '../../src/data/AxisData';
import type { CategoryAxisConfig } from '../../src/types/config';
import type { CategoryAxisDomain } from '../../src/types/data';

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
