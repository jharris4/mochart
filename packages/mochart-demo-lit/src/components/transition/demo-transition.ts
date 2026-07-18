import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { buildMochartDemoConfig, defaultTransitionConfig, getTransitionDataProviders, getTransitionMochartConfig } from '@mochart/demo-common';

import { LightElement } from '../misc/LightElement';
import './transition-chart-tab';
import './transition-config-tab';

import type { TransitionConfig } from '../../types';

const eventKeyChart = 1;
const eventKeyConfig = 2;

@customElement('demo-transition')
export class DemoTransition extends LightElement {
  @state() private activeKey = eventKeyChart;
  @state() private transitionConfig: TransitionConfig = defaultTransitionConfig;
  @state() private mochartConfig = getTransitionMochartConfig(defaultTransitionConfig);
  @state() private dataProviders = getTransitionDataProviders(defaultTransitionConfig);

  private handleSelect(nextActiveKey: number): void {
    this.activeKey = nextActiveKey;
  }

  private onUpdateConfig = (nextTransitionConfig: TransitionConfig): void => {
    this.transitionConfig = nextTransitionConfig;
    this.mochartConfig = getTransitionMochartConfig(nextTransitionConfig);
    this.dataProviders = getTransitionDataProviders(nextTransitionConfig);
  };

  private onResetConfig = (): void => {
    this.transitionConfig = defaultTransitionConfig;
    this.mochartConfig = getTransitionMochartConfig(defaultTransitionConfig);
    this.dataProviders = getTransitionDataProviders(defaultTransitionConfig);
  };

  override render(): unknown {
    return html`<div class="mochart-demo-container multi">
      <div class="mochart-demo-tabs-container">
        <ul class="nav nav-tabs">
          <li class="nav-item">
            <button type="button" class=${'nav-link' + (this.activeKey === eventKeyChart ? ' active' : '')}
                    @click=${() => this.handleSelect(eventKeyChart)}>
              Chart
            </button>
          </li>
          <li class="nav-item">
            <button type="button" class=${'nav-link' + (this.activeKey === eventKeyConfig ? ' active' : '')}
                    @click=${() => this.handleSelect(eventKeyConfig)}>
              Transition Config
            </button>
          </li>
        </ul>
      </div>
      <div class="mochart-demo-content-pane">
        <div class="mochart-demo-content">
          <transition-chart-tab .mochartConfig=${this.mochartConfig} .dataProviders=${this.dataProviders} .active=${this.activeKey === eventKeyChart}></transition-chart-tab>
          <transition-config-tab .transitionConfig=${this.transitionConfig} .onUpdate=${this.onUpdateConfig} .onReset=${this.onResetConfig}
              .active=${this.activeKey === eventKeyConfig}></transition-config-tab>
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-transition': DemoTransition;
  }
}
