# @mochart/angular

Angular components for the [@mochart/core](https://github.com/jharris4/mochart) charting library.

Input changes get mochart's
[staged animations](https://github.com/jharris4/mochart/tree/main/packages/mochart#staged-animation)
for free — axis expansion, value change (with category and series transitions),
axis contraction, and gapless stacked transitions — no extra wiring needed.

## Install

```sh
npm install @mochart/angular @angular/core
```

## Usage

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

`Chart` is the lower-level component for hosts that manage config enhancement
and data providers themselves:

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

## Inputs & outputs

Both components emit the chart callbacks as outputs (`chartClick`,
`sliceClick`, `chartMouseEnter`, `chartMouseMove`, `chartMouseLeave`,
`titleClick`, `focusChange`, `seriesFilter`, `seriesLayoutBoundsChange` —
usable as `(chartClick)="..."` etc. in templates; only subscribed outputs
are wired into the chart) and accept the
placeholder components (`loadingComponent`, `errorComponent`,
`noDataComponent`, `noSizeComponent`, `noSeriesComponent`,
`configErrorComponent`). Each placeholder input takes an **Angular component
class** whose declared inputs among the chart context names (`width`,
`height`, `error`, …) are kept up to date while the chart is in that state.
Both components also accept `loading` and `error` to force the loading or
error state.

### Controlled state

Focus and legend filtering are chart-managed by default, but each piece of
that state has a matching input that takes over while it is set (not
`undefined`): `focusedCategoryIndex` (`-1` = none), `focusedSeriesId` and
`focusedValueAxisId` (`null` = none), and `filteredSeriesIds` (a map of
series id → `true` = filtered out). Pass back what the `focusChange` and
`seriesFilter` outputs emit to keep focus and filtering in sync across
several charts; leave an input `undefined` to let the chart keep managing
that piece itself.
