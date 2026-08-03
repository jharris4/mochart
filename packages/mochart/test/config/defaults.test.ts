import { describe, it, expect } from 'vitest';
import { isObject, getValueOrDefault } from '../../src/config/defaults/utils';
import { conditionalDefault, getActualDefaults, defaultRule } from '../../src/config/defaults/conditionalDefault';
import { deepMerge } from '../../src/config/core/deepMerge';
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

  it('recurses into a nested map so a conditional default can target a nested path', () => {
    const actual = getActualDefaults({
      renderer: () => 'bar',
      shapeStyle: {
        normal: { fillOpacity: () => 0.8 },
        focused: { fillOpacity: () => 1 }
      }
    });
    expect(actual).toEqual({
      renderer: 'bar',
      shapeStyle: { normal: { fillOpacity: 0.8 }, focused: { fillOpacity: 1 } }
    });
  });

  it('leaves the members of a nested default the recursion does not name alone', () => {
    // the conditional map names one member and deepMerge keeps the siblings
    const regularDefaults = { shapeStyle: { normal: { strokeColor: '#000000', fillOpacity: 0.5 } } };
    const conditionalDefaults = getActualDefaults({
      shapeStyle: { normal: { fillOpacity: () => 0.9 } }
    });
    expect(deepMerge(regularDefaults, conditionalDefaults))
      .toEqual({ shapeStyle: { normal: { strokeColor: '#000000', fillOpacity: 0.9 } } });
  });
});

describe('tooltip defaults', () => {
  it('matches icon size to the font by default', () => {
    const automatic = getDefaults({
      version: '1.0.0',
      groupAxisConfig: { property: 'p' }
    }) as { tooltipConfig: { iconSize: string | number } };

    expect(automatic.tooltipConfig.iconSize).toBe('auto');
  });
});

describe('legend defaults', () => {
  it('matches icon size to the measured text height by default', () => {
    const defaults = getDefaults({
      version: '1.0.0',
      groupAxisConfig: { property: 'p' }
    }) as { legendConfig: { iconSize: string | number } };

    expect(defaults.legendConfig.iconSize).toBe('auto');
  });
});

describe('series color-icon defaults', () => {
  function showColorFlags(shapeStyle?: Record<string, unknown>) {
    const defaults = getDefaults({
      version: '1.0.0',
      groupAxisConfig: { property: 'p' },
      seriesConfigs: [{ property: 'a', ...(shapeStyle ? { shapeStyle } : {}) }]
    }) as { seriesConfigs: { showColorInLegend: boolean; showColorInTooltip: boolean }[] };
    const { showColorInLegend, showColorInTooltip } = defaults.seriesConfigs[0]!;
    return { showColorInLegend, showColorInTooltip };
  }

  it('shows the color icon for a series with a color of its own', () => {
    expect(showColorFlags()).toEqual({ showColorInLegend: true, showColorInTooltip: true });
  });

  it('hides the color icon for a series colored by group index', () => {
    // every group paints it differently, so a single swatch would be arbitrary
    expect(showColorFlags({ normal: { strokeColor: 'groupIndex', fillColor: 'groupIndex' } }))
      .toEqual({ showColorInLegend: false, showColorInTooltip: false });
    // either member is enough
    expect(showColorFlags({ normal: { fillColor: 'groupIndex' } }))
      .toEqual({ showColorInLegend: false, showColorInTooltip: false });
    expect(showColorFlags({ normal: { strokeColor: 'groupIndex' } }))
      .toEqual({ showColorInLegend: false, showColorInTooltip: false });
  });

  it('keeps the icon when only a focus state names the group index', () => {
    expect(showColorFlags({ focused: { fillColor: 'groupIndex' } }))
      .toEqual({ showColorInLegend: true, showColorInTooltip: true });
  });
});

describe('pie-mode conditional defaults', () => {
  it('hides the axes and unsnaps the tooltip when chartConfig.type is pie', () => {
    const defaults = getDefaults({ version: '1.0.0', chartConfig: { type: 'pie' }, groupAxisConfig: { property: 'p' } }) as {
      groupAxisConfig: { visible: boolean };
      seriesAxisConfigs: { visible: boolean }[];
      tooltipConfig: { snapToGroup: boolean; showGroup: boolean };
      pieConfig: { innerRadiusPercent: number; labelType: string };
    };
    expect(defaults.groupAxisConfig.visible).toBe(false);
    expect(defaults.seriesAxisConfigs[0]!.visible).toBe(false);
    expect(defaults.tooltipConfig.snapToGroup).toBe(false);
    expect(defaults.tooltipConfig.showGroup).toBe(false);
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
      tooltipConfig: { snapToGroup: boolean; showGroup: boolean };
    };
    expect(defaults.groupAxisConfig.visible).toBe(true);
    expect(defaults.seriesAxisConfigs[0]!.visible).toBe(true);
    expect(defaults.tooltipConfig.snapToGroup).toBe(true);
    expect(defaults.tooltipConfig.showGroup).toBe(true);
  });
});

// Regression: the seriesStackConfigs stack-axis map iterated the raw section
// unfiltered, so junk that validation is supposed to report (a number, a null
// entry) threw inside getDefaults before validation could run.
describe('getDefaults with malformed seriesStackConfigs', () => {
  it('does not throw on junk section shapes', () => {
    expect(() => getDefaults({ seriesStackConfigs: 5 })).not.toThrow();
    expect(() => getDefaults({ seriesStackConfigs: [null] })).not.toThrow();
    expect(() => getDefaults({ seriesStackConfigs: 'junk' })).not.toThrow();
    expect(() => getDefaults({ seriesStackConfigs: { ignore: true } })).not.toThrow();
  });

  it('still marks the stacked axis for a valid stack section', () => {
    const defaults = getDefaults({
      seriesStackConfigs: [{ id: 's' }],
      seriesConfigs: [{ property: 'v', stack: 's' }]
    }) as { seriesAxisConfigs: { base: unknown }[] };
    expect(defaults.seriesAxisConfigs[0].base).toBe(0);
  });
});
