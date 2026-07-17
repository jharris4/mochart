<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue';

import { NONE, getDataErrors } from 'mochart';
import type { MochartConfig, DataProvider } from 'mochart';

import { generateChartDataProvider } from './RandomGenerator';

import DemosTab from '../demos/DemosTab.vue';
import RandomChartTab from './RandomChartTab.vue';
import RandomConfigTab from './RandomConfigTab.vue';
import RandomDataTab from './RandomDataTab.vue';
import ErrorTab from '../misc/ErrorTab.vue';

import type { DemoData, DemoMode, MochartDemoConfig, RandomConfigWithValid, DemoDataProvider, GroupValue, OnDemoModeChanged, OnDemoChanged } from '../../types';

interface EventKeys {
  eventKeyChart: number;
  eventKeyDemo: number;
  eventKeyConfig: number;
  eventKeyData: number;
}

interface Props {
  demoData: DemoData;
  mochartDemoConfig: MochartDemoConfig;
  initialRandomConfig: RandomConfigWithValid;
  demoMode: DemoMode;
  initialDemoId: string;
  demoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChange: OnDemoChanged;
  activeKey: number;
  eventKeys: EventKeys;
  randomId: number;
  incrementRandomId: () => void;
  decrementRandomId: () => void;
}

const props = defineProps<Props>();

const { eventKeyChart, eventKeyDemo, eventKeyConfig, eventKeyData } = props.eventKeys;

const randomConfig = shallowRef<RandomConfigWithValid>(props.initialRandomConfig);
const dataProvider = shallowRef<DemoDataProvider | null>(null);
const data = shallowRef<unknown>(null);
const applyReuse = ref(false);

function toggleApplyReuse() {
  applyReuse.value = !applyReuse.value;
}

function getData(mochartConfig: MochartConfig, groupValues: GroupValue[], seriesValues: Record<string, (number | undefined)[]>) {
  const { groupAxisConfig } = mochartConfig;
  const groupProperty = groupAxisConfig.property ?? '';
  const nextData: Record<string, any>[] = groupValues.map(g => ({ [groupProperty]: g }));
  const groupCount = groupValues.length;
  if (groupAxisConfig.displayProperty !== NONE) {
    const displayProperty = groupAxisConfig.displayProperty;
    for (let i = 0; i < groupCount; i++) {
      nextData[i][displayProperty] = groupValues[i];
    }
  }
  const seriesProperties = Object.keys(seriesValues);
  for (const seriesProperty of seriesProperties) {
    const seriesPropertyValues = seriesValues[seriesProperty];
    for (let i = 0; i < groupCount; i++) {
      nextData[i][seriesProperty] = seriesPropertyValues[i];
    }
  }
  return nextData;
}

function updateDataProvider(forcedRandomConfig?: RandomConfigWithValid) {
  const { mochartConfig } = props.mochartDemoConfig;
  const nextRandomConfig = forcedRandomConfig !== void 0 ? forcedRandomConfig : randomConfig.value;

  if (nextRandomConfig.valid) {
    const nextDataProvider = generateChartDataProvider(mochartConfig, nextRandomConfig, props.randomId);
    const { groupValues = [], seriesValues = {} } = nextDataProvider;
    const nextData = getData(mochartConfig, groupValues, seriesValues);
    const dataErrors = getDataErrors(mochartConfig, nextDataProvider as unknown as DataProvider);
    if (dataErrors.length > 0) {
      console.error('data errors: ', dataErrors);
      console.warn('group values: ', groupValues);
      console.warn('series values: ', seriesValues);
      dataProvider.value = {
        getGroupValues: () => [],
        getError: () => 'Error creating DataProvider'
      };
      data.value = { error: 'Error creating DataProvider' };
      randomConfig.value = nextRandomConfig;
    }
    else {
      dataProvider.value = nextDataProvider;
      data.value = nextData;
      randomConfig.value = nextRandomConfig;
    }
  }
  else {
    dataProvider.value = {
      getGroupValues: () => [],
      getError: () => 'Invalid Random Config'
    };
    data.value = {
      error: 'Invalid Random Config'
    };
    randomConfig.value = nextRandomConfig;
  }
}

if (props.initialDemoId !== 'demos') {
  updateDataProvider(props.initialRandomConfig);
}

watch(
  () => [props.initialDemoId, props.initialRandomConfig, props.mochartDemoConfig, props.randomId] as const,
  ([nextInitialDemoId, nextInitialRandomConfig, nextMochartDemoConfig, nextRandomId],
   [previousInitialDemoId, previousInitialRandomConfig, previousMochartDemoConfig, previousRandomId]) => {
    if (nextInitialDemoId !== previousInitialDemoId || nextInitialRandomConfig !== previousInitialRandomConfig ||
        nextMochartDemoConfig !== previousMochartDemoConfig) {
      updateDataProvider(nextInitialRandomConfig);
    }
    else if (nextRandomId !== previousRandomId) {
      updateDataProvider();
    }
  }
);

function onRandomizeBack() {
  props.decrementRandomId();
}

function onRandomizeNext() {
  props.incrementRandomId();
}

function onUpdateConfig(nextRandomConfig: RandomConfigWithValid) {
  randomConfig.value = nextRandomConfig;
}

function onResetConfig() {
  randomConfig.value = props.initialRandomConfig;
}
</script>

<template>
  <div class="mochart-demo-content">
    <ErrorTab :active="props.activeKey === eventKeyDemo">
      <DemosTab :active="props.activeKey === eventKeyDemo" :demo-data="props.demoData" :demo-mode="props.demoMode" :demo-id="props.demoId"
                :on-demo-mode-changed="props.onDemoModeChanged" :on-demo-change="props.onDemoChange" />
    </ErrorTab>
    <ErrorTab :active="props.activeKey === eventKeyChart">
      <RandomChartTab :active="props.activeKey === eventKeyChart" :mochart-config="props.mochartDemoConfig.mochartConfig" :data-provider="dataProvider"
                      :on-randomize-back="onRandomizeBack" :on-randomize-next="onRandomizeNext"
                      :apply-reuse="applyReuse" :toggle-apply-reuse="toggleApplyReuse" />
    </ErrorTab>
    <ErrorTab :active="props.activeKey === eventKeyConfig">
      <RandomConfigTab :active="props.activeKey === eventKeyConfig" :random-config="randomConfig" :on-update="onUpdateConfig" :on-reset="onResetConfig" />
    </ErrorTab>
    <ErrorTab :active="props.activeKey === eventKeyData">
      <RandomDataTab :active="props.activeKey === eventKeyData" :data="data" />
    </ErrorTab>
  </div>
</template>
