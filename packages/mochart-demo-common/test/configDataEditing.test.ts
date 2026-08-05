import { describe, it, expect } from 'vitest';

import { copyDemoConfig, isConfigSectionActive, slowAnimationConfig, toggleConfigProperty, toggleConfigSection } from '../src/configEditing';
import { restoreHiddenDataProperties } from '../src/unusedDataProperties';
import { formatData, stringifyWithSpacedCommas } from '../src/dataEditing';
import type { MochartDemoConfig } from '../src/types';

// Regression: the Slow toggle detected its state by object identity with the
// module constant, which every Apply's JSON-clone destroyed — the button read
// unpressed while slow animations stayed active, and only Reset recovered.
describe('toggleConfigSection across the clone boundary', () => {
  const original = { animate: true, initialDuration: 700 };
  const baseDemoConfig = () => ({
    configWithDefaults: { animation: { ...original } },
    configWithoutDefaults: { animation: { ...original } }
  }) as unknown as MochartDemoConfig;

  it('stays active and toggles back off after a clone', () => {
    const mochartDemoConfig = baseDemoConfig();
    const on = toggleConfigSection(mochartDemoConfig, copyDemoConfig(mochartDemoConfig), 'animationConfig', slowAnimationConfig);
    expect(isConfigSectionActive(on, 'animationConfig', slowAnimationConfig)).toBe(true);

    // Apply round-trips the config through JSON, losing object identity
    const applied = copyDemoConfig(on);
    expect(isConfigSectionActive(applied, 'animationConfig', slowAnimationConfig)).toBe(true);

    const off = toggleConfigSection(mochartDemoConfig, applied, 'animationConfig', slowAnimationConfig);
    expect(isConfigSectionActive(off, 'animationConfig', slowAnimationConfig)).toBe(false);
    expect(off.configWithoutDefaults.animation).toEqual(original);
  });
});

// Regression: formatData spaced every comma via regex, corrupting commas
// inside string values on each view/apply round trip.
describe('formatData', () => {
  it('keeps the historical layout for plain rows', () => {
    expect(formatData([{ month: 'Jan', sales: 10 }, { month: 'Feb', sales: 20 }]))
      .toBe('[{"month":"Jan", "sales":10},\n {"month":"Feb", "sales":20}]');
  });

  it('leaves commas inside string values untouched', () => {
    const rows = [{ city: 'Boston, MA', value: 1 }];
    const text = formatData(rows);
    expect(text).toContain('"Boston, MA"');
    expect(JSON.parse(text)).toEqual(rows);
    // stable across repeated view/format round trips
    expect(formatData(JSON.parse(text))).toBe(text);
  });

  it('spaces structural commas in nested values only', () => {
    expect(stringifyWithSpacedCommas({ label: 'a,b', tags: [1, 2] }))
      .toBe('{"label":"a,b", "tags":[1, 2]}');
  });
});

// Regression: hidden (unused) properties were restored purely by row index, so
// deleting or reordering rows in the filtered view grafted the wrong rows'
// hidden columns onto the result.
describe('restoreHiddenDataProperties row identity', () => {
  const used = new Set(['month', 'sales']);
  const fullRows = [
    { month: 'Jan', sales: 1, hidden: 'jan-extra' },
    { month: 'Feb', sales: 2, hidden: 'feb-extra' },
    { month: 'Mar', sales: 3, hidden: 'mar-extra' }
  ];

  it('keeps hidden columns with their row when a view row is deleted', () => {
    const viewRows = [{ month: 'Jan', sales: 1 }, { month: 'Mar', sales: 3 }];
    const restored = restoreHiddenDataProperties(viewRows, fullRows, used, 'month');
    expect(restored).toEqual([
      { month: 'Jan', sales: 1, hidden: 'jan-extra' },
      { month: 'Mar', sales: 3, hidden: 'mar-extra' }
    ]);
  });

  it('keeps hidden columns with their row when view rows are reordered', () => {
    const viewRows = [{ month: 'Mar', sales: 3 }, { month: 'Jan', sales: 1 }];
    const restored = restoreHiddenDataProperties(viewRows, fullRows, used, 'month');
    expect(restored[0]!.hidden).toBe('mar-extra');
    expect(restored[1]!.hidden).toBe('jan-extra');
  });

  it('falls back to index matching for an in-place category edit', () => {
    const viewRows = [{ month: 'January', sales: 1 }, { month: 'Feb', sales: 2 }, { month: 'Mar', sales: 3 }];
    const restored = restoreHiddenDataProperties(viewRows, fullRows, used, 'month');
    expect(restored[0]!.hidden).toBe('jan-extra');
  });

  it('falls back to index matching without a category property', () => {
    const viewRows = [{ month: 'Jan', sales: 10 }];
    const restored = restoreHiddenDataProperties(viewRows, fullRows, used);
    expect(restored[0]!.hidden).toBe('jan-extra');
  });
});

// Regression: toggleConfigProperty toggled from the raw section only, so a
// property whose core default is true would uselessly write true on the first
// press; the effective (defaulted) value drives the toggle now.
describe('toggleConfigProperty effective defaults', () => {
  it('switches a defaulted-true property off on the first press', () => {
    const view = {
      configWithDefaults: { plot: { inverted: true } },
      configWithoutDefaults: {}
    };
    const toggled = toggleConfigProperty(view, 'plot', 'inverted', true);
    expect(toggled.configWithoutDefaults.plot).toEqual({ inverted: false });
    expect(toggled.configWithDefaults.plot).toEqual({ inverted: false });
  });

  it('uses the provided default when no effective value exists', () => {
    const view = { configWithDefaults: {}, configWithoutDefaults: {} };
    const toggled = toggleConfigProperty(view, 'plot', 'inverted', true);
    expect(toggled.configWithoutDefaults.plot).toEqual({ inverted: true });
  });

  it('still round-trips an explicit raw value', () => {
    const view = {
      configWithDefaults: { plot: { inverted: true, other: 1 } },
      configWithoutDefaults: { plot: { inverted: true } }
    };
    const toggled = toggleConfigProperty(view, 'plot', 'inverted', true);
    expect(toggled.configWithoutDefaults.plot).toEqual({ inverted: false });
    expect(toggled.configWithDefaults.plot).toEqual({ inverted: false, other: 1 });
  });
});
