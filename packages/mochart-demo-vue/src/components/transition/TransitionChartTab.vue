<script setup lang="ts">
import { ref, watch } from 'vue';

import { Chart } from '@mochart/vue';
import type { MochartConfig } from '@mochart/core';

import { demoText } from '@mochart/demo-common';

import ButtonWithTooltip from '../misc/ButtonWithTooltip.vue';
import ExportButtons from '../misc/ExportButtons.vue';
import Icon from '../misc/Icon.vue';

import type { ChartDataProviderLike } from '../../types';

interface Props {
  active?: boolean;
  mochartConfig: MochartConfig;
  dataProviders: ChartDataProviderLike[];
}

const props = withDefaults(defineProps<Props>(), {
  active: false
});

const dataProviderIndex = ref(0);
const chartSizerElement = ref<HTMLDivElement | null>(null);

watch(() => [props.mochartConfig, props.dataProviders] as const, () => {
  dataProviderIndex.value = 0;
});

function onStepBack() {
  if (props.dataProviders.length > 1) {
    if (dataProviderIndex.value === 0) {
      dataProviderIndex.value = props.dataProviders.length - 1;
    }
    else {
      dataProviderIndex.value--;
    }
  }
}

function onStepForward() {
  if (props.dataProviders.length > 1) {
    if (dataProviderIndex.value === props.dataProviders.length - 1) {
      dataProviderIndex.value = 0;
    }
    else {
      dataProviderIndex.value++;
    }
  }
}
</script>

<template>
  <div :class="'mochart-demo-tab-container col chart' + (props.active ? ' active' : '')">
    <div class="transition-chart-sizer" ref="chartSizerElement">
      <Chart style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;"
             :mochart-config="props.mochartConfig" :data-provider="props.dataProviders[dataProviderIndex]" />
    </div>
    <div class="transition-controls">
      <form class="form-inline">
        <div class="form-group">
          <div class="btn-toolbar" role="toolbar">
            <div class="btn-group">
              <ButtonWithTooltip id="transition-back" :label="demoText.transitionChartTab.back.label" :tooltip-text="demoText.transitionChartTab.back.tooltip" tooltip-placement="top-start"
                                 :on-click="onStepBack" :aria-label="demoText.transitionChartTab.back.aria">
                <Icon size="lg" :fixed-width="true" name="backward-step" />
              </ButtonWithTooltip>
              <ButtonWithTooltip id="transition-forward" :label="demoText.transitionChartTab.next.label" :tooltip-text="demoText.transitionChartTab.next.tooltip" tooltip-placement="top-start"
                                 :on-click="onStepForward" :aria-label="demoText.transitionChartTab.next.aria">
                <Icon size="lg" :fixed-width="true" name="forward-step" />
              </ButtonWithTooltip>
            </div>
            <ExportButtons id-prefix="transition" :get-container="() => chartSizerElement" />
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
