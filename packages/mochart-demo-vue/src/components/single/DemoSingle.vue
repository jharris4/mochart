<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';

import { consumeSingleShareState, demoText } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import BackToDemosButton from '../misc/BackToDemosButton.vue';
import ModeSwitcher from '../misc/ModeSwitcher.vue';
import NotesMenu from '../misc/NotesMenu.vue';
import SiteRootButton from '../misc/SiteRootButton.vue';
import ThemeToggleButton from '../misc/ThemeToggleButton.vue';
import ChartTab from './ChartTab.vue';
import ConfigTab from './ConfigTab.vue';
import DataTab from './DataTab.vue';
import ErrorTab from '../misc/ErrorTab.vue';

import type { DemoData, DemoConfig, DataRow } from '../../types';

interface Props {
  demoData: DemoData;
  initialDemoId: string;
  siteRootUrl?: string;
  onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
  onBackToDemos: () => void;
}

type DataError = string | boolean | null;

const eventKeyChart = 1;
const eventKeyConfig = 2;
const eventKeyData = 3;

const props = defineProps<Props>();

const activeKey = ref(eventKeyChart);

// A share link carries edited config/data in the URL hash; it overrides the
// demo's own config/data for the initial mount only.
const sharedState = consumeSingleShareState();

// Config/data edits made on the Config/Data tabs stay "pending" until the
// Chart tab is shown again (so the chart animates one combined change).
const demoId = ref(props.initialDemoId);
const pendingConfig = shallowRef<DemoConfig | null>(null);
const pendingData = shallowRef<DataRow[] | null>(null);
const pendingDataError = shallowRef<DataError>(false);
const config = shallowRef<DemoConfig>(sharedState?.config ?? props.demoData.demoObjectMap[props.initialDemoId].config);
const data = shallowRef<DataRow[]>(sharedState?.data ?? props.demoData.demoObjectMap[props.initialDemoId].data);
const viewingConfig = shallowRef<DemoConfig>(config.value);
const viewingData = shallowRef<DataRow[]>(data.value);
const viewingDataError = shallowRef<DataError>(false);

function chartShown() {
  if (pendingConfig.value !== null || pendingData.value !== null || pendingDataError.value !== null) {
    if (pendingConfig.value !== null) {
      viewingConfig.value = pendingConfig.value;
      pendingConfig.value = null;
    }
    if (pendingData.value !== null) {
      viewingData.value = pendingData.value;
      pendingData.value = null;
    }
    if (pendingDataError.value !== null) {
      viewingDataError.value = pendingDataError.value;
      pendingDataError.value = null;
    }
  }
}

function handleSelect(nextActiveKey: number) {
  const previousActiveKey = activeKey.value;
  activeKey.value = nextActiveKey;
  if (nextActiveKey === eventKeyChart && previousActiveKey !== eventKeyChart) {
    chartShown();
  }
}

// When the routed demo changes (history navigation between two demos), reload
// its config/data and promote them straight to the visible chart.
watch(() => props.initialDemoId, (initialDemoId) => {
  activeKey.value = eventKeyChart;
  demoId.value = initialDemoId;
  config.value = props.demoData.demoObjectMap[initialDemoId].config;
  data.value = props.demoData.demoObjectMap[initialDemoId].data;
  pendingConfig.value = config.value;
  pendingData.value = data.value;
  chartShown();
});

function onConfigChange(nextPendingConfig: DemoConfig) {
  pendingConfig.value = nextPendingConfig;
}

function onConfigReset() {
  const resetConfig = { ...props.demoData.demoObjectMap[demoId.value].config };
  pendingConfig.value = resetConfig;
  config.value = resetConfig;
}

function onDataChange(nextPendingData: DataRow[]) {
  pendingData.value = nextPendingData;
  pendingDataError.value = false;
}

function onDataError(errorMessage: string) {
  pendingDataError.value = errorMessage;
}

function onDataReset() {
  // give it a new array reference so children know to update
  pendingData.value = props.demoData.demoObjectMap[demoId.value].data.slice();
  pendingDataError.value = false;
}

// Applied config/data edits are held until the Chart tab is shown; badge the
// Chart tab so it's visible that something is waiting there.
const hasPendingChanges = computed(() =>
  activeKey.value !== eventKeyChart && (pendingConfig.value !== null || pendingData.value !== null));
</script>

<template>
  <div class="mochart-demo-container">
    <div class="mochart-demo-tabs-container">
      <div class="mochart-demo-nav-group">
        <SiteRootButton :site-root-url="props.siteRootUrl" />
        <BackToDemosButton :on-back-to-demos="props.onBackToDemos" />
        <ul class="demo-tabs">
          <li class="demo-tab-item">
            <button type="button" :class="'demo-tab' + (activeKey === eventKeyChart ? ' active' : '')"
                    :title="hasPendingChanges ? demoText.tabs.chartPendingTitle : undefined"
                    @click="handleSelect(eventKeyChart)">
              {{ demoText.tabs.chart }}<span v-if="hasPendingChanges" class="mochart-pending-badge" aria-hidden="true"></span>
            </button>
          </li>
          <li class="demo-tab-item">
            <button type="button" :class="'demo-tab' + (activeKey === eventKeyConfig ? ' active' : '')"
                    @click="handleSelect(eventKeyConfig)">
              {{ demoText.tabs.config }}
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
        <ModeSwitcher demo-mode="single" :on-mode-changed="props.onModeChanged" />
        <ThemeToggleButton />
      </div>
    </div>
    <div class="mochart-demo-content-pane">
      <div class="mochart-demo-content">
        <ErrorTab :active="activeKey === eventKeyChart">
          <ChartTab :active="activeKey === eventKeyChart" :config="viewingConfig" :data="viewingData" :data-error="viewingDataError" />
        </ErrorTab>
        <ErrorTab :active="activeKey === eventKeyConfig">
          <ConfigTab :active="activeKey === eventKeyConfig" :config="config" :on-config-change="onConfigChange" :on-config-reset="onConfigReset" />
        </ErrorTab>
        <ErrorTab :active="activeKey === eventKeyData">
          <DataTab :active="activeKey === eventKeyData" :config="viewingConfig" :data="data"
                   :on-data-change="onDataChange" :on-data-error="onDataError" :on-data-reset="onDataReset" />
        </ErrorTab>
      </div>
    </div>
  </div>
</template>
