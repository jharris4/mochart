<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue';

import { buildMochartDemoConfig, demoText } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import BackToDemosButton from '../misc/BackToDemosButton.vue';
import ModeSwitcher from '../misc/ModeSwitcher.vue';
import NotesMenu from '../misc/NotesMenu.vue';
import SiteRootButton from '../misc/SiteRootButton.vue';
import ThemeToggleButton from '../misc/ThemeToggleButton.vue';
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
  const demo = props.demoData.demoObjectMap[demoId];
  return {
    mochartDemoConfig: buildMochartDemoConfig(demo.config),
    randomConfig: Object.assign({}, demo.random, { valid: true }),
    generator: demo.generator
  };
}

const initialState = buildStateForDemo(props.initialDemoId);

const activeKey = ref(eventKeyChart);
const mochartDemoConfig = shallowRef(initialState.mochartDemoConfig);
const randomConfig = shallowRef(initialState.randomConfig);
const generator = shallowRef(initialState.generator);

// When the routed demo changes, rebuild its config state (RandomContent's own
// watch tells a demo change apart from a randomId-only step).
watch(() => props.initialDemoId, (nextInitialDemoId) => {
  const nextState = buildStateForDemo(nextInitialDemoId);
  activeKey.value = eventKeyChart;
  mochartDemoConfig.value = nextState.mochartDemoConfig;
  randomConfig.value = nextState.randomConfig;
  generator.value = nextState.generator;
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
        <ul class="demo-tabs">
          <li class="demo-tab-item">
            <button type="button" :class="'demo-tab' + (activeKey === eventKeyChart ? ' active' : '')"
                    @click="handleSelect(eventKeyChart)">
              {{ demoText.tabs.chart }}
            </button>
          </li>
          <li class="demo-tab-item">
            <button type="button" :class="'demo-tab' + (activeKey === eventKeyConfig ? ' active' : '')"
                    @click="handleSelect(eventKeyConfig)">
              {{ demoText.tabs.randomConfig }}
            </button>
          </li>
          <li class="demo-tab-item">
            <button type="button" :class="'demo-tab' + (activeKey === eventKeyData ? ' active' : '')"
                    @click="handleSelect(eventKeyData)">
              {{ demoText.tabs.data }}
            </button>
          </li>
        </ul>
        <NotesMenu :title="props.demoData.demoObjectMap[props.initialDemoId].title" :notes="props.demoData.demoObjectMap[props.initialDemoId].notes" />
      </div>
      <div class="mochart-demo-nav-group">
        <ModeSwitcher demo-mode="random" :on-mode-changed="props.onModeChanged" />
        <ThemeToggleButton />
      </div>
    </div>
    <div class="mochart-demo-content-pane">
      <RandomContent :mochart-demo-config="mochartDemoConfig" :initial-random-config="randomConfig" :generator="generator"
                     :active-key="activeKey" :event-keys="{ eventKeyChart, eventKeyConfig, eventKeyData }"
                     :random-id="props.randomId" :increment-random-id="props.incrementRandomId" :decrement-random-id="props.decrementRandomId" />
    </div>
  </div>
</template>
