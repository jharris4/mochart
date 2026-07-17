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

const theDemoIds = computed(() => isTestMode.value ? props.demoData.testDemoIds : props.demoData.demoIds);
const isSingle = computed(() => props.demoMode === 'single');
const isMulti = computed(() => props.demoMode === 'multi');
const isRandom = computed(() => props.demoMode === 'random');

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
                    @click="props.onDemoModeChanged('single', props.demoId)">
              <Icon size="lg" name="edit" /> Single
            </button>
            <button type="button" :class="'btn btn-' + (isMulti ? 'primary' : 'secondary')" :disabled="isMulti"
                    @click="props.onDemoModeChanged('multi', props.demoId)">
              <Icon size="lg" name="window-restore" /> Multi
            </button>
            <button type="button" :class="'btn btn-' + (isRandom ? 'primary' : 'secondary')" :disabled="isRandom"
                    @click="props.onDemoModeChanged('random', props.demoId)">
              <Icon size="lg" name="random" /> Random
            </button>
            <button type="button" class="btn btn-secondary"
                    @click="props.onDemoModeChanged('transition', props.demoId)">
              <Icon size="lg" name="exchange" /> Transition
            </button>
            <button type="button" class="btn btn-secondary"
                    @click="props.onDemoModeChanged('rotation', props.demoId)">
              <Icon size="lg" name="repeat" /> Rotation
            </button>
          </div>
        </div>
        <div class="form-group" style="margin-left: 10px;">
          <div class="btn-toolbar" role="toolbar">
            <button type="button" :class="'btn btn-' + (isTestMode ? 'primary' : 'secondary')"
                    @click="onTestModeToggle">
              <Icon size="lg" name="edit" /> Test Demos
            </button>
          </div>
        </div>
      </form>
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
