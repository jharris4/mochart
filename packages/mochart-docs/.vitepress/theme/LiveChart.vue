<script setup lang="ts">
// Mounts a live mochart chart from a raw config + dataset. The chart module
// is imported on mount so pages stay SSR-safe, and the chart width tracks the
// container so examples stay responsive.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { encodeShareState, getChartExportOptions, shareHashPrefix } from '@mochart/demo-common';
import type { DemoConfig, ShowcaseMode } from '@mochart/demo-common';

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
  /** Vanilla-gallery demo slug to host the share link (see demos.json ids). */
  demo?: string;
  /** Link to a vanilla-gallery showcase page instead of a single demo. */
  showcase?: ShowcaseMode;
  /** Show Download SVG / Download PNG buttons (the export guide's live demo). */
  exportButtons?: boolean;
  /** CSS color set on the chart host — shows chrome following `currentColor`. */
  color?: string;
}>(), {
  altData: undefined,
  height: 320,
  demoLink: true,
  demo: 'stacked',
  showcase: undefined,
  exportButtons: false,
  color: undefined
});

// Deep link into the vanilla gallery with this chart's config/data as the
// share payload (see demo-common shareState) — the payload overrides the
// host demo's config and data, so the chart shown is exactly this example.
// Pages should pass the closest matching demo slug via `demo` so the URL
// reads right and stripping the hash lands somewhere sensible. Resolves only
// on the assembled site, where the galleries sit next to the docs.
const demoUrl = computed(() => {
  if (!props.demoLink) {
    return null;
  }
  // Showcase pages are curated, so they get a plain link without a payload.
  if (props.showcase !== undefined) {
    return import.meta.env.BASE_URL + 'vanilla/' + props.showcase;
  }
  const payload = encodeShareState({
    mode: 'single',
    config: props.config as DemoConfig,
    data: props.data
  });
  return import.meta.env.BASE_URL + 'vanilla/single/' + props.demo + '/' + shareHashPrefix + payload;
});

const demoLinkTitle = computed(() => props.showcase === undefined
  ? "Open this chart in the demo gallery's editor"
  : `Open the ${props.showcase} showcase in the demo gallery`);

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

// Imported on click for the same SSR-safety reason as the chart module; the
// background color follows the site theme so dark-mode text stays readable.
async function download(format: 'svg' | 'png') {
  const el = host.value;
  if (el === null) {
    return;
  }
  const { exportSVG, exportPNG } = await import('@mochart/export');
  if (format === 'svg') {
    exportSVG(el, getChartExportOptions());
  } else {
    await exportPNG(el, getChartExportOptions());
  }
}
</script>

<template>
  <div class="live-chart">
    <!-- The card carries the padding/border; the chart measures the unpadded
         host, so clientWidth is the true content width. -->
    <div class="live-chart-card">
      <div ref="host" class="live-chart-host" :style="{ height: height + 'px', color: color }" />
    </div>
    <div v-if="altData || exportButtons || demoUrl" class="live-chart-controls">
      <button v-if="altData" type="button" @click="toggle">
        {{ showingAlt ? 'Animate back' : 'Animate to new data' }}
      </button>
      <button v-if="exportButtons" type="button" @click="download('svg')">
        Download SVG
      </button>
      <button v-if="exportButtons" type="button" @click="download('png')">
        Download PNG
      </button>
      <!-- target=_self keeps VitePress's SPA router from intercepting the
           navigation into the (non-VitePress) demo gallery. -->
      <a v-if="demoUrl" class="live-chart-demo-link" :href="demoUrl" target="_self" :title="demoLinkTitle">
        Open in demo ↗
      </a>
    </div>
  </div>
</template>
