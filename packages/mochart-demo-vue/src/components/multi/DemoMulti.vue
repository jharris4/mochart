<script setup lang="ts">
import { demoText } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import TopBar from '../misc/TopBar.vue';
import ChartsTab from './ChartsTab.vue';
import ErrorTab from '../misc/ErrorTab.vue';

import type { DemoData } from '../../types';

interface Props {
  demoData: DemoData;
  initialDemoId: string;
  siteRootUrl?: string;
  onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
  onBackToDemos: () => void;
}

const props = defineProps<Props>();
</script>

<template>
  <div class="mochart-demo-container multi">
    <TopBar :site-root-url="props.siteRootUrl" :on-back-to-demos="props.onBackToDemos"
            :notes="props.demoData.demoObjectMap[props.initialDemoId]"
            :modes="{ demoMode: 'multi', onModeChanged: props.onModeChanged }">
      <template #tabs>
        <li class="demo-tab-item">
          <button type="button" class="demo-tab active">{{ demoText.tabs.chart }}</button>
        </li>
      </template>
    </TopBar>
    <div class="mochart-demo-content-pane">
      <div class="mochart-demo-content">
        <ErrorTab :active="true">
          <ChartsTab :active="true" :demo-object="props.demoData.demoObjectMap[props.initialDemoId]" />
        </ErrorTab>
      </div>
    </div>
  </div>
</template>
