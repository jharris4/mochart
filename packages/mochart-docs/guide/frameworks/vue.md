# Vue

`@mochart/vue` wraps [@mochart/core](https://github.com/jharris4/mochart/tree/main/packages/mochart)
in Vue 3 components. Config and data changes get mochart's
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

## When the data changes

Config and data changes are detected **by reference identity**: the chart
compares the props it receives, not their contents. Vue's deep reactivity
re-renders your own template after an in-place `push`, but the chart still
sees the same array — replace instead of mutate:

```js
const data = ref(initialData);

// ✓ a new array — the chart animates to it
data.value = [...data.value, { month: 'Mar', revenue: 30 }];

// ✗ invisible to the chart — same array identity
data.value.push({ month: 'Mar', revenue: 30 });
```

The same rule applies to `config` on `DefaultChart` and to
`mochartConfig`/`dataProvider` on `Chart` — pass a new object (or provider)
to change them.

For hosts that do mutate data in place, a template ref on the component
exposes the core
[`refresh()`](/guide/data-providers#when-the-data-changes) escape hatch —
it re-reads the current config/data, re-indexing the built-in providers:

```vue
<script setup>
const chart = ref(null);

function addRow(row) {
  data.value.push(row);
  chart.value.refresh();
}
</script>

<template>
  <DefaultChart ref="chart" :config="config" :data="data" />
</template>
```

## Callbacks and states

Both components accept the [chart callbacks](/guide/interaction#callbacks)
under their core names (`onChartClick`, `onFocus`, `onSliceClick`, …), usable
as `@chart-click` etc. in templates, and a placeholder prop per state. Each
placeholder prop takes a **Vue component** that receives the
[chart state context](/guide/chart-states) (`width`, `height`, `error`, …) as
props and is rendered while the chart is in that state. Both components also
accept `loading` and `error` to force the loading or error state.

Every prop, with its type and its core counterpart, is listed in
[Framework props](/reference/framework-props#vue).

## See it in action

The [Vue demo gallery](/vue/demos) is a full application built on `@mochart/vue`
(vue reactivity router); its source lives in
[packages/mochart-demo-vue](https://github.com/jharris4/mochart/tree/main/packages/mochart-demo-vue).
