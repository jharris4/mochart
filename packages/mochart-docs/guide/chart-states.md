# Chart states

Charts have explicit states for the moments when there is nothing (or nothing
valid) to draw — loading, error, no data, no size, no series, and invalid
config — and each state's rendering can be replaced.

<script setup>
import * as states from '../examples/chart-states'
</script>

## Driving the states

`loading` and `error` are props; the rest are derived:

```js
const chart = createDefaultChart(container, {
  config, data, width, height,
  loading: true          // show the loading state
});

chart.update({ loading: false });          // back to the chart
chart.update({ error: 'Request failed' }); // show the error state
```

- **Loading** — the `loading` prop is `true`
- **Error** — the `error` prop is set to anything but `null` or `undefined`
  (`''` and `0` count)
- **Config error** — the config failed [validation](/guide/config-model#validation)
- **No data / no series** — the dataset is empty or no series are configured
- **No size** — width or height is not a positive number (e.g. 0, before the
  container has been laid out)

When `loading` and `error` are both set, the error state wins: the loading
overlay is not shown while an error is active.

## The states, live

Each state below renders with its built-in placeholder.

**Loading** — the `loading` prop is `true`:

<LiveChart :config="states.config" :data="states.data" :chart-props="{ loading: true }" toggle="loading" :height="180" :demo-link="false" />

**Error** — the `error` prop is set; the built-in placeholder shows the
error value:

<LiveChart :config="states.config" :data="states.data" :chart-props="{ error: 'Request failed (503)' }" toggle="error" :height="180" :demo-link="false" />

**Config error** — the config failed validation (here, a series pointing at
a value axis that does not exist); the built-in placeholder shows a generic
message, while the validation errors themselves come from
[`validateConfig`](/guide/config-model#validation):

<LiveChart :config="states.invalidConfig" :data="states.data" :height="180" :demo-link="false" />

**No data** — the dataset is empty:

<LiveChart :config="states.config" :data="states.noData" :height="180" :demo-link="false" />

**No series** — no series are configured. Filtering every series out from the
legend does *not* produce this state: filtering hides series but leaves the
configured list intact.



<LiveChart :config="states.noSeriesConfig" :data="states.data" :height="180" :demo-link="false" />

**No size** — the chart's width or height is 0, as before a container has
been laid out (this chart is told `width: 0` while its box stays visible):

<LiveChart :config="states.config" :data="states.data" :chart-props="{ width: 0 }" :height="180" :demo-link="false" />

## Interaction while loading

Loading is the only state that draws a working chart and then holds part of it
back — with no data or an error there is no plot to interact with in the first
place. The rule is that **the chart reports but does not commit**:

- Anything keyed to a **series or axis id** keeps working, because ids come from
  the config and survive a data change. Legend filtering, tooltip-row filtering,
  and axis hover focus all stay live.
- Anything keyed to a **category position** is suppressed, because it may name
  something that no longer exists once the new data lands. Plot clicks, the
  plot's arrow keys, and series or slice activation are all ignored, and no new
  tooltip opens — including the one `tooltip.followPointer` would otherwise open
  on hover.
- Whatever is **already open** can still be dismissed. A tooltip opened before
  the load stays put, and Escape and its close button keep working.

Pointer movement is still reported throughout, so `onChartMouseEnter`,
`onChartMouseMove` and `onChartMouseLeave` keep firing and stay correctly paired.

The tooltip's previous/next buttons are the one deliberate exception: they move a
category position, but only within a tooltip that is already open.

One practical detail: the loading message is a real element sized to its own
content, so the pointer does not reach the chart underneath it.

## Customizing what renders

Each state has a factory prop that returns a DOM node (or string). Every
factory receives the same context object, with all six members present on every
call:

```js
createDefaultChart(container, {
  config, data, width, height,
  loading: isLoading,
  getLoadingComponent: () => {
    const el = document.createElement('div');
    el.className = 'chart-loading';
    el.textContent = 'Loading…';
    return el;
  }
});
```

| Member | Value |
| --- | --- |
| `width` / `height` | Pixel size of the box the returned content fills; which box depends on the state (see below) |
| `mochartConfig` | The enhanced config as supplied, including the invalid one in the config-error state; `null` before the host has a config |
| `dataProvider` | The current provider, or `null` when there is none |
| `error` | The active error (the `error` prop or the provider's); `undefined` outside the error state |
| `hasData` | True when the committed dataset holds at least one category |

`width`/`height` are the only members whose meaning moves between states,
because the content is placed in a different box:

| Factory | `width`/`height` measure |
| --- | --- |
| `getNoSizeComponent`, `getConfigErrorComponent` | The chart — there is no plot yet |
| `getLoadingComponent`, `getErrorComponent` | The chart before a config arrives, the plot area once the chart is laid out |
| `getNoSeriesComponent`, `getNoDataComponent` | The plot area, with the axes drawn around it |

See [State factories](/reference/props#factories) for what each one renders,
and [`ChartFactoryContext`](/reference/props#factoryContext) for the context
fields.

The same loading chart as above, with a custom factory (a spinner driven by
the Web Animations API, sized from the factory context):

<LiveChart :config="states.config" :data="states.data" :chart-props="{ loading: true, getLoadingComponent: states.getLoadingComponent }" toggle="loading" :height="180" :demo-link="false" />

The framework bindings do not take these DOM factories — each exposes a
framework-native placeholder prop per state instead. `loadingComponent` and
friends take an Angular, React, Svelte, or Vue **component** that receives
the same context as props; the Lit binding's `loadingTemplate` and friends
take a **lit-html template function**. The binding renders it into the DOM
node the core factory must return. See the framework guides
([Angular](/guide/frameworks/angular), [Lit](/guide/frameworks/lit),
[React](/guide/frameworks/react), [Svelte](/guide/frameworks/svelte),
[Vue](/guide/frameworks/vue)) or
[Framework props](/reference/framework-props) for each binding's shape.
