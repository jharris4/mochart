# API Reference

Everything below is imported from `@mochart/core`. The framework bindings
have their own entry points — see the
[framework pages](/guide/frameworks/react) — but accept the same props,
callbacks, and helpers documented here.

```js
import {
  createDefaultChart, createChart,
  ArrayOfObjectsDataProvider, ObjectOfArraysDataProvider,
  validateConfig, migrateConfig, enhanceConfig, getDefaults, getDataErrors,
  createHistogram, createWaterfall, createSparklineConfig, createHeatmap,
  mochartCssClasses, getVersionString
} from '@mochart/core';
```

## createDefaultChart

```ts
createDefaultChart(container: Element, props: DefaultChartProps): ChartHandle
```

The simplest entry point (see [Getting started](/guide/getting-started)).
Mounts a chart into `container` from a raw
[config](/guide/config-model) and a plain array-of-objects dataset; the
config is validated and enhanced internally on every change, and `data` is
wrapped in an `ArrayOfObjectsDataProvider` keyed by
[`groupAxisConfig.property`](/reference/groupAxisConfig#groupAxisConfig.property).

Props: `config`, `data`, `width`, `height`, `style`, `loading`, `error`,
the [interaction callbacks](/guide/interaction#callbacks), and the
[state factories](/guide/chart-states#customizing-what-renders).

## createChart

```ts
createChart(container: Element, props: ManagedChartProps): ChartHandle
```

The lower-level entry point for hosts that manage
[config enhancement](/guide/config-model#enhancement) and
[data providers](/guide/data-providers) themselves. Identical to
`createDefaultChart` except it takes `mochartConfig` (from `enhanceConfig`)
and `dataProvider` in place of `config` and `data` — useful when several
charts share one enhanced config, or when data lives in a custom store.

## ChartHandle

Returned by both entry points:

```ts
interface ChartHandle<TProps> {
  update(nextProps: Partial<TProps>): void;
  destroy(): void;
}
```

- `update(nextProps)` merges new props into the chart. Config, data, and
  size changes animate through the
  [staged animation](/guide/staged-animation) phases when animation is
  enabled.
- `destroy()` cancels running tweens and removes the chart's DOM.

## Data providers

```ts
new ArrayOfObjectsDataProvider(data, groupProperty)  // [{ month: 'Jan', revenue: 10 }, …]
new ObjectOfArraysDataProvider(data, groupProperty)  // { month: ['Jan', …], revenue: [10, …] }
```

Both implement the `DataProvider` interface, which custom providers can
implement to read straight from an existing store:

```ts
interface DataProvider<TGroupValue, TSeriesValue> {
  getGroupValues(): readonly TGroupValue[];
  getSeriesValue(groupValue: TGroupValue, groupIndex: number, seriesProperty: string): TSeriesValue;
  getError?(): unknown;    // truthy → the chart shows its error state
  getLoading?(): boolean;  // true → the chart shows its loading state
}
```

See [Data providers](/guide/data-providers) for which properties are read.

## Config helpers

```ts
validateConfig(config, getDefaults(config))  // → { valid, errors, warnings }
migrateConfig(config)                        // → config upgraded to the current format version
enhanceConfig(config)                        // → MochartConfig (validated, defaults applied)
getDataErrors(mochartConfig, dataProvider)   // → string[] of readable data problems
```

- `validateConfig` checks a raw config against the same validators that
  generate this reference, returning human-readable `errors` and `warnings`
  (unknown properties). See
  [Validation](/guide/config-model#validation).
- `migrateConfig` upgrades a config written against an older
  [`version`](/guide/config-model#validation) to the current format.
- `enhanceConfig` produces the fully-built `MochartConfig` that
  `createChart` consumes: validated, every default applied, `*All` sections
  merged, and cross-references resolved.
- `getDataErrors` checks a dataset against an enhanced config — missing
  properties, non-numeric series values, duplicate groups.

## Chart helpers

Factories for chart shapes that are really data transforms plus config
conventions. Each returns chart-ready `data` rows alongside config
*fragments* (`groupAxisConfig`, `seriesConfigs`, …) to spread into your own
config — they never touch the chart, so titles, axes, and styling stay
yours. Each links to a recipe with a live example.

```ts
createHistogram(values, options?)   // → { bins, data, groupAxisConfig, seriesConfig }
createWaterfall(items, options?)    // → { steps, data, groupAxisConfig, seriesConfigs }
createHeatmap(rows, options?)       // → { domain, colorScale, data, groupAxisConfig, seriesAxisConfig, seriesConfigs }
createSparklineConfig(config, options?)  // → config with the sparkline preset applied
```

- `createHistogram` bins an array of numbers (Sturges' count and round bin
  edges by default; `normalize` / `cumulative` modes) into contiguous bars.
  `binValues` returns just the bins, without the chart fragments. See
  [Histogram](/recipes/histogram).
- `createWaterfall` accumulates signed steps into floating bars with
  increase/decrease/total series. `computeWaterfallSteps` is the math
  alone. See [Waterfall](/recipes/waterfall).
- `createHeatmap` turns a grid of row values into stacked bar-band series
  colored from a shared sequential ramp; `createHeatmapColorScale` builds
  the same value→color scale standalone (e.g. for a ramp legend). See
  [Heatmap](/recipes/heatmap).
- `createSparklineConfig` is a config preset rather than a data transform:
  it hides axes, legend, tooltip, crosshairs and markers, and collapses
  margins for tiny inline charts. Values already set on the passed config
  win. See [Sparklines](/recipes/sparklines).

## Constants

`AUTO` (`'auto'`), `NONE` (`null`), the group axis types `TYPE_STRING` /
`TYPE_NUMBER` / `TYPE_DATE`, and the scales `SCALE_ORDINAL` /
`SCALE_LINEAR` — exported so configs built in code can avoid string
literals.

## Styling hooks

`mochartCssClasses` maps every chart part to the CSS class the renderer puts
on it (`mochart-chart`, `mochart-title-text`, `mochart-plot`, …) — useful
for targeted CSS overrides and DOM queries.
[@mochart/export](https://github.com/jharris4/mochart/tree/main/packages/mochart-export)
uses these to serialize rendered charts to SVG/PNG.

`getVersionString()` returns the library's version.

## Advanced exports

Building blocks for hosts that embed chart internals directly — most
applications never need these:

- `Chart`, `Legend`, `Crosshair`, `Tooltip` — the retained-mode components
  the entry points assemble.
- `StaticDataSource`, `AnimatedDataSource`, `FocusController` — the chart
  controllers driving data flow, staged transitions, and focus state.
- `Renderer`, `El`, `TextEl`, `svgEl`, `htmlEl`, `textEl`, `shallowEqual` —
  the retained-mode rendering primitives.
- `buildMochartConfig`, `applyDefaults`, `hasConfigStructureChange`,
  `sectionKeyAllMap`, `isDataProviderValid` — the lower-level pieces
  `enhanceConfig` and the chart controllers are built from.

The shipped `.d.ts` documents all of these — hover any import in your
editor for details.
