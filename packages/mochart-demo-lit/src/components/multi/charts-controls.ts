import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { LightElement } from '../misc/LightElement';
import { buttonWithTooltip, icon } from '../misc/templates';

const defaultChartRows = 2;
const defaultChartCols = 2;
const defaultRate = 2000;

@customElement('charts-controls')
export class ChartsControls extends LightElement {
  @property({ attribute: false }) playing = false;
  @property({ attribute: false }) onRowsChange!: (rows: number) => void;
  @property({ attribute: false }) onColsChange!: (cols: number) => void;
  @property({ attribute: false }) onStepBackwardClick!: () => void;
  @property({ attribute: false }) onStepForwardClick!: () => void;
  @property({ attribute: false }) onPlayBackwardClick!: () => void;
  @property({ attribute: false }) onPlayForwardClick!: () => void;
  @property({ attribute: false }) onStopClick!: () => void;
  @property({ attribute: false }) onRateChange!: (rate: number) => void;

  @state() private rateText = '' + defaultRate;
  @state() private rowsText = '' + defaultChartRows;
  @state() private colsText = '' + defaultChartCols;

  // Input values arrive as strings and are coerced to numbers in place, so the
  // working variable is intentionally loose (matching the original demo).
  private rowsChanged = (event: Event): void => {
    let rows: any = (event.currentTarget as HTMLInputElement).value;
    if (!isNaN(parseFloat(rows)) && isFinite(rows)) {
      rows = +rows;
      if (rows >= 1 && rows <= 4) {
        this.onRowsChange(rows);
      }
    }
    this.rowsText = rows;
  };

  private colsChanged = (event: Event): void => {
    let cols: any = (event.currentTarget as HTMLInputElement).value;
    if (!isNaN(parseFloat(cols)) && isFinite(cols)) {
      cols = +cols;
      if (cols >= 1 && cols <= 4) {
        this.onColsChange(cols);
      }
    }
    this.colsText = cols;
  };

  private rateChanged = (event: Event): void => {
    let rate: any = (event.currentTarget as HTMLInputElement).value;
    if (!isNaN(parseFloat(rate)) && isFinite(rate)) {
      rate = +rate;
      if (rate >= 5 && rate <= 60000) {
        this.onRateChange(rate);
      }
    }
    this.rateText = rate;
  };

  override render(): unknown {
    return html`<div class="multi-controls">
      <form class="form-inline">
        <div class="form-group">
          <label class="form-control-plaintext" for="grid-rows">Grid:</label>
          <input id="grid-rows" ?disabled=${this.playing} type="number" min="1" max="4" class="form-control" .value=${'' + this.rowsText} aria-label="Grid rows" @input=${this.rowsChanged} />
          <span class="form-control-plaintext">&times;</span>
          <input id="grid-cols" ?disabled=${this.playing} type="number" min="1" max="4" class="form-control" .value=${'' + this.colsText} aria-label="Grid columns" @input=${this.colsChanged} />
        </div>
        <div class="form-group">
          <div class="btn-toolbar" role="toolbar">
            <div class="btn-group">
              ${buttonWithTooltip(
                { id: 'step-back', disabled: this.playing, tooltipText: 'Step all charts one dataset backward', tooltipPlacement: 'top-start', onClick: this.onStepBackwardClick, ariaLabel: 'Step Backward' },
                icon({ size: 'lg', fixedWidth: true, name: 'backward-step' })
              )}
              ${buttonWithTooltip(
                { id: 'step-forward', disabled: this.playing, tooltipText: 'Step all charts one dataset forward', tooltipPlacement: 'top-start', onClick: this.onStepForwardClick, ariaLabel: 'Step Forward' },
                icon({ size: 'lg', fixedWidth: true, name: 'forward-step' })
              )}
              ${buttonWithTooltip(
                { id: 'play-backward', disabled: this.playing, tooltipText: 'Play backward through the datasets at the interval', tooltipPlacement: 'top-start', onClick: this.onPlayBackwardClick, ariaLabel: 'Play Backward' },
                icon({ size: 'lg', fixedWidth: true, name: 'play', flip: 'horizontal' })
              )}
              ${buttonWithTooltip(
                { id: 'play-forward', disabled: this.playing, tooltipText: 'Play forward through the datasets at the interval', tooltipPlacement: 'top-start', onClick: this.onPlayForwardClick, ariaLabel: 'Play Forward' },
                icon({ size: 'lg', fixedWidth: true, name: 'play' })
              )}
              ${buttonWithTooltip(
                { id: 'stop', disabled: !this.playing, tooltipText: 'Stop playback', tooltipPlacement: 'top-start', onClick: this.onStopClick, ariaLabel: 'Stop' },
                icon({ size: 'lg', fixedWidth: true, name: 'stop' })
              )}
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-control-plaintext" for="multi-rate">Interval (ms):</label>
          <input id="multi-rate" ?disabled=${this.playing} type="number" min="5" max="60000" step="100" class="form-control" .value=${'' + this.rateText} aria-label="Playback interval in milliseconds" @input=${this.rateChanged} />
        </div>
      </form>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'charts-controls': ChartsControls;
  }
}
