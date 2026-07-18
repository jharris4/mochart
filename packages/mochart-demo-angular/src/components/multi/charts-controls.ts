import { Component, Input, signal } from '@angular/core';

import { demoText } from '@mochart/demo-common';

import { ButtonWithTooltip } from '../misc/button-with-tooltip';
import { Icon } from '../misc/icon';

const defaultChartRows = 2;
const defaultChartCols = 2;
const defaultRate = 2000;

@Component({
  selector: 'app-charts-controls',
  imports: [ButtonWithTooltip, Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div class="multi-controls">
      <form class="form-inline">
        <div class="form-group">
          <label class="form-control-plaintext" for="grid-rows">{{ text.gridLabel }}</label>
          <input id="grid-rows" [disabled]="playing" type="number" min="1" max="4" class="form-control" [value]="rowsText()"
                 [attr.aria-label]="text.gridRowsAria" (input)="rowsChanged($event)" />
          <span class="form-control-plaintext">&times;</span>
          <input id="grid-cols" [disabled]="playing" type="number" min="1" max="4" class="form-control" [value]="colsText()"
                 [attr.aria-label]="text.gridColsAria" (input)="colsChanged($event)" />
        </div>
        <div class="form-group">
          <div class="btn-toolbar" role="toolbar">
            <div class="btn-group">
              <app-button-with-tooltip id="step-back" [disabled]="playing" [tooltipText]="text.stepBackward.tooltip" tooltipPlacement="top-start"
                                       [onClick]="onStepBackwardClick" [aria-label]="text.stepBackward.aria">
                <app-icon size="lg" [fixedWidth]="true" name="backward-step" />
              </app-button-with-tooltip>
              <app-button-with-tooltip id="step-forward" [disabled]="playing" [tooltipText]="text.stepForward.tooltip" tooltipPlacement="top-start"
                                       [onClick]="onStepForwardClick" [aria-label]="text.stepForward.aria">
                <app-icon size="lg" [fixedWidth]="true" name="forward-step" />
              </app-button-with-tooltip>
              <app-button-with-tooltip id="play-backward" [disabled]="playing" [tooltipText]="text.playBackward.tooltip" tooltipPlacement="top-start"
                                       [onClick]="onPlayBackwardClick" [aria-label]="text.playBackward.aria">
                <app-icon size="lg" [fixedWidth]="true" name="play" flip="horizontal" />
              </app-button-with-tooltip>
              <app-button-with-tooltip id="play-forward" [disabled]="playing" [tooltipText]="text.playForward.tooltip" tooltipPlacement="top-start"
                                       [onClick]="onPlayForwardClick" [aria-label]="text.playForward.aria">
                <app-icon size="lg" [fixedWidth]="true" name="play" />
              </app-button-with-tooltip>
              <app-button-with-tooltip id="stop" [disabled]="!playing" [tooltipText]="text.stop.tooltip" tooltipPlacement="top-start"
                                       [onClick]="onStopClick" [aria-label]="text.stop.aria">
                <app-icon size="lg" [fixedWidth]="true" name="stop" />
              </app-button-with-tooltip>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-control-plaintext" for="multi-rate">{{ text.intervalLabel }}</label>
          <input id="multi-rate" [disabled]="playing" type="number" min="5" max="60000" step="100" class="form-control" [value]="rateText()"
                 [attr.aria-label]="text.intervalAria" (input)="rateChanged($event)" />
        </div>
      </form>
    </div>
  `
})
export class ChartsControls {
  readonly text = demoText.multiChartsTab;

  @Input({ required: true }) playing!: boolean;
  @Input({ required: true }) onRowsChange!: (rows: number) => void;
  @Input({ required: true }) onColsChange!: (cols: number) => void;
  @Input({ required: true }) onStepBackwardClick!: () => void;
  @Input({ required: true }) onStepForwardClick!: () => void;
  @Input({ required: true }) onPlayBackwardClick!: () => void;
  @Input({ required: true }) onPlayForwardClick!: () => void;
  @Input({ required: true }) onStopClick!: () => void;
  @Input({ required: true }) onRateChange!: (rate: number) => void;

  rateText = signal('' + defaultRate);
  rowsText = signal('' + defaultChartRows);
  colsText = signal('' + defaultChartCols);

  // Input values arrive as strings and are coerced to numbers in place, so the
  // working variable is intentionally loose (matching the original demo).
  rowsChanged(event: Event): void {
    let rows: any = (event.currentTarget as HTMLInputElement).value;
    if (!isNaN(parseFloat(rows)) && isFinite(rows)) {
      rows = +rows;
      if (rows >= 1 && rows <= 4) {
        this.onRowsChange(rows);
      }
    }
    this.rowsText.set('' + rows);
  }

  colsChanged(event: Event): void {
    let cols: any = (event.currentTarget as HTMLInputElement).value;
    if (!isNaN(parseFloat(cols)) && isFinite(cols)) {
      cols = +cols;
      if (cols >= 1 && cols <= 4) {
        this.onColsChange(cols);
      }
    }
    this.colsText.set('' + cols);
  }

  rateChanged(event: Event): void {
    let rate: any = (event.currentTarget as HTMLInputElement).value;
    if (!isNaN(parseFloat(rate)) && isFinite(rate)) {
      rate = +rate;
      if (rate >= 5 && rate <= 60000) {
        this.onRateChange(rate);
      }
    }
    this.rateText.set('' + rate);
  }
}
