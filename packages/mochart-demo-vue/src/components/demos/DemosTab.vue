<script setup lang="ts">
import { computed, ref } from 'vue';

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

const modeCaptions: Record<string, string> = {
  single: 'Single: one chart with editable config, data, groups and series — pick a demo below.',
  multi: 'Multi: a grid of charts stepping through generated datasets together — pick a demo below.',
  random: 'Random: a chart fed by a seeded random data generator — pick a demo below.',
  transition: 'Transition: animates a chart between datasets — pick a demo below.',
  rotation: 'Rotation: a grid of every chart config variation.'
};

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
          <span class="form-control-plaintext">Demo Mode:&nbsp;</span>
        </div>
        <div class="form-group">
          <div class="btn-toolbar" role="toolbar">
            <button type="button" :class="'btn btn-' + (isSingle ? 'primary' : 'secondary')" :disabled="isSingle"
                    title="One chart with editable config, data, groups and series"
                    @click="props.onDemoModeChanged('single', props.demoId)">
              <Icon size="lg" name="pen-to-square" /> Single
            </button>
            <button type="button" :class="'btn btn-' + (isMulti ? 'primary' : 'secondary')" :disabled="isMulti"
                    title="A grid of charts stepping through datasets together"
                    @click="props.onDemoModeChanged('multi', props.demoId)">
              <Icon size="lg" name="window-restore" /> Multi
            </button>
            <button type="button" :class="'btn btn-' + (isRandom ? 'primary' : 'secondary')" :disabled="isRandom"
                    title="A chart fed by a seeded random data generator"
                    @click="props.onDemoModeChanged('random', props.demoId)">
              <Icon size="lg" name="shuffle" /> Random
            </button>
            <button type="button" class="btn btn-secondary"
                    title="Animate a chart between two datasets"
                    @click="props.onDemoModeChanged('transition', props.demoId)">
              <Icon size="lg" name="right-left" /> Transition
            </button>
            <button type="button" class="btn btn-secondary"
                    title="A grid of chart config variations"
                    @click="props.onDemoModeChanged('rotation', props.demoId)">
              <Icon size="lg" name="repeat" /> Rotation
            </button>
          </div>
        </div>
        <div class="form-group" style="margin-left: 10px;">
          <div class="btn-toolbar" role="toolbar">
            <button type="button" :class="'btn btn-' + (isTestMode ? 'primary' : 'secondary')" :aria-pressed="isTestMode"
                    title="Show the test demos (intentionally invalid configs for exercising error handling)"
                    @click="onTestModeToggle">
              <Icon size="lg" name="flask" /> Test Demos
            </button>
          </div>
        </div>
      </form>
      <div v-if="modeCaption" class="mochart-demo-caption">{{ modeCaption }}</div>
    </div>
    <div class="mochart-demo-list-container">
      <div class="mochart-demo-list">
        <ul class="list-group">
          <li v-for="currentDemoId in theDemoIds" :key="currentDemoId"
              :class="'list-group-item' + (currentDemoId === props.demoId ? ' active' : '')"
              role="button" tabindex="0"
              @click="props.onDemoChange(currentDemoId)"
              @keydown="(event) => { if (event.key === 'Enter' || event.key === ' ') { props.onDemoChange(currentDemoId); } }">
            {{ props.demoData.demoObjectMap[currentDemoId].title }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
