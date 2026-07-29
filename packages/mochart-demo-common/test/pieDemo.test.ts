import { describe, it, expect } from 'vitest';

import { enhanceConfig } from '@mochart/core';

import demoData from '@mochart/demo-data';

import { getPieSlices, applyPieSliceValue, getPieStepSuppressedIds, getPieSequenceSteps } from '../src/pieDemo';

const pieDemo = demoData.demoObjectMap['pie'];
const donutDemo = demoData.demoObjectMap['donut'];

describe('getPieSlices', () => {
  it('returns one slice per series with id, title and property', () => {
    const slices = getPieSlices(enhanceConfig(pieDemo.config));
    expect(slices).toHaveLength(6);
    expect(slices[0].property).toBe('slice0');
    expect(slices[0].title).toBe('Subscriptions');
    expect(slices.every(slice => typeof slice.id === 'string' && slice.id.length > 0)).toBe(true);
  });
});

describe('applyPieSliceValue', () => {
  it('sets the value and leaves rows without percent columns alone', () => {
    const slices = getPieSlices(enhanceConfig(pieDemo.config));
    const row = { ...pieDemo.data[0] };
    applyPieSliceValue(row, slices, 'slice0', 999);
    expect(row['slice0']).toBe(999);
    expect(row['slice0Percent']).toBeUndefined();
  });

  it('recomputes the precomputed percent columns like createPie', () => {
    const slices = getPieSlices(enhanceConfig(donutDemo.config));
    const row = { ...donutDemo.data[0] };
    applyPieSliceValue(row, slices, slices[0].property, 50);
    let total = 0;
    for (const slice of slices) {
      total += row[slice.property] as number;
    }
    for (const slice of slices) {
      expect(row[slice.property + 'Percent']).toBe(Math.round(((row[slice.property] as number) / total) * 1000) / 10);
    }
  });
});

describe('getPieStepSuppressedIds', () => {
  const ids = ['s0', 's1', 's2', 's3', 's4', 's5'];

  it('suppresses the last (step + chartIndex) mod cycle slices', () => {
    expect(getPieStepSuppressedIds(ids, 0, 0)).toEqual({});
    expect(getPieStepSuppressedIds(ids, 1, 0)).toEqual({ s5: true });
    expect(getPieStepSuppressedIds(ids, 2, 1)).toEqual({ s3: true, s4: true, s5: true });
  });

  it('always keeps at least two slices', () => {
    for (let chartIndex = 0; chartIndex < 4; chartIndex++) {
      for (let step = -3; step < 12; step++) {
        const suppressed = Object.keys(getPieStepSuppressedIds(ids, chartIndex, step)).length;
        expect(ids.length - suppressed).toBeGreaterThanOrEqual(2);
      }
    }
    const gaugeIds = ['a', 'b', 'c'];
    for (let step = 0; step < 5; step++) {
      expect(gaugeIds.length - Object.keys(getPieStepSuppressedIds(gaugeIds, 0, step)).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('getPieSequenceSteps', () => {
  it('suppresses down to two remaining, then restores to empty', () => {
    const steps = getPieSequenceSteps(['a', 'b', 'c', 'd']);
    expect(steps.map(step => Object.keys(step).sort().join(','))).toEqual([
      'd', 'c,d', 'd', ''
    ]);
  });

  it('is empty-ended and short for a three-slice gauge', () => {
    const steps = getPieSequenceSteps(['a', 'b', 'c']);
    expect(steps.map(step => Object.keys(step).sort().join(','))).toEqual(['c', '']);
  });
});
