# Chart states

Charts have explicit states for the moments when there is nothing (or nothing
valid) to draw — loading, error, no data, no size, no series, and invalid
config — and each state's rendering can be replaced.

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
- **Error** — the `error` prop is set
- **Config error** — the config failed [validation](/guide/config-model#validation)
- **No data / no series** — the dataset is empty or no series are configured
- **No size** — width or height is 0 (e.g. the container hasn't been laid
  out yet)

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

The framework bindings pass these through unchanged, so the same factories
work in Angular, Lit, React, Svelte, and Vue.
