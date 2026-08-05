# @mochart/svelte

Svelte 5 components for the [@mochart/core](https://github.com/jharris4/mochart) charting library.

Prop changes get mochart's
[staged animations](https://github.com/jharris4/mochart/tree/main/packages/mochart#staged-animation)
for free — axis expansion, value change (with category and series transitions),
axis contraction, and gapless stacked transitions — no extra wiring needed.

## Install

```sh
npm install @mochart/svelte svelte
```

## Usage

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

`Chart` is the lower-level component for hosts that manage config enhancement
and data providers themselves:

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

## Props

Both components accept the chart callbacks (`onChartClick`, `onSliceClick`,
`onChartMouseEnter`, `onChartMouseMove`, `onChartMouseLeave`, `onTitleClick`,
`onFocus`, `onSeriesFilter`, `onSeriesLayoutBoundsChange`) and the placeholder
components (`loadingComponent`, `errorComponent`, `noDataComponent`,
`noSizeComponent`, `noSeriesComponent`, `configErrorComponent`). Each
placeholder prop takes a **Svelte component** that receives the chart context
(`width`, `height`, `error`, …) as props and is rendered while the chart is in
that state. Both components also accept `loading` and `error` to force the
loading or error state.

### Controlled state

Focus and legend filtering are chart-managed by default, but each piece of
that state has a matching prop that takes over while it is set (not
`undefined`): `focusedCategoryIndex` (`-1` = none), `focusedSeriesId` and
`focusedValueAxisId` (`null` = none), and `filteredSeriesIds` (a map of
series id → `true` = filtered out). Pass back what `onFocus` and
`onSeriesFilter` report to keep focus and filtering in sync across several
charts; leave a prop `undefined` to let the chart keep managing that piece
itself.
