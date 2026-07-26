import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { chart } from '@mochart/lit';
import type { MochartConfig } from '@mochart/core';
import { exportPNG, exportSVG } from '@mochart/export';

import { demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import { LightElement } from '../misc/LightElement';
import { buttonWithTooltip, icon } from '../misc/templates';
import '../misc/export-share-menu';

import type { DemoDataProvider, RandomConfigWithValid } from '../../types';

const defaultRate = 2000;

@customElement('random-chart-tab')
export class RandomChartTab extends LightElement {
  @property({ attribute: false }) active = false;
  @property({ attribute: false }) mochartConfig!: MochartConfig;
  @property({ attribute: false }) dataProvider: DemoDataProvider | null = null;
  @property({ attribute: false }) randomConfig!: RandomConfigWithValid;
  @property({ attribute: false }) initialRate: number | undefined = void 0;
  @property({ attribute: false }) onRandomizeBack!: () => void;
  @property({ attribute: false }) onRandomizeNext!: () => void;
  @property({ attribute: false }) applyReuse = false;
  @property({ attribute: false }) toggleApplyReuse!: () => void;

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private rate = defaultRate;

  @state() private playing = false;
  @state() private rateText = '' + defaultRate;

  override willUpdate(changed: PropertyValues<this>): void {
    if (!this.hasUpdated) {
      // A share link restores the interval; otherwise start on the default.
      if (this.initialRate !== void 0) {
        this.rate = this.initialRate;
        this.rateText = '' + this.initialRate;
      }
    }
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

  // Share captures the generator config, the reuse toggle and the interval; the
  // step comes from the /random/:demoId/:randomId path already in the URL.
  private getShareState = (): ShareState => ({
    mode: 'random', randomConfig: this.randomConfig, applyReuse: this.applyReuse, interval: this.rate
  });

  override render(): unknown {
    return html`<div class=${'mochart-demo-tab-container demo-layout-col chart' + (this.active ? ' active' : '')}>
      <div class="random-chart-sizer">
        ${chart({
          style: 'flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;',
          mochartConfig: this.mochartConfig,
          dataProvider: this.dataProvider
        })}
      </div>
      <div class="random-controls">
        <form class="demo-form-row">
          <div class="demo-field">
            <div class="demo-toolbar" role="toolbar">
              <div class="demo-btn-group">
                ${buttonWithTooltip(
                  { id: 'randomize-back', disabled: this.playing, label: demoText.randomChartTab.back.label, tooltipText: demoText.randomChartTab.back.tooltip, tooltipPlacement: 'top-start', onClick: this.onRandomizeBack, ariaLabel: demoText.randomChartTab.back.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'dice', flip: 'horizontal' })
                )}
                ${buttonWithTooltip(
                  { id: 'randomize-next', disabled: this.playing, label: demoText.randomChartTab.randomize.label, tooltipText: demoText.randomChartTab.randomize.tooltip, tooltipPlacement: 'top-start', onClick: this.onRandomizeNext, ariaLabel: demoText.randomChartTab.randomize.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'dice' })
                )}
                ${buttonWithTooltip(
                  { id: 'play', disabled: this.playing, tooltipText: demoText.randomChartTab.play.tooltip, tooltipPlacement: 'top-start', onClick: this.onPlayClick, ariaLabel: demoText.randomChartTab.play.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'play' })
                )}
                ${buttonWithTooltip(
                  { id: 'stop', disabled: !this.playing, tooltipText: demoText.randomChartTab.stop.tooltip, tooltipPlacement: 'top-start', onClick: this.onStopClick, ariaLabel: demoText.randomChartTab.stop.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'stop' })
                )}
              </div>
              <div class="demo-field">
                <label class="demo-label" for="random-rate">${demoText.randomChartTab.intervalLabel}</label>
                <input id="random-rate" ?disabled=${this.playing} type="number" min="5" max="60000" step="100" class="demo-input" .value=${'' + this.rateText} aria-label=${demoText.randomChartTab.intervalAria} @input=${this.rateChanged} />
              </div>
            </div>
            <div class="demo-toolbar" role="toolbar">
              <div class="demo-btn-group">
                ${buttonWithTooltip(
                  { id: 'reuse', disabled: this.playing, label: demoText.randomChartTab.reuse.label, pressed: this.applyReuse, tooltipText: demoText.randomChartTab.reuse.tooltip, tooltipPlacement: 'top-start', onClick: this.toggleApplyReuse, ariaLabel: demoText.randomChartTab.reuse.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'recycle' })
                )}
              </div>
              <export-share-menu .idPrefix=${'random'}
                .exportPng=${() => { const container = this.querySelector('.random-chart-sizer'); if (container) { void exportPNG(container); } }}
                .exportSvg=${() => { const container = this.querySelector('.random-chart-sizer'); if (container) { exportSVG(container); } }}
                .getShareState=${this.getShareState}></export-share-menu>
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
