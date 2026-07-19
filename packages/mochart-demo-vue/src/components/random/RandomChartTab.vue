<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

import { Chart } from '@mochart/vue';
import type { MochartConfig } from '@mochart/core';
import { exportPNG, exportSVG } from '@mochart/export';

import { demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import ButtonWithTooltip from '../misc/ButtonWithTooltip.vue';
import ExportShareMenu from '../misc/ExportShareMenu.vue';
import Icon from '../misc/Icon.vue';

import type { DemoDataProvider, RandomConfigWithValid } from '../../types';

interface Props {
  active?: boolean;
  mochartConfig: MochartConfig;
  dataProvider: DemoDataProvider | null;
  randomConfig: RandomConfigWithValid;
  initialRate?: number;
  onRandomizeBack: () => void;
  onRandomizeNext: () => void;
  applyReuse: boolean;
  toggleApplyReuse: () => void;
}

const defaultRate = 2000;

const props = withDefaults(defineProps<Props>(), {
  active: false,
  initialRate: void 0
});

let intervalId: ReturnType<typeof setInterval> | null = null;

const playing = ref(false);
const chartSizerElement = ref<HTMLDivElement | null>(null);
// A share link restores the interval; otherwise start on the default.
const rate = ref(props.initialRate ?? defaultRate);
const rateText = ref('' + (props.initialRate ?? defaultRate));

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

function onExportPng() {
  const container = chartSizerElement.value;
  if (container) {
    void exportPNG(container);
  }
}

function onExportSvg() {
  const container = chartSizerElement.value;
  if (container) {
    exportSVG(container);
  }
}

// Share captures the generator config, the reuse toggle and the interval; the
// step comes from the /random/:demoId/:randomId path already in the URL.
function getRandomShareState(): ShareState {
  return { mode: 'random', randomConfig: props.randomConfig, applyReuse: props.applyReuse, interval: rate.value };
}
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
              <ButtonWithTooltip id="randomize-back" :disabled="playing" :label="demoText.randomChartTab.back.label"
                                 :tooltip-text="demoText.randomChartTab.back.tooltip" tooltip-placement="top-start"
                                 :on-click="props.onRandomizeBack" :aria-label="demoText.randomChartTab.back.aria">
                <Icon size="lg" :fixed-width="true" name="dice" flip="horizontal" />
              </ButtonWithTooltip>
              <ButtonWithTooltip id="randomize-next" :disabled="playing" :label="demoText.randomChartTab.randomize.label"
                                 :tooltip-text="demoText.randomChartTab.randomize.tooltip" tooltip-placement="top-start"
                                 :on-click="props.onRandomizeNext" :aria-label="demoText.randomChartTab.randomize.aria">
                <Icon size="lg" :fixed-width="true" name="dice" />
              </ButtonWithTooltip>
              <ButtonWithTooltip id="play" :disabled="playing" :tooltip-text="demoText.randomChartTab.play.tooltip" tooltip-placement="top-start"
                                 :on-click="onPlayClick" :aria-label="demoText.randomChartTab.play.aria">
                <Icon size="lg" :fixed-width="true" name="play" />
              </ButtonWithTooltip>
              <ButtonWithTooltip id="stop" :disabled="!playing" :tooltip-text="demoText.randomChartTab.stop.tooltip" tooltip-placement="top-start"
                                 :on-click="onStopClick" :aria-label="demoText.randomChartTab.stop.aria">
                <Icon size="lg" :fixed-width="true" name="stop" />
              </ButtonWithTooltip>
            </div>
            <div class="form-group">
              <label class="form-control-plaintext" for="random-rate">{{ demoText.randomChartTab.intervalLabel }}</label>
              <input id="random-rate" :disabled="playing" type="number" min="5" max="60000" step="100" class="form-control" :value="rateText"
                     :aria-label="demoText.randomChartTab.intervalAria" @input="rateChanged" />
            </div>
          </div>
          <div class="btn-toolbar ml-2" role="toolbar">
            <div class="btn-group">
              <ButtonWithTooltip id="reuse" :disabled="playing" :label="demoText.randomChartTab.reuse.label" :pressed="props.applyReuse"
                                 :tooltip-text="demoText.randomChartTab.reuse.tooltip" tooltip-placement="top-start"
                                 :on-click="props.toggleApplyReuse" :aria-label="demoText.randomChartTab.reuse.aria">
                <Icon size="lg" :fixed-width="true" name="recycle" />
              </ButtonWithTooltip>
            </div>
            <ExportShareMenu id-prefix="random" :export-png="onExportPng" :export-svg="onExportSvg" :get-share-state="getRandomShareState" />
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
