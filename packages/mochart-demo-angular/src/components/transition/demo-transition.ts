import { Component, signal } from '@angular/core';

import { ArrayOfObjectsDataProvider } from 'mochart';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import { TransitionChartTab } from './transition-chart-tab';
import { TransitionConfigTab } from './transition-config-tab';

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

function getMochartConfig(transitionConfig: TransitionConfig) {
  return buildMochartDemoConfig(transitionConfig.config).mochartConfig;
}

function getDataProviders(transitionConfig: TransitionConfig): ChartDataProviderLike[] {
  // TODO - this doesn't handle group display property or extra series properties...
  const groupProperty = transitionConfig.config['groupAxisConfig'].property;
  return transitionConfig.data.map(data => new ArrayOfObjectsDataProvider(data, groupProperty));
}

@Component({
  selector: 'app-demo-transition',
  imports: [TransitionChartTab, TransitionConfigTab],
  styles: [':host { display: contents; }'],
  template: `
    <div class="mochart-demo-container multi">
      <div class="mochart-demo-tabs-container">
        <ul class="nav nav-tabs">
          <li class="nav-item">
            <button type="button" [class]="'nav-link' + (activeKey() === eventKeyChart ? ' active' : '')"
                    (click)="handleSelect(eventKeyChart)">
              Chart
            </button>
          </li>
          <li class="nav-item">
            <button type="button" [class]="'nav-link' + (activeKey() === eventKeyConfig ? ' active' : '')"
                    (click)="handleSelect(eventKeyConfig)">
              Transition Config
            </button>
          </li>
        </ul>
      </div>
      <div class="mochart-demo-content-pane">
        <div class="mochart-demo-content">
          <app-transition-chart-tab [mochartConfig]="mochartConfig()" [dataProviders]="dataProviders()" [active]="activeKey() === eventKeyChart" />
          <app-transition-config-tab [transitionConfig]="transitionConfig()" [onUpdate]="onUpdateConfig" [onReset]="onResetConfig"
                                     [active]="activeKey() === eventKeyConfig" />
        </div>
      </div>
    </div>
  `
})
export class DemoTransition {
  readonly eventKeyChart = eventKeyChart;
  readonly eventKeyConfig = eventKeyConfig;

  activeKey = signal(eventKeyChart);

  transitionConfig = signal<TransitionConfig>(defaultTransitionConfig);
  mochartConfig = signal(getMochartConfig(defaultTransitionConfig));
  dataProviders = signal(getDataProviders(defaultTransitionConfig));

  handleSelect(nextActiveKey: number): void {
    this.activeKey.set(nextActiveKey);
  }

  onUpdateConfig = (nextTransitionConfig: TransitionConfig): void => {
    this.transitionConfig.set(nextTransitionConfig);
    this.mochartConfig.set(getMochartConfig(nextTransitionConfig));
    this.dataProviders.set(getDataProviders(nextTransitionConfig));
  };

  onResetConfig = (): void => {
    this.transitionConfig.set(defaultTransitionConfig);
    this.mochartConfig.set(getMochartConfig(defaultTransitionConfig));
    this.dataProviders.set(getDataProviders(defaultTransitionConfig));
  };
}
