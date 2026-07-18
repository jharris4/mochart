import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { defaultChart } from 'mochart-lit';

import { LightElement } from '../misc/LightElement';

import { configs, data, minWidth } from './rotationConfigs';

@customElement('demo-rotation')
export class DemoRotation extends LightElement {
  @state() private innerWidth = window.innerWidth;

  private onWindowResize = (): void => {
    this.innerWidth = window.innerWidth;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('resize', this.onWindowResize);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.onWindowResize);
  }

  override render(): unknown {
    const cols = Math.floor(this.innerWidth / minWidth);
    const colWidth = Math.floor(this.innerWidth / cols);
    return html`<div class="rotation-container">
      ${configs.map((config, i) => html`<div
          class=${'rotation-chart rotation-chart-' + i}
          style=${`left: ${(i % cols) * colWidth}px; top: ${Math.floor(i / cols) * colWidth}px; width: ${colWidth}px; height: ${colWidth}px;`}>
        ${defaultChart({ config, data, width: colWidth, height: colWidth })}
      </div>`)}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-rotation': DemoRotation;
  }
}
