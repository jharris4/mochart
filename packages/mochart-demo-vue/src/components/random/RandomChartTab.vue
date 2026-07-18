<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

import { Chart } from '@mochart/vue';
import type { MochartConfig } from '@mochart/core';

import ButtonWithTooltip from '../misc/ButtonWithTooltip.vue';
import ExportButtons from '../misc/ExportButtons.vue';
import Icon from '../misc/Icon.vue';

import type { DemoDataProvider } from '../../types';

interface Props {
  active?: boolean;
  mochartConfig: MochartConfig;
  dataProvider: DemoDataProvider | null;
  onRandomizeBack: () => void;
  onRandomizeNext: () => void;
  applyReuse: boolean;
  toggleApplyReuse: () => void;
}

const defaultRate = 2000;

const props = withDefaults(defineProps<Props>(), {
  active: false
});

let intervalId: ReturnType<typeof setInterval> | null = null;

const playing = ref(false);
const chartSizerElement = ref<HTMLDivElement | null>(null);
const rate = ref(defaultRate);
const rateText = ref('' + defaultRate);

watch(() => props.active, () => {
  onStopClick();
});

function onPlayClick() {
  playing.value = true;
  intervalId = setInterval(props.onRandomizeNext, rate.value);
}

function onStopClick() {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
  intervalId = null;
  playing.value = false;
}

function rateChanged(event: Event) {
  let nextRateText: any = (event.currentTarget as HTMLInputElement).value;
  if (!isNaN(parseFloat(nextRateText)) && isFinite(nextRateText)) {
    nextRateText = +nextRateText;
    if (nextRateText >= 5 && nextRateText <= 60000) {
      rate.value = nextRateText;
    }
  }
  rateText.value = nextRateText;
}

onBeforeUnmount(() => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
});
</script>

<template>
  <div :class="'mochart-demo-tab-container col chart' + (props.active ? ' active' : '')">
    <div class="random-chart-sizer" ref="chartSizerElement">
      <Chart style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;"
             :mochart-config="props.mochartConfig" :data-provider="props.dataProvider" />
    </div>
    <div class="random-controls">
      <form class="form-inline">
        <div class="form-group">
          <div class="btn-toolbar" role="toolbar">
            <div class="btn-group">
              <ButtonWithTooltip id="randomize-back" :disabled="playing" label="Back"
                                 tooltip-text="Go back to the previous random dataset" tooltip-placement="top-start"
                                 :on-click="props.onRandomizeBack" aria-label="Randomize Back">
                <Icon size="lg" :fixed-width="true" name="dice" flip="horizontal" />
              </ButtonWithTooltip>
              <ButtonWithTooltip id="randomize-next" :disabled="playing" label="Randomize"
                                 tooltip-text="Generate the next random dataset" tooltip-placement="top-start"
                                 :on-click="props.onRandomizeNext" aria-label="Randomize Next">
                <Icon size="lg" :fixed-width="true" name="dice" />
              </ButtonWithTooltip>
              <ButtonWithTooltip id="play" :disabled="playing" tooltip-text="Keep generating random datasets at the interval" tooltip-placement="top-start"
                                 :on-click="onPlayClick" aria-label="Play Randomize">
                <Icon size="lg" :fixed-width="true" name="play" />
              </ButtonWithTooltip>
              <ButtonWithTooltip id="stop" :disabled="!playing" tooltip-text="Stop generating" tooltip-placement="top-start"
                                 :on-click="onStopClick" aria-label="Stop">
                <Icon size="lg" :fixed-width="true" name="stop" />
              </ButtonWithTooltip>
            </div>
            <div class="form-group">
              <label class="form-control-plaintext" for="random-rate">Interval (ms):</label>
              <input id="random-rate" :disabled="playing" type="number" min="5" max="60000" step="100" class="form-control" :value="rateText"
                     aria-label="Randomize interval in milliseconds" @input="rateChanged" />
            </div>
          </div>
          <div class="btn-toolbar ml-2" role="toolbar">
            <ExportButtons id-prefix="random" :get-container="() => chartSizerElement" />
            <div class="btn-group">
              <ButtonWithTooltip id="reuse" :disabled="playing" label="Reuse" :pressed="props.applyReuse"
                                 tooltip-text="Keep part of the data the same between randomizations (the config's reuse settings), so transitions animate with continuity — off generates fully independent datasets" tooltip-placement="top-start"
                                 :on-click="props.toggleApplyReuse" aria-label="Reuse">
                <Icon size="lg" :fixed-width="true" name="recycle" />
              </ButtonWithTooltip>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
