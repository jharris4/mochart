<script setup lang="ts">
import { computed } from 'vue';

import { demoText, getAvailableDemoModes } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import Icon from './Icon.vue';
import { usePhoneViewport } from './usePhoneViewport';

// The in-demo Single/Multi/Random mode switcher. Transition/rotation are
// standalone gallery pages, not modes, so they don't appear here.
interface Props {
  demoMode: SwitchableDemoMode;
  onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
}

const props = defineProps<Props>();

const isPhone = usePhoneViewport();
const availableModes = computed(() => getAvailableDemoModes(isPhone.value));

const modeIcons: Record<SwitchableDemoMode, string> = {
  single: 'pen-to-square',
  multi: 'window-restore',
  random: 'shuffle'
};
</script>

<template>
  <div class="mochart-demo-mode-switcher">
    <span class="demo-label">{{ demoText.modeSwitcher.label }}</span>
    <div class="demo-toolbar" role="toolbar">
      <button v-for="mode in availableModes" :key="mode" type="button"
              :class="'demo-btn demo-btn-' + (mode === props.demoMode ? 'primary' : 'secondary')"
              :disabled="mode === props.demoMode" :title="demoText.modeSwitcher.modes[mode].title"
              @click="props.onModeChanged(mode)">
        <Icon size="lg" :name="modeIcons[mode]" /><span class="btn-label">{{ demoText.modeSwitcher.modes[mode].label }}</span>
      </button>
    </div>
  </div>
</template>
