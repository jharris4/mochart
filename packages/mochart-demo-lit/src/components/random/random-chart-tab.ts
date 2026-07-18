import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { chart } from 'mochart-lit';
import type { MochartConfig } from 'mochart';

import { LightElement } from '../misc/LightElement';
import { buttonWithTooltip, icon } from '../misc/templates';

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
                  { id: 'randomize-back', disabled: this.playing, tooltipText: 'Randomize Back', tooltipPlacement: 'top-start', onClick: this.onRandomizeBack, ariaLabel: 'Randomize Back' },
                  icon({ size: 'lg', fixedWidth: true, name: 'random', flip: 'horizontal' })
                )}
                ${buttonWithTooltip(
                  { id: 'randomize-next', disabled: this.playing, tooltipText: 'Randomize Next', tooltipPlacement: 'top-start', onClick: this.onRandomizeNext, ariaLabel: 'Randomize Next' },
                  icon({ size: 'lg', fixedWidth: true, name: 'random' })
                )}
                ${buttonWithTooltip(
                  { id: 'play', disabled: this.playing, tooltipText: 'Play Randomize', tooltipPlacement: 'top-start', onClick: this.onPlayClick, ariaLabel: 'Play Randomize' },
                  icon({ size: 'lg', fixedWidth: true, name: 'play' })
                )}
                ${buttonWithTooltip(
                  { id: 'stop', disabled: !this.playing, tooltipText: 'Stop', tooltipPlacement: 'top-start', onClick: this.onStopClick, ariaLabel: 'Stop' },
                  icon({ size: 'lg', fixedWidth: true, name: 'stop' })
                )}
              </div>
              <div class="form-group">
                <input ?disabled=${this.playing} type="text" class="form-control" .value=${'' + this.rateText} maxlength="4" size="4" @input=${this.rateChanged} />
              </div>
            </div>
            <div class="btn-toolbar ml-2" role="toolbar">
              <div class="btn-group">
                ${buttonWithTooltip(
                  { id: 'reuse', disabled: this.playing, tooltipText: 'Reuse', tooltipPlacement: 'top-start', onClick: this.toggleApplyReuse, ariaLabel: 'Reuse', color: this.applyReuse ? 'primary' : 'secondary' },
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
