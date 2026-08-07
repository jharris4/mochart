# Angular

`@mochart/angular` wraps [@mochart/core](https://github.com/jharris4/mochart/tree/main/packages/mochart)
in Angular components. Config and data changes get mochart's
[staged animations](/guide/staged-animation) for free — axis expansion, value
change, axis contraction, and gapless stacked transitions — no extra wiring
needed.

## Install

```sh
npm install @mochart/angular @angular/core
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

```ts
import { Component } from '@angular/core';
import { DefaultChart } from '@mochart/angular';

@Component({
  selector: 'app-revenue',
  imports: [DefaultChart],
  template: '<mochart-default-chart [config]="config" [data]="data" [width]="640" [height]="400" />'
})
export class Revenue {
  config = {
    title: { text: 'Revenue' },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    seriesDefaults: { renderer: 'bar' },
    series: [{ property: 'revenue', title: 'Revenue' }]
  };

  data = [
    { month: 'Jan', revenue: 10 },
    { month: 'Feb', revenue: 20 }
  ];
}
```

`Chart` is the lower-level component for hosts that manage
[config enhancement](/guide/config-model#enhancement) and
[data providers](/guide/data-providers) themselves:

```ts
import { Component } from '@angular/core';
import { enhanceConfig, ArrayOfObjectsDataProvider } from '@mochart/core';
import { Chart } from '@mochart/angular';

@Component({
  selector: 'app-revenue',
  imports: [Chart],
  template: '<mochart-chart [mochartConfig]="mochartConfig" [dataProvider]="dataProvider" [width]="640" [height]="400" />'
})
export class Revenue {
  mochartConfig = enhanceConfig(config);
  dataProvider = new ArrayOfObjectsDataProvider(data, 'month');
}
```

## Sizing

`width` and `height` are optional. The component's own host element
(`<mochart-chart>` / `<mochart-default-chart>`) is the container the chart
mounts into; whichever dimension you omit tracks that element's size via
`ResizeObserver`. `class` and `style` set on the element style that same
container, so size it however you like and the chart follows it:

```html
<mochart-chart [mochartConfig]="mochartConfig" [dataProvider]="dataProvider" style="width: 100%; height: 400px" />
```

## When the data changes

Config and data changes are detected **by reference identity**: the chart
compares the inputs it receives, not their contents. An in-place `push`
leaves the input reference unchanged, so change detection has nothing new
to pass on — reassign instead of mutate:

```ts
// ✓ a new array — the chart animates to it
this.data = [...this.data, { month: 'Mar', revenue: 30 }];

// ✗ invisible — same reference, the input never changes
this.data.push({ month: 'Mar', revenue: 30 });
```

The same rule applies to `config` on `mochart-default-chart` and to
`mochartConfig`/`dataProvider` on `mochart-chart` — pass a new object (or
provider) to change them.

For hosts that do mutate data in place, the components expose the core
[`refresh()`](/guide/data-providers#when-the-data-changes) escape hatch as
a public method — it re-reads the current config/data, re-indexing the
built-in providers. Reach it through a template reference variable or
`@ViewChild`:

```ts
@ViewChild('chart') chart!: DefaultChart;

addRow(row: DataRow) {
  this.data.push(row);
  this.chart.refresh();
}
```

```html
<mochart-default-chart #chart [config]="config" [data]="data" />
```

## Inputs, outputs, and states

Both components emit the [chart callbacks](/guide/interaction#callbacks) as
outputs, dropping the core `on` prefix — `onChartClick` becomes `chartClick`,
`onSliceClick` becomes `sliceClick` — usable as `(chartClick)="..."` in
templates; only subscribed outputs are wired into the chart. The one exception
is `onFocus`, exposed as `focusChange` — a bare `(focus)` would collide with
the native focus event. They also accept
a placeholder input per state. Each placeholder input takes an **Angular
component class** whose declared inputs among the
[chart state context](/guide/chart-states) names (`width`, `height`,
`error`, …) are kept up to date while the chart is in that state. Both
components also accept `loading` and `error` to force the loading or error
state.

Every input and output, with its type and its core counterpart, is listed in
[Framework props](/reference/framework-props#angular).

## Controlled state

Focus and legend filtering are chart-managed by default, but each piece of
that state has a matching input that takes over while it is set (not
`undefined`): `focusedCategoryIndex` (`-1` = none), `focusedSeriesId` and
`focusedValueAxisId` (`null` = none), and `filteredSeriesIds` (a map of
series id → `true` = filtered out). Pass back what the `focusChange` and
`seriesFilter` outputs emit to keep focus and filtering in sync across
several charts (the round-trip is shown in
[Controlled focus and filtering](/guide/interaction#controlled-focus-and-filtering));
leave an input `undefined` to let the chart keep managing that piece itself.

## See it in action

The [Angular demo gallery](/angular/demos) is a full application built on
`@mochart/angular` (Angular router, zoneless); its source lives in
[packages/mochart-demo-angular](https://github.com/jharris4/mochart/tree/main/packages/mochart-demo-angular).
