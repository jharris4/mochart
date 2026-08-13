# Vue

`@mochart/vue` wraps [@mochart/core](https://github.com/jharris4/mochart/tree/main/packages/mochart)
in Vue 3 components. Config and data changes get mochart's
[staged animations](/guide/staged-animation) for free — axis expansion, value
change, axis contraction, and gapless stacked transitions — no extra wiring
needed.

## Install

```sh
npm install @mochart/vue @mochart/core vue
```

## The optional stylesheet

If your app uses a global CSS reset (Tailwind's preflight, a
`normalize.css`-style reset), also import the core package's
[optional stylesheet](/guide/getting-started#the-optional-stylesheet) — it
re-asserts the browser defaults the chart's tooltip and message overlays
rely on, and never overrides the chart's own styling:

```js
import '@mochart/core/mochart.css';
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
const dataProvider = new ArrayOfObjectsDataProvider(data);
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

Explicit `width`/`height` props win over conflicting `style` values.

Other attributes (`id`, `data-testid`, …) fall through to the container div
the same way. The optional `dataTestId` prop is the same surface the other
bindings offer — it also sets `data-testid` and wins over a fallthrough
attribute when both are given.

## When the data changes

Config and data changes are detected **by reference identity**: the chart
compares the props it receives, not their contents. Vue's deep reactivity
re-renders your own template after an in-place `push`, but the chart still
sees the same array — replace instead of mutate:

```js
import { ref } from 'vue';

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
it re-reads the current config/data (the built-in providers read live, so any in-place change is seen):

```vue
<script setup>
import { ref } from 'vue';
import { DefaultChart } from '@mochart/vue';

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

A placeholder is rendered as its own Vue root that carries the chart
component's **app context**, so it can use globally registered components and
directives and can `inject()` a value passed to `app.provide()`. It has no
parent component, so a value an ancestor component supplied with `provide()` is
not reachable — `inject()` returns its default (and warns when there is none).
If a placeholder needs such a value, either move it to `app.provide()`, or
`inject()` it in the host component and define the placeholder there as a
component that closes over it. This is narrower than React, where a placeholder
reads any ancestor's context; see [React](/guide/frameworks/react).

Every prop, with its type and its core counterpart, is listed in
[Framework props](/reference/framework-props#vue).

## Controlled state

Focus and legend filtering are chart-managed by default, but each piece of
that state has a matching prop that takes over while it is set (not
`undefined`): `focusedCategoryIndex` (`-1` = none), `focusedSeriesId` and
`focusedValueAxisId` (`null` = none), and `filteredSeriesIds` (a map of
series id → `true` = filtered out). Pass back what `onFocus` and
`onSeriesFilter` report to keep focus and filtering in sync across several
charts (the round-trip is shown in
[Controlled focus and filtering](/guide/interaction#controlled-focus-and-filtering));
leave a prop `undefined` to let the chart keep managing that piece itself.

## See it in action

The [Vue demo gallery](/vue/demos) is a full application built on `@mochart/vue`
(vue reactivity router); its source lives in
[packages/mochart-demo-vue](https://github.com/jharris4/mochart/tree/main/packages/mochart-demo-vue).
