# mochart-react

React components for the [mochart](https://github.com/jharris4/mochart) charting library.

## Install

```sh
npm install mochart-react react
```

## Usage

`DefaultChart` is the simplest entry point — give it a raw config and a plain
array-of-objects dataset:

```tsx
import { DefaultChart } from 'mochart-react';

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

export function Revenue() {
  return <DefaultChart config={config} data={data} width={640} height={400} />;
}
```

`Chart` is the lower-level component for hosts that manage config enhancement
and data providers themselves:

```tsx
import { enhanceConfig, ArrayOfObjectsDataProvider } from 'mochart';
import { Chart } from 'mochart-react';

const mochartConfig = enhanceConfig(config);
const dataProvider = new ArrayOfObjectsDataProvider(data, 'month');

<Chart mochartConfig={mochartConfig} dataProvider={dataProvider} width={640} height={400} />
```

## Sizing

`width` and `height` are optional. The component renders a container div the
chart mounts into; whichever dimension you omit tracks that div's size via
`ResizeObserver`. Size the div with the `className`/`style` props and the
chart follows it:

```tsx
<Chart mochartConfig={mochartConfig} dataProvider={dataProvider} style={{ width: '100%', height: 400 }} />
```

## Props

Both components accept the chart callbacks (`onChartClick`,
`onChartMouseEnter`, `onChartMouseMove`, `onChartMouseLeave`, `onTitleClick`,
`onFocus`, `onSeriesFilter`, `onSeriesLayoutInfoChange`) and the placeholder
factories (`getLoadingComponent`, `getErrorComponent`, `getNoDataComponent`,
`getNoSizeComponent`, `getNoSeriesComponent`). Factories return a **DOM Node
or string**, not JSX — mochart renders without a vdom.
