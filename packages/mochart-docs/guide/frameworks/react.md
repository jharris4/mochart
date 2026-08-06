# React

`@mochart/react` wraps [@mochart/core](https://github.com/jharris4/mochart/tree/main/packages/mochart)
in React components. Config and data changes get mochart's
[staged animations](/guide/staged-animation) for free — axis expansion, value
change, axis contraction, and gapless stacked transitions — no extra wiring
needed.

## Install

```sh
npm install @mochart/react react react-dom
```

## Quick start

`DefaultChart` is the simplest entry point — give it a raw config and a plain
array-of-objects dataset:

```tsx
import { DefaultChart } from '@mochart/react';

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

export function Revenue() {
  return <DefaultChart config={config} data={data} width={640} height={400} />;
}
```

`Chart` is the lower-level component for hosts that manage
[config enhancement](/guide/config-model#enhancement) and
[data providers](/guide/data-providers) themselves:

```tsx
import { enhanceConfig, ArrayOfObjectsDataProvider } from '@mochart/core';
import { Chart } from '@mochart/react';

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

## When the data changes

Config and data changes are detected **by reference identity**: passing the
same array or object again — even after mutating it in place — leaves the
chart unchanged. Update state with a new reference and the change animates
as a normal data update:

```tsx
const [data, setData] = useState(initialData);

// ✓ a new array — the chart animates to it
setData(current => [...current, { month: 'Mar', revenue: 30 }]);

// ✗ invisible — same array identity (and no React re-render either)
data.push({ month: 'Mar', revenue: 30 });
```

Idiomatic React state updates already work this way. The same rule applies
to `config` on `DefaultChart` and to `mochartConfig`/`dataProvider` on
`Chart` — pass a new object (or provider) to change them.

For hosts that do mutate data in place, the `ref` prop exposes a `ChartRef`
handle with the core
[`refresh()`](/guide/data-providers#when-the-data-changes) escape hatch —
it re-reads the current config/data, re-indexing the built-in providers:

```tsx
const chartRef = useRef<ChartRef>(null);

<DefaultChart ref={chartRef} config={config} data={data} />;

data.push({ month: 'Mar', revenue: 30 });
chartRef.current?.refresh();
```

## Callbacks and states

Both components accept the [chart callbacks](/guide/interaction#callbacks)
under their core names (`onChartClick`, `onFocus`, `onSliceClick`, …) and a
placeholder prop per state. Each placeholder prop takes a **React component**
that receives the [chart state context](/guide/chart-states) (`width`,
`height`, `error`, …) as props and is rendered while the chart is in that
state. Both components also accept `loading` and `error` to force the
loading or error state.

Every prop, with its type and its core counterpart, is listed in
[Framework props](/reference/framework-props#react).

## See it in action

The [React demo gallery](/react/demos) is a full application built on
`@mochart/react` (react-router 7); its source lives in
[packages/mochart-demo-react](https://github.com/jharris4/mochart/tree/main/packages/mochart-demo-react).
