import { describe, it, expect } from 'vitest';
import buildMochartConfig, {
  applyDefaults,
  sectionKeyAllMap,
  hasConfigStructureChange,
  configWithAll,
  filterConfig,
  filterConfigs
} from '../../src/config/core/mochartConfig';
import { makeConfig } from '../data/fixtures';
import type { MochartConfig } from '../../src/types/config';

describe('sectionKeyAllMap', () => {
  it('maps list section keys to their "all" config key', () => {
    expect(sectionKeyAllMap.series).toBe('seriesDefaults');
    expect(sectionKeyAllMap.valueAxes).toBe('valueAxisDefaults');
  });
});

describe('filterConfig / filterConfigs', () => {
  it('keeps objects that are not ignored', () => {
    expect(filterConfig({ id: 'a' })).toBe(true);
    expect(filterConfig({ id: 'a', ignore: true })).toBe(false);
    expect(filterConfig(5)).toBe(false);
  });

  it('filters a list down to non-ignored objects', () => {
    expect(filterConfigs([{ id: 'a' }, { id: 'b', ignore: true }, 3])).toEqual([{ id: 'a' }]);
    expect(filterConfigs('not-an-array')).toEqual([]);
  });
});

// CONFIG-8: applyDefaults filters every array section on `ignore`, but it used to be typed,
// validated and documented on `series` alone - so ignoring a value axis worked at runtime while
// the types rejected it, and `ignore: false` on the other sections warned as an unknown property.
describe('ignore across every list section', () => {
  const sections = ['valueAxes', 'seriesGroups', 'seriesStacks', 'linearGradients', 'radialGradients'] as const;
  const withSection = (section: string, entries: Record<string, unknown>[]) => makeConfig({
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'sales' }],
    [section]: entries
  }) as unknown as Record<string, unknown>;

  it('drops an ignored entry from every list section', () => {
    for (const section of sections) {
      const built = withSection(section, [{ id: 'keep' }, { id: 'drop', ignore: true }]);
      expect((built[section] as { id: string }[]).map(entry => entry.id), section).toEqual(['keep']);
    }
  });

  // a gradient entry needs more than an id to be valid, so this asserts on the ignore warning
  // specifically rather than on overall validity
  it('treats ignore as a known property on every list section', () => {
    for (const section of sections) {
      const built = withSection(section, [{ id: 'a', ignore: false }]);
      const { warnings } = built.validation as { warnings: string[] };
      expect(warnings.filter(warning => warning.includes('ignore')), section).toEqual([]);
      expect(warnings.filter(warning => warning.includes('invalid propert')), section).toEqual([]);
    }
  });
});

describe('applyDefaults', () => {
  it('returns an empty object for a non-object config', () => {
    expect(applyDefaults(null, {})).toEqual({});
    expect(applyDefaults(5, { a: { x: 1 } })).toEqual({});
  });

  it('fills in a missing object section from defaults', () => {
    const result = applyDefaults({}, { title: { size: 10 } });
    expect(result.title).toEqual({ size: 10 });
  });

  it('merges defaults under the provided object section', () => {
    const result = applyDefaults({ title: { size: 20 } }, { title: { size: 10, color: 'red' } });
    expect(result.title).toEqual({ size: 20, color: 'red' });
  });

  it('drops undefined values from the defaults before merging', () => {
    const result = applyDefaults({}, { title: { size: 10, color: undefined } });
    expect(result.title).toEqual({ size: 10 });
  });

  it('applies list defaults element-wise and merges the all-config', () => {
    const result = applyDefaults(
      { series: [{ property: 'a' }], seriesDefaults: { renderer: 'bar' } },
      { series: [{ order: 0 }] }
    );
    // per-element defaults, then allSection, then the element's own values
    expect(result.series).toEqual([{ order: 0, renderer: 'bar', property: 'a' }]);
  });

  // CONFIG-2: valueAxes is the one list section with an implicit entry, so its *Defaults
  // section has to reach the defaults list when the user declares nothing
  it('merges the all-config into the defaults list when the section is not declared', () => {
    const result = applyDefaults(
      { valueAxisDefaults: { visible: false, title: 'T' } },
      { valueAxes: [{ id: 'VA0', visible: true, title: null }] }
    );
    expect(result.valueAxes).toEqual([{ id: 'VA0', visible: false, title: 'T' }]);
  });

  it('merges the all-config into the defaults list when every entry is ignored', () => {
    const result = applyDefaults(
      { valueAxes: [{ ignore: true }], valueAxisDefaults: { visible: false } },
      { valueAxes: [{ id: 'VA0', visible: true }] }
    );
    expect(result.valueAxes).toEqual([{ id: 'VA0', visible: false }]);
  });

  it('leaves the defaults list alone when there is no all-config', () => {
    const result = applyDefaults({}, { valueAxes: [{ id: 'VA0', visible: true }] });
    expect(result.valueAxes).toEqual([{ id: 'VA0', visible: true }]);
  });
});

describe('configWithAll', () => {
  it('merges the all-config under each config in a list', () => {
    expect(configWithAll([{ a: 1 }, { a: 2, b: 9 }], { b: 5 })).toEqual([{ a: 1, b: 5 }, { a: 2, b: 9 }]);
  });

  it('merges the all-config under a single config object', () => {
    expect(configWithAll({ a: 1 }, { b: 5 })).toEqual({ a: 1, b: 5 });
  });

  it('returns the config unchanged when the all-config is not an object', () => {
    expect(configWithAll({ a: 1 }, null)).toEqual({ a: 1 });
  });
});

describe('buildMochartConfig', () => {
  it('returns just the validation for a non-object config', () => {
    const validation = { valid: false, errors: ['bad'], warnings: [] };
    expect(buildMochartConfig(null, {}, validation)).toEqual({ validation });
  });

  it('defaults to a valid validation when none is supplied', () => {
    const built = buildMochartConfig(null, {});
    expect(built.validation).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('throws when the validation shape is invalid', () => {
    expect(() => buildMochartConfig({}, {}, { valid: 'nope' } as never)).toThrow();
  });

  it('orders series configs by their order property', () => {
    const built = buildMochartConfig(
      { series: [{ id: 'a', order: 2 }, { id: 'b', order: 1 }] },
      { series: [] }
    );
    expect((built.series as { id: string }[]).map(s => s.id)).toEqual(['b', 'a']);
    expect((built as unknown as { seriesById: Record<string, unknown> }).seriesById).toHaveProperty('a');
    expect((built as unknown as { seriesById: Record<string, unknown> }).seriesById).toHaveProperty('b');
  });
});

describe('hasConfigStructureChange', () => {
  const base = () =>
    makeConfig({
      categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
      series: [{ property: 'sales' }]
    });

  it('reports no change for two identical configs', () => {
    expect(hasConfigStructureChange(base(), base())).toBe(false);
  });

  // hosts hold no config while loading, so either side may be null
  it('treats a config appearing or disappearing as a change, but two nulls as none', () => {
    expect(hasConfigStructureChange(null, base())).toBe(true);
    expect(hasConfigStructureChange(base(), null)).toBe(true);
    expect(hasConfigStructureChange(null, null)).toBe(false);
  });

  it('reports a change when the new config is invalid', () => {
    const invalid = makeConfig({}) as MochartConfig;
    expect(hasConfigStructureChange(base(), invalid)).toBe(true);
  });

  it('reports a change when the category axis property differs', () => {
    const other = makeConfig({
      categoryAxis: { property: 'week', type: 'string', scale: 'ordinal' },
      series: [{ property: 'sales' }]
    });
    expect(hasConfigStructureChange(base(), other)).toBe(true);
  });

  it('reports a change when the series count differs', () => {
    const other = makeConfig({
      categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
      series: [{ property: 'sales' }, { property: 'costs' }]
    });
    expect(hasConfigStructureChange(base(), other)).toBe(true);
  });

  it('reports a change when a series property differs', () => {
    const other = makeConfig({
      categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
      series: [{ property: 'costs' }]
    });
    expect(hasConfigStructureChange(base(), other)).toBe(true);
  });

  it('reports a change when a series id differs', () => {
    const withId = (id: string) =>
      makeConfig({
        categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
        series: [{ id, property: 'sales' }]
      });
    expect(hasConfigStructureChange(withId('a'), withId('a'))).toBe(false);
    expect(hasConfigStructureChange(withId('a'), withId('b'))).toBe(true);
  });

  // ANIM-7: showInLegend only decides whether a series appears in the legend - no data, no
  // colours, no series rendering - so it must not tear the chart down and replay its opening
  // animation. The legend's measured sizes are keyed by series id, so a stale set is harmless.
  it('reports no change when only a series showInLegend differs', () => {
    const withShowInLegend = (showInLegend: boolean) =>
      makeConfig({
        categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
        series: [{ property: 'sales', showInLegend }]
      });
    expect(hasConfigStructureChange(withShowInLegend(true), withShowInLegend(true))).toBe(false);
    expect(hasConfigStructureChange(withShowInLegend(false), withShowInLegend(true))).toBe(false);
    expect(hasConfigStructureChange(withShowInLegend(true), withShowInLegend(false))).toBe(false);
  });
});
