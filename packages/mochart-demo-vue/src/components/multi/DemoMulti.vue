<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { demoText } from '@mochart/demo-common';

import DemosTab from '../demos/DemosTab.vue';
import ChartsTab from './ChartsTab.vue';
import ErrorTab from '../misc/ErrorTab.vue';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

interface Props {
  demoData: DemoData;
  demoMode: DemoMode;
  initialDemoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChanged: OnDemoChanged;
}

const eventKeyChart = 1;
const eventKeyDemo = 2;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

const props = defineProps<Props>();

const demoId = ref(props.initialDemoId);
const activeKey = ref(getActiveKeyForInitialDemoId(props.initialDemoId));

watch(() => props.initialDemoId, (initialDemoId) => {
  activeKey.value = getActiveKeyForInitialDemoId(initialDemoId);
  demoId.value = initialDemoId;
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
      </ul>
    </div>
    <div class="mochart-demo-content-pane">
      <div v-if="isDemos" class="mochart-demo-content single-tab">
        <DemosTab :active="activeKey === eventKeyDemo" :demo-data="props.demoData" :demo-mode="props.demoMode" :demo-id="demoId"
                  :on-demo-mode-changed="props.onDemoModeChanged" :on-demo-change="onDemoChange" />
      </div>
      <div v-else class="mochart-demo-content">
        <ErrorTab :active="activeKey === eventKeyDemo">
          <DemosTab :active="activeKey === eventKeyDemo" :demo-data="props.demoData" :demo-mode="props.demoMode" :demo-id="demoId"
                    :on-demo-mode-changed="props.onDemoModeChanged" :on-demo-change="onDemoChange" />
        </ErrorTab>
        <ErrorTab :active="activeKey === eventKeyChart">
          <ChartsTab :active="activeKey === eventKeyChart" :demo-object="props.demoData.demoObjectMap[demoId]" />
        </ErrorTab>
      </div>
    </div>
  </div>
</template>
