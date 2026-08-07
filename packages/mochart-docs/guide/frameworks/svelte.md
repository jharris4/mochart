# Svelte

`@mochart/svelte` wraps [@mochart/core](https://github.com/jharris4/mochart/tree/main/packages/mochart)
in Svelte 5 components. Config and data changes get mochart's
[staged animations](/guide/staged-animation) for free — axis expansion, value
change, axis contraction, and gapless stacked transitions — no extra wiring
needed.

## Install

```sh
npm install @mochart/svelte svelte
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

```svelte
<script>
  import { DefaultChart } from '@mochart/svelte';

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

<DefaultChart {config} {data} width={640} height={400} />
```

`Chart` is the lower-level component for hosts that manage
[config enhancement](/guide/config-model#enhancement) and
[data providers](/guide/data-providers) themselves:

```svelte
<script>
  import { enhanceConfig, ArrayOfObjectsDataProvider } from '@mochart/core';
  import { Chart } from '@mochart/svelte';

  const mochartConfig = enhanceConfig(config);
  const dataProvider = new ArrayOfObjectsDataProvider(data, 'month');
</script>

<Chart {mochartConfig} {dataProvider} width={640} height={400} />
```

## Sizing

`width` and `height` are optional. The component renders a container div the
chart mounts into; whichever dimension you omit tracks that div's size via
`ResizeObserver`. Size the div with the `class`/`style` props and the chart
follows it:

```svelte
<Chart {mochartConfig} {dataProvider} style="width: 100%; height: 400px" />
```

Explicit `width`/`height` props win over conflicting `style` values.

## When the data changes

Config and data changes are detected **by reference identity**: the chart
compares the props it receives, not their contents. `$state`'s deep
reactivity updates your own markup after an in-place `push`, but the chart
still sees the same array — reassign instead of mutate:

```svelte
let data = $state(initialData);

// ✓ a new array — the chart animates to it
data = [...data, { month: 'Mar', revenue: 30 }];

// ✗ invisible to the chart — same array identity
data.push({ month: 'Mar', revenue: 30 });
```

The same rule applies to `config` on `DefaultChart` and to
`mochartConfig`/`dataProvider` on `Chart` — pass a new object (or provider)
to change them.

For hosts that do mutate data in place, `bind:this` exposes the core
[`refresh()`](/guide/data-providers#when-the-data-changes) escape hatch —
it re-reads the current config/data, re-indexing the built-in providers:

```svelte
<script>
  let chart;

  function addRow(row) {
    data.push(row);
    chart.refresh();
  }
</script>

<DefaultChart bind:this={chart} {config} {data} />
```

## Callbacks and states

Both components accept the [chart callbacks](/guide/interaction#callbacks)
under their core names (`onChartClick`, `onFocus`, `onSliceClick`, …) and a
placeholder prop per state. Each placeholder prop takes a **Svelte component**
that receives the [chart state context](/guide/chart-states) (`width`,
`height`, `error`, …) as props and is rendered while the chart is in that
state. Both components also accept `loading` and `error` to force the
loading or error state.

Every prop, with its type and its core counterpart, is listed in
[Framework props](/reference/framework-props#svelte).

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

The [Svelte demo gallery](/svelte/demos) is a full application built on
`@mochart/svelte` (Svelte 5 runes router); its source lives in
[packages/mochart-demo-svelte](https://github.com/jharris4/mochart/tree/main/packages/mochart-demo-svelte).
