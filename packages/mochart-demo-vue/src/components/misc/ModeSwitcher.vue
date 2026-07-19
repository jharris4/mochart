<script setup lang="ts">
import { demoText, switchableDemoModes } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import Icon from './Icon.vue';

// The in-demo Single/Multi/Random mode switcher. Transition/rotation are
// standalone gallery pages, not modes, so they don't appear here.
interface Props {
  demoMode: SwitchableDemoMode;
  onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
}

const props = defineProps<Props>();

const modeIcons: Record<SwitchableDemoMode, string> = {
  single: 'pen-to-square',
  multi: 'window-restore',
  random: 'shuffle'
};
</script>

<template>
  <div class="mochart-demo-mode-switcher">
    <span class="form-control-plaintext">{{ demoText.modeSwitcher.label }}</span>
    <div class="btn-toolbar" role="toolbar">
      <button v-for="mode in switchableDemoModes" :key="mode" type="button"
              :class="'btn btn-' + (mode === props.demoMode ? 'primary' : 'secondary')"
              :disabled="mode === props.demoMode" :title="demoText.modeSwitcher.modes[mode].title"
              @click="props.onModeChanged(mode)">
        <Icon size="lg" :name="modeIcons[mode]" /> {{ demoText.modeSwitcher.modes[mode].label }}
      </button>
    </div>
  </div>
</template>
