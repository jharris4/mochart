import { describe, it, expect } from 'vitest';
import { getFocusAnimationData } from '../../src/animation/FocusAnimationData';
import type { FocusData } from '../../src/types/animation';
import type { MochartConfig } from '../../src/types/config';

const config = {} as MochartConfig;

function focusData(overrides: Partial<FocusData> = {}): FocusData {
  return {
    focusedGroupIndex: -1,
    focusedSeriesAxisId: null,
    focusedSeriesId: null,
    groupFocusPercentages: [0, 0, 0],
    seriesAxisFocusPercentages: { SA0: 0, SA1: 0 },
    seriesFocusPercentages: { S0: 0, S1: 0 },
    groupFocusDomainPercentages: [0],
    seriesAxisFocusDomainPercentages: [0],
    seriesFocusDomainPercentages: [0],
    seriesAxisComputedFocusDomainPercentages: { SA0: [0] },
    ...overrides
  };
}

describe('getFocusAnimationData', () => {
  it('reports no delta when nothing changed', () => {
    const start = focusData();
    const end = focusData();
    const data = getFocusAnimationData(config, start, end);
    expect(data.deltaPercentage).toBe(0);
    expect(data.group.deltas).toEqual([0, 0, 0]);
    expect(data.group.deltaPercentages).toBeNull();
    expect(data.group.deltaFactors).toBeNull();
    expect(data.seriesAxis.deltaPercentages).toBeNull();
    expect(data.series.deltaPercentages).toBeNull();
    expect(data.start).toBe(start);
    expect(data.end).toBe(end);
    expect(data.final).toBe(end);
  });

  it('computes group deltas, percentages and factors relative to the largest delta', () => {
    const start = focusData({ groupFocusPercentages: [0, 1, 0.5] });
    const end = focusData({ groupFocusPercentages: [1, 1, 0.75] });
    const data = getFocusAnimationData(config, start, end);
    expect(data.group.deltas).toEqual([1, 0, 0.25]);
    expect(data.group.deltaPercentage).toBe(1);
    // unchanged entries get 0, others are scaled by the max delta
    expect(data.group.deltaPercentages).toEqual([1, 0, 0.25]);
    expect(data.group.deltaFactors).toEqual([1, 0, 4]);
    expect(data.deltaPercentage).toBe(1);
  });

  it('treats null focus percentages as zero', () => {
    const start = focusData({ groupFocusPercentages: [null, 1] });
    const end = focusData({ groupFocusPercentages: [1, null] });
    const data = getFocusAnimationData(config, start, end);
    expect(data.group.deltas).toEqual([1, -1]);
    expect(data.group.deltaPercentage).toBe(1);
  });

  it('computes series axis map deltas with mixed changed and unchanged entries', () => {
    const start = focusData({ seriesAxisFocusPercentages: { SA0: 0, SA1: 0.5 } });
    const end = focusData({ seriesAxisFocusPercentages: { SA0: 0.5, SA1: 0.5 } });
    const data = getFocusAnimationData(config, start, end);
    expect(data.seriesAxis.deltas).toEqual({ SA0: 0.5, SA1: 0 });
    expect(data.seriesAxis.deltaPercentage).toBe(0.5);
    expect(data.seriesAxis.deltaPercentages).toEqual({ SA0: 1, SA1: 0 });
    expect(data.seriesAxis.deltaFactors).toEqual({ SA0: 1, SA1: 0 });
  });

  it('computes series map deltas and scales smaller deltas against the largest', () => {
    const start = focusData({ seriesFocusPercentages: { S0: 0, S1: 0 } });
    const end = focusData({ seriesFocusPercentages: { S0: 1, S1: 0.25 } });
    const data = getFocusAnimationData(config, start, end);
    expect(data.series.deltas).toEqual({ S0: 1, S1: 0.25 });
    expect(data.series.deltaPercentage).toBe(1);
    expect(data.series.deltaPercentages).toEqual({ S0: 1, S1: 0.25 });
    expect(data.series.deltaFactors).toEqual({ S0: 1, S1: 4 });
  });

  it('takes the overall delta from the largest of group, axis and series deltas', () => {
    const start = focusData();
    const end = focusData({
      groupFocusPercentages: [0.25, 0, 0],
      seriesAxisFocusPercentages: { SA0: 0.75, SA1: 0 },
      seriesFocusPercentages: { S0: 0.5, S1: 0 }
    });
    const data = getFocusAnimationData(config, start, end);
    expect(data.group.deltaPercentage).toBe(0.25);
    expect(data.seriesAxis.deltaPercentage).toBe(0.75);
    expect(data.series.deltaPercentage).toBe(0.5);
    expect(data.deltaPercentage).toBe(0.75);
  });
});
