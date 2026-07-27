import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { defaultChart } from '@mochart/lit';

import { LightElement } from '../misc/LightElement';
import { backToDemosButton, siteRootButton } from '../misc/mode-switcher';
import '../misc/theme-toggle-button';

import { configs, data, minWidth } from './rotationConfigs';

@customElement('demo-rotation')
export class DemoRotation extends LightElement {
  @property({ attribute: false }) siteRootUrl: string | undefined = undefined;
  @property({ attribute: false }) onBackToDemos!: () => void;

  // Columns are sized from the card's measured width (not the window) so the
  // grid stays inside the padded shell.
  @state() private chartsWidth = 0;

  private resizeObserver: ResizeObserver | null = null;

  override firstUpdated(): void {
    const el = this.querySelector('.rotation-charts');
    if (el) {
      const measure = (): void => { this.chartsWidth = el.clientWidth; };
      this.resizeObserver = new ResizeObserver(measure);
      this.resizeObserver.observe(el);
      measure();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.resizeObserver !== null) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  override render(): unknown {
    const cols = Math.max(1, Math.floor(this.chartsWidth / minWidth));
    const colWidth = Math.floor(this.chartsWidth / cols);
    return html`<div class="mochart-demo-container">
      <div class="mochart-demo-tabs-container">
        <div class="mochart-demo-nav-group">
          ${siteRootButton(this.siteRootUrl)}
          ${backToDemosButton(this.onBackToDemos)}
        </div>
        <theme-toggle-button></theme-toggle-button>
      </div>
      <div class="rotation-charts">
        ${colWidth > 0 ? configs.map((config, i) => html`<div
            class=${'rotation-chart rotation-chart-' + i}
            style=${`left: ${(i % cols) * colWidth}px; top: ${Math.floor(i / cols) * colWidth}px; width: ${colWidth}px; height: ${colWidth}px;`}>
          ${defaultChart({ config, data, width: colWidth, height: colWidth })}
        </div>`) : null}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-rotation': DemoRotation;
  }
}
