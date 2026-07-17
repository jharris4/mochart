<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { DefaultChart } from 'mochart-vue';

import { configs, data, minWidth } from './rotationConfigs';

const innerWidth = ref(window.innerWidth);

function onWindowResize() {
  innerWidth.value = window.innerWidth;
}

onMounted(() => {
  window.addEventListener('resize', onWindowResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
});

const cols = computed(() => Math.floor(innerWidth.value / minWidth));
const colWidth = computed(() => Math.floor(innerWidth.value / cols.value));
</script>

<template>
  <div class="rotation-container">
    <div v-for="(config, i) in configs" :key="i"
         :class="'rotation-chart rotation-chart-' + i"
         :style="`left: ${(i % cols) * colWidth}px; top: ${Math.floor(i / cols) * colWidth}px; width: ${colWidth}px; height: ${colWidth}px;`">
      <DefaultChart :config="config" :data="data" :width="colWidth" :height="colWidth" />
    </div>
  </div>
</template>
