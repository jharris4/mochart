import { describe, it, expect } from 'vitest';
import { getColumnGenerator } from '../../src/utils/SeriesShapes';
import type { EnhancedSeriesConfig } from '../../src/types/enhanced';
import type { SeriesPositionData, StackData } from '../../src/types/data';

// Regression: the stack outer-cap test indexed raw-category-indexed outer series ids with the
// compacted position index, so once a category was skipped ('connect') caps landed on the wrong segments.
describe('stacked bar outer caps with skipped categories', () => {
  const seriesConfig = {
    id: 'B', stack: 'st', capType: 'point', capSize: 4, capExpand: false,
    capOnlyStackOuter: true, seriesStackConfig: null, barMinExtent: 0
  } as unknown as EnhancedSeriesConfig;

  // three raw categories with the middle one skipped: compacted 0 → raw 0, compacted 1 → raw 2
  const seriesPositionData = {
    length: 2,
    skipped: true,
    skipCategoryIndexMap: { 0: 0, 1: 2 },
    categoryValueExtent: 10,
    getOffsetCategoryPosition: (_: null, i: number) => 20 * i,
    getSeriesExtent: () => 10,
    getSeriesPosition: () => 50,
    getPriorSeriesPosition: () => 80,
    getCurrentSeriesPosition: () => 50
  } as unknown as SeriesPositionData;

  // series B is the outer positive series only at raw category 2
  const stackData = {
    filteredOuterPositiveSeriesIds: { st: ['A', 'A', 'B'] },
    filteredOuterNegativeSeriesIds: { st: [undefined, undefined, undefined] }
  } as unknown as StackData;

  it('caps the segment that is outer at its raw category, not its compacted index', () => {
    const generator = getColumnGenerator(seriesConfig, seriesPositionData, false, stackData);
    // compacted 1 is raw category 2, where B is the outer series — the point cap draws line segments
    expect(generator(1)).toContain('L');
    // compacted 0 is raw category 0, where A is outer — B draws a plain uncapped rect
    expect(generator(0)).not.toContain('L');
  });
});
