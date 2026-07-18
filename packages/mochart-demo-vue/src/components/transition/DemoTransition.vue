<script setup lang="ts">
import { ref, shallowRef } from 'vue';

import { ArrayOfObjectsDataProvider } from 'mochart';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import TransitionChartTab from './TransitionChartTab.vue';
import TransitionConfigTab from './TransitionConfigTab.vue';

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
        "property": "listenerCount",
        "title": "Listener Count",
        "renderer": "bar",
        "markerShape": null,
        "valueFormat": ",d"
      }
    ]
  },
  "data": [
    [
      { "timestamp": "aaa", "classicCount": 0, "listenerCount": 50 },
      { "timestamp": "bbb", "classicCount": 0, "listenerCount": 48 },
      { "timestamp": "ccc", "classicCount": 0, "listenerCount": 28 },
      { "timestamp": "ddd", "classicCount": 0, "listenerCount": 27 },
      { "timestamp": "eee", "classicCount": 1, "listenerCount": 25 },
      { "timestamp": "fff", "classicCount": 0, "listenerCount": 22 }
    ],
    [
      { "timestamp": "ccc", "classicCount": 0, "listenerCount": 45 },
      { "timestamp": "bbb", "classicCount": 0, "listenerCount": 42 },
      { "timestamp": "ddd", "classicCount": 0, "listenerCount": 27 },
      { "timestamp": "eee", "classicCount": 1, "listenerCount": 25 },
      { "timestamp": "fff", "classicCount": 0, "listenerCount": 22 },
      { "timestamp": "ggg", "classicCount": 0, "listenerCount": 20 }
    ],
    [
      { "timestamp": "bbb", "classicCount": 0, "listenerCount": 42 },
      { "timestamp": "ccc", "classicCount": 0, "listenerCount": 45 },
      { "timestamp": "ddd", "classicCount": 0, "listenerCount": 27 },
      { "timestamp": "eee", "classicCount": 1, "listenerCount": 25 },
      { "timestamp": "fff", "classicCount": 0, "listenerCount": 22 },
      { "timestamp": "ggg", "classicCount": 0, "listenerCount": 20 }
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

const activeKey = ref(eventKeyChart);

const transitionConfig = shallowRef<TransitionConfig>(defaultTransitionConfig);
const mochartConfig = shallowRef(getMochartConfig(defaultTransitionConfig));
const dataProviders = shallowRef(getDataProviders(defaultTransitionConfig));

function handleSelect(nextActiveKey: number) {
  activeKey.value = nextActiveKey;
}

function onUpdateConfig(nextTransitionConfig: TransitionConfig) {
  transitionConfig.value = nextTransitionConfig;
  mochartConfig.value = getMochartConfig(nextTransitionConfig);
  dataProviders.value = getDataProviders(nextTransitionConfig);
}

function onResetConfig() {
  transitionConfig.value = defaultTransitionConfig;
  mochartConfig.value = getMochartConfig(defaultTransitionConfig);
  dataProviders.value = getDataProviders(defaultTransitionConfig);
}
</script>

<template>
  <div class="mochart-demo-container multi">
    <div class="mochart-demo-tabs-container">
      <ul class="nav nav-tabs">
        <li class="nav-item">
          <button type="button" :class="'nav-link' + (activeKey === eventKeyChart ? ' active' : '')"
                  @click="handleSelect(eventKeyChart)">
            Chart
          </button>
        </li>
        <li class="nav-item">
          <button type="button" :class="'nav-link' + (activeKey === eventKeyConfig ? ' active' : '')"
                  @click="handleSelect(eventKeyConfig)">
            Transition Config
          </button>
        </li>
      </ul>
    </div>
    <div class="mochart-demo-content-pane">
      <div class="mochart-demo-content">
        <TransitionChartTab :mochart-config="mochartConfig" :data-providers="dataProviders" :active="activeKey === eventKeyChart" />
        <TransitionConfigTab :transition-config="transitionConfig" :on-update="onUpdateConfig" :on-reset="onResetConfig"
                             :active="activeKey === eventKeyConfig" />
      </div>
    </div>
  </div>
</template>
