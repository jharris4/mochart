<script setup lang="ts">
import { ref, shallowRef } from 'vue';

import { buildMochartDemoConfig, defaultTransitionConfig, demoText, getTransitionDataProviders, getTransitionMochartConfig } from '@mochart/demo-common';

import TransitionChartTab from './TransitionChartTab.vue';
import TransitionConfigTab from './TransitionConfigTab.vue';

import type { TransitionConfig } from '../../types';

const eventKeyChart = 1;
const eventKeyConfig = 2;

const activeKey = ref(eventKeyChart);

const transitionConfig = shallowRef<TransitionConfig>(defaultTransitionConfig);
const mochartConfig = shallowRef(getTransitionMochartConfig(defaultTransitionConfig));
const dataProviders = shallowRef(getTransitionDataProviders(defaultTransitionConfig));

function handleSelect(nextActiveKey: number) {
  activeKey.value = nextActiveKey;
}

function onUpdateConfig(nextTransitionConfig: TransitionConfig) {
  transitionConfig.value = nextTransitionConfig;
  mochartConfig.value = getTransitionMochartConfig(nextTransitionConfig);
  dataProviders.value = getTransitionDataProviders(nextTransitionConfig);
}

function onResetConfig() {
  transitionConfig.value = defaultTransitionConfig;
  mochartConfig.value = getTransitionMochartConfig(defaultTransitionConfig);
  dataProviders.value = getTransitionDataProviders(defaultTransitionConfig);
}
</script>

<template>
  <div class="mochart-demo-container multi">
    <div class="mochart-demo-tabs-container">
      <ul class="nav nav-tabs">
        <li class="nav-item">
          <button type="button" :class="'nav-link' + (activeKey === eventKeyChart ? ' active' : '')"
                  @click="handleSelect(eventKeyChart)">
            {{ demoText.tabs.chart }}
          </button>
        </li>
        <li class="nav-item">
          <button type="button" :class="'nav-link' + (activeKey === eventKeyConfig ? ' active' : '')"
                  @click="handleSelect(eventKeyConfig)">
            {{ demoText.tabs.transitionConfig }}
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
