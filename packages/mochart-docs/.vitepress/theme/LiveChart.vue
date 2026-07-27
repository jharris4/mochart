<script setup lang="ts">
// Mounts a live mochart chart from a raw config + dataset. The chart module
// is imported on mount so pages stay SSR-safe, and the chart width tracks the
// container so examples stay responsive.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { encodeShareState, shareHashPrefix } from '@mochart/demo-common';

interface ChartHandle {
  update(props: Record<string, unknown>): void;
  destroy(): void;
}

const props = withDefaults(defineProps<{
  config: Record<string, unknown>;
  data: Record<string, unknown>[];
  altData?: Record<string, unknown>[];
  height?: number;
  demoLink?: boolean;
}>(), {
  altData: undefined,
  height: 320,
  demoLink: true
});

// Deep link into the vanilla gallery with this chart's config/data as the
// share payload (see demo-common shareState). The host demo route is
// arbitrary — the payload overrides its config and data. Resolves only on
// the assembled site, where the galleries sit next to the docs.
const demoUrl = computed(() => {
  if (!props.demoLink) {
    return null;
  }
  const payload = encodeShareState({ config: props.config, data: props.data });
  return import.meta.env.BASE_URL + 'vanilla/single/stacked/' + shareHashPrefix + payload;
});

// The docs render tooltips at VitePress's 16px body font while the default
// iconSize (14) is sized 1:1 for the demo apps' 14px font, leaving the color
// icon undersized against the row text. Match it to the docs' font size here;
// examples can still override, and the share payload keeps the raw config
// since the demo galleries render at 14px.
const renderConfig = computed(() => ({
  ...props.config,
  tooltipConfig: {
    iconSize: 16,
    ...(props.config['tooltipConfig'] as Record<string, unknown> | undefined)
  }
}));

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
    config: renderConfig.value,
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
    <!-- The card carries the padding/border; the chart measures the unpadded
         host, so clientWidth is the true content width. -->
    <div class="live-chart-card">
      <div ref="host" class="live-chart-host" :style="{ height: height + 'px' }" />
    </div>
    <div v-if="altData || demoUrl" class="live-chart-controls">
      <button v-if="altData" type="button" @click="toggle">
        {{ showingAlt ? 'Animate back' : 'Animate to new data' }}
      </button>
      <!-- target=_self keeps VitePress's SPA router from intercepting the
           navigation into the (non-VitePress) demo gallery. -->
      <a v-if="demoUrl" class="live-chart-demo-link" :href="demoUrl" target="_self" title="Open this chart in the demo gallery's editor">
        Open in demo ↗
      </a>
    </div>
  </div>
</template>
