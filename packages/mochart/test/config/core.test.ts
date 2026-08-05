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
});
