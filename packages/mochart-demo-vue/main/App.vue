<script setup lang="ts">
import { computed, watchEffect } from 'vue';

import { getPath, navigate } from './router';

import demoData from '@mochart/demo-data';

import DemoSingle from '../src/components/single/DemoSingle.vue';
import DemoMulti from '../src/components/multi/DemoMulti.vue';
import DemoRandom from '../src/components/random/DemoRandom.vue';
import DemoTransition from '../src/components/transition/DemoTransition.vue';
import DemoRotation from '../src/components/rotation/DemoRotation.vue';

import type { DemoMode } from '../src/types';

interface Route {
  redirect?: string;
  notFound?: string;
  mode?: string;
  demoId?: string;
  randomId?: string;
}

const { demoIds, demoObjectMap } = demoData;
const initialDemoId = demoIds[0];

// Same routes as the react demo (react-router 7), resolved by hand.
const route = computed((): Route => {
  const path = getPath();
  const segments = path.split('/').filter(segment => segment.length > 0);
  if (segments.length === 0) {
    return { redirect: '/single/demos' };
  }
  const [mode, demoId, randomId] = segments;
  if ((mode === 'single' || mode === 'multi' || mode === 'random') && segments.length === 1) {
    return { redirect: `/${mode}/demos` };
  }
  if ((mode === 'single' || mode === 'multi') && segments.length === 2) {
    return { mode, demoId };
  }
  if (mode === 'random' && segments.length === 2) {
    return { redirect: `/random/${demoId}/0` };
  }
  if (mode === 'random' && segments.length === 3) {
    return { mode, demoId, randomId };
  }
  if ((mode === 'transition' || mode === 'rotation') && segments.length === 1) {
    return { mode };
  }
  return { notFound: path };
});

watchEffect(() => {
  if (route.value.redirect !== void 0) {
    navigate(route.value.redirect, { replace: true });
  }
});

function getBasePathForMode(demoMode: string): string {
  return '/' + demoMode;
}

function onDemoModeChanged(nextDemoMode: DemoMode, nextDemoId?: string) {
  if (nextDemoMode === 'transition' || nextDemoMode === 'rotation') {
    navigate(getBasePathForMode(nextDemoMode));
  }
  else {
    navigate(`${getBasePathForMode(nextDemoMode)}/${nextDemoId !== void 0 ? nextDemoId : initialDemoId}`);
  }
}

function makeOnDemoChanged(demoMode: string) {
  return (nextDemoId: string) => {
    navigate(`${getBasePathForMode(demoMode)}/${nextDemoId}`);
  };
}

const demoId = computed(() => route.value.demoId !== void 0 ? route.value.demoId : initialDemoId);
const isKnownDemo = computed(() => demoId.value === 'demos' || demoObjectMap[demoId.value] !== void 0);
const randomId = computed(() => Number(route.value.randomId));
const isValidRandomId = computed(() => randomId.value > Number.MIN_SAFE_INTEGER && randomId.value < Number.MAX_SAFE_INTEGER);

function incrementRandomId() {
  navigate(`${getBasePathForMode('random')}/${demoId.value}/${Math.floor(randomId.value) + 1}`);
}

function decrementRandomId() {
  navigate(`${getBasePathForMode('random')}/${demoId.value}/${Math.floor(randomId.value) - 1}`);
}
</script>

<template>
  <template v-if="route.redirect !== void 0">
    <!-- redirecting -->
  </template>
  <div v-else-if="route.notFound !== void 0">No route found matching {{ route.notFound }}</div>
  <!-- The transition/rotation demos have no navigation of their own, so give
       them a way back to the main demo gallery. -->
  <div v-else-if="route.mode === 'transition' || route.mode === 'rotation'"
       style="height: 100%; display: flex; flex-direction: column;">
    <div style="padding: 14px 18px 0;">
      <button type="button" class="btn btn-secondary btn-sm" @click="navigate('/single/demos')">&larr; Back to demos</button>
    </div>
    <div style="flex: 1; min-height: 0;">
      <DemoTransition v-if="route.mode === 'transition'" />
      <DemoRotation v-else />
    </div>
  </div>
  <div v-else-if="!isKnownDemo">No demo found for id: {{ demoId }}</div>
  <DemoSingle v-else-if="route.mode === 'single'"
              :demo-data="demoData" :initial-demo-id="demoId" demo-mode="single"
              :on-demo-mode-changed="onDemoModeChanged" :on-demo-changed="makeOnDemoChanged('single')" />
  <DemoMulti v-else-if="route.mode === 'multi'"
             :demo-data="demoData" :initial-demo-id="demoId" demo-mode="multi"
             :on-demo-mode-changed="onDemoModeChanged" :on-demo-changed="makeOnDemoChanged('multi')" />
  <template v-else-if="route.mode === 'random'">
    <div v-if="!isValidRandomId">Bad random id: {{ route.randomId }}</div>
    <DemoRandom v-else
                :demo-data="demoData" :initial-demo-id="demoId" demo-mode="random"
                :on-demo-mode-changed="onDemoModeChanged" :on-demo-changed="makeOnDemoChanged('random')"
                :random-id="randomId" :increment-random-id="incrementRandomId" :decrement-random-id="decrementRandomId" />
  </template>
</template>
