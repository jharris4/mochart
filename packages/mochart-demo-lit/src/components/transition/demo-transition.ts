import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { ArrayOfObjectsDataProvider } from '@mochart/core';
import type { MochartConfig } from '@mochart/core';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import { LightElement } from '../misc/LightElement';
import './transition-chart-tab';
import './transition-config-tab';

import type { TransitionConfig, ChartDataProviderLike } from '../../types';

const eventKeyChart = 1;
const eventKeyConfig = 2;

const defaultTransitionConfig = {
  "config": {
    "version": "1.0.0",
    "animationConfig": {
      "initialDuration": 1000,
      "expansionDuration": 3000,
      "valueChangeDuration": 3000,
      "collapseDuration": 3000
    },
    "groupAxisConfig": {
      "property": "timestamp",
      "type": "string",
      "scale": "ordinal",
      "valueLabel": "Date",
      "dateUTC": false
    },
    "legendConfig": {
      "visible": true
    },
    "seriesAxisConfigs": [
      {
        "id": "SA0",
        "min": 0
      }
    ],
    "seriesStackConfigs": [{
      "id": "SS0",
      "axis": "SA0"
    }],
    "seriesConfigs": [
      {
        "axis": "SA0",
        "stack": "SS0",
        "property": "count",
        "title": "Count",
        "renderer": "bar",
        "markerShape": null,
        "valueFormat": ",d"
      }
    ]
  },
  "data": [
    [
      { "timestamp": "aaa", "count": 50 },
      { "timestamp": "bbb", "count": 48 },
      { "timestamp": "ccc", "count": 28 },
      { "timestamp": "ddd", "count": 27 },
      { "timestamp": "eee", "count": 25 },
      { "timestamp": "fff", "count": 22 }
    ],
    [
      { "timestamp": "ccc", "count": 45 },
      { "timestamp": "bbb", "count": 42 },
      { "timestamp": "ddd", "count": 27 },
      { "timestamp": "eee", "count": 25 },
      { "timestamp": "fff", "count": 22 },
      { "timestamp": "ggg", "count": 20 }
    ],
    [
      { "timestamp": "bbb", "count": 42 },
      { "timestamp": "ccc", "count": 45 },
      { "timestamp": "ddd", "count": 27 },
      { "timestamp": "eee", "count": 25 },
      { "timestamp": "fff", "count": 22 },
      { "timestamp": "ggg", "count": 20 }
    ]
  ]
};

function getMochartConfig(transitionConfig: TransitionConfig): MochartConfig {
  return buildMochartDemoConfig(transitionConfig.config).mochartConfig;
}

function getDataProviders(transitionConfig: TransitionConfig): ChartDataProviderLike[] {
  // TODO - this doesn't handle group display property or extra series properties...
  const groupProperty = transitionConfig.config.groupAxisConfig.property;
  return transitionConfig.data.map(data => new ArrayOfObjectsDataProvider(data, groupProperty));
}

@customElement('demo-transition')
export class DemoTransition extends LightElement {
  @state() private activeKey = eventKeyChart;
  @state() private transitionConfig: TransitionConfig = defaultTransitionConfig;
  @state() private mochartConfig = getMochartConfig(defaultTransitionConfig);
  @state() private dataProviders = getDataProviders(defaultTransitionConfig);

  private handleSelect(nextActiveKey: number): void {
    this.activeKey = nextActiveKey;
  }

  private onUpdateConfig = (nextTransitionConfig: TransitionConfig): void => {
    this.transitionConfig = nextTransitionConfig;
    this.mochartConfig = getMochartConfig(nextTransitionConfig);
    this.dataProviders = getDataProviders(nextTransitionConfig);
  };

  private onResetConfig = (): void => {
    this.transitionConfig = defaultTransitionConfig;
    this.mochartConfig = getMochartConfig(defaultTransitionConfig);
    this.dataProviders = getDataProviders(defaultTransitionConfig);
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
