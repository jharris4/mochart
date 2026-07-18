import { ArrayOfObjectsDataProvider } from '@mochart/core';

import { buildMochartDemoConfig } from '@mochart/demo-common';

import { el } from '../misc/dom';
import { transitionChartTab } from './TransitionChartTab';
import { transitionConfigTab } from './TransitionConfigTab';

import type { TransitionConfig, ChartDataProviderLike } from '../../types';

export interface DemoTransitionHandle {
  el: HTMLElement;
  destroy(): void;
}

const eventKeyChart = 1;
const eventKeyConfig = 2;

const defaultTransitionConfig: TransitionConfig = {
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
  const groupProperty = transitionConfig.config.groupAxisConfig.property;
  return transitionConfig.data.map(data => new ArrayOfObjectsDataProvider(data, groupProperty));
}

export function demoTransition(): DemoTransitionHandle {
  let activeKey = eventKeyChart;

  let transitionConfig = defaultTransitionConfig;
  let mochartConfig = getMochartConfig(defaultTransitionConfig);
  let dataProviders = getDataProviders(defaultTransitionConfig);

  const chart = transitionChartTab({
    active: activeKey === eventKeyChart,
    mochartConfig,
    dataProviders
  });
  const config = transitionConfigTab({
    active: activeKey === eventKeyConfig,
    transitionConfig,
    onUpdate(nextTransitionConfig: TransitionConfig) {
      transitionConfig = nextTransitionConfig;
      mochartConfig = getMochartConfig(nextTransitionConfig);
      dataProviders = getDataProviders(nextTransitionConfig);
      chart.update({ mochartConfig, dataProviders });
      config.setTransitionConfig(nextTransitionConfig);
    },
    onReset() {
      transitionConfig = defaultTransitionConfig;
      mochartConfig = getMochartConfig(defaultTransitionConfig);
      dataProviders = getDataProviders(defaultTransitionConfig);
      chart.update({ mochartConfig, dataProviders });
      config.setTransitionConfig(defaultTransitionConfig);
    }
  });

  function navItem(text: string, key: number): { li: HTMLLIElement; button: HTMLButtonElement } {
    const button = el('button', {
      className: 'nav-link' + (activeKey === key ? ' active' : ''),
      attrs: { type: 'button' },
      text
    });
    button.addEventListener('click', () => handleSelect(key));
    return { li: el('li', { className: 'nav-item' }, [button]), button };
  }

  const chartNav = navItem('Chart', eventKeyChart);
  const configNav = navItem('Transition Config', eventKeyConfig);

  const container = el('div', { className: 'mochart-demo-container multi' }, [
    el('div', { className: 'mochart-demo-tabs-container' }, [
      el('ul', { className: 'nav nav-tabs' }, [chartNav.li, configNav.li])
    ]),
    el('div', { className: 'mochart-demo-content-pane' }, [
      el('div', { className: 'mochart-demo-content' }, [chart.el, config.el])
    ])
  ]);

  function handleSelect(nextActiveKey: number): void {
    activeKey = nextActiveKey;
    chartNav.button.classList.toggle('active', activeKey === eventKeyChart);
    configNav.button.classList.toggle('active', activeKey === eventKeyConfig);
    chart.setActive(activeKey === eventKeyChart);
    config.setActive(activeKey === eventKeyConfig);
  }

  return {
    el: container,
    destroy() {
      chart.destroy();
    }
  };
}
