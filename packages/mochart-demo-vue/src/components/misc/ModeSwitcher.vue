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

<!-- How the current mode is marked depends on the width. In the strip it is a
     filled, disabled segment — plainly "you are here". On a phone the switcher
     lives in the nav overflow menu, where `.demo-menu-overflow .demo-btn:disabled`
     greys a row out and a greyed row in a list of destinations reads as
     unavailable rather than current — so there it gets the panel's `.active`
     tint plus `aria-current`, and is simply inert when tapped. -->
<template>
  <div class="mochart-demo-mode-switcher">
    <span class="demo-label">{{ demoText.modeSwitcher.label }}</span>
    <div class="demo-toolbar" role="toolbar">
      <button v-for="mode in availableModes" :key="mode" type="button"
              :class="'demo-btn demo-btn-' + (mode === props.demoMode ? 'primary' : 'secondary') + (mode === props.demoMode && isPhone ? ' active' : '')"
              :disabled="mode === props.demoMode && !isPhone" :title="demoText.modeSwitcher.modes[mode].title"
              :aria-current="mode === props.demoMode && isPhone ? 'true' : undefined"
              @click="mode !== props.demoMode && props.onModeChanged(mode)">
        <Icon size="lg" :fixed-width="true" :name="modeIcons[mode]" /><span class="btn-label">{{ demoText.modeSwitcher.modes[mode].label }}</span>
      </button>
    </div>
  </div>
</template>
