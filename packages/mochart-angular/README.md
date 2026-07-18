# mochart-angular

Angular components for the [mochart](https://github.com/jharris4/mochart) charting library.

Input changes get mochart's
[staged animations](https://github.com/jharris4/mochart/tree/main/packages/mochart#staged-animation)
for free — axis expansion, value change (with group and series transitions),
axis contraction, and gapless stacked transitions — no extra wiring needed.

## Install

```sh
npm install mochart-angular @angular/core
```

## Usage

`DefaultChart` is the simplest entry point — give it a raw config and a plain
array-of-objects dataset:

```ts
import { Component } from '@angular/core';
import { DefaultChart } from 'mochart-angular';

@Component({
  selector: 'app-revenue',
  imports: [DefaultChart],
  template: '<mochart-default-chart [config]="config" [data]="data" [width]="640" [height]="400" />'
})
export class Revenue {
  config = {
    titleConfig: { title: 'Revenue' },
    groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
    seriesAllConfig: { renderer: 'bar' },
    seriesConfigs: [{ property: 'revenue', title: 'Revenue' }]
  };

  data = [
    { month: 'Jan', revenue: 10 },
    { month: 'Feb', revenue: 20 }
  ];
}
```

`Chart` is the lower-level component for hosts that manage config enhancement
and data providers themselves:

```ts
import { Component } from '@angular/core';
import { enhanceConfig, ArrayOfObjectsDataProvider } from 'mochart';
import { Chart } from 'mochart-angular';

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

## Inputs & outputs

Both components emit the chart callbacks as outputs (`chartClick`,
`chartMouseEnter`, `chartMouseMove`, `chartMouseLeave`, `titleClick`, `focus`,
`seriesFilter`, `seriesLayoutInfoChange` — usable as `(chartClick)="..."` etc.
in templates; only subscribed outputs are wired into the chart) and accept the
placeholder components (`loadingComponent`, `errorComponent`,
`noDataComponent`, `noSizeComponent`, `noSeriesComponent`,
`configErrorComponent`). Each placeholder input takes an **Angular component
class** whose declared inputs among the chart context names (`width`,
`height`, `error`, …) are kept up to date while the chart is in that state.
Both components also accept `loading` and `error` to force the loading or
error state.
