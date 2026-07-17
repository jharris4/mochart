# mochart-vue

Vue 3 components for the [mochart](https://github.com/jharris4/mochart) charting library.

## Install

```sh
npm install mochart-vue vue
```

## Usage

`DefaultChart` is the simplest entry point — give it a raw config and a plain
array-of-objects dataset:

```vue
<script setup>
import { DefaultChart } from 'mochart-vue';

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
</script>

<template>
  <DefaultChart :config="config" :data="data" :width="640" :height="400" />
</template>
```

`Chart` is the lower-level component for hosts that manage config enhancement
and data providers themselves:

```vue
<script setup>
import { enhanceConfig, ArrayOfObjectsDataProvider } from 'mochart';
import { Chart } from 'mochart-vue';

const mochartConfig = enhanceConfig(config);
const dataProvider = new ArrayOfObjectsDataProvider(data, 'month');
</script>

<template>
  <Chart :mochart-config="mochartConfig" :data-provider="dataProvider" :width="640" :height="400" />
</template>
```

## Sizing

`width` and `height` are optional. The component renders a container div the
chart mounts into; whichever dimension you omit tracks that div's size via
`ResizeObserver`. `class` and `style` fall through to that div, so size it
however you like and the chart follows it:

```vue
<Chart :mochart-config="mochartConfig" :data-provider="dataProvider" style="width: 100%; height: 400px" />
```

## Props

Both components accept the chart callbacks (`onChartClick`,
`onChartMouseEnter`, `onChartMouseMove`, `onChartMouseLeave`, `onTitleClick`,
`onFocus`, `onSeriesFilter`, `onSeriesLayoutInfoChange` — usable as
`@chart-click` etc. in templates) and the placeholder factories
(`getLoadingComponent`, `getErrorComponent`, `getNoDataComponent`,
`getNoSizeComponent`, `getNoSeriesComponent`). Factories return a **DOM Node
or string**, not a vnode — mochart renders without a vdom.
