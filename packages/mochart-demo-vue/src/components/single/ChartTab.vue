<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';

import { hasConfigStructureChange } from '@mochart/core';

import { buildMochartDemoConfig } from '@mochart/demo-common';

import EditableChart from './EditableChart.vue';
import { useElementSize } from '../misc/useElementSize';

import type { DemoConfig, DataRow, MochartDemoConfig, FocusData, FilteredSeriesIds } from '../../types';

interface Props {
  config?: DemoConfig | null;
  data?: DataRow[] | null;
  dataError?: string | boolean | null;
  active?: boolean;
}

const minChartWidthForSecondChart = 480;
const scrollWidthOffset = 20;
const defaultChartCount = 1;

const props = withDefaults(defineProps<Props>(), {
  config: null,
  data: null,
  dataError: false,
  active: false
});

// Measured width of the tab.
const { elementRef, width } = useElementSize();

const chartCount = ref(defaultChartCount);
const focusedSeriesAxisId = shallowRef<string | null>(null);
const focusedSeriesId = shallowRef<string | null>(null);
const focusedGroupIndex = ref(-1);
const filteredSeriesIds = shallowRef<FilteredSeriesIds>({});
const mochartDemoConfig = shallowRef<MochartDemoConfig | null>(props.config ? buildMochartDemoConfig(props.config) : null);

function resetFocusAndFiltered() {
  focusedSeriesAxisId.value = null;
  focusedSeriesId.value = null;
  focusedGroupIndex.value = -1;
  filteredSeriesIds.value = {};
}

// Mirror the react lifecycle: a config change rebuilds the demo config and
// resets focus/filter state when the structure changed (or on data errors);
// a data change remaps the focused group index onto the new data.
watch(
  () => [props.config, props.data, props.dataError] as const,
  ([nextConfig, nextData, nextDataError], [previousConfig, previousData, previousDataError]) => {
    if (nextDataError || nextConfig !== previousConfig) {
      let configChanged = false;
      if (nextConfig !== previousConfig) {
        const nextDemoConfig = nextConfig ? buildMochartDemoConfig(nextConfig) : null;
        if (nextDemoConfig && mochartDemoConfig.value) {
          configChanged = hasConfigStructureChange(mochartDemoConfig.value.mochartConfig, nextDemoConfig.mochartConfig);
        }
        mochartDemoConfig.value = nextDemoConfig;
      }
      if (nextDataError || configChanged) {
        resetFocusAndFiltered();
      }
    }
    else if (nextData !== previousData) {
      const { configValidation, mochartConfig } = mochartDemoConfig.value ?? {};
      const valid = configValidation?.valid ?? false;
      if (!previousDataError && previousData && nextData && valid && mochartConfig) {
        if (focusedGroupIndex.value >= 0) {
          const property = mochartConfig.groupAxisConfig.property ?? '';
          const groupValue = previousData[focusedGroupIndex.value][property];
          let newFocusedGroupIndex = -1;
          let i, count = nextData.length;
          for (i = 0; i < count; i++) {
            if (nextData[i][property] === groupValue) {
              newFocusedGroupIndex = i;
              break;
            }
          }
          focusedGroupIndex.value = newFocusedGroupIndex;
        }
      }
      else {
        resetFocusAndFiltered();
      }
    }
  }
);

function onFocus(focusData: FocusData = {}) {
  const { seriesAxisId, seriesId, groupIndex } = focusData;
  if (seriesAxisId !== void 0) {
    focusedSeriesAxisId.value = seriesAxisId;
  }
  if (seriesId !== void 0) {
    focusedSeriesId.value = seriesId;
  }
  if (groupIndex !== void 0) {
    focusedGroupIndex.value = groupIndex;
  }
}

// The chart owns filter toggling now and reports the whole map.
function onSeriesFilter({ filteredSeriesIds: nextFilteredSeriesIds }: { filteredSeriesIds: FilteredSeriesIds }) {
  filteredSeriesIds.value = { ...nextFilteredSeriesIds };
}

function onChartCountToggle() {
  chartCount.value = chartCount.value === 1 ? 2 : 1;
}

const allowedChartCount = computed(() => Math.floor(width.value / 2) > minChartWidthForSecondChart ? 2 : 1);
const adjustedChartCount = computed(() => Math.min(chartCount.value, allowedChartCount.value));
const chartWidth = computed(() => Math.floor((width.value - scrollWidthOffset) / adjustedChartCount.value));
</script>

<template>
  <div ref="elementRef" :class="'mochart-demo-tab-container row chart' + (props.active ? ' active' : '')">
    <div class="editable-charts-sizer">
      <div class="editable-charts">
        <template v-if="mochartDemoConfig && width > 0">
          <EditableChart v-for="i in adjustedChartCount" :key="i"
                         :chart-count="chartCount" :show-chart-count-controls="allowedChartCount > 1 && i === 1" :show-share-button="i === 1"
                         :width="chartWidth" :mochart-demo-config="mochartDemoConfig" :data="props.data ?? []" :data-error="props.dataError"
                         :is-active="props.active" :filtered-series-ids="filteredSeriesIds" :focused-group-index="focusedGroupIndex"
                         :focused-series-axis-id="focusedSeriesAxisId" :focused-series-id="focusedSeriesId" :on-chart-count-toggle="onChartCountToggle"
                         :on-focus="onFocus" :on-series-filter="onSeriesFilter" />
        </template>
      </div>
    </div>
  </div>
</template>
