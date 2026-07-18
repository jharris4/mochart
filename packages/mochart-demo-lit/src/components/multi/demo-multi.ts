import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { LightElement } from '../misc/LightElement';

import '../demos/demos-tab';
import './charts-tab';
import '../misc/error-tab';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

const eventKeyChart = 1;
const eventKeyDemo = 2;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

@customElement('demo-multi')
export class DemoMulti extends LightElement {
  @property({ attribute: false }) demoData!: DemoData;
  @property({ attribute: false }) demoMode!: DemoMode;
  @property({ attribute: false }) initialDemoId!: string;
  @property({ attribute: false }) onDemoModeChanged!: OnDemoModeChanged;
  @property({ attribute: false }) onDemoChanged!: OnDemoChanged;

  @state() private demoId = '';
  @state() private activeKey = eventKeyChart;

  override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('initialDemoId')) {
      this.activeKey = getActiveKeyForInitialDemoId(this.initialDemoId);
      this.demoId = this.initialDemoId;
    }
  }

  private onDemoChange = (nextDemoId: string): void => {
    this.demoId = nextDemoId;
    this.onDemoChanged(nextDemoId);
  };

  private handleSelect(nextActiveKey: number): void {
    this.activeKey = nextActiveKey;
  }

  override render(): unknown {
    const isDemos = this.initialDemoId === 'demos';
    const demosTab = html`<demos-tab .active=${this.activeKey === eventKeyDemo} .demoData=${this.demoData} .demoMode=${this.demoMode} .demoId=${this.demoId}
        .onDemoModeChanged=${this.onDemoModeChanged} .onDemoChange=${this.onDemoChange}></demos-tab>`;
    return html`<div class="mochart-demo-container multi">
      <div class="mochart-demo-tabs-container">
        <ul class="nav nav-tabs">
          <li class="nav-item">
            <button type="button" class=${'nav-link' + (this.activeKey === eventKeyDemo ? ' active' : '')}
                    @click=${() => this.handleSelect(eventKeyDemo)}>
              Demos
            </button>
          </li>
          <li class="nav-item" style=${isDemos ? 'display: none;' : ''}>
            <button type="button" class=${'nav-link' + (this.activeKey === eventKeyChart ? ' active' : '')}
                    @click=${() => this.handleSelect(eventKeyChart)}>
              Chart
            </button>
          </li>
        </ul>
      </div>
      <div class="mochart-demo-content-pane">
        ${isDemos
          ? html`<div class="mochart-demo-content single-tab">${demosTab}</div>`
          : html`<div class="mochart-demo-content">
              <error-tab .active=${this.activeKey === eventKeyDemo} .content=${() => demosTab}></error-tab>
              <error-tab .active=${this.activeKey === eventKeyChart} .content=${() =>
                html`<charts-tab .active=${this.activeKey === eventKeyChart} .demoObject=${this.demoData.demoObjectMap[this.demoId]}></charts-tab>`}></error-tab>
            </div>`}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-multi': DemoMulti;
  }
}
