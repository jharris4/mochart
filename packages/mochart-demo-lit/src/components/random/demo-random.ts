import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { buildMochartDemoConfig, demoText } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import { LightElement } from '../misc/LightElement';
import { PhoneViewportController } from '../misc/PhoneViewportController';
import { backToDemosButton, modeSwitcher, siteRootButton } from '../misc/mode-switcher';
import '../misc/notes-menu';
import '../misc/theme-toggle-button';
import './random-content';

import type { DemoData, MochartDemoConfig, RandomConfigWithValid } from '../../types';

const eventKeyChart = 1;
const eventKeyConfig = 2;
const eventKeyData = 3;

@customElement('demo-random')
export class DemoRandom extends LightElement {
  @property({ attribute: false }) demoData!: DemoData;
  @property({ attribute: false }) initialDemoId!: string;
  @property({ attribute: false }) siteRootUrl: string | undefined = undefined;
  @property({ attribute: false }) onModeChanged!: (nextDemoMode: SwitchableDemoMode) => void;
  @property({ attribute: false }) onBackToDemos!: () => void;
  @property({ attribute: false }) randomId = 0;
  @property({ attribute: false }) incrementRandomId!: () => void;
  @property({ attribute: false }) decrementRandomId!: () => void;

  @state() private activeKey = eventKeyChart;
  @state() private mochartDemoConfig: MochartDemoConfig | null = null;
  @state() private randomConfig: RandomConfigWithValid | null = null;
  @state() private generator: string | undefined = undefined;

  private viewport = new PhoneViewportController(this);

  private buildStateForDemo(demoId: string): { mochartDemoConfig: MochartDemoConfig; randomConfig: RandomConfigWithValid; generator?: string } {
    const demo = this.demoData.demoObjectMap[demoId];
    return {
      mochartDemoConfig: buildMochartDemoConfig(demo.config),
      randomConfig: Object.assign({}, demo.random, { valid: true }),
      generator: demo.generator
    };
  }

  // The demo's derived config state rebuilds only when the routed demo
  // changes; a randomId-only change flows through to random-content untouched.
  override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has('initialDemoId')) {
      return;
    }
    const nextState = this.buildStateForDemo(this.initialDemoId);
    this.activeKey = eventKeyChart;
    this.mochartDemoConfig = nextState.mochartDemoConfig;
    this.randomConfig = nextState.randomConfig;
    this.generator = nextState.generator;
  }

  private handleSelect(nextActiveKey: number): void {
    this.activeKey = nextActiveKey;
  }

  private renderTab(eventKey: number, label: string): unknown {
    return html`<li class="demo-tab-item">
      <button type="button" class=${'demo-tab' + (this.activeKey === eventKey ? ' active' : '')}
              @click=${() => this.handleSelect(eventKey)}>${label}</button>
    </li>`;
  }

  override render(): unknown {
    return html`<div class="mochart-demo-container multi">
      <div class="mochart-demo-tabs-container">
        <div class="mochart-demo-nav-group">
          ${siteRootButton(this.siteRootUrl)}
          ${backToDemosButton(this.onBackToDemos)}
          <ul class="demo-tabs">
            ${this.renderTab(eventKeyChart, demoText.tabs.chart)}
            ${this.renderTab(eventKeyConfig, demoText.tabs.randomConfig)}
            ${this.renderTab(eventKeyData, demoText.tabs.data)}
          </ul>
          <notes-menu .demoTitle=${this.demoData.demoObjectMap[this.initialDemoId].title} .notes=${this.demoData.demoObjectMap[this.initialDemoId].notes}></notes-menu>
        </div>
        <div class="mochart-demo-nav-group">
          ${modeSwitcher({ demoMode: 'random', isPhone: this.viewport.isPhone, onModeChanged: this.onModeChanged })}
          <theme-toggle-button></theme-toggle-button>
        </div>
      </div>
      <div class="mochart-demo-content-pane">
        <random-content
            .mochartDemoConfig=${this.mochartDemoConfig!} .initialRandomConfig=${this.randomConfig!} .generator=${this.generator}
            .activeKey=${this.activeKey} .eventKeys=${{ eventKeyChart, eventKeyConfig, eventKeyData }}
            .randomId=${this.randomId} .incrementRandomId=${this.incrementRandomId} .decrementRandomId=${this.decrementRandomId}></random-content>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-random': DemoRandom;
  }
}
