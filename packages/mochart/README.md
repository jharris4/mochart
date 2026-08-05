# @mochart/core

Animated interactive SVG charting library with zero framework dependencies.

Charts are drawn with a retained-mode renderer — updates write only the DOM
attributes that actually changed; there is no vdom and no framework runtime.
Data and config changes animate smoothly, and charts respond to hover, focus,
and series filtering out of the box.

## Features

- **Renderers**: `bar`, `line`, and `area` series, mixable in one chart
- **Scales**: ordinal and linear category axes over string, number, and date values (via d3-scale)
- **Animation**: [staged transitions](#staged-animation) — axis expansion,
  value change (with group and series transitions), axis contraction — and
  gapless stacked animation
- **Interaction**: crosshair, tooltip, legend with series filtering, click and
  hover callbacks
- **Extras**: axis thresholds and ranges, linear/radial gradients, series
  markers and labels, stacked and grouped series
- **Config validation**: configs are validated with
  [@mochart/movalid](../movalid/README.md), producing human-readable error messages

## Staged animation

Most charting libraries tween every element straight to its final position in
a single step, which makes updates that change both the data and the axis
domains hard to follow. mochart instead splits each update into sequential
phases, so only one kind of change is in motion at a time:

1. **Axis expansion** — if the new data needs more room (new groups, larger
   values), the axis domains grow first and the existing shapes reflow into
   the wider domains, so incoming data has a place to land.
2. **Value change** — values tween to their new positions. This phase also
   plays **group transitions** (groups added, removed, or reordered are merged
   into one display sequence so old and new groups animate coherently) and
   **series transitions** (series added, removed, or filtered via the legend).
3. **Axis contraction** — once the values settle, the axis domains collapse to
   fit the remaining data.

Phases that a given update doesn't need are skipped, and each phase's duration
scales with the size of its change, so small updates stay snappy while large
ones use the full configured duration. The per-phase durations
(`expansionDuration`, `valueChangeDuration`, `contractionDuration`, plus
`initialDuration` for first load and `focusDuration` for hover/focus
transitions) are set in `animation`.

### Gapless stacked animation

Stacked series animate as a single unit: throughout a transition, each
segment's baseline is derived from the tweened top of the segment below it,
rather than each segment tweening independently toward its final position. The
stack therefore stays contiguous for the whole animation — no gaps or overlaps
between segments — even while series are being added to or removed from the
stack.

## Install

```sh
npm install @mochart/core
```

Charts style themselves with inline styles — no CSS import is required. If
your page uses a global CSS reset (Tailwind preflight, VitePress base styles,
normalize.css), also import the optional stylesheet, which re-asserts the
browser defaults the chart's HTML overlays (tooltip, message states) rely on:

```js
import '@mochart/core/mochart.css';
```

## Quick start

`createDefaultChart` is the simplest entry point — give it a raw config and a
plain array-of-objects dataset:

```js
import { createDefaultChart } from '@mochart/core';

const config = {
  title: { text: 'Revenue' },
  categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
  seriesDefaults: { renderer: 'bar' },
  series: [{ property: 'revenue', title: 'Revenue' }]
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
import { createChart, enhanceConfig, ArrayOfObjectsDataProvider } from '@mochart/core';

const mochartConfig = enhanceConfig(config);
const dataProvider = new ArrayOfObjectsDataProvider(data, 'month');

const chart = createChart(container, { mochartConfig, dataProvider, width: 640, height: 400 });
```

Both return a `ChartHandle`:

- `update(nextProps)` — merge new props into the chart; config, data, and size
  changes animate when animation is enabled
- `destroy()` — cancel running tweens and remove the chart's DOM

## Configuration

A config is a plain object made of per-concern sections. Nearly every section
and property is optional and falls back to a sensible default — only
`categoryAxis.property` and each series entry's `property` are required:

| Section | Configures |
| --- | --- |
| `title` | chart title text, alignment, style, click behavior |
| `categoryAxis` | the category axis: data `property`, `type` (`string`/`number`/`date`), `scale` (`ordinal`/`linear`), ticks, thresholds |
| `series` | one entry per series: data `property`, `title`, `renderer` (`bar`/`line`/`area`), colors, markers, labels, focus behavior |
| `seriesDefaults` | shared defaults applied to every entry of `series` |
| `valueAxes` | one or more value axes; series are assigned by `axis` id |
| `seriesGroups` / `seriesStacks` | grouping and stacking of series |
| `legend` | legend placement, item style, series filtering on click |
| `tooltip` | tooltip content, formatting, positioning |
| `crosshair` | crosshair line style and snapping |
| `animation` | `animate` on/off plus per-phase durations (initial, expansion, value change, contraction, focus) |
| `plot` | plot area (e.g. `inverted` for horizontal charts) |
| `chart` / `colorPalette` / `linearGradients` / `radialGradients` | chart-wide style, palette, and gradient definitions |

The full property-by-property reference is generated from the validation
schema: `npm run generate-docs -w @mochart/core` writes
[mochart-docs.html](mochart-docs.html) plus
`generated/config-reference.json`, the structured model that the
[@mochart/docs](../mochart-docs/README.md) site renders into its config
reference pages. The command fails if the descriptions, validators, and
defaults ever disagree on a section's keys.

### Config helpers

- `validateConfig(config, getDefaults(config))` — validate a raw config, returns readable errors
- `getDefaults(config)` — the per-section defaults `validateConfig` needs as its second argument
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
  onFocus: ({ focusedSeriesId, focusedCategoryIndex }) => { /* hover/click focus changed */ },
  onSeriesFilter: ({ filteredSeriesIds }) => { /* legend filtering changed */ },
  onChartClick: ({ categoryIndex, chartX, chartY }) => { /* plot area clicked */ },
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
- `onSeriesLayoutBoundsChange(bounds)` — the plot area was re-laid-out

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

- [@mochart/angular](../mochart-angular/README.md) — Angular components
- [@mochart/lit](../mochart-lit/README.md) — lit-html directives
- [@mochart/react](../mochart-react/README.md) — React components
- [@mochart/svelte](../mochart-svelte/README.md) — Svelte 5 components
- [@mochart/vue](../mochart-vue/README.md) — Vue 3 components

Each wrapper adds automatic container sizing (omit `width`/`height` to track
the container) on top of the same chart props.

## Examples

Build-free static HTML examples (script tag and ES module) live in
[example/](example/README.md). The full demo gallery is the
[@mochart/demo-vanilla](../mochart-demo-vanilla/README.md) package.

## Development

```sh
npm run build -w @mochart/core          # bundle to dist/ with vite
npm test -w @mochart/core               # vitest (includes golden snapshot tests)
npm run test:coverage -w @mochart/core  # vitest with v8 coverage
npm run typecheck -w @mochart/core
npm run generate-docs -w @mochart/core   # regenerate mochart-docs.html + generated/config-reference.json
npm run generate-jsdoc -w @mochart/core  # regenerate the JSDoc on src/types/config.ts from the config docs
```

The JSDoc on the config interfaces in `src/types/config.ts` is generated
from the same descriptions/validators/defaults as the config reference, so
IDE hovers document every config property; a test
(`test/config/jsdocSync.test.ts`) fails when the file drifts from the
sources.

The golden snapshot tests in `test/golden/` render whole charts (initial
mount, static update, mid-tween, and settled states) and compare serialized
SVG against checked-in snapshots — they are the primary regression oracle for
renderer changes.

## License

BSD-3-Clause
