import { Component, Input } from '@angular/core';
import { createDefaultChart } from '@mochart/core';
import type { DataRow, MochartInputConfig } from '@mochart/core';
import { BaseChart } from './base-chart.js';
import type { CreateChartFn } from './host.js';

/**
 * Angular wrapper around mochart's `createDefaultChart`: takes a raw `config`
 * (enhanced internally) and a plain array-of-objects `data`. Omit
 * `width`/`height` to have the chart track the host element's size;
 * `class`/`style` set on `<mochart-default-chart>` style that same element.
 */
@Component({
  selector: 'mochart-default-chart',
  template: '',
  styles: [':host { display: block; }']
})
export class DefaultChart extends BaseChart {
  @Input({ required: true }) config!: MochartInputConfig;
  @Input({ required: true }) data!: readonly DataRow[];

  protected override readonly create: CreateChartFn = createDefaultChart;

  protected override collectChartProps(): Record<string, any> {
    return {
      config: this.config,
      data: this.data
    };
  }
}
