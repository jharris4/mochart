import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { chart } from 'mochart-lit';
import type { MochartConfig } from 'mochart';

import { LightElement } from '../misc/LightElement';
import { buttonWithTooltip, exportButtons, icon } from '../misc/templates';

import type { DemoDataProvider } from '../../types';

const defaultRate = 2000;

@customElement('random-chart-tab')
export class RandomChartTab extends LightElement {
  @property({ attribute: false }) active = false;
  @property({ attribute: false }) mochartConfig!: MochartConfig;
  @property({ attribute: false }) dataProvider: DemoDataProvider | null = null;
  @property({ attribute: false }) onRandomizeBack!: () => void;
  @property({ attribute: false }) onRandomizeNext!: () => void;
  @property({ attribute: false }) applyReuse = false;
  @property({ attribute: false }) toggleApplyReuse!: () => void;

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private rate = defaultRate;

  @state() private playing = false;
  @state() private rateText = '' + defaultRate;

  override willUpdate(changed: PropertyValues<this>): void {
    if (this.hasUpdated && changed.has('active')) {
      this.onStopClick();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private onPlayClick = (): void => {
    this.playing = true;
    this.intervalId = setInterval(() => this.onRandomizeNext(), this.rate);
  };

  private onStopClick = (): void => {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
    this.intervalId = null;
    this.playing = false;
  };

  private rateChanged = (event: Event): void => {
    let nextRateText: any = (event.currentTarget as HTMLInputElement).value;
    if (!isNaN(parseFloat(nextRateText)) && isFinite(nextRateText)) {
      nextRateText = +nextRateText;
      if (nextRateText >= 5 && nextRateText <= 60000) {
        this.rate = nextRateText;
      }
    }
    this.rateText = nextRateText;
  };

  override render(): unknown {
    return html`<div class=${'mochart-demo-tab-container col chart' + (this.active ? ' active' : '')}>
      <div class="random-chart-sizer">
        ${chart({
          style: 'flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;',
          mochartConfig: this.mochartConfig,
          dataProvider: this.dataProvider
        })}
      </div>
      <div class="random-controls">
        <form class="form-inline">
          <div class="form-group">
            <div class="btn-toolbar" role="toolbar">
              <div class="btn-group">
                ${buttonWithTooltip(
                  { id: 'randomize-back', disabled: this.playing, label: 'Back', tooltipText: 'Go back to the previous random dataset', tooltipPlacement: 'top-start', onClick: this.onRandomizeBack, ariaLabel: 'Randomize Back' },
                  icon({ size: 'lg', fixedWidth: true, name: 'dice', flip: 'horizontal' })
                )}
                ${buttonWithTooltip(
                  { id: 'randomize-next', disabled: this.playing, label: 'Randomize', tooltipText: 'Generate the next random dataset', tooltipPlacement: 'top-start', onClick: this.onRandomizeNext, ariaLabel: 'Randomize Next' },
                  icon({ size: 'lg', fixedWidth: true, name: 'dice' })
                )}
                ${buttonWithTooltip(
                  { id: 'play', disabled: this.playing, tooltipText: 'Keep generating random datasets at the interval', tooltipPlacement: 'top-start', onClick: this.onPlayClick, ariaLabel: 'Play Randomize' },
                  icon({ size: 'lg', fixedWidth: true, name: 'play' })
                )}
                ${buttonWithTooltip(
                  { id: 'stop', disabled: !this.playing, tooltipText: 'Stop generating', tooltipPlacement: 'top-start', onClick: this.onStopClick, ariaLabel: 'Stop' },
                  icon({ size: 'lg', fixedWidth: true, name: 'stop' })
                )}
              </div>
              <div class="form-group">
                <label class="form-control-plaintext" for="random-rate">Interval (ms):</label>
                <input id="random-rate" ?disabled=${this.playing} type="number" min="5" max="60000" step="100" class="form-control" .value=${'' + this.rateText} aria-label="Randomize interval in milliseconds" @input=${this.rateChanged} />
              </div>
            </div>
            <div class="btn-toolbar ml-2" role="toolbar">
              ${exportButtons({ idPrefix: 'random', getContainer: () => this.querySelector('.random-chart-sizer') })}
              <div class="btn-group">
                ${buttonWithTooltip(
                  { id: 'reuse', disabled: this.playing, label: 'Reuse', pressed: this.applyReuse, tooltipText: "Keep part of the data the same between randomizations (the config's reuse settings), so transitions animate with continuity — off generates fully independent datasets", tooltipPlacement: 'top-start', onClick: this.toggleApplyReuse, ariaLabel: 'Reuse' },
                  icon({ size: 'lg', fixedWidth: true, name: 'recycle' })
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'random-chart-tab': RandomChartTab;
  }
}
