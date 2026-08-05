<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue';

import { NONE, getDataErrors } from '@mochart/core';
import type { MochartConfig, DataProvider } from '@mochart/core';

import RandomChartTab from './RandomChartTab.vue';
import RandomConfigTab from './RandomConfigTab.vue';
import RandomDataTab from './RandomDataTab.vue';
import ErrorTab from '../misc/ErrorTab.vue';

import { consumeShareState, demoText, generateDemoDataProvider, neutralizeRandomReuse, restoreSharedRandomConfig } from '@mochart/demo-common';

import type { MochartDemoConfig, RandomConfigWithValid, DemoDataProvider, CategoryValue } from '../../types';

interface EventKeys {
  eventKeyChart: number;
  eventKeyConfig: number;
  eventKeyData: number;
}

interface Props {
  mochartDemoConfig: MochartDemoConfig;
  initialRandomConfig: RandomConfigWithValid;
  /** The demo's chart-type generator id, if it has one (demos.json). */
  generator?: string;
  activeKey: number;
  eventKeys: EventKeys;
  randomId: number;
  incrementRandomId: () => void;
  decrementRandomId: () => void;
}

const props = defineProps<Props>();

const { eventKeyChart, eventKeyConfig, eventKeyData } = props.eventKeys;

// A share link restores the generator config, reuse toggle and interval (the
// step comes from the randomId in the URL path). Consume it once at mount.
const sharedState = consumeShareState('random');
const initialShared = sharedState && sharedState.mode === 'random' ? sharedState : null;
const initialRate = initialShared ? initialShared.interval : undefined;

const randomConfig = shallowRef<RandomConfigWithValid>(
  initialShared ? restoreSharedRandomConfig(initialShared.randomConfig, props.generator) : props.initialRandomConfig);
const dataProvider = shallowRef<DemoDataProvider | null>(null);
const data = shallowRef<unknown>(null);
// Reuse defaults on to match the generator's historical behavior (the
// config's reuse settings were always applied before the toggle worked).
const applyReuse = ref(initialShared ? initialShared.applyReuse : true);

function toggleApplyReuse() {
  applyReuse.value = !applyReuse.value;
  updateDataProvider();
}

function getData(mochartConfig: MochartConfig, categoryValues: CategoryValue[], seriesValues: Record<string, (number | undefined)[]>) {
  const { categoryAxis: categoryAxisConfig } = mochartConfig;
  const categoryProperty = categoryAxisConfig.property ?? '';
  const nextData: Record<string, any>[] = categoryValues.map(g => ({ [categoryProperty]: g }));
  const categoryCount = categoryValues.length;
  if (categoryAxisConfig.displayProperty !== NONE) {
    const displayProperty = categoryAxisConfig.displayProperty;
    for (let i = 0; i < categoryCount; i++) {
      nextData[i][displayProperty] = categoryValues[i];
    }
  }
  const seriesProperties = Object.keys(seriesValues);
  for (const seriesProperty of seriesProperties) {
    const seriesPropertyValues = seriesValues[seriesProperty];
    for (let i = 0; i < categoryCount; i++) {
      nextData[i][seriesProperty] = seriesPropertyValues[i];
    }
  }
  return nextData;
}

function updateDataProvider(forcedRandomConfig?: RandomConfigWithValid) {
  const { mochartConfig } = props.mochartDemoConfig;
  const nextRandomConfig = forcedRandomConfig !== undefined ? forcedRandomConfig : randomConfig.value;

  if (nextRandomConfig.valid) {
    // with reuse off the generator gets a config whose reuse settings are
    // neutralized, so every dataset is generated independently
    const generatorConfig = applyReuse.value ? nextRandomConfig : neutralizeRandomReuse(nextRandomConfig);
    const nextDataProvider = generateDemoDataProvider(props.generator, mochartConfig, generatorConfig, props.randomId);
    const { categoryValues = [], seriesValues = {} } = nextDataProvider;
    const nextData = getData(mochartConfig, categoryValues, seriesValues);
    const dataErrors = getDataErrors(mochartConfig, nextDataProvider as unknown as DataProvider);
    if (dataErrors.length > 0) {
      console.error('data errors: ', dataErrors);
      console.warn('category values: ', categoryValues);
      console.warn('series values: ', seriesValues);
      dataProvider.value = {
        getCategoryValues: () => [],
        getError: () => demoText.errors.creatingDataProvider
      };
      data.value = { error: demoText.errors.creatingDataProvider };
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
      getCategoryValues: () => [],
      getError: () => demoText.errors.invalidRandomConfig
    };
    data.value = {
      error: demoText.errors.invalidRandomConfig
    };
    randomConfig.value = nextRandomConfig;
  }
}

updateDataProvider(randomConfig.value);

watch(
  () => [props.initialRandomConfig, props.mochartDemoConfig, props.randomId] as const,
  ([nextInitialRandomConfig, nextMochartDemoConfig, nextRandomId],
   [previousInitialRandomConfig, previousMochartDemoConfig, previousRandomId]) => {
    if (nextInitialRandomConfig !== previousInitialRandomConfig ||
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

// Regenerate immediately so Apply/Reset on the Random Config tab visibly
// take effect instead of waiting for the next randomize.
function onUpdateConfig(nextRandomConfig: RandomConfigWithValid) {
  updateDataProvider(nextRandomConfig);
}

function onResetConfig() {
  updateDataProvider(props.initialRandomConfig);
}
</script>

<template>
  <div class="mochart-demo-content">
    <ErrorTab :active="props.activeKey === eventKeyChart">
      <RandomChartTab :active="props.activeKey === eventKeyChart" :mochart-config="props.mochartDemoConfig.mochartConfig" :data-provider="dataProvider"
                      :random-config="randomConfig" :initial-rate="initialRate"
                      :on-randomize-back="onRandomizeBack" :on-randomize-next="onRandomizeNext"
                      :apply-reuse="applyReuse" :toggle-apply-reuse="toggleApplyReuse" />
    </ErrorTab>
    <ErrorTab :active="props.activeKey === eventKeyConfig">
      <RandomConfigTab :active="props.activeKey === eventKeyConfig" :random-config="randomConfig" :generator="props.generator" :on-update="onUpdateConfig" :on-reset="onResetConfig" />
    </ErrorTab>
    <ErrorTab :active="props.activeKey === eventKeyData">
      <RandomDataTab :active="props.activeKey === eventKeyData" :data="data" />
    </ErrorTab>
  </div>
</template>
