import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { buildMochartDemoConfig, demoText } from '@mochart/demo-common';

import { LightElement } from '../misc/LightElement';
import '../demos/demos-tab';
import './random-content';

import type { DemoData, DemoMode, MochartDemoConfig, RandomConfigWithValid, OnDemoModeChanged, OnDemoChanged } from '../../types';

const eventKeyChart = 1;
const eventKeyDemo = 2;
const eventKeyConfig = 3;
const eventKeyData = 4;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

@customElement('demo-random')
export class DemoRandom extends LightElement {
  @property({ attribute: false }) demoData!: DemoData;
  @property({ attribute: false }) demoMode!: DemoMode;
  @property({ attribute: false }) initialDemoId!: string;
  @property({ attribute: false }) onDemoModeChanged!: OnDemoModeChanged;
  @property({ attribute: false }) onDemoChanged!: OnDemoChanged;
  @property({ attribute: false }) randomId = 0;
  @property({ attribute: false }) incrementRandomId!: () => void;
  @property({ attribute: false }) decrementRandomId!: () => void;

  @state() private demoId = '';
  @state() private activeKey = eventKeyChart;
  @state() private mochartDemoConfig: MochartDemoConfig | null = null;
  @state() private randomConfig: RandomConfigWithValid | null = null;

  private buildStateForDemo(demoId: string): { mochartDemoConfig: MochartDemoConfig; randomConfig: RandomConfigWithValid } {
    const config = this.demoData.demoObjectMap[demoId].config;
    return {
      mochartDemoConfig: buildMochartDemoConfig(config),
      randomConfig: Object.assign({}, this.demoData.demoObjectMap[demoId].random, { valid: true })
    };
  }

  override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has('initialDemoId')) {
      return;
    }
    if (!this.hasUpdated) {
      const initialState = this.initialDemoId !== 'demos' ? this.buildStateForDemo(this.initialDemoId) : { mochartDemoConfig: null, randomConfig: null };
      this.demoId = this.initialDemoId;
      this.activeKey = getActiveKeyForInitialDemoId(this.initialDemoId);
      this.mochartDemoConfig = initialState.mochartDemoConfig;
      this.randomConfig = initialState.randomConfig;
      return;
    }
    if (this.initialDemoId !== 'demos') {
      const nextState = this.buildStateForDemo(this.initialDemoId);
      this.demoId = this.initialDemoId;
      this.activeKey = getActiveKeyForInitialDemoId(this.initialDemoId);
      this.mochartDemoConfig = nextState.mochartDemoConfig;
      this.randomConfig = nextState.randomConfig;
    }
    else {
      this.demoId = this.initialDemoId;
      this.activeKey = getActiveKeyForInitialDemoId(this.initialDemoId);
    }
  }

  private onDemoChange = (nextDemoId: string): void => {
    this.demoId = nextDemoId;
    this.onDemoChanged(nextDemoId);
  };

  private handleSelect(nextActiveKey: number): void {
    this.activeKey = nextActiveKey;
  }

  private renderTab(eventKey: number, label: string, hidden: boolean): unknown {
    return html`<li class="nav-item" style=${hidden ? 'display: none;' : ''}>
      <button type="button" class=${'nav-link' + (this.activeKey === eventKey ? ' active' : '')}
              @click=${() => this.handleSelect(eventKey)}>
        ${label}
      </button>
    </li>`;
  }

  override render(): unknown {
    const isDemos = this.initialDemoId === 'demos';
    return html`<div class="mochart-demo-container multi">
      <div class="mochart-demo-tabs-container">
        <ul class="nav nav-tabs">
          ${this.renderTab(eventKeyDemo, demoText.tabs.demos, false)}
          ${this.renderTab(eventKeyChart, demoText.tabs.chart, isDemos)}
          ${this.renderTab(eventKeyConfig, demoText.tabs.randomConfig, isDemos)}
          ${this.renderTab(eventKeyData, demoText.tabs.data, isDemos)}
        </ul>
      </div>
      <div class="mochart-demo-content-pane">
        ${isDemos
          ? html`<div class="mochart-demo-content single-tab">
              <demos-tab .active=${this.activeKey === eventKeyDemo} .demoData=${this.demoData} .demoMode=${this.demoMode} .demoId=${this.demoId}
                  .onDemoModeChanged=${this.onDemoModeChanged} .onDemoChange=${this.onDemoChange}></demos-tab>
            </div>`
          : html`<random-content
              .demoData=${this.demoData} .mochartDemoConfig=${this.mochartDemoConfig!} .initialRandomConfig=${this.randomConfig!}
              .demoMode=${this.demoMode} .initialDemoId=${this.initialDemoId} .demoId=${this.demoId}
              .onDemoModeChanged=${this.onDemoModeChanged} .onDemoChange=${this.onDemoChange} .activeKey=${this.activeKey}
              .eventKeys=${{ eventKeyChart, eventKeyDemo, eventKeyConfig, eventKeyData }}
              .randomId=${this.randomId} .incrementRandomId=${this.incrementRandomId} .decrementRandomId=${this.decrementRandomId}></random-content>`}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-random': DemoRandom;
  }
}
