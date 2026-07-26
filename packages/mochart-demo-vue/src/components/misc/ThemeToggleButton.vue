<script lang="ts">
import { initTheme } from '@mochart/demo-common';

// One controller for the whole app; every view's toggle button shares it.
const theme = initTheme();
</script>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';

import { demoText } from '@mochart/demo-common';

import Icon from './Icon.vue';

// Icon-only light/dark toggle; shares the docs site's theme choice.
const dark = ref(theme.isDark());
const unsubscribe = theme.onChange(value => {
  dark.value = value;
});
onUnmounted(unsubscribe);

function toggleTheme(): void {
  theme.toggle();
}
</script>

<template>
  <button type="button" class="demo-btn demo-btn-secondary mochart-demo-theme-toggle"
          :title="dark ? demoText.themeToggle.tooltipToLight : demoText.themeToggle.tooltipToDark"
          :aria-label="demoText.themeToggle.aria"
          @click="toggleTheme()">
    <Icon size="lg" :name="dark ? 'sun' : 'moon'" fixed-width />
  </button>
</template>
