<script setup lang="ts">
// Mounts a live mochart chart from a raw config + dataset. The chart module
// is imported on mount so pages stay SSR-safe, and the chart width tracks the
// container so examples stay responsive.
import { onBeforeUnmount, onMounted, ref } from 'vue';

interface ChartHandle {
  update(props: Record<string, unknown>): void;
  destroy(): void;
}

const props = withDefaults(defineProps<{
  config: Record<string, unknown>;
  data: Record<string, unknown>[];
  altData?: Record<string, unknown>[];
  height?: number;
}>(), {
  altData: undefined,
  height: 320
});

const host = ref<HTMLElement | null>(null);
const showingAlt = ref(false);
let chart: ChartHandle | null = null;
let observer: ResizeObserver | null = null;

onMounted(async () => {
  const { createDefaultChart } = await import('@mochart/core');
  const el = host.value;
  if (el === null) {
    return;
  }
  chart = createDefaultChart(el, {
    config: props.config,
    data: props.data,
    width: el.clientWidth,
    height: props.height
  }) as ChartHandle;
  observer = new ResizeObserver(() => {
    chart?.update({ width: el.clientWidth });
  });
  observer.observe(el);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
  chart?.destroy();
  chart = null;
});

function toggle() {
  if (chart === null || props.altData === undefined) {
    return;
  }
  showingAlt.value = !showingAlt.value;
  chart.update({ data: showingAlt.value ? props.altData : props.data });
}
</script>

<template>
  <div class="live-chart">
    <div ref="host" class="live-chart-host" :style="{ height: height + 'px' }" />
    <div v-if="altData" class="live-chart-controls">
      <button type="button" @click="toggle">
        {{ showingAlt ? 'Animate back' : 'Animate to new data' }}
      </button>
    </div>
  </div>
</template>
