# mochart-lit

[lit-html](https://lit.dev/docs/libraries/standalone-templates/) directives for
the [mochart](https://github.com/jharris4/mochart) charting library. Works in
standalone lit-html templates and inside `LitElement` render methods alike.

## Install

```sh
npm install mochart-lit lit-html
```

## Usage

`defaultChart` is the simplest entry point — give it a raw config and a plain
array-of-objects dataset:

```js
import { html, render } from 'lit-html';
import { defaultChart } from 'mochart-lit';

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

render(html`${defaultChart({ config, data, width: 640, height: 400 })}`, document.body);
```

`chart` is the lower-level directive for hosts that manage config enhancement
and data providers themselves:

```js
import { enhanceConfig, ArrayOfObjectsDataProvider } from 'mochart';
import { chart } from 'mochart-lit';

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

Both directives accept the chart callbacks (`onChartClick`,
`onChartMouseEnter`, `onChartMouseMove`, `onChartMouseLeave`, `onTitleClick`,
`onFocus`, `onSeriesFilter`, `onSeriesLayoutInfoChange`) and the placeholder
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
