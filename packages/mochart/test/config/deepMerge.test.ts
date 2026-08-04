import { describe, it, expect } from 'vitest';
import { deepMerge, deepMergeAll, isPlainObject, withoutUndefined } from '../../src/config/core/deepMerge';
import { enhanceConfig } from '../../src/config/helper';
import { getDefaults } from '../../src/config/defaults/mochartConfig';
import { validateConfigDetailed } from '../../src/config/validation/mochartConfig';
import type { DeepPartial, MochartInputConfig, Style, SeriesConfig } from '../../src/types/config';

const V = '1.0.0';

function detailedFor(config: unknown) {
  const defaults = getDefaults(config as never);
  return validateConfigDetailed(config, defaults as never);
}

// ---------------------------------------------------------------------------
// the merge itself
// ---------------------------------------------------------------------------

describe('isPlainObject', () => {
  it('is true only for plain data objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(() => 0)).toBe(false);
    expect(isPlainObject('x')).toBe(false);
  });
});

describe('withoutUndefined', () => {
  it('drops undefined-valued keys and keeps the rest', () => {
    expect(withoutUndefined({ a: 1, b: undefined, c: null })).toEqual({ a: 1, c: null });
  });

  it('returns the same object when there is nothing to drop', () => {
    const object = { a: 1 };
    expect(withoutUndefined(object)).toBe(object);
  });
});

describe('deepMerge', () => {
  it('merges nested objects instead of replacing them', () => {
    expect(deepMerge({ style: { stroke: 'black', width: 2 } }, { style: { stroke: 'red' } }))
      .toEqual({ style: { stroke: 'red', width: 2 } });
  });

  it('treats undefined in the source as "not specified"', () => {
    expect(deepMerge({ a: 1 }, { a: undefined })).toEqual({ a: 1 });
  });

  it('drops undefined-valued keys coming from the target', () => {
    expect(Object.keys(deepMerge({ a: undefined, b: 1 }, {}))).toEqual(['b']);
  });

  it('treats null in the source as a real value that overrides', () => {
    expect(deepMerge({ a: 'black' }, { a: null })).toEqual({ a: null });
    expect(deepMerge({ style: { fill: 'black' } }, { style: { fill: null } }))
      .toEqual({ style: { fill: null } });
  });

  it('replaces arrays wholesale rather than merging them element-wise', () => {
    expect(deepMerge({ stops: [1, 2, 3] }, { stops: [9] })).toEqual({ stops: [9] });
    expect(deepMerge({ stops: [{ a: 1, b: 2 }] }, { stops: [{ a: 9 }] }))
      .toEqual({ stops: [{ a: 9 }] });
  });

  it('replaces an object with an array and an array with an object', () => {
    expect(deepMerge({ a: { x: 1 } }, { a: [1] })).toEqual({ a: [1] });
    expect(deepMerge({ a: [1] }, { a: { x: 1 } })).toEqual({ a: { x: 1 } });
  });

  it('does not recurse into class instances', () => {
    class Thing { constructor(public x = 1) {} }
    const instance = new Thing(2);
    const merged = deepMerge({ a: new Thing(1) }, { a: instance }) as { a: Thing };
    expect(merged.a).toBe(instance);
  });

  it('does not recurse into functions', () => {
    const fn = () => 1;
    const merged = deepMerge({ a: () => 0 }, { a: fn }) as { a: () => number };
    expect(merged.a).toBe(fn);
  });

  it('does not mutate either input', () => {
    const target = { style: { stroke: 'black' } };
    const source = { style: { fill: 'red' } };
    deepMerge(target, source);
    expect(target).toEqual({ style: { stroke: 'black' } });
    expect(source).toEqual({ style: { fill: 'red' } });
  });

  it('orders keys by the target first, then the source-only keys', () => {
    expect(Object.keys(deepMerge({ b: 1, a: 1 }, { c: 1, a: 2 }))).toEqual(['b', 'a', 'c']);
  });

  it('shares untouched values by reference rather than deep cloning', () => {
    const nested = { x: 1 };
    const merged = deepMerge({ nested, other: 1 }, { other: 2 }) as { nested: object };
    expect(merged.nested).toBe(nested);
  });

  it('tolerates a null or undefined side', () => {
    expect(deepMerge(null, { a: 1 })).toEqual({ a: 1 });
    expect(deepMerge({ a: 1 }, null)).toEqual({ a: 1 });
  });
});

describe('deepMergeAll', () => {
  it('layers each object over the ones before it, member by member', () => {
    expect(deepMergeAll({ s: { a: 1, b: 1, c: 1 } }, { s: { b: 2 } }, { s: { c: 3 } }))
      .toEqual({ s: { a: 1, b: 2, c: 3 } });
  });
});

// ---------------------------------------------------------------------------
// deep merge through the config pipeline
// ---------------------------------------------------------------------------

describe('partial nested config sections', () => {
  it('keeps the sibling defaults of a partially overridden style', () => {
    const config = enhanceConfig({
      version: V,
      categoryAxis: { property: 'p' },
      chart: { backgroundStyle: { fillColor: '#ff0000' } },
      series: [{ property: 'a' }]
    });
    expect(config.validation.valid).toBe(true);
    expect(config.chart.backgroundStyle)
      .toEqual({ strokeColor: 'currentColor', strokeOpacity: 0, strokeWidth: null, strokeDashArray: null, fillColor: '#ff0000', fillOpacity: 0 });
  });

  it('validates a partial style rather than demanding every member', () => {
    expect(detailedFor({
      version: V,
      categoryAxis: { property: 'p' },
      legend: { backgroundStyle: { fillOpacity: 0.5 } },
      series: [{ property: 'a' }]
    }).valid).toBe(true);
  });

  it('still rejects a partial style member whose value is invalid', () => {
    const detailed = detailedFor({
      version: V,
      categoryAxis: { property: 'p' },
      legend: { backgroundStyle: { fillOpacity: 5 } },
      series: [{ property: 'a' }]
    });
    expect(detailed.valid).toBe(false);
    expect(detailed.diagnostics.some(diagnostic =>
      diagnostic.severity === 'error' &&
      diagnostic.path.join('.') === 'legend.backgroundStyle.fillOpacity')).toBe(true);
  });

  it('lets an explicit null override a non-null default', () => {
    const config = enhanceConfig({
      version: V,
      categoryAxis: { property: 'p' },
      title: { textStyle: { fillColor: null } },
      series: [{ property: 'a' }]
    });
    expect(config.validation.valid).toBe(true);
    // the default fillColor is 'currentColor'; null means "omit the attribute"
    expect(config.title.textStyle.fillColor).toBeNull();
    expect('fillColor' in config.title.textStyle).toBe(true);
  });

  it('replaces an array-valued config member wholesale', () => {
    const config = enhanceConfig({
      version: V,
      categoryAxis: { property: 'p' },
      linearGradients: [{ id: 'G', stops: [{ offset: 0, color: '#ff0000', opacity: 1 }] }],
      series: [{ property: 'a' }]
    });
    expect(config.linearGradients[0]!.stops).toEqual([{ offset: 0, color: '#ff0000', opacity: 1 }]);
  });

  it('deep-merges an *All config into each array entry', () => {
    const config = enhanceConfig({
      version: V,
      categoryAxis: { property: 'p' },
      seriesDefaults: { curve: { type: 'basis' } },
      series: [
        { property: 'a' },
        { property: 'b', curve: { type: 'natural' } }
      ]
    } as MochartInputConfig);
    expect(config.series[0]!.curve).toEqual({ type: 'basis' });
    expect(config.series[1]!.curve).toEqual({ type: 'natural' });
  });

  it('deep-merges an *All config member into an entry that overrides a sibling member', () => {
    const config = enhanceConfig({
      version: V,
      categoryAxis: { property: 'p' },
      valueAxisDefaults: { backgroundStyle: { fillOpacity: 0.5 } },
      valueAxes: [{ id: 'A', backgroundStyle: { strokeOpacity: 0.25 } }],
      series: [{ property: 'a', axis: 'A' }]
    } as MochartInputConfig);
    expect(config.validation.valid).toBe(true);
    const { backgroundStyle } = config.valueAxes[0]!;
    expect(backgroundStyle.fillOpacity).toBe(0.5);
    expect(backgroundStyle.strokeOpacity).toBe(0.25);
    // the members neither layer named keep the built-in defaults
    expect(backgroundStyle.strokeColor).toBe('currentColor');
    expect(backgroundStyle.strokeWidth).toBeNull();
    expect(backgroundStyle.fillColor).toBeNull();
  });
});

describe('nested validation diagnostics', () => {
  it('warns about an unknown key inside a nested object, with the nested path', () => {
    const detailed = detailedFor({
      version: V,
      categoryAxis: { property: 'p' },
      legend: { backgroundStyle: { fillColour: 'red' } },
      series: [{ property: 'a' }]
    });
    expect(detailed.valid).toBe(false);
    const warning = detailed.diagnostics.find(diagnostic =>
      diagnostic.severity === 'warning' &&
      diagnostic.path.join('.') === 'legend.backgroundStyle');
    expect(warning).toBeDefined();
    expect(warning!.message).toContain('fillColour');
    expect(detailed.warnings.some(message =>
      message.includes('legend') && message.includes('backgroundStyle') && message.includes('fillColour')))
      .toBe(true);
  });

  it('warns about an unknown key inside a nested object of an array section entry', () => {
    const detailed = detailedFor({
      version: V,
      categoryAxis: { property: 'p' },
      series: [{ property: 'a', curve: { typo: 1 } }]
    });
    expect(detailed.diagnostics.some(diagnostic =>
      diagnostic.severity === 'warning' &&
      diagnostic.path.join('.') === 'series.0.curve')).toBe(true);
  });

  it('keeps reporting an unknown key at the top level of a section', () => {
    const detailed = detailedFor({
      version: V,
      categoryAxis: { property: 'p' },
      legend: { nonsense: 1 },
      series: [{ property: 'a' }]
    });
    expect(detailed.diagnostics.some(diagnostic =>
      diagnostic.severity === 'warning' && diagnostic.path.join('.') === 'legend')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DeepPartial, checked at compile time
// ---------------------------------------------------------------------------

type Extends<A, B> = A extends B ? true : false;
function expectType<T extends true>(_value?: T): void { /* compile-time only */ }

type OneOrManyOld<T> = T | T[];

/** MochartInputConfig as it was before DeepPartial: one level of Partial. */
interface ShallowInputConfig {
  id?: string;
  version?: string;
  animation?: Partial<import('../../src/types/config').AnimationConfig>;
  chart?: Partial<import('../../src/types/config').ChartConfig>;
  colorPalette?: Partial<import('../../src/types/config').ColorPaletteConfig>;
  crosshair?: Partial<import('../../src/types/config').CrosshairConfig>;
  categoryAxis?: Partial<import('../../src/types/config').CategoryAxisConfig>;
  legend?: Partial<import('../../src/types/config').LegendConfig>;
  pie?: Partial<import('../../src/types/config').PieConfig>;
  plot?: Partial<import('../../src/types/config').PlotConfig>;
  title?: Partial<import('../../src/types/config').TitleConfig>;
  tooltip?: Partial<import('../../src/types/config').TooltipConfig>;
  linearGradients?: OneOrManyOld<Partial<import('../../src/types/config').LinearGradientConfig>>;
  linearGradientDefaults?: Partial<import('../../src/types/config').LinearGradientConfig>;
  radialGradients?: OneOrManyOld<Partial<import('../../src/types/config').RadialGradientConfig>>;
  radialGradientDefaults?: Partial<import('../../src/types/config').RadialGradientConfig>;
  valueAxes?: OneOrManyOld<Partial<import('../../src/types/config').ValueAxisConfig>>;
  valueAxisDefaults?: Partial<import('../../src/types/config').ValueAxisConfig>;
  series?: OneOrManyOld<Partial<SeriesConfig>>;
  seriesDefaults?: Partial<SeriesConfig>;
  seriesGroups?: OneOrManyOld<Partial<import('../../src/types/config').SeriesGroupConfig>>;
  seriesGroupDefaults?: Partial<import('../../src/types/config').SeriesGroupConfig>;
  seriesStacks?: OneOrManyOld<Partial<import('../../src/types/config').SeriesStackConfig>>;
  seriesStackDefaults?: Partial<import('../../src/types/config').SeriesStackConfig>;
}

describe('DeepPartial', () => {
  it('accepts a nested partial, keeps arrays whole, and leaves SeriesColor alone', () => {
    // nothing the one-level-Partial input config accepted is rejected now, so
    // every config that typechecked before still typechecks
    expectType<Extends<ShallowInputConfig, MochartInputConfig>>();
    expectType<Extends<Partial<Style>, DeepPartial<Style>>>();
    // nested members become optional
    expectType<Extends<{ backgroundStyle: { fillColor: 'red' } }, DeepPartial<{ backgroundStyle: Style }>>>();
    // arrays stay arrays of whole entries
    expectType<Extends<DeepPartial<{ stops: { a: number }[] }>['stops'], { a: number }[] | undefined>>();
    // the string & {} pattern survives, so arbitrary colors are still accepted
    expectType<Extends<'#ff0000', NonNullable<NonNullable<NonNullable<DeepPartial<SeriesConfig>['shapeStyle']>['normal']>['strokeColor']>>>();
    expectType<Extends<'seriesIndex', NonNullable<NonNullable<NonNullable<DeepPartial<SeriesConfig>['shapeStyle']>['normal']>['strokeColor']>>>();

    const partial: MochartInputConfig = {
      version: V,
      chart: { backgroundStyle: { fillColor: 'red' } },
      seriesDefaults: { curve: { type: 'basis' } }
    };
    expect(partial.chart!.backgroundStyle!.fillColor).toBe('red');
  });
});

// ---------------------------------------------------------------------------
// axis styles, which nest one level further: element -> focus state -> member
// ---------------------------------------------------------------------------

describe('axis focus-state styles', () => {
  it('keeps the sibling members and states of a partially overridden style', () => {
    const config = enhanceConfig({
      version: V,
      categoryAxis: { property: 'p', tickLabelTextStyle: { focused: { fillColor: '#ff0000' } } },
      series: [{ property: 'a' }]
    });
    expect(config.validation.valid).toBe(true);
    expect(config.categoryAxis.tickLabelTextStyle.focused)
      .toEqual({ strokeColor: 'same', strokeOpacity: 1, strokeWidth: 0, strokeDashArray: 'same', fillColor: '#ff0000', fillOpacity: 1 });
    expect(config.categoryAxis.tickLabelTextStyle.normal.fillColor).toBe('currentColor');
  });

  it('accepts "same" on a focused or defocused color but not on the normal one', () => {
    expect(detailedFor({
      version: V,
      categoryAxis: { property: 'p', axisLineStyle: { defocused: { strokeColor: 'same' } } },
      series: [{ property: 'a' }]
    }).valid).toBe(true);

    const detailed = detailedFor({
      version: V,
      categoryAxis: { property: 'p', axisLineStyle: { normal: { strokeColor: 'same' } } },
      series: [{ property: 'a' }]
    });
    expect(detailed.valid).toBe(false);
    expect(detailed.diagnostics.some(diagnostic =>
      diagnostic.severity === 'error' &&
      diagnostic.path.join('.') === 'categoryAxis.axisLineStyle.normal.strokeColor')).toBe(true);
  });
});
