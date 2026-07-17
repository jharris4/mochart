import { describe, it, expect } from 'vitest';
import { isObject, getValueOrDefault } from '../../src/config/defaults/utils';
import { conditionalDefault, getActualDefaults, defaultRule } from '../../src/config/defaults/conditionalDefault';

describe('isObject', () => {
  it('is true for plain objects and arrays', () => {
    expect(isObject({})).toBe(true);
    expect(isObject([])).toBe(true);
  });

  it('is false for null, undefined and primitives', () => {
    expect(isObject(null)).toBe(false);
    expect(isObject(undefined)).toBe(false);
    expect(isObject(5)).toBe(false);
    expect(isObject('x')).toBe(false);
  });
});

describe('getValueOrDefault', () => {
  const defaults = { a: 1, b: 2 };

  it('returns the configured value when present', () => {
    expect(getValueOrDefault({ a: 9 }, defaults, 'a')).toBe(9);
  });

  it('falls back to the default when the key is undefined', () => {
    expect(getValueOrDefault({ a: 9 }, defaults, 'b')).toBe(2);
  });

  it('falls back to the default when the config is null or undefined', () => {
    expect(getValueOrDefault(null, defaults, 'a')).toBe(1);
    expect(getValueOrDefault(undefined, defaults, 'a')).toBe(1);
  });

  it('treats an explicit undefined value as absent but keeps other falsy values', () => {
    expect(getValueOrDefault({ a: undefined }, defaults, 'a')).toBe(1);
    expect(getValueOrDefault({ a: 0 }, { a: 1 }, 'a')).toBe(0);
  });
});

describe('conditionalDefault', () => {
  it('returns the default of the first matching rule', () => {
    const fn = conditionalDefault(
      [
        { condition: (c: { big: boolean }) => c.big, suffix: null, default: 'large' },
        { ...defaultRule, default: 'small' }
      ],
      { big: true },
      undefined
    );
    expect(fn()).toBe('large');
  });

  it('falls through to the always-true default rule', () => {
    const fn = conditionalDefault(
      [
        { condition: (c: { big: boolean }) => c.big, suffix: null, default: 'large' },
        { ...defaultRule, default: 'small' }
      ],
      { big: false },
      undefined
    );
    expect(fn()).toBe('small');
  });

  it('exposes the rules on the returned function', () => {
    const rules = [{ ...defaultRule, default: 1 }];
    const fn = conditionalDefault(rules, {}, undefined);
    expect(fn.rules).toBe(rules);
  });

  it('passes the extra argument through to conditions', () => {
    const fn = conditionalDefault(
      [
        { condition: (_c: object, threshold: number) => threshold > 10, suffix: null, default: 'high' },
        { ...defaultRule, default: 'low' }
      ],
      {},
      20
    );
    expect(fn()).toBe('high');
  });
});

describe('getActualDefaults', () => {
  it('invokes each default thunk and collects the results', () => {
    const actual = getActualDefaults({
      a: () => 1,
      b: () => 'two'
    });
    expect(actual).toEqual({ a: 1, b: 'two' });
  });
});
