import { Component, ElementRef, Input, ViewChild, signal } from '@angular/core';
import type { OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';

import { Chart } from '@mochart/angular';
import type { MochartConfig } from '@mochart/core';
import { exportPNG, exportSVG } from '@mochart/export';

import { demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import { ButtonWithTooltip } from '../misc/button-with-tooltip';
import { ExportShareMenu } from '../misc/export-share-menu';
import { Icon } from '../misc/icon';

import type { DemoDataProvider, RandomConfigWithValid } from '../../types';

const defaultRate = 2000;

@Component({
  selector: 'app-random-chart-tab',
  imports: [Chart, ButtonWithTooltip, ExportShareMenu, Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div [class]="'mochart-demo-tab-container demo-layout-col chart' + (active ? ' active' : '')">
      <div class="random-chart-sizer" #chartSizer>
        <mochart-chart style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;"
                       [mochartConfig]="mochartConfig" [dataProvider]="dataProvider" />
      </div>
      <div class="random-controls">
        <form class="demo-form-row">
          <div class="demo-field">
            <div class="demo-toolbar" role="toolbar">
              <div class="demo-btn-group">
                <app-button-with-tooltip id="randomize-back" [disabled]="playing()" [label]="text.back.label"
                                         [tooltipText]="text.back.tooltip" tooltipPlacement="top-start"
                                         [onClick]="onRandomizeBack" [aria-label]="text.back.aria">
                  <app-icon size="lg" [fixedWidth]="true" name="dice" flip="horizontal" />
                </app-button-with-tooltip>
                <app-button-with-tooltip id="randomize-next" [disabled]="playing()" [label]="text.randomize.label"
                                         [tooltipText]="text.randomize.tooltip" tooltipPlacement="top-start"
                                         [onClick]="onRandomizeNext" [aria-label]="text.randomize.aria">
                  <app-icon size="lg" [fixedWidth]="true" name="dice" />
                </app-button-with-tooltip>
                <app-button-with-tooltip id="play" [disabled]="playing()" [tooltipText]="text.play.tooltip" tooltipPlacement="top-start"
                                         [onClick]="onPlayClick" [aria-label]="text.play.aria">
                  <app-icon size="lg" [fixedWidth]="true" name="play" />
                </app-button-with-tooltip>
                <app-button-with-tooltip id="stop" [disabled]="!playing()" [tooltipText]="text.stop.tooltip" tooltipPlacement="top-start"
                                         [onClick]="onStopClick" [aria-label]="text.stop.aria">
                  <app-icon size="lg" [fixedWidth]="true" name="stop" />
                </app-button-with-tooltip>
              </div>
              <div class="demo-field">
                <label class="demo-label" for="random-rate">{{ text.intervalLabel }}</label>
                <input id="random-rate" [disabled]="playing()" type="number" min="5" max="60000" step="100" class="demo-input" [value]="rateText()"
                       [attr.aria-label]="text.intervalAria" (input)="rateChanged($event)" />
              </div>
            </div>
            <div class="demo-toolbar" role="toolbar">
              <div class="demo-btn-group">
                <app-button-with-tooltip id="reuse" [disabled]="playing()" [label]="text.reuse.label" [pressed]="applyReuse"
                                         [tooltipText]="text.reuse.tooltip" tooltipPlacement="top-start"
                                         [onClick]="toggleApplyReuse" [aria-label]="text.reuse.aria">
                  <app-icon size="lg" [fixedWidth]="true" name="recycle" />
                </app-button-with-tooltip>
              </div>
              <app-export-share-menu idPrefix="random" [exportPng]="onExportPng" [exportSvg]="onExportSvg" [getShareState]="getShareState" />
            </div>
          </div>
        </form>
      </div>
    </div>
  `
})
export class RandomChartTab implements OnInit, OnChanges, OnDestroy {
  readonly text = demoText.randomChartTab;

  @Input() active = false;
  @Input({ required: true }) mochartConfig!: MochartConfig;
  @Input({ required: true }) dataProvider!: DemoDataProvider | null;
  @Input({ required: true }) randomConfig!: RandomConfigWithValid;
  @Input() initialRate?: number;
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

  onExportPng = (): void => {
    const container = this.getChartSizer();
    if (container) {
      void exportPNG(container);
    }
  };

  onExportSvg = (): void => {
    const container = this.getChartSizer();
    if (container) {
      exportSVG(container);
    }
  };

  // Share captures the generator config, the reuse toggle and the interval; the
  // step comes from the /random/:demoId/:randomId path already in the URL.
  getShareState = (): ShareState => ({
    mode: 'random', randomConfig: this.randomConfig, applyReuse: this.applyReuse, interval: this.rate()
  });

  ngOnInit(): void {
    // A share link restores the interval; otherwise keep the default.
    if (this.initialRate !== undefined) {
      this.rate.set(this.initialRate);
      this.rateText.set('' + this.initialRate);
    }
  }

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
