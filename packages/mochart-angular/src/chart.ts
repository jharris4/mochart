import { Component, Input } from '@angular/core';
import { createChart } from '@mochart/core';
import { BaseChart } from './base-chart';
import type { CreateChartFn } from './host';

/**
 * Angular wrapper around mochart's `createChart`: takes an enhanced config
 * (`mochartConfig`) and a data provider. Omit `width`/`height` to have the
 * chart track the host element's size; `class`/`style` set on
 * `<mochart-chart>` style that same element.
 */
@Component({
  selector: 'mochart-chart',
  template: '',
  styles: [':host { display: block; }']
})
export class Chart extends BaseChart {
  @Input({ required: true }) mochartConfig: any;
  @Input({ required: true }) dataProvider: any;

  protected override readonly create: CreateChartFn = createChart;

  protected override collectChartProps(): Record<string, any> {
    return {
      mochartConfig: this.mochartConfig,
      dataProvider: this.dataProvider
    };
  }
}
