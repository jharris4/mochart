<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue';

import { buildMochartDemoConfig, demoText } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import BackToDemosButton from '../misc/BackToDemosButton.vue';
import ModeSwitcher from '../misc/ModeSwitcher.vue';
import SiteRootButton from '../misc/SiteRootButton.vue';
import RandomContent from './RandomContent.vue';

import type { DemoData } from '../../types';

interface Props {
  demoData: DemoData;
  initialDemoId: string;
  siteRootUrl?: string;
  onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
  onBackToDemos: () => void;
  randomId: number;
  incrementRandomId: () => void;
  decrementRandomId: () => void;
}

const eventKeyChart = 1;
const eventKeyConfig = 2;
const eventKeyData = 3;

const props = defineProps<Props>();

function buildStateForDemo(demoId: string) {
  const config = props.demoData.demoObjectMap[demoId].config;
  return {
    mochartDemoConfig: buildMochartDemoConfig(config),
    randomConfig: Object.assign({}, props.demoData.demoObjectMap[demoId].random, { valid: true })
  };
}

const initialState = buildStateForDemo(props.initialDemoId);

const activeKey = ref(eventKeyChart);
const mochartDemoConfig = shallowRef(initialState.mochartDemoConfig);
const randomConfig = shallowRef(initialState.randomConfig);

// When the routed demo changes, rebuild its config state (RandomContent's own
// watch tells a demo change apart from a randomId-only step).
watch(() => props.initialDemoId, (nextInitialDemoId) => {
  const nextState = buildStateForDemo(nextInitialDemoId);
  activeKey.value = eventKeyChart;
  mochartDemoConfig.value = nextState.mochartDemoConfig;
  randomConfig.value = nextState.randomConfig;
});

function handleSelect(nextActiveKey: number) {
  activeKey.value = nextActiveKey;
}
</script>

<template>
  <div class="mochart-demo-container multi">
    <div class="mochart-demo-tabs-container">
      <div class="mochart-demo-nav-group">
        <SiteRootButton :site-root-url="props.siteRootUrl" />
        <BackToDemosButton :on-back-to-demos="props.onBackToDemos" />
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
              {{ demoText.tabs.randomConfig }}
            </button>
          </li>
          <li class="nav-item">
            <button type="button" :class="'nav-link' + (activeKey === eventKeyData ? ' active' : '')"
                    @click="handleSelect(eventKeyData)">
              {{ demoText.tabs.data }}
            </button>
          </li>
        </ul>
      </div>
      <ModeSwitcher demo-mode="random" :on-mode-changed="props.onModeChanged" />
    </div>
    <div class="mochart-demo-content-pane">
      <RandomContent :mochart-demo-config="mochartDemoConfig" :initial-random-config="randomConfig"
                     :active-key="activeKey" :event-keys="{ eventKeyChart, eventKeyConfig, eventKeyData }"
                     :random-id="props.randomId" :increment-random-id="props.incrementRandomId" :decrement-random-id="props.decrementRandomId" />
    </div>
  </div>
</template>
