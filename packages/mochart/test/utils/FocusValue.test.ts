import { describe, it, expect } from 'vitest';
import {
  getFocusValue,
  getGroupFocusPercentage,
  getAggregateSeriesFocusPercentage,
  getFocusedDefocused,
  getFocusPercentageColor,
  getAxisFocusColor,
  getAxisFocusOpacity
} from '../../src/utils/FocusValue';
import type { SeriesConfig } from '../../src/types/config';

const NORMAL = 10;
const FOCUSED = 20;
const DEFOCUSED = 5;

describe('getFocusValue', () => {
  it('returns the normal value for null or 0 focus', () => {
    expect(getFocusValue(null, NORMAL, FOCUSED, DEFOCUSED)).toBe(NORMAL);
    expect(getFocusValue(0, NORMAL, FOCUSED, DEFOCUSED)).toBe(NORMAL);
  });

  it('interpolates toward the focused value for positive focus', () => {
    // 10 + 1 * (20 - 10) = 20 at full focus; half focus is midway
    expect(getFocusValue(1, NORMAL, FOCUSED, DEFOCUSED)).toBe(20);
    expect(getFocusValue(0.5, NORMAL, FOCUSED, DEFOCUSED)).toBe(15);
  });

  it('interpolates toward the defocused value for negative focus', () => {
    // 10 + (-1) * (10 - 5) = 5 at full defocus
    expect(getFocusValue(-1, NORMAL, FOCUSED, DEFOCUSED)).toBe(5);
    expect(getFocusValue(-0.5, NORMAL, FOCUSED, DEFOCUSED)).toBe(7.5);
  });
});

describe('getGroupFocusPercentage / combined focus', () => {
  it('returns null when both are null', () => {
    expect(getGroupFocusPercentage(null, null)).toBe(null);
  });

  it('returns the other side when one is null or 0', () => {
    expect(getGroupFocusPercentage(null, 0.5)).toBe(0.5);
    expect(getGroupFocusPercentage(0, 0.5)).toBe(0.5);
    expect(getGroupFocusPercentage(0.5, null)).toBe(0.5);
    expect(getGroupFocusPercentage(0.5, 0)).toBe(0.5);
  });

  it('takes the strongest defocus (min) when both are negative', () => {
    expect(getGroupFocusPercentage(-0.2, -0.8)).toBe(-0.8);
  });

  it('takes the strongest focus (max) otherwise', () => {
    expect(getGroupFocusPercentage(0.2, 0.8)).toBe(0.8);
    expect(getGroupFocusPercentage(-0.2, 0.8)).toBe(0.8);
  });
});

describe('getAggregateSeriesFocusPercentage', () => {
  const cfg = (id: string): SeriesConfig => ({ id } as SeriesConfig);

  it('is null when no series has a focus percentage', () => {
    expect(getAggregateSeriesFocusPercentage([cfg('a'), cfg('b')], { a: null, b: null })).toBe(null);
  });

  it('returns the maximum focus percentage across series', () => {
    expect(getAggregateSeriesFocusPercentage([cfg('a'), cfg('b'), cfg('c')], { a: 0.2, b: null, c: 0.9 })).toBe(0.9);
  });
});

describe('getFocusedDefocused', () => {
  it('classifies null as neither', () => {
    expect(getFocusedDefocused(null)).toEqual({ focused: false, defocused: false });
  });

  it('classifies positive as focused and negative as defocused', () => {
    expect(getFocusedDefocused(0.5)).toEqual({ focused: true, defocused: false });
    expect(getFocusedDefocused(-0.5)).toEqual({ focused: false, defocused: true });
  });
});

describe('getFocusPercentageColor', () => {
  it('picks the color matching the focus state', () => {
    expect(getFocusPercentageColor(0.5, 'n', 'f', 'd')).toBe('f');
    expect(getFocusPercentageColor(-0.5, 'n', 'f', 'd')).toBe('d');
    expect(getFocusPercentageColor(null, 'n', 'f', 'd')).toBe('n');
  });
});

describe('getAxisFocusColor', () => {
  it('returns the normal color when either percentage is undefined', () => {
    expect(getAxisFocusColor(undefined, 0.5, true, 'n', 'f', 'd')).toBe('n');
    expect(getAxisFocusColor(0.5, undefined, true, 'n', 'f', 'd')).toBe('n');
  });

  it('uses the axis focus when it is set', () => {
    expect(getAxisFocusColor(0.5, -0.5, true, 'n', 'f', 'd')).toBe('f');
  });

  it('falls back to series focus when the axis focus is null and useSeriesFocus is set', () => {
    expect(getAxisFocusColor(null, -0.5, true, 'n', 'f', 'd')).toBe('d');
  });

  it('stays normal when the axis focus is null and series focus is disabled', () => {
    expect(getAxisFocusColor(null, 0.5, false, 'n', 'f', 'd')).toBe('n');
  });
});

describe('getAxisFocusOpacity', () => {
  it('returns the normal opacity when either percentage is undefined', () => {
    expect(getAxisFocusOpacity(undefined, 0.5, true, NORMAL, FOCUSED, DEFOCUSED)).toBe(NORMAL);
  });

  it('returns the normal opacity when both percentages are null', () => {
    expect(getAxisFocusOpacity(null, null, true, NORMAL, FOCUSED, DEFOCUSED)).toBe(NORMAL);
  });

  it('combines axis and series focus when useSeriesFocus is set', () => {
    // combined(null, 1) => 1, then getFocusValue(1, ...) => FOCUSED
    expect(getAxisFocusOpacity(null, 1, true, NORMAL, FOCUSED, DEFOCUSED)).toBe(FOCUSED);
  });

  it('uses only the axis focus when useSeriesFocus is false', () => {
    expect(getAxisFocusOpacity(1, null, false, NORMAL, FOCUSED, DEFOCUSED)).toBe(FOCUSED);
  });
});
