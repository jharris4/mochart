<script setup lang="ts">
import { ref, watch } from 'vue';

import { Chart } from 'mochart-vue';
import type { MochartConfig } from 'mochart';

import ButtonWithTooltip from '../misc/ButtonWithTooltip.vue';
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
    <div class="transition-chart-sizer">
      <Chart style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;"
             :mochart-config="props.mochartConfig" :data-provider="props.dataProviders[dataProviderIndex]" />
    </div>
    <div class="transition-controls">
      <form class="form-inline">
        <div class="form-group">
          <div class="btn-toolbar" role="toolbar">
            <div class="btn-group">
              <ButtonWithTooltip id="transition-back" label="Back" tooltip-text="Transition to the previous dataset" tooltip-placement="top-start"
                                 :on-click="onStepBack" aria-label="Step Backward">
                <Icon size="lg" :fixed-width="true" name="backward-step" />
              </ButtonWithTooltip>
              <ButtonWithTooltip id="transition-forward" label="Next" tooltip-text="Transition to the next dataset" tooltip-placement="top-start"
                                 :on-click="onStepForward" aria-label="Step Forward">
                <Icon size="lg" :fixed-width="true" name="forward-step" />
              </ButtonWithTooltip>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
