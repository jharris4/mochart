<script setup lang="ts">
import { ref } from 'vue';

import ButtonWithTooltip from '../misc/ButtonWithTooltip.vue';
import Icon from '../misc/Icon.vue';

interface Props {
  playing: boolean;
  onRowsChange: (rows: number) => void;
  onColsChange: (cols: number) => void;
  onStepBackwardClick: () => void;
  onStepForwardClick: () => void;
  onPlayBackwardClick: () => void;
  onPlayForwardClick: () => void;
  onStopClick: () => void;
  onRateChange: (rate: number) => void;
}

const defaultChartRows = 2;
const defaultChartCols = 2;
const defaultRate = 2000;

const props = defineProps<Props>();

const rateText = ref('' + defaultRate);
const rowsText = ref('' + defaultChartRows);
const colsText = ref('' + defaultChartCols);

// Input values arrive as strings and are coerced to numbers in place, so the
// working variable is intentionally loose (matching the original demo).
function rowsChanged(event: Event) {
  let rows: any = (event.currentTarget as HTMLInputElement).value;
  if (!isNaN(parseFloat(rows)) && isFinite(rows)) {
    rows = +rows;
    if (rows >= 1 && rows <= 4) {
      props.onRowsChange(rows);
    }
  }
  rowsText.value = rows;
}

function colsChanged(event: Event) {
  let cols: any = (event.currentTarget as HTMLInputElement).value;
  if (!isNaN(parseFloat(cols)) && isFinite(cols)) {
    cols = +cols;
    if (cols >= 1 && cols <= 4) {
      props.onColsChange(cols);
    }
  }
  colsText.value = cols;
}

function rateChanged(event: Event) {
  let rate: any = (event.currentTarget as HTMLInputElement).value;
  if (!isNaN(parseFloat(rate)) && isFinite(rate)) {
    rate = +rate;
    if (rate >= 5 && rate <= 60000) {
      props.onRateChange(rate);
    }
  }
  rateText.value = rate;
}
</script>

<template>
  <div class="multi-controls">
    <form class="form-inline">
      <div class="form-group">
        <label class="form-control-plaintext" for="grid-rows">Grid:</label>
        <input id="grid-rows" :disabled="props.playing" type="number" min="1" max="4" class="form-control" :value="rowsText"
               aria-label="Grid rows" @input="rowsChanged" />
        <span class="form-control-plaintext">&times;</span>
        <input id="grid-cols" :disabled="props.playing" type="number" min="1" max="4" class="form-control" :value="colsText"
               aria-label="Grid columns" @input="colsChanged" />
      </div>
      <div class="form-group">
        <div class="btn-toolbar" role="toolbar">
          <div class="btn-group">
            <ButtonWithTooltip id="step-back" :disabled="props.playing" tooltip-text="Step all charts one dataset backward" tooltip-placement="top-start"
                               :on-click="props.onStepBackwardClick" aria-label="Step Backward">
              <Icon size="lg" :fixed-width="true" name="backward-step" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="step-forward" :disabled="props.playing" tooltip-text="Step all charts one dataset forward" tooltip-placement="top-start"
                               :on-click="props.onStepForwardClick" aria-label="Step Forward">
              <Icon size="lg" :fixed-width="true" name="forward-step" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="play-backward" :disabled="props.playing" tooltip-text="Play backward through the datasets at the interval" tooltip-placement="top-start"
                               :on-click="props.onPlayBackwardClick" aria-label="Play Backward">
              <Icon size="lg" :fixed-width="true" name="play" flip="horizontal" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="play-forward" :disabled="props.playing" tooltip-text="Play forward through the datasets at the interval" tooltip-placement="top-start"
                               :on-click="props.onPlayForwardClick" aria-label="Play Forward">
              <Icon size="lg" :fixed-width="true" name="play" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="stop" :disabled="!props.playing" tooltip-text="Stop playback" tooltip-placement="top-start"
                               :on-click="props.onStopClick" aria-label="Stop">
              <Icon size="lg" :fixed-width="true" name="stop" />
            </ButtonWithTooltip>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-control-plaintext" for="multi-rate">Interval (ms):</label>
        <input id="multi-rate" :disabled="props.playing" type="number" min="5" max="60000" step="100" class="form-control" :value="rateText"
               aria-label="Playback interval in milliseconds" @input="rateChanged" />
      </div>
    </form>
  </div>
</template>
