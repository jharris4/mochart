import { describe, it, expect } from 'vitest';
import { isObject, getValueOrDefault } from '../../src/config/defaults/utils';
import { conditionalDefault, getActualDefaults, defaultRule } from '../../src/config/defaults/conditionalDefault';
import { getDefaults } from '../../src/config/defaults/mochartConfig';

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

describe('pie-mode conditional defaults', () => {
  it('hides the axes and unsnaps the tooltip when chartConfig.type is pie', () => {
    const defaults = getDefaults({ version: '1.0.0', chartConfig: { type: 'pie' }, groupAxisConfig: { property: 'p' } }) as {
      groupAxisConfig: { visible: boolean };
      seriesAxisConfigs: { visible: boolean }[];
      tooltipConfig: { snapToGroup: boolean };
      pieConfig: { innerRadiusPercent: number; labelType: string };
    };
    expect(defaults.groupAxisConfig.visible).toBe(false);
    expect(defaults.seriesAxisConfigs[0]!.visible).toBe(false);
    expect(defaults.tooltipConfig.snapToGroup).toBe(false);
    expect(defaults.pieConfig).toEqual(expect.objectContaining({ innerRadiusPercent: 0, labelType: 'percent' }));
  });

  it('derives pieConfig.endAngle from startAngle so rotation never truncates the pie', () => {
    const rotated = getDefaults({ version: '1.0.0', chartConfig: { type: 'pie' }, pieConfig: { startAngle: -90 }, groupAxisConfig: { property: 'p' } }) as {
      pieConfig: { endAngle: number };
    };
    expect(rotated.pieConfig.endAngle).toBe(270);
    const plain = getDefaults({ version: '1.0.0', chartConfig: { type: 'pie' }, groupAxisConfig: { property: 'p' } }) as {
      pieConfig: { endAngle: number };
    };
    expect(plain.pieConfig.endAngle).toBe(360);
  });

  it('keeps the xy defaults when chartConfig.type is omitted', () => {
    const defaults = getDefaults({ version: '1.0.0', groupAxisConfig: { property: 'p' } }) as {
      groupAxisConfig: { visible: boolean };
      seriesAxisConfigs: { visible: boolean }[];
      tooltipConfig: { snapToGroup: boolean };
    };
    expect(defaults.groupAxisConfig.visible).toBe(true);
    expect(defaults.seriesAxisConfigs[0]!.visible).toBe(true);
    expect(defaults.tooltipConfig.snapToGroup).toBe(true);
  });
});
