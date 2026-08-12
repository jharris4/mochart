# API Reference

Everything below is imported from `@mochart/core`. The framework bindings
have their own entry points — see the
[framework pages](/guide/frameworks/react) — but accept the same props,
callbacks, and helpers documented here.

The props the entry points accept are listed property by property in
[Chart props](/reference/props) and
[Callbacks and payloads](/reference/callbacks), and the name each binding
gives them in [Framework props](/reference/framework-props). All three are
generated from the packages' type declarations.

```js
import {
  createDefaultChart, createChart,
  ArrayOfObjectsDataProvider, ObjectOfArraysDataProvider,
  validateConfig, validateConfigDetailed, migrateConfig, enhanceConfig, getDefaults, getDataErrors,
  createHistogram, createWaterfall, createSparklineConfig, createHeatmap, createCandlestick,
  createOhlc, createPie,
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
[`categoryAxis.property`](/reference/categoryAxis#categoryAxis.property).

Props: `config` and `data`, plus everything in
[Chart props](/reference/props) — sizing, `loading`/`error`, the controlled
focus and filter props, the [state factories](/reference/props#factories),
and the [callbacks](/reference/callbacks).

## createChart

```ts
createChart(container: Element, props: ManagedChartProps): ChartHandle
```

The lower-level entry point for hosts that manage
[config enhancement](/guide/config-model#enhancement) and
[data providers](/guide/data-providers) themselves. Identical to
`createDefaultChart` except it takes `mochartConfig` (from `enhanceConfig`)
and `dataProvider` in place of `config` and `data` — useful when several
charts share one enhanced config, or when data lives in a custom store. Its
props are listed under [Chart props](/reference/props#managedChartProps).

## ChartHandle

Returned by both entry points:

```ts
interface ChartHandle<TProps> {
  update(nextProps: Partial<TProps>): void;
  replace(nextProps: TProps): void;
  refresh(): void;
  destroy(): void;
}
```

- `update(nextProps)` merges new props into the chart. Change detection is
  by object identity — pass a new config/data reference. Config and data
  changes animate through the
  [staged animation](/guide/staged-animation) phases when animation is
  enabled; width/height changes re-layout the chart instantly.
- `replace(nextProps)` swaps the props wholesale: a key absent from
  `nextProps` is unset and returns to chart-managed behavior, where `update`
  would keep its previous value. For hosts that pass the complete prop set
  on every render.
- `refresh()` re-reads the current data without a new reference — the escape
  hatch for hosts that mutate their data in place.
- `destroy()` cancels running tweens and removes the chart's DOM.

## Data providers

```ts
new ArrayOfObjectsDataProvider(data, categoryProperty)  // [{ month: 'Jan', revenue: 10 }, …]
new ObjectOfArraysDataProvider(data, categoryProperty)  // { month: ['Jan', …], revenue: [10, …] }
```

Both report a category property that matches nothing — absent from every
row, or a missing / all-`undefined` column — through `getError()`, which
the chart renders as its error state.

Both implement the `DataProvider` interface, which custom providers can
implement to read straight from an existing store:

```ts
interface DataProvider<TCategoryValue, TSeriesValue> {
  getCategoryValues(): readonly TCategoryValue[];
  getSeriesValue(categoryValue: TCategoryValue, categoryIndex: number, seriesProperty: string): TSeriesValue;
  getCategoryProperty?(): string;  // when present, getDataErrors flags a mismatch with categoryAxis.property
  getError?(): unknown;    // non-null → the chart shows its error state ('' and 0 count)
  getLoading?(): boolean;  // true → the chart shows its loading state
  refresh?(): void;        // the handle's refresh() calls it before re-reading — invalidate caches here
}
```

See [Data providers](/guide/data-providers) for which properties are read.

## Config helpers

```ts
validateConfig(config, getDefaults(config))  // → { valid, errors, warnings }
validateConfigDetailed(config, getDefaults(config))
                                             // → validation plus path-addressable diagnostics
migrateConfig(config)                        // → config upgraded to the current format version
enhanceConfig(config)                        // → MochartConfig (validated, defaults applied)
getDataErrors(mochartConfig, dataProvider)   // → string[] of readable data problems
```

- `validateConfig` checks a raw config against the same validators that
  generate this reference, returning human-readable `errors` and `warnings`
  (unknown properties). See
  [Validation](/guide/config-model#validation).
- `validateConfigDetailed` performs the same validation without changing the
  `validateConfig` result shape, and additionally returns `diagnostics`.
  Each diagnostic contains a config `path`, `severity`, `message`, and
  `source`, making it suitable for editors that need to highlight the
  property responsible for a validation problem.
- `migrateConfig` upgrades a config written against an older
  [`version`](/guide/config-model#validation) to the current format.
- `enhanceConfig` produces the fully-built `MochartConfig` that
  `createChart` consumes: migrated to the current format, validated, every
  default applied, `*Defaults` sections merged, and cross-references resolved.
  The lower-level `getDefaults` / `validateConfig` / `buildMochartConfig` do
  not migrate — call `migrateConfig` first if you use them directly on a
  stored config.
- `getDataErrors` checks a dataset against an enhanced config —
  non-numeric series values, category values that don't match the configured
  type, duplicate category values. A series property absent from every row
  is not an error: it reads as all-`undefined` (missing values). A category
  property that matches nothing is reported by the built-in providers'
  `getError()` instead, which `getDataErrors` defers to.

## Chart helpers

Factories for chart shapes that are really data transforms plus config
conventions. Each returns chart-ready `data` rows alongside config
*fragments* (`categoryAxis`, `series`, …) to spread into your own
config — they never touch the chart, so titles, axes, and styling stay
yours. Each links to a recipe with a live example.

```ts
createHistogram(values, options?)   // → { bins, data, categoryAxis, seriesConfig }
createWaterfall(items, options?)    // → { steps, data, categoryAxis, series }
createHeatmap(rows, options?)       // → { domain, colorScale, data, categoryAxis, valueAxisConfig, series }
createCandlestick(items, options?)  // → { candles, data, categoryAxis, series }
createOhlc(items, options?)         // → { candles, data, categoryAxis, series }
createPie(items, options?)          // → { total, fractions, data, chart, pie, categoryAxis, series }
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
- `createCandlestick` turns OHLC items into candles: direction-colored
  open/close bodies over thin low/high wicks, or outlined up bodies with
  the `hollow` option. The `volume` option adds a volume pane on a second
  axis (the result gains a `valueAxes` fragment).
  `computeCandlesticks` is the math alone. See
  [Candlestick](/recipes/candlestick).
- `createOhlc` turns the same OHLC items into tick bars: thin low/high
  lines with a left open tick and a right close tick, with the same
  `volume` option. See [OHLC Bars](/recipes/ohlc).
- `createPie` turns labelled values into pie or donut slices — one series
  per slice, sized by its share of the total. Its `chart` fragment is
  what switches the chart into pie mode (`type: 'pie'`).
  `computePieFractions` returns just the total and per-slice fractions. See
  [Pie and donut](/recipes/pie).
- `createSparklineConfig` is a config preset rather than a data transform:
  it hides axes, legend, tooltip, crosshairs and markers, and collapses
  margins for tiny inline charts. Values already set on the passed config
  win. See [Sparklines](/recipes/sparklines).

For TypeScript hosts, every helper's item, option, and result shapes are
exported as named types — histogram: `BinValuesOptions`, `HistogramBin`,
`CreateHistogramOptions`, `HistogramData`; waterfall: `WaterfallItem`,
`WaterfallDirection`, `WaterfallStep`, `CreateWaterfallOptions`,
`WaterfallData`; heatmap: `HeatmapRow`, `CreateHeatmapOptions`,
`CreateHeatmapColorScaleOptions`, `HeatmapData`; candlestick:
`CandlestickItem`, `CandlestickDirection`, `Candlestick`,
`CreateCandlestickOptions`, `CandlestickVolumeOptions`, `CandlestickData`;
OHLC: `CreateOhlcOptions`, `OhlcData`; pie: `PieItem`, `CreatePieOptions`,
`PieData`; sparkline: `CreateSparklineConfigOptions`. The shipped `.d.ts`
documents every field — hover the type in your editor.

## Constants

Every enumerated config value is exported so configs built in code can avoid
string literals. `AUTO` (`'auto'`), `NONE` (`null`) and `CONFIG_VERSION` stand
alone; the rest come in families:

| Config member | Constants |
| --- | --- |
| axis `type` | `TYPE_STRING`, `TYPE_NUMBER`, `TYPE_DATE` |
| axis `scale` | `SCALE_ORDINAL`, `SCALE_LINEAR` |
| [`chart.type`](/reference/chart#chart.type) | `CHART_TYPE_XY`, `CHART_TYPE_PIE` |
| `align` | `ALIGN_LEFT`, `ALIGN_CENTER`, `ALIGN_RIGHT` |
| `verticalAlign` | `VERTICAL_ALIGN_TOP`, `VERTICAL_ALIGN_MIDDLE`, `VERTICAL_ALIGN_BOTTOM` |
| `anchor` | `ANCHOR_START`, `ANCHOR_MIDDLE`, `ANCHOR_END` |
| `position` | `POSITION_TOP`, `POSITION_BOTTOM` |
| axis `side` | `SIDE_START`, `SIDE_END` |
| threshold `titleSide` | `TITLE_SIDE_LOW`, `TITLE_SIDE_HIGH` |
| [`series.missingValues`](/reference/series#series.missingValues) | `MISSING_VALUES_BREAK`, `MISSING_VALUES_CONNECT`, `MISSING_VALUES_BASE` |
| [`series.renderer`](/reference/series#series.renderer) | `RENDERER_BAR`, `RENDERER_LINE`, `RENDERER_AREA`, `RENDERER_NONE` |
| [`series.curveType`](/reference/series#series.curveType) | `CURVE_TYPE_LINEAR`, `CURVE_TYPE_MONOTONE_X`, `CURVE_TYPE_MONOTONE_Y`, `CURVE_TYPE_BASIS`, `CURVE_TYPE_CARDINAL`, `CURVE_TYPE_CATMULL_ROM`, `CURVE_TYPE_NATURAL`, `CURVE_TYPE_STEP`, `CURVE_TYPE_STEP_BEFORE`, `CURVE_TYPE_STEP_AFTER` |
| bar cap type | `CAP_TYPE_POINT`, `CAP_TYPE_CURVE`, `CAP_TYPE_ROUND` |
| label `position` | `LABEL_POSITION_INSIDE`, `LABEL_POSITION_CENTER`, `LABEL_POSITION_OUTSIDE` |
| style color modes | `COLOR_SERIES`, `COLOR_SAME`, `COLOR_SERIES_INDEX`, `COLOR_CATEGORY_INDEX`, `COLOR_CURRENT` |
| `colorScale.interpolation` | `COLOR_INTERPOLATION_RGB`, `COLOR_INTERPOLATION_HSL`, `COLOR_INTERPOLATION_LAB`, `COLOR_INTERPOLATION_HCL` |
| [`series.markerShape`](/reference/series#series.markerShape) | `MARKER_SHAPE_CIRCLE`, `MARKER_SHAPE_CROSS`, `MARKER_SHAPE_DIAMOND`, `MARKER_SHAPE_SQUARE`, `MARKER_SHAPE_STAR`, `MARKER_SHAPE_TRIANGLE`, `MARKER_SHAPE_WYE` |
| marker size scale | `MARKER_SIZE_SCALE_SQRT`, `MARKER_SIZE_SCALE_LINEAR` |
| [`pie`](/reference/pie) label types | `PIE_LABEL_TYPE_VALUE`, `PIE_LABEL_TYPE_PERCENT`, `PIE_LABEL_TYPE_TITLE`, `PIE_LABEL_TYPE_VALUE_PERCENT`, `PIE_LABEL_TYPE_PERCENT_VALUE`, `PIE_LABEL_TYPE_TITLE_VALUE`, `PIE_LABEL_TYPE_TITLE_PERCENT` |

The union types those constants form are exported too — `Align`,
`VerticalAlign`, `Anchor`, `Position`, `AxisSide`, `ThresholdTitleSide`,
`MissingValues`, `Scale`, `DataType`, `ChartType`, `RendererType`,
`CurveType`, `CapType`, `LabelPosition`, `ColorMode`, `ColorInterpolation`,
`MarkerShape`, `MarkerSizeScale`, `PieLabelType`, `PieTooltipLabelType`,
`Auto` — so a wrapper can name one in its own signature rather than reaching
for `SeriesConfig['renderer']`.

## Styling hooks

`mochartCssClasses` maps every chart part to the CSS class the renderer puts
on it (`mochart-chart`, `mochart-title-text`, `mochart-plot`, …) — useful
for targeted CSS overrides and DOM queries. The `@mochart/export` package
uses these to serialize rendered charts to SVG/PNG — see
[Exporting images](/guide/export).

`getVersionString()` returns the library's version.

## Advanced exports

Building blocks for hosts that embed chart internals directly — most
applications never need these:

- `Chart`, `Legend`, `Crosshair`, `Tooltip` — the retained-mode components
  the entry points assemble.
- `StaticDataSource`, `AnimatedDataSource`, `FocusController` — the chart
  controllers driving data flow, staged transitions, and focus state. Their
  contracts are the types `ChartDataSource` (the interface both data
  sources implement), `ChartDataSourceInput` (the config + data provider +
  focus/filter snapshot a source consumes), and `InternalFocus` (a partial
  focus update raised from inside the chart).
- `Renderer`, `El`, `TextEl`, `svgEl`, `htmlEl`, `textEl`, `shallowEqual` —
  the retained-mode rendering primitives.
- `buildMochartConfig`, `applyDefaults`, `hasConfigStructureChange`,
  `sectionKeyAllMap`, `isDataProviderValid` — the lower-level pieces
  `enhanceConfig` and the chart controllers are built from.

The shipped `.d.ts` documents all of these — hover any import in your
editor for details.
