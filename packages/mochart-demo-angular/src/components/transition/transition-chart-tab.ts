import { Component, ElementRef, Input, ViewChild, signal } from '@angular/core';
import type { OnChanges, SimpleChanges } from '@angular/core';

import { Chart } from 'mochart-angular';
import type { MochartConfig } from 'mochart';

import { ButtonWithTooltip } from '../misc/button-with-tooltip';
import { ExportButtons } from '../misc/export-buttons';
import { Icon } from '../misc/icon';

import type { ChartDataProviderLike } from '../../types';

@Component({
  selector: 'app-transition-chart-tab',
  imports: [Chart, ButtonWithTooltip, ExportButtons, Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div [class]="'mochart-demo-tab-container col chart' + (active ? ' active' : '')">
      <div class="transition-chart-sizer" #chartSizer>
        <mochart-chart style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;"
                       [mochartConfig]="mochartConfig" [dataProvider]="dataProviders[dataProviderIndex()]" />
      </div>
      <div class="transition-controls">
        <form class="form-inline">
          <div class="form-group">
            <div class="btn-toolbar" role="toolbar">
              <div class="btn-group">
                <app-button-with-tooltip id="transition-back" label="Back" tooltipText="Transition to the previous dataset" tooltipPlacement="top-start"
                                         [onClick]="onStepBack" aria-label="Step Backward">
                  <app-icon size="lg" [fixedWidth]="true" name="backward-step" />
                </app-button-with-tooltip>
                <app-button-with-tooltip id="transition-forward" label="Next" tooltipText="Transition to the next dataset" tooltipPlacement="top-start"
                                         [onClick]="onStepForward" aria-label="Step Forward">
                  <app-icon size="lg" [fixedWidth]="true" name="forward-step" />
                </app-button-with-tooltip>
              </div>
              <app-export-buttons idPrefix="transition" [getContainer]="getChartSizer" />
            </div>
          </div>
        </form>
      </div>
    </div>
  `
})
export class TransitionChartTab implements OnChanges {
  @Input() active = false;
  @Input({ required: true }) mochartConfig!: MochartConfig;
  @Input({ required: true }) dataProviders!: ChartDataProviderLike[];

  @ViewChild('chartSizer', { static: true }) chartSizerElement!: ElementRef<HTMLDivElement>;

  dataProviderIndex = signal(0);

  getChartSizer = (): Element | null => this.chartSizerElement?.nativeElement ?? null;

  ngOnChanges(changes: SimpleChanges): void {
    const mochartConfigChange = changes['mochartConfig'];
    const dataProvidersChange = changes['dataProviders'];
    if ((mochartConfigChange && !mochartConfigChange.firstChange) || (dataProvidersChange && !dataProvidersChange.firstChange)) {
      this.dataProviderIndex.set(0);
    }
  }

  onStepBack = (): void => {
    if (this.dataProviders.length > 1) {
      if (this.dataProviderIndex() === 0) {
        this.dataProviderIndex.set(this.dataProviders.length - 1);
      }
      else {
        this.dataProviderIndex.update(index => index - 1);
      }
    }
  };

  onStepForward = (): void => {
    if (this.dataProviders.length > 1) {
      if (this.dataProviderIndex() === this.dataProviders.length - 1) {
        this.dataProviderIndex.set(0);
      }
      else {
        this.dataProviderIndex.update(index => index + 1);
      }
    }
  };
}
