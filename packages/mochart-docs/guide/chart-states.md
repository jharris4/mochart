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
- **No size** — width or height is 0 (e.g. the container hasn't been laid
  out yet)

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

**No series** — no series are configured (filtering every series out via the
legend lands a populated chart in the same state):

<LiveChart :config="states.noSeriesConfig" :data="states.data" :height="180" :demo-link="false" />

**No size** — the chart's width or height is 0, as before a container has
been laid out (this chart is told `width: 0` while its box stays visible):

<LiveChart :config="states.config" :data="states.data" :chart-props="{ width: 0 }" :height="180" :demo-link="false" />

## Customizing what renders

Each state has a factory prop that returns a DOM node (or string). The
factory receives a context object with the current
`{ width, height, mochartConfig, dataProvider, error, hasData }`:

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

Available factories: `getLoadingComponent`, `getErrorComponent`,
`getNoDataComponent`, `getNoSizeComponent`, `getNoSeriesComponent`, and
`getConfigErrorComponent` — see [State factories](/reference/props#factories)
for what each one renders, and
[`ChartFactoryContext`](/reference/props#factoryContext) for the context
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
