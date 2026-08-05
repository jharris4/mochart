# Getting started

mochart draws animated, interactive SVG charts from two plain inputs: a
**config** object describing the chart and a **dataset**. No framework is
required — the core library manipulates the DOM directly through a
retained-mode renderer, and updates write only the attributes that changed.

## Install

```sh
npm install @mochart/core
```

Using a framework? Install its binding instead and get automatic container
sizing on top of the same API:
[Angular](/guide/frameworks/angular), [Lit](/guide/frameworks/lit),
[React](/guide/frameworks/react), [Svelte](/guide/frameworks/svelte), or
[Vue](/guide/frameworks/vue).

### The optional stylesheet

Charts style themselves with inline styles, so no CSS import is required.
The package does ship one optional stylesheet:

```js
import '@mochart/core/mochart.css';
```

It re-asserts the browser default styles that the chart's HTML overlays (the
tooltip and the no-data/loading/error messages) rely on. Import it when your
page uses a global CSS reset — Tailwind's preflight, VitePress's base styles,
or a `normalize.css`-style reset — which can otherwise disturb overlay layout
(for example, `svg { display: block }` breaks the vertical alignment of
tooltip rows). It never overrides the chart's own styling, and overlays still
inherit your page's font and text color.

## Your first chart

`createDefaultChart` is the simplest entry point — give it a container
element, a raw config, and an array-of-objects dataset:

<script setup>
import * as basic from '../examples/basic'
</script>

<LiveChart :config="basic.config" :data="basic.data" :alt-data="basic.altData" />

```js
import { createDefaultChart } from '@mochart/core';

const config = {
  title: { text: 'Monthly Revenue' },
  categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
  seriesDefaults: { renderer: 'bar' },
  series: [{ property: 'revenue', title: 'Revenue' }]
};

const data = [
  { month: 'Jan', revenue: 12 },
  { month: 'Feb', revenue: 18 },
  { month: 'Mar', revenue: 15 },
  { month: 'Apr', revenue: 24 },
  { month: 'May', revenue: 21 },
  { month: 'Jun', revenue: 28 }
];

const chart = createDefaultChart(document.getElementById('chart'), {
  config,
  data,
  width: 640,
  height: 400
});
```

Three things to notice:

- `categoryAxis.property` and each series' `property` name the dataset
  fields to read — the category value and the series values.
- An optional `version` pins the config format — worth including in configs
  you store or share, so `migrateConfig` can upgrade them if the format
  changes ([validation](/guide/config-model#validation)).
- Everything else is optional. Axes, legend, tooltip, crosshair, and
  animation all come with defaults; the
  [config reference](/reference/) documents every property.

## Updating and destroying

The returned `ChartHandle`:

```js
chart.update({ data: nextData });   // animates to the new data
chart.update({ width, height });    // re-layout at a new size
chart.update({ config: nextConfig }); // config changes animate too
chart.refresh();                    // re-read data that was mutated in place
chart.destroy();                    // cancel tweens, remove the chart's DOM
```

`update` merges new props into the chart and detects changes by object
identity: pass a **new** data array or config object — mutating the previous
one in place is not detected. If you do mutate your data in place, call
`refresh` to re-read it. (There is also `replace`, which swaps the
whole prop set at once, for hosts that pass every prop on every render.)

When animation is enabled (the default), data, config, and size changes —
and `refresh` — all animate through mochart's
[staged animation](/guide/staged-animation) phases — try the button under the
chart above.

## The lower-level entry point

`createChart` skips the conveniences: it takes an already-enhanced config and
an explicit data provider, for hosts that manage those themselves:

```js
import { createChart, enhanceConfig, ArrayOfObjectsDataProvider } from '@mochart/core';

const mochartConfig = enhanceConfig(config);
const dataProvider = new ArrayOfObjectsDataProvider(data, 'month');

const chart = createChart(container, { mochartConfig, dataProvider, width: 640, height: 400 });
```

See [The config model](/guide/config-model) for what "enhanced" means and
[Data providers](/guide/data-providers) for the provider interface.

## Where to go next

- [The config model](/guide/config-model) — how config sections, shared
  `*Defaults` sections, defaults, and validation fit together
- [Staged animation](/guide/staged-animation) — what animates, in what order,
  and how to tune it
- [Interaction](/guide/interaction) — focus, legend filtering, tooltip,
  crosshair, and the callback props
- [Recipes](/recipes/stacked-bars) — working configs for common chart shapes
- The demo galleries ([Vanilla](/vanilla/demos), [Angular](/angular/demos),
  [Lit](/lit/demos), [React](/react/demos), [Svelte](/svelte/demos), [Vue](/vue/demos)) — browse
  dozens of demo charts and edit their configs and data live
