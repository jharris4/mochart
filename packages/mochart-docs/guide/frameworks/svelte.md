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

## See it in action

The [Svelte demo gallery](/svelte/demos) is a full application built on
`@mochart/svelte` (Svelte 5 runes router); its source lives in
[packages/mochart-demo-svelte](https://github.com/jharris4/mochart/tree/main/packages/mochart-demo-svelte).
