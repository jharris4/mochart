# mochart

Animated interactive SVG charting library with zero framework dependencies.

Charts are drawn with a retained-mode renderer — updates write only the DOM
attributes that actually changed; there is no vdom and no framework runtime.
Data and config changes animate smoothly, and charts respond to hover, focus,
and series filtering out of the box.

## Features

- **Renderers**: `bar`, `line`, and `area` series, mixable in one chart
- **Scales**: ordinal, linear, and date group axes (via d3-scale)
- **Animation**: tweened transitions for data, domain, and focus changes
- **Interaction**: crosshair, tooltip, legend with series filtering, click and
  hover callbacks
- **Extras**: axis thresholds and ranges, linear/radial gradients, series
  markers and labels, stacked and grouped series
- **Config validation**: configs are validated with
  [movalid](../movalid/README.md), producing human-readable error messages

## Install

```sh
npm install mochart
```

## Quick start

`createDefaultChart` is the simplest entry point — give it a raw config and a
plain array-of-objects dataset:

```js
import { createDefaultChart } from 'mochart';

const config = {
  titleConfig: { title: 'Revenue' },
  groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
  seriesAllConfig: { renderer: 'bar' },
  seriesConfigs: [{ property: 'revenue', title: 'Revenue' }]
};

const data = [
  { month: 'Jan', revenue: 10 },
  { month: 'Feb', revenue: 20 }
];

const chart = createDefaultChart(document.getElementById('chart'), {
  config,
  data,
  width: 640,
  height: 400
});

chart.update({ data: nextData });  // animates to the new data
chart.destroy();
```

`createChart` is the lower-level entry point for hosts that manage config
enhancement and data providers themselves:

```js
import { createChart, enhanceConfig, ArrayOfObjectsDataProvider } from 'mochart';

const mochartConfig = enhanceConfig(config);
const dataProvider = new ArrayOfObjectsDataProvider(data, 'month');

const chart = createChart(container, { mochartConfig, dataProvider, width: 640, height: 400 });
```

Both return a `ChartHandle`:

- `update(nextProps)` — merge new props into the chart; config, data, and size
  changes animate when animation is enabled
- `destroy()` — cancel running tweens and remove the chart's DOM

## Configuration

A config is a plain object made of per-concern sections. Every section and
property is optional and falls back to a sensible default:

| Section | Configures |
| --- | --- |
| `titleConfig` | chart title text, alignment, style, click behavior |
| `groupAxisConfig` | the group (category) axis: data `property`, `type` (`string`/`number`/`date`), `scale` (`ordinal`/`linear`), ticks, thresholds |
| `seriesConfigs` | one entry per series: data `property`, `title`, `renderer` (`bar`/`line`/`area`), colors, markers, labels, focus behavior |
| `seriesAllConfig` | shared defaults applied to every entry of `seriesConfigs` |
| `seriesAxisConfigs` | one or more value axes; series are assigned by `axis` id |
| `seriesGroupConfigs` / `seriesStackConfigs` | grouping and stacking of series |
| `legendConfig` | legend placement, item style, series filtering on click |
| `tooltipConfig` | tooltip content, formatting, positioning |
| `crosshairConfig` | crosshair line style and snapping |
| `animationConfig` | `animate` on/off plus per-phase durations (initial, value change, expansion, collapse, focus) |
| `plotConfig` | plot area (e.g. `inverted` for horizontal charts) |
| `chartConfig` / `colorPaletteConfig` / `linearGradientConfigs` / `radialGradientConfigs` | chart-wide style, palette, and gradient definitions |

The full property-by-property reference can be generated from the validation
schema with `npm run generate-docs -w mochart`, which writes
[mochart-docs.html](mochart-docs.html).

### Config helpers

- `validateConfig(config)` — validate a raw config, returns readable errors
- `migrateConfig(config)` — migrate configs from older versions
- `enhanceConfig(config)` — validate/default/normalize into a `mochartConfig`
- `getDataErrors(mochartConfig, dataProvider)` — validate data against a config

## Data providers

Two dataset shapes are supported out of the box:

- `ArrayOfObjectsDataProvider` — `[{ month: 'Jan', revenue: 10 }, …]`
- `ObjectOfArraysDataProvider` — `{ month: ['Jan', …], revenue: [10, …] }`

`createDefaultChart` wraps its `data` array in an `ArrayOfObjectsDataProvider`
automatically; `createChart` accepts any object implementing the
`DataProvider` interface.

## Interaction callbacks

All callbacks are optional props on either entry point:

```js
createDefaultChart(container, {
  config, data, width, height,
  onFocus: ({ focusedSeriesId, focusedGroupIndex }) => { /* hover/click focus changed */ },
  onSeriesFilter: ({ filteredSeriesIds }) => { /* legend filtering changed */ },
  onChartClick: ({ groupIndex, chartX, chartY }) => { /* plot area clicked */ },
  onTitleClick: () => {}
});
```

- `onFocus(focus)` — the focused series/group/axis changed (mouse over/out or
  click, per the series' `focusOnMouseOver`/`focusOnClick` config)
- `onSeriesFilter(filter)` — a legend click toggled a series in/out of the
  filtered set
- `onChartClick` / `onChartMouseEnter` / `onChartMouseMove` /
  `onChartMouseLeave` — plot-area pointer events with chart coordinates and
  the nearest group index
- `onSeriesLayoutInfoChange(bounds)` — the plot area was re-laid-out

## Loading, error, and empty states

`loading` and `error` props switch the chart into the corresponding state.
What renders in each state is customizable through factory props that return a
DOM node (or string):

```js
createDefaultChart(container, {
  config, data, width, height,
  loading: isLoading,
  getLoadingComponent: () => {
    const el = document.createElement('div');
    el.textContent = 'Loading…';
    return el;
  }
});
```

Available factories: `getLoadingComponent`, `getErrorComponent`,
`getNoDataComponent`, `getNoSizeComponent`, `getNoSeriesComponent`, and
`getConfigErrorComponent` — each called with a context object
(`{ width, height, mochartConfig, dataProvider, error, hasData }`).

## Framework wrappers

- [mochart-react](../mochart-react/README.md) — React components
- [mochart-svelte](../mochart-svelte/README.md) — Svelte 5 components
- [mochart-vue](../mochart-vue/README.md) — Vue 3 components
- [mochart-lit](../mochart-lit/README.md) — lit-html directives

Each wrapper adds automatic container sizing (omit `width`/`height` to track
the container) on top of the same chart props.

## Examples

Build-free static HTML examples (script tag and ES module) live in
[example/](example/README.md). The full demo gallery is the
[mochart-demo](../mochart-demo/README.md) package.

## Development

```sh
npm run build -w mochart          # bundle to dist/ with vite
npm test -w mochart               # vitest (includes golden snapshot tests)
npm run test:coverage -w mochart  # vitest with v8 coverage
npm run typecheck -w mochart
npm run generate-docs -w mochart  # regenerate mochart-docs.html
```

The golden snapshot tests in `test/golden/` render whole charts (initial
mount, static update, mid-tween, and settled states) and compare serialized
SVG against checked-in snapshots — they are the primary regression oracle for
renderer changes.

## License

BSD-3-Clause
