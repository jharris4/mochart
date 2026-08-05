# @mochart/lit

[lit-html](https://lit.dev/docs/libraries/standalone-templates/) directives for
the [@mochart/core](https://github.com/jharris4/mochart) charting library. Works in
standalone lit-html templates and inside `LitElement` render methods alike.

Config and data changes get mochart's
[staged animations](https://github.com/jharris4/mochart/tree/main/packages/mochart#staged-animation)
for free — axis expansion, value change (with category and series transitions),
axis contraction, and gapless stacked transitions — no extra wiring needed.

## Install

```sh
npm install @mochart/lit lit-html
```

## Usage

`defaultChart` is the simplest entry point — give it a raw config and a plain
array-of-objects dataset:

```js
import { html, render } from 'lit-html';
import { defaultChart } from '@mochart/lit';

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

render(html`${defaultChart({ config, data, width: 640, height: 400 })}`, document.body);
```

`chart` is the lower-level directive for hosts that manage config enhancement
and data providers themselves:

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

## Props

Both directives accept the chart callbacks (`onChartClick`, `onSliceClick`,
`onChartMouseEnter`, `onChartMouseMove`, `onChartMouseLeave`, `onTitleClick`,
`onFocus`, `onSeriesFilter`, `onSeriesLayoutBoundsChange`) and the placeholder
templates (`loadingTemplate`, `errorTemplate`, `noDataTemplate`,
`noSizeTemplate`, `noSeriesTemplate`, `configErrorTemplate`). Each placeholder
prop takes a **lit-html template function** that receives the chart context
(`width`, `height`, `error`, …) and is rendered while the chart is in that
state:

```js
const loadingTemplate = ({ width, height }) => html`<div>Loading ${width}x${height}…</div>`;

html`${chart({ mochartConfig, dataProvider, loading, loadingTemplate })}`
```

Both directives also accept `loading` and `error` to force the loading or
error state.

### Controlled state

Focus and legend filtering are chart-managed by default, but each piece of
that state has a matching prop that takes over while it is set (not
`undefined`): `focusedCategoryIndex` (`-1` = none), `focusedSeriesId` and
`focusedValueAxisId` (`null` = none), and `filteredSeriesIds` (a map of
series id → `true` = filtered out). Pass back what `onFocus` and
`onSeriesFilter` report to keep focus and filtering in sync across several
charts; leave a prop `undefined` to let the chart keep managing that piece
itself.
