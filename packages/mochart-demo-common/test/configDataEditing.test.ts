import { describe, it, expect } from 'vitest';

import { copyDemoConfig, isConfigSectionActive, slowAnimationConfig, toggleConfigSection } from '../src/configEditing';
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
