# Lit

`@mochart/lit` provides
[lit-html](https://lit.dev/docs/libraries/standalone-templates/) directives
for [@mochart/core](https://github.com/jharris4/mochart/tree/main/packages/mochart).
They work in standalone lit-html templates and inside `LitElement` render
methods alike. Re-renders get mochart's
[staged animations](/guide/staged-animation) for free — axis expansion, value
change, axis contraction, and gapless stacked transitions — no extra wiring
needed.

## Install

```sh
npm install @mochart/lit lit-html
```

## Quick start

`defaultChart` is the simplest entry point — give it a raw config and a plain
array-of-objects dataset:

```js
import { html, render } from 'lit-html';
import { defaultChart } from '@mochart/lit';

const config = {
  version: '1.0.0',
  title: { text: 'Revenue' },
  categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
  seriesDefaults: { renderer: 'bar' },
  series: [{ property: 'revenue', title: 'Revenue' }]
};

const data = [
  { month: 'Jan', revenue: 10 },
  { month: 'Feb', revenue: 20 }
];

render(html`${defaultChart({ config, data, width: 640, height: 400 })}`, document.body);
```

`chart` is the lower-level directive for hosts that manage
[config enhancement](/guide/config-model#enhancement) and
[data providers](/guide/data-providers) themselves:

```js
import { enhanceConfig, ArrayOfObjectsDataProvider } from '@mochart/core';
import { chart } from '@mochart/lit';

const mochartConfig = enhanceConfig(config);
const dataProvider = new ArrayOfObjectsDataProvider(data, 'month');

render(html`${chart({ mochartConfig, dataProvider, width: 640, height: 400 })}`, document.body);
```

## Sizing

`width` and `height` are optional. The directive renders a container div the
chart mounts into; whichever dimension you omit tracks that div's size via
`ResizeObserver`, so you can size the div from surrounding layout and the
chart follows it:

```js
html`<div style="width: 100%; height: 400px">${chart({ mochartConfig, dataProvider })}</div>`
```

The optional `className` and `style` props land on the container div itself —
the directive equivalent of the class/style fallthrough the component
wrappers get (explicit `width`/`height` props still win over `style`):

```js
html`${chart({ mochartConfig, dataProvider, style: 'flex: 1 1 auto; min-width: 0;' })}`
```

## Callbacks and states

Both directives accept the [chart callbacks](/guide/interaction#callbacks)
under their core names (`onChartClick`, `onFocus`, `onSliceClick`, …) and a
placeholder prop per state — named `*Template` rather than `*Component`,
since each takes a
**lit-html template function** rather than a component class. It receives the
[chart state context](/guide/chart-states) (`width`, `height`, `error`, …)
and is rendered while the chart is in that state:

```js
const loadingTemplate = ({ width, height }) => html`<div>Loading ${width}x${height}…</div>`;

html`${chart({ mochartConfig, dataProvider, loading, loadingTemplate })}`
```

Both directives also accept `loading` and `error` to force the loading or
error state.

Every prop, with its type and its core counterpart, is listed in
[Framework props](/reference/framework-props#lit).

## See it in action

The [Lit demo gallery](/lit/) is a full `LitElement` application built on
`@mochart/lit`; its source lives in
[packages/mochart-demo-lit](https://github.com/jharris4/mochart/tree/main/packages/mochart-demo-lit).
