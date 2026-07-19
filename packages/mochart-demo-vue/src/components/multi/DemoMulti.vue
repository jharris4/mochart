<script setup lang="ts">
import { demoText } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import BackToDemosButton from '../misc/BackToDemosButton.vue';
import ModeSwitcher from '../misc/ModeSwitcher.vue';
import SiteRootButton from '../misc/SiteRootButton.vue';
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
    <div class="mochart-demo-tabs-container">
      <div class="mochart-demo-nav-group">
        <SiteRootButton :site-root-url="props.siteRootUrl" />
        <BackToDemosButton :on-back-to-demos="props.onBackToDemos" />
        <ul class="nav nav-tabs">
          <li class="nav-item">
            <button type="button" class="nav-link active">{{ demoText.tabs.chart }}</button>
          </li>
        </ul>
      </div>
      <ModeSwitcher demo-mode="multi" :on-mode-changed="props.onModeChanged" />
    </div>
    <div class="mochart-demo-content-pane">
      <div class="mochart-demo-content">
        <ErrorTab :active="true">
          <ChartsTab :active="true" :demo-object="props.demoData.demoObjectMap[props.initialDemoId]" />
        </ErrorTab>
      </div>
    </div>
  </div>
</template>
