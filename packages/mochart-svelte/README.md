# mochart-svelte

Svelte 5 components for the [mochart](https://github.com/jharris4/mochart) charting library.

## Install

```sh
npm install mochart-svelte svelte
```

## Usage

`DefaultChart` is the simplest entry point — give it a raw config and a plain
array-of-objects dataset:

```svelte
<script>
  import { DefaultChart } from 'mochart-svelte';

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

<DefaultChart {config} {data} width={640} height={400} />
```

`Chart` is the lower-level component for hosts that manage config enhancement
and data providers themselves:

```svelte
<script>
  import { enhanceConfig, ArrayOfObjectsDataProvider } from 'mochart';
  import { Chart } from 'mochart-svelte';

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

Both components accept the chart callbacks (`onChartClick`,
`onChartMouseEnter`, `onChartMouseMove`, `onChartMouseLeave`, `onTitleClick`,
`onFocus`, `onSeriesFilter`, `onSeriesLayoutInfoChange`) and the placeholder
components (`loadingComponent`, `errorComponent`, `noDataComponent`,
`noSizeComponent`, `noSeriesComponent`). Each placeholder prop takes a
**Svelte component** that receives the chart context (`width`, `height`,
`error`, …) as props and is rendered while the chart is in that state.
