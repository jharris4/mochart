<script setup lang="ts">
import { computed, ref } from 'vue';

import { demoText } from '@mochart/demo-common';

import Icon from '../misc/Icon.vue';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

interface Props {
  active?: boolean;
  demoData: DemoData;
  demoMode: DemoMode;
  demoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChange: OnDemoChanged;
}

const props = withDefaults(defineProps<Props>(), {
  active: false
});

const isTestMode = ref(false);

const modeCaptions: Record<string, string> = demoText.demosTab.modeCaptions;

const theDemoIds = computed(() => isTestMode.value ? props.demoData.testDemoIds : props.demoData.demoIds);
const isSingle = computed(() => props.demoMode === 'single');
const isMulti = computed(() => props.demoMode === 'multi');
const isRandom = computed(() => props.demoMode === 'random');
const modeCaption = computed(() => modeCaptions[props.demoMode] ?? '');

function onTestModeToggle() {
  isTestMode.value = !isTestMode.value;
}
</script>

<template>
  <div :class="'mochart-demo-tab-container col demos' + (props.active ? ' active' : '')">
    <div class="mochart-demo-modes-container">
      <form class="form-inline">
        <div class="form-group">
          <span class="form-control-plaintext">{{ demoText.demosTab.demoModeLabel }}&nbsp;</span>
        </div>
        <div class="form-group">
          <div class="btn-toolbar" role="toolbar">
            <button type="button" :class="'btn btn-' + (isSingle ? 'primary' : 'secondary')" :disabled="isSingle"
                    :title="demoText.demosTab.modes.single.title"
                    @click="props.onDemoModeChanged('single', props.demoId)">
              <Icon size="lg" name="pen-to-square" /> {{ demoText.demosTab.modes.single.label }}
            </button>
            <button type="button" :class="'btn btn-' + (isMulti ? 'primary' : 'secondary')" :disabled="isMulti"
                    :title="demoText.demosTab.modes.multi.title"
                    @click="props.onDemoModeChanged('multi', props.demoId)">
              <Icon size="lg" name="window-restore" /> {{ demoText.demosTab.modes.multi.label }}
            </button>
            <button type="button" :class="'btn btn-' + (isRandom ? 'primary' : 'secondary')" :disabled="isRandom"
                    :title="demoText.demosTab.modes.random.title"
                    @click="props.onDemoModeChanged('random', props.demoId)">
              <Icon size="lg" name="shuffle" /> {{ demoText.demosTab.modes.random.label }}
            </button>
            <button type="button" class="btn btn-secondary"
                    :title="demoText.demosTab.modes.transition.title"
                    @click="props.onDemoModeChanged('transition', props.demoId)">
              <Icon size="lg" name="right-left" /> {{ demoText.demosTab.modes.transition.label }}
            </button>
            <button type="button" class="btn btn-secondary"
                    :title="demoText.demosTab.modes.rotation.title"
                    @click="props.onDemoModeChanged('rotation', props.demoId)">
              <Icon size="lg" name="repeat" /> {{ demoText.demosTab.modes.rotation.label }}
            </button>
          </div>
        </div>
        <div class="form-group" style="margin-left: 10px;">
          <div class="btn-toolbar" role="toolbar">
            <button type="button" :class="'btn btn-' + (isTestMode ? 'primary' : 'secondary')" :aria-pressed="isTestMode"
                    :title="demoText.demosTab.testDemos.title"
                    @click="onTestModeToggle">
              <Icon size="lg" name="flask" /> {{ demoText.demosTab.testDemos.label }}
            </button>
          </div>
        </div>
      </form>
      <div v-if="modeCaption" class="mochart-demo-caption">{{ modeCaption }}</div>
    </div>
    <div class="mochart-demo-list-container">
      <div class="mochart-demo-list">
        <div class="list-group">
          <button v-for="currentDemoId in theDemoIds" :key="currentDemoId" type="button"
                  :class="'list-group-item list-group-item-action' + (currentDemoId === props.demoId ? ' active' : '')"
                  @click="props.onDemoChange(currentDemoId)">
            {{ props.demoData.demoObjectMap[currentDemoId].title }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
