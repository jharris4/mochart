import { describe, it, expect, vi, beforeEach } from 'vitest';

import { validateRandomConfig, neutralizeRandomReuse, formatRandomConfig } from '../src/randomConfig';

import type { RandomConfigWithValid } from '../src/types';

const genericConfig = {
  group: {
    count: 15,
    order: { sort: true },
    missing: { probability: 0 },
    reuse: { globalPercentage: 0.5, stepPercentage: 0.5 },
    number: { min: -100, max: 100, interval: 1 },
    string: { minLength: 1, maxLength: 20 },
    date: { min: '2014-01-01', max: '2018-01-01', interval: 30, intervalUnit: 'day' }
  },
  series: {
    number: { min: -500, max: 500, round: true, limitToAxisConfig: true },
    missing: { probability: 0 },
    reuse: { global: false, step: true }
  }
};

const pieConfig = {
  value: { min: 0, max: 420 },
  missing: { probability: 0.25 },
  reuse: { globalPercentage: 0, stepPercentage: 0.5 }
};

const walkConfig = {
  candles: { min: 16, max: 20 },
  price: { min: 90, max: 110, volatility: 0.04 },
  reuse: { step: true }
};

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('validateRandomConfig', () => {
  it('validates the generic schema when no generator is given', () => {
    expect(validateRandomConfig(genericConfig)).toBe(true);
    expect(validateRandomConfig({})).toBe(false);
  });

  it('dispatches to the generator schema', () => {
    expect(validateRandomConfig(pieConfig, 'pie')).toBe(true);
    expect(validateRandomConfig(pieConfig, 'gauge')).toBe(true);
    expect(validateRandomConfig(walkConfig, 'candlestick')).toBe(true);
    expect(validateRandomConfig(walkConfig, 'ohlc')).toBe(true);
  });

  it('rejects the generic shape under a generator schema (old share links)', () => {
    expect(validateRandomConfig(genericConfig, 'pie')).toBe(false);
  });

  it('rejects out-of-range generator settings', () => {
    expect(validateRandomConfig({ ...pieConfig, missing: { probability: 2 } }, 'pie')).toBe(false);
    expect(validateRandomConfig({ ...pieConfig, value: { min: 100, max: 0 } }, 'pie')).toBe(false);
    expect(validateRandomConfig({ ...walkConfig, candles: { min: 0, max: 20 } }, 'candlestick')).toBe(false);
  });

  it('falls back to the generic schema for unknown generator ids', () => {
    expect(validateRandomConfig(genericConfig, 'not-a-generator')).toBe(true);
  });
});

describe('neutralizeRandomReuse', () => {
  it('zeroes the generic group/series reuse settings', () => {
    const neutralized = neutralizeRandomReuse(genericConfig);
    expect(neutralized.group.reuse).toEqual({ globalPercentage: 0, stepPercentage: 0 });
    expect(neutralized.series.reuse).toEqual({ global: false, step: false });
    expect(neutralized.group.count).toBe(15);
    expect(genericConfig.series.reuse.step).toBe(true);
  });

  it('neutralizes a top-level reuse section structurally', () => {
    expect(neutralizeRandomReuse(pieConfig).reuse).toEqual({ globalPercentage: 0, stepPercentage: 0 });
    expect(neutralizeRandomReuse(walkConfig).reuse).toEqual({ step: false });
    expect(pieConfig.reuse.stepPercentage).toBe(0.5);
  });
});

describe('formatRandomConfig', () => {
  it('strips the valid flag and round-trips any schema', () => {
    const formatted = formatRandomConfig({ ...pieConfig, valid: true } as RandomConfigWithValid);
    expect(JSON.parse(formatted)).toEqual(pieConfig);
    expect(formatted.includes('"valid"')).toBe(false);
  });
});
