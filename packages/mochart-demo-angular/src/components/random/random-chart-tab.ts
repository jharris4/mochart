import { Component, ElementRef, Input, ViewChild, signal } from '@angular/core';
import type { OnChanges, OnDestroy, SimpleChanges } from '@angular/core';

import { Chart } from 'mochart-angular';
import type { MochartConfig } from 'mochart';

import { ButtonWithTooltip } from '../misc/button-with-tooltip';
import { ExportButtons } from '../misc/export-buttons';
import { Icon } from '../misc/icon';

import type { DemoDataProvider } from '../../types';

const defaultRate = 2000;

@Component({
  selector: 'app-random-chart-tab',
  imports: [Chart, ButtonWithTooltip, ExportButtons, Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div [class]="'mochart-demo-tab-container col chart' + (active ? ' active' : '')">
      <div class="random-chart-sizer" #chartSizer>
        <mochart-chart style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;"
                       [mochartConfig]="mochartConfig" [dataProvider]="dataProvider" />
      </div>
      <div class="random-controls">
        <form class="form-inline">
          <div class="form-group">
            <div class="btn-toolbar" role="toolbar">
              <div class="btn-group">
                <app-button-with-tooltip id="randomize-back" [disabled]="playing()" label="Back"
                                         tooltipText="Go back to the previous random dataset" tooltipPlacement="top-start"
                                         [onClick]="onRandomizeBack" aria-label="Randomize Back">
                  <app-icon size="lg" [fixedWidth]="true" name="dice" flip="horizontal" />
                </app-button-with-tooltip>
                <app-button-with-tooltip id="randomize-next" [disabled]="playing()" label="Randomize"
                                         tooltipText="Generate the next random dataset" tooltipPlacement="top-start"
                                         [onClick]="onRandomizeNext" aria-label="Randomize Next">
                  <app-icon size="lg" [fixedWidth]="true" name="dice" />
                </app-button-with-tooltip>
                <app-button-with-tooltip id="play" [disabled]="playing()" tooltipText="Keep generating random datasets at the interval" tooltipPlacement="top-start"
                                         [onClick]="onPlayClick" aria-label="Play Randomize">
                  <app-icon size="lg" [fixedWidth]="true" name="play" />
                </app-button-with-tooltip>
                <app-button-with-tooltip id="stop" [disabled]="!playing()" tooltipText="Stop generating" tooltipPlacement="top-start"
                                         [onClick]="onStopClick" aria-label="Stop">
                  <app-icon size="lg" [fixedWidth]="true" name="stop" />
                </app-button-with-tooltip>
              </div>
              <div class="form-group">
                <label class="form-control-plaintext" for="random-rate">Interval (ms):</label>
                <input id="random-rate" [disabled]="playing()" type="number" min="5" max="60000" step="100" class="form-control" [value]="rateText()"
                       aria-label="Randomize interval in milliseconds" (input)="rateChanged($event)" />
              </div>
            </div>
            <div class="btn-toolbar ml-2" role="toolbar">
              <app-export-buttons idPrefix="random" [getContainer]="getChartSizer" />
              <div class="btn-group">
                <app-button-with-tooltip id="reuse" [disabled]="playing()" label="Reuse" [pressed]="applyReuse"
                                         tooltipText="Keep part of the data the same between randomizations (the config's reuse settings), so transitions animate with continuity — off generates fully independent datasets" tooltipPlacement="top-start"
                                         [onClick]="toggleApplyReuse" aria-label="Reuse">
                  <app-icon size="lg" [fixedWidth]="true" name="recycle" />
                </app-button-with-tooltip>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  `
})
export class RandomChartTab implements OnChanges, OnDestroy {
  @Input() active = false;
  @Input({ required: true }) mochartConfig!: MochartConfig;
  @Input({ required: true }) dataProvider!: DemoDataProvider | null;
  @Input({ required: true }) onRandomizeBack!: () => void;
  @Input({ required: true }) onRandomizeNext!: () => void;
  @Input({ required: true }) applyReuse!: boolean;
  @Input({ required: true }) toggleApplyReuse!: () => void;

  @ViewChild('chartSizer', { static: true }) chartSizerElement!: ElementRef<HTMLDivElement>;

  private intervalId: ReturnType<typeof setInterval> | null = null;

  playing = signal(false);
  rate = signal(defaultRate);
  rateText = signal('' + defaultRate);

  getChartSizer = (): Element | null => this.chartSizerElement?.nativeElement ?? null;

  ngOnChanges(changes: SimpleChanges): void {
    const activeChange = changes['active'];
    if (activeChange && !activeChange.firstChange) {
      this.onStopClick();
    }
  }

  onPlayClick = (): void => {
    this.playing.set(true);
    this.intervalId = setInterval(this.onRandomizeNext, this.rate());
  };

  onStopClick = (): void => {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
    this.intervalId = null;
    this.playing.set(false);
  };

  rateChanged(event: Event): void {
    let nextRateText: any = (event.currentTarget as HTMLInputElement).value;
    if (!isNaN(parseFloat(nextRateText)) && isFinite(nextRateText)) {
      nextRateText = +nextRateText;
      if (nextRateText >= 5 && nextRateText <= 60000) {
        this.rate.set(nextRateText);
      }
    }
    this.rateText.set('' + nextRateText);
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
