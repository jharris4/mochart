<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';

import { buildMochartDemoConfig, demoText } from '@mochart/demo-common';

import DemosTab from '../demos/DemosTab.vue';
import RandomContent from './RandomContent.vue';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

interface Props {
  demoData: DemoData;
  demoMode: DemoMode;
  initialDemoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChanged: OnDemoChanged;
  randomId: number;
  incrementRandomId: () => void;
  decrementRandomId: () => void;
}

const eventKeyChart = 1;
const eventKeyDemo = 2;
const eventKeyConfig = 3;
const eventKeyData = 4;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

const props = defineProps<Props>();

function buildStateForDemo(demoId: string) {
  const config = props.demoData.demoObjectMap[demoId].config;
  return {
    mochartDemoConfig: buildMochartDemoConfig(config),
    randomConfig: Object.assign({}, props.demoData.demoObjectMap[demoId].random, { valid: true })
  };
}

const initialState = props.initialDemoId !== 'demos' ? buildStateForDemo(props.initialDemoId) : { mochartDemoConfig: null, randomConfig: null };

const demoId = ref(props.initialDemoId);
const activeKey = ref(getActiveKeyForInitialDemoId(props.initialDemoId));
const mochartDemoConfig = shallowRef(initialState.mochartDemoConfig);
const randomConfig = shallowRef(initialState.randomConfig);

watch(() => props.initialDemoId, (nextInitialDemoId, previousInitialDemoId) => {
  if (nextInitialDemoId !== 'demos' && nextInitialDemoId !== previousInitialDemoId) {
    const nextState = buildStateForDemo(nextInitialDemoId);
    demoId.value = nextInitialDemoId;
    activeKey.value = getActiveKeyForInitialDemoId(nextInitialDemoId);
    mochartDemoConfig.value = nextState.mochartDemoConfig;
    randomConfig.value = nextState.randomConfig;
  }
  else if (nextInitialDemoId !== previousInitialDemoId) {
    demoId.value = nextInitialDemoId;
    activeKey.value = getActiveKeyForInitialDemoId(nextInitialDemoId);
  }
});

function onDemoChange(nextDemoId: string) {
  demoId.value = nextDemoId;
  props.onDemoChanged(nextDemoId);
}

function handleSelect(nextActiveKey: number) {
  activeKey.value = nextActiveKey;
}

const isDemos = computed(() => props.initialDemoId === 'demos');
</script>

<template>
  <div class="mochart-demo-container multi">
    <div class="mochart-demo-tabs-container">
      <ul class="nav nav-tabs">
        <li class="nav-item">
          <button type="button" :class="'nav-link' + (activeKey === eventKeyDemo ? ' active' : '')"
                  @click="handleSelect(eventKeyDemo)">
            {{ demoText.tabs.demos }}
          </button>
        </li>
        <li class="nav-item" :style="isDemos ? 'display: none;' : void 0">
          <button type="button" :class="'nav-link' + (activeKey === eventKeyChart ? ' active' : '')"
                  @click="handleSelect(eventKeyChart)">
            {{ demoText.tabs.chart }}
          </button>
        </li>
        <li class="nav-item" :style="isDemos ? 'display: none;' : void 0">
          <button type="button" :class="'nav-link' + (activeKey === eventKeyConfig ? ' active' : '')"
                  @click="handleSelect(eventKeyConfig)">
            {{ demoText.tabs.randomConfig }}
          </button>
        </li>
        <li class="nav-item" :style="isDemos ? 'display: none;' : void 0">
          <button type="button" :class="'nav-link' + (activeKey === eventKeyData ? ' active' : '')"
                  @click="handleSelect(eventKeyData)">
            {{ demoText.tabs.data }}
          </button>
        </li>
      </ul>
    </div>
    <div class="mochart-demo-content-pane">
      <div v-if="isDemos" class="mochart-demo-content single-tab">
        <DemosTab :active="activeKey === eventKeyDemo" :demo-data="props.demoData" :demo-mode="props.demoMode" :demo-id="demoId"
                  :on-demo-mode-changed="props.onDemoModeChanged" :on-demo-change="onDemoChange" />
      </div>
      <RandomContent v-else
                     :demo-data="props.demoData" :mochart-demo-config="mochartDemoConfig!" :initial-random-config="randomConfig!"
                     :demo-mode="props.demoMode" :initial-demo-id="props.initialDemoId" :demo-id="demoId"
                     :on-demo-mode-changed="props.onDemoModeChanged" :on-demo-change="onDemoChange" :active-key="activeKey"
                     :event-keys="{ eventKeyChart, eventKeyDemo, eventKeyConfig, eventKeyData }"
                     :random-id="props.randomId" :increment-random-id="props.incrementRandomId" :decrement-random-id="props.decrementRandomId" />
    </div>
  </div>
</template>
