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

  // Regression: these checks compared against count.max on a scalar count, so
  // they never fired and an insufficient range froze the page in the
  // generator's uniqueness retry loop.
  describe('group range sufficiency', () => {
    function withGroup(overrides: Record<string, unknown>) {
      return { ...genericConfig, group: { ...genericConfig.group, ...overrides } };
    }

    it('rejects a number range too small for the group count', () => {
      expect(validateRandomConfig(withGroup({ number: { min: 0, max: 5, interval: 1 } }))).toBe(false);
    });

    it('rejects a date range too small for the group count', () => {
      expect(validateRandomConfig(withGroup({
        date: { min: '2014-01-01', max: '2014-01-05', interval: 1, intervalUnit: 'day' }
      }))).toBe(false);
    });

    it('rejects a string range too small for the group count', () => {
      expect(validateRandomConfig(withGroup({ string: { minLength: 1, maxLength: 1 } }))).toBe(false);
    });

    it('accounts for the step-reuse preview lineages', () => {
      // count 12, stepPercentage 1 -> preview lineages need 18 uniques; 15 lattice values is enough for count alone
      const number = { min: 0, max: 14, interval: 1 };
      expect(validateRandomConfig(withGroup({
        count: 12, number, reuse: { globalPercentage: 0, stepPercentage: 1 }
      }))).toBe(false);
      expect(validateRandomConfig(withGroup({
        count: 12, number, reuse: { globalPercentage: 0, stepPercentage: 0 }
      }))).toBe(true);
    });
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
