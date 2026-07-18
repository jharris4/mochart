# Vue

`@mochart/vue` wraps [@mochart/core](https://github.com/jharris4/mochart/tree/main/packages/mochart)
in Vue 3 components. Prop changes get mochart's
[staged animations](/guide/staged-animation) for free — axis expansion, value
change, axis contraction, and gapless stacked transitions — no extra wiring
needed.

## Install

```sh
npm install @mochart/vue vue
```

## Quick start

`DefaultChart` is the simplest entry point — give it a raw config and a plain
array-of-objects dataset:

```vue
<script setup>
import { DefaultChart } from '@mochart/vue';

const config = {
  version: '1.0.0',
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

`Chart` is the lower-level component for hosts that manage
[config enhancement](/guide/config-model#enhancement) and
[data providers](/guide/data-providers) themselves:

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

## Callbacks and states

Both components accept the [chart callbacks](/guide/interaction#callbacks)
(`onChartClick`, `onChartMouseEnter`, `onChartMouseMove`,
`onChartMouseLeave`, `onTitleClick`, `onFocus`, `onSeriesFilter`,
`onSeriesLayoutInfoChange` — usable as `@chart-click` etc. in templates) and
per-state placeholders — `loadingComponent`, `errorComponent`,
`noDataComponent`, `noSizeComponent`, `noSeriesComponent`,
`configErrorComponent`. Each placeholder prop takes a **Vue component** that
receives the [chart state context](/guide/chart-states) (`width`, `height`,
`error`, …) as props and is rendered while the chart is in that state. Both
components also accept `loading` and `error` to force the loading or error
state.

## See it in action

The [Vue demo gallery](/vue/) is a full application built on `@mochart/vue`
(vue reactivity router); its source lives in
[packages/mochart-demo-vue](https://github.com/jharris4/mochart/tree/main/packages/mochart-demo-vue).
