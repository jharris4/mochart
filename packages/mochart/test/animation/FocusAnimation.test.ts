import { describe, it, expect } from 'vitest';
import { getFocusDataForPercent } from '../../src/animation/FocusAnimation';
import type {
  ArrayFocusDeltaData,
  FocusAnimationData,
  FocusData,
  MapFocusDeltaData
} from '../../src/types/animation';

function focusData(overrides: Partial<FocusData> = {}): FocusData {
  return {
    focusedGroupIndex: 0,
    focusedSeriesAxisId: null,
    focusedSeriesId: null,
    groupFocusPercentages: [0, 0],
    seriesAxisFocusPercentages: { SA0: 0 },
    seriesFocusPercentages: { S0: 0 },
    groupFocusDomainPercentages: [0],
    seriesAxisFocusDomainPercentages: [0],
    seriesFocusDomainPercentages: [0],
    seriesAxisComputedFocusDomainPercentages: { SA0: [0] },
    ...overrides
  };
}

const groupDelta: ArrayFocusDeltaData = {
  start: [0, 0],
  deltas: [1, 1],
  deltaPercentage: 1,
  deltaPercentages: [1, 1],
  deltaFactors: [1, 1],
  end: [1, 1]
};

const seriesAxisDelta: MapFocusDeltaData = {
  start: { SA0: 0 },
  deltas: { SA0: 1 },
  deltaPercentage: 1,
  deltaPercentages: { SA0: 1 },
  deltaFactors: { SA0: 1 },
  end: { SA0: 1 }
};

const seriesDelta: MapFocusDeltaData = {
  start: { S0: 0 },
  deltas: { S0: 1 },
  deltaPercentage: 1,
  deltaPercentages: { S0: 1 },
  deltaFactors: { S0: 1 },
  end: { S0: 1 }
};

function animationData(start: FocusData, end: FocusData): FocusAnimationData {
  return {
    start,
    end,
    final: end,
    deltaPercentage: 1,
    group: groupDelta,
    seriesAxis: seriesAxisDelta,
    series: seriesDelta
  };
}

describe('getFocusDataForPercent', () => {
  it('returns the shared value when start and end are identical', () => {
    const same = focusData();
    const data = animationData(same, same);
    expect(getFocusDataForPercent(data, 0.5)).toBe(same);
  });

  it('returns the start at percentage 0', () => {
    const start = focusData({ focusedGroupIndex: 0 });
    const end = focusData({ focusedGroupIndex: 1 });
    expect(getFocusDataForPercent(animationData(start, end), 0)).toBe(start);
  });

  it('returns the end at percentage 1', () => {
    const start = focusData({ focusedGroupIndex: 0 });
    const end = focusData({ focusedGroupIndex: 1 });
    expect(getFocusDataForPercent(animationData(start, end), 1)).toBe(end);
  });

  it('interpolates the focus percentages at the midpoint', () => {
    const start = focusData({ focusedGroupIndex: 0 });
    const end = focusData({
      focusedGroupIndex: 1,
      groupFocusPercentages: [1, 1],
      seriesAxisFocusPercentages: { SA0: 1 },
      seriesFocusPercentages: { S0: 1 },
      groupFocusDomainPercentages: [1]
    });
    const result = getFocusDataForPercent(animationData(start, end), 0.5);
    // start 0 + percentage 0.5 * deltaFactor 1 * delta 1 = 0.5
    expect(result.groupFocusPercentages).toEqual([0.5, 0.5]);
    expect(result.seriesAxisFocusPercentages).toEqual({ SA0: 0.5 });
    expect(result.seriesFocusPercentages).toEqual({ S0: 0.5 });
    // focused identifiers and domain percentages are taken from the end state
    expect(result.focusedGroupIndex).toBe(1);
    expect(result.groupFocusDomainPercentages).toEqual([1]);
  });

  it('holds a channel at its end value once its delta window has elapsed', () => {
    // deltaPercentages below the requested percentage means the channel has
    // already finished animating and should read straight from the end state
    const start = focusData({ focusedGroupIndex: 0 });
    const end = focusData({ focusedGroupIndex: 1, groupFocusPercentages: [1, 1] });
    const data = animationData(start, end);
    data.group = { ...groupDelta, deltaPercentages: [0.1, 0.1] };
    const result = getFocusDataForPercent(data, 0.5);
    expect(result.groupFocusPercentages).toEqual([1, 1]);
  });
});
