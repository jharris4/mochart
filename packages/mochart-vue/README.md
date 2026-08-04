# @mochart/vue

Vue 3 components for the [@mochart/core](https://github.com/jharris4/mochart) charting library.

Prop changes get mochart's
[staged animations](https://github.com/jharris4/mochart/tree/main/packages/mochart#staged-animation)
for free — axis expansion, value change (with group and series transitions),
axis contraction, and gapless stacked transitions — no extra wiring needed.

## Install

```sh
npm install @mochart/vue vue
```

## Usage

`DefaultChart` is the simplest entry point — give it a raw config and a plain
array-of-objects dataset:

```vue
<script setup>
import { DefaultChart } from '@mochart/vue';

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
</script>

<template>
  <DefaultChart :config="config" :data="data" :width="640" :height="400" />
</template>
```

`Chart` is the lower-level component for hosts that manage config enhancement
and data providers themselves:

```vue
<script setup>
import { enhanceConfig, ArrayOfObjectsDataProvider } from '@mochart/core';
import { Chart } from '@mochart/vue';

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
`onFocus`, `onSeriesFilter`, `onSeriesLayoutBoundsChange` — usable as
`@chart-click` etc. in templates) and the placeholder components
(`loadingComponent`, `errorComponent`, `noDataComponent`, `noSizeComponent`,
`noSeriesComponent`, `configErrorComponent`). Each placeholder prop takes a
**Vue component** that receives the chart context (`width`, `height`, `error`,
…) as props and is rendered while the chart is in that state. Both components
also accept `loading` and `error` to force the loading or error state.
