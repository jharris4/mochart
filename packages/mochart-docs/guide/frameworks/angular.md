# Angular

`@mochart/angular` wraps [@mochart/core](https://github.com/jharris4/mochart/tree/main/packages/mochart)
in Angular components. Input changes get mochart's
[staged animations](/guide/staged-animation) for free — axis expansion, value
change, axis contraction, and gapless stacked transitions — no extra wiring
needed.

## Install

```sh
npm install @mochart/angular @angular/core
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

## Inputs, outputs, and states

Both components emit the [chart callbacks](/guide/interaction#callbacks) as
outputs, dropping the core `on` prefix — `onChartClick` becomes `chartClick`,
`onSliceClick` becomes `sliceClick` — usable as `(chartClick)="..."` in
templates; only subscribed outputs are wired into the chart. They also accept
a placeholder input per state. Each placeholder input takes an **Angular
component class** whose declared inputs among the
[chart state context](/guide/chart-states) names (`width`, `height`,
`error`, …) are kept up to date while the chart is in that state. Both
components also accept `loading` and `error` to force the loading or error
state.

Every input and output, with its type and its core counterpart, is listed in
[Framework props](/reference/framework-props#angular).

## See it in action

The [Angular demo gallery](/angular/) is a full application built on
`@mochart/angular` (Angular router, zoneless); its source lives in
[packages/mochart-demo-angular](https://github.com/jharris4/mochart/tree/main/packages/mochart-demo-angular).
