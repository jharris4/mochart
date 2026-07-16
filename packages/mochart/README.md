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
  markers and labels
- **Config validation**: configs are validated with
  [valide](../valide/README.md), producing human-readable error messages

## Install

```sh
npm install mochart
```

## Usage

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

Both return a `ChartHandle` with `update(nextProps)` and `destroy()`.

### Data providers

Two dataset shapes are supported:

- `ArrayOfObjectsDataProvider` — `[{ month: 'Jan', revenue: 10 }, …]`
- `ObjectOfArraysDataProvider` — `{ month: ['Jan', …], revenue: [10, …] }`

### Config helpers

- `validateConfig(config)` — validate a raw config, returns readable errors
- `migrateConfig(config)` — migrate configs from older versions
- `enhanceConfig(config)` — validate/default/normalize into a `mochartConfig`
- `getDataErrors(dataProvider, mochartConfig)` — validate data against a config

## Framework wrappers

- [mochart-react](../mochart-react/README.md) — React components
- [mochart-svelte](../mochart-svelte/README.md) — Svelte 5 components

## Examples

Build-free static HTML examples (script tag and ES module) live in
[example/](example/README.md). The full demo gallery is the
[mochartdemo](../mochartdemo/README.md) package.

## Development

```sh
npm run build -w mochart       # bundle to dist/ with vite
npm test -w mochart            # vitest (includes golden snapshot tests)
npm run typecheck -w mochart
```

## License

BSD-3-Clause
