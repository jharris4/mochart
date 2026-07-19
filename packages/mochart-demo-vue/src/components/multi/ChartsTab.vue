<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';

import { Chart } from '@mochart/vue';

import { buildMochartDemoConfig, getDataProvidersForDataCount } from '@mochart/demo-common';

import ChartsControls from './ChartsControls.vue';
import { useElementSize } from '../misc/useElementSize';

import type { Demo, FilteredSeriesIds, ChartDataProviderLike } from '../../types';

interface Props {
  demoObject: Demo;
  active?: boolean;
}

const scrollWidthOffset = 20;

const defaultChartRows = 2;
const defaultChartCols = 2;

const defaultRate = 2000;

const props = withDefaults(defineProps<Props>(), {
  active: false
});

let intervalId: ReturnType<typeof setInterval> | null = null;

const playing = ref(false);
const chartRows = ref(defaultChartRows);
const chartCols = ref(defaultChartCols);
const rate = ref(defaultRate);
const mochartDemoConfig = shallowRef(buildMochartDemoConfig(props.demoObject.config));
const data = shallowRef(props.demoObject.data);
const dataCount = ref(props.demoObject.data.length);
const currentDataCount = ref(props.demoObject.data.length);
const dataProviders = shallowRef(getDataProvidersForDataCount(
  mochartDemoConfig.value.mochartConfig, props.demoObject.data, defaultChartRows * defaultChartCols, props.demoObject.data.length));
const focusedGroupIndices = shallowRef<number[]>(dataProviders.value.map(() => -1));
const focusedGroupIndex = ref(-1);
const focusedSeriesAxisId = shallowRef<string | null>(null);
const focusedSeriesId = shallowRef<string | null>(null);
const filteredSeriesIds = shallowRef<FilteredSeriesIds>({});

function initFocusAndFiltered() {
  focusedGroupIndex.value = -1;
  focusedSeriesAxisId.value = null;
  focusedSeriesId.value = null;
  filteredSeriesIds.value = {};
}

watch(
  () => [props.demoObject, props.active] as const,
  ([nextDemoObject, nextActive], [previousDemoObject, previousActive]) => {
    if (nextDemoObject !== previousDemoObject) {
      mochartDemoConfig.value = buildMochartDemoConfig(nextDemoObject.config);
      initFocusAndFiltered();
      playing.value = false;
      data.value = nextDemoObject.data;
      dataCount.value = data.value.length;
      currentDataCount.value = dataCount.value;
      dataProviders.value = getDataProvidersForDataCount(mochartDemoConfig.value.mochartConfig, data.value, chartRows.value * chartCols.value, currentDataCount.value);
      focusedGroupIndices.value = dataProviders.value.map(() => -1);
    }
    if (nextActive !== previousActive) {
      onStopClick();
    }
  }
);

function onRateChange(nextRate: number) {
  rate.value = nextRate;
}

function onRowsChange(nextChartRows: number) {
  chartRows.value = nextChartRows;
  currentDataCount.value = dataCount.value;
  dataProviders.value = getDataProvidersForDataCount(mochartDemoConfig.value.mochartConfig, data.value, chartRows.value * chartCols.value, currentDataCount.value);
  focusedGroupIndices.value = getFocusedGroupIndices(dataProviders.value);
}

function onColsChange(nextChartCols: number) {
  chartCols.value = nextChartCols;
  currentDataCount.value = dataCount.value;
  dataProviders.value = getDataProvidersForDataCount(mochartDemoConfig.value.mochartConfig, data.value, chartRows.value * chartCols.value, currentDataCount.value);
  focusedGroupIndices.value = getFocusedGroupIndices(dataProviders.value);
}

function onStepBackwardClick() {
  currentDataCount.value = dataCount.value + (currentDataCount.value - 1) % dataCount.value;
  dataProviders.value = getDataProvidersForDataCount(mochartDemoConfig.value.mochartConfig, data.value, chartRows.value * chartCols.value, currentDataCount.value);
  focusedGroupIndices.value = getFocusedGroupIndices(dataProviders.value);
}

function onStepForwardClick() {
  currentDataCount.value = (currentDataCount.value + 1) % dataCount.value;
  dataProviders.value = getDataProvidersForDataCount(mochartDemoConfig.value.mochartConfig, data.value, chartRows.value * chartCols.value, currentDataCount.value);
  focusedGroupIndices.value = getFocusedGroupIndices(dataProviders.value);
}

function getFocusedGroupIndices(nextDataProviders: ChartDataProviderLike[]): number[] {
  const { mochartConfig } = mochartDemoConfig.value;
  if (focusedGroupIndex.value >= 0) {
    const groupValue = data.value[focusedGroupIndex.value][mochartConfig.groupAxisConfig.property ?? ''];
    return getFocusedGroupIndicesForValue(nextDataProviders, groupValue);
  }
  else {
    return nextDataProviders.map(() => -1);
  }
}

function getFocusedGroupIndicesForValue(nextDataProviders: ChartDataProviderLike[], groupValue: unknown): number[] {
  let count, i;
  return nextDataProviders.map(dataProvider => {
    let chartGroupIndex = -1;
    const groupValues = dataProvider.getGroupValues();
    count = groupValues.length;
    for (i = 0; i < count; i++) {
      if (groupValues[i] === groupValue) {
        chartGroupIndex = i;
        break;
      }
    }
    return chartGroupIndex;
  });
}

function onPlayBackwardClick() {
  playing.value = true;
  intervalId = setInterval(onStepBackwardClick, rate.value);
}

function onPlayForwardClick() {
  playing.value = true;
  intervalId = setInterval(onStepForwardClick, rate.value);
}

function onStopClick() {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
  intervalId = null;
  playing.value = false;
}

onBeforeUnmount(() => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
});

function onChartFocus(chartIndex: number, focusData: { focusedSeriesAxisId?: string | null; focusedSeriesId?: string | null; focusedGroupIndex?: number }) {
  const { focusedSeriesAxisId: seriesAxisId, focusedSeriesId: seriesId } = focusData;
  let groupIndex = focusData.focusedGroupIndex;
  const { mochartConfig } = mochartDemoConfig.value;
  let nextFocusedGroupIndices = focusedGroupIndices.value;
  if (groupIndex !== void 0 && groupIndex >= 0) {
    const groupValue = dataProviders.value[chartIndex].getGroupValues()[groupIndex];
    let i, count = data.value.length;
    for (i = 0; i < count; i++) {
      if (data.value[i][mochartConfig.groupAxisConfig.property ?? ''] === groupValue) {
        groupIndex = i;
        break;
      }
    }
    if (groupIndex !== focusedGroupIndex.value) {
      nextFocusedGroupIndices = getFocusedGroupIndicesForValue(dataProviders.value, groupValue);
    }
  }
  else if (focusedGroupIndex.value >= 0) {
    nextFocusedGroupIndices = dataProviders.value.map(() => -1);
  }
  if (groupIndex !== void 0) {
    focusedGroupIndex.value = groupIndex;
  }
  if (seriesAxisId !== void 0) {
    focusedSeriesAxisId.value = seriesAxisId;
  }
  if (seriesId !== void 0) {
    focusedSeriesId.value = seriesId;
  }
  focusedGroupIndices.value = nextFocusedGroupIndices;
}

// The chart owns filter toggling now and reports the whole map.
function onSeriesFilter({ filteredSeriesIds: nextFilteredSeriesIds }: { filteredSeriesIds: FilteredSeriesIds }) {
  filteredSeriesIds.value = { ...nextFilteredSeriesIds };
}

// Measured size of the charts grid.
const { elementRef: gridRef, width: gridWidth, height: gridHeight } = useElementSize();

const chartWidth = computed(() => Math.floor((gridWidth.value - scrollWidthOffset) / chartCols.value));
const chartHeight = computed(() => Math.floor(gridHeight.value / chartRows.value));
</script>

<template>
  <div :class="'mochart-demo-tab-container col chart' + (props.active ? ' active' : '')">
    <div ref="gridRef" class="multi-charts-sizer">
      <div v-if="gridWidth > 0" class="multi-charts">
        <div v-for="(dataProvider, i) in dataProviders" :key="i" class="multi-mochart-chart">
          <Chart :mochart-config="mochartDemoConfig.mochartConfig" :data-provider="dataProvider"
                 :width="chartWidth" :height="chartHeight"
                 :on-series-filter="onSeriesFilter" :on-focus="(focusData: any) => onChartFocus(i, focusData)" />
        </div>
      </div>
    </div>
    <ChartsControls :playing="playing" :on-rows-change="onRowsChange" :on-cols-change="onColsChange"
                    :on-step-backward-click="onStepBackwardClick" :on-step-forward-click="onStepForwardClick"
                    :on-play-backward-click="onPlayBackwardClick" :on-play-forward-click="onPlayForwardClick"
                    :on-stop-click="onStopClick" :on-rate-change="onRateChange" />
  </div>
</template>
