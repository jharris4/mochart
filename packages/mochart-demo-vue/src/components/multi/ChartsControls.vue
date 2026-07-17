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
        <input :disabled="props.playing" type="text" class="form-control" :value="rowsText" maxlength="3" size="3" @input="rowsChanged" />
        <span class="form-control-plaintext">x</span>
        <input :disabled="props.playing" type="text" class="form-control" :value="colsText" maxlength="3" size="3" @input="colsChanged" />
      </div>
      <div class="form-group">
        <div class="btn-toolbar" role="toolbar">
          <div class="btn-group">
            <ButtonWithTooltip id="step-back" :disabled="props.playing" tooltip-text="Step Backward" tooltip-placement="top-start"
                               :on-click="props.onStepBackwardClick" aria-label="Step Backward">
              <Icon size="lg" :fixed-width="true" name="step-backward" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="step-forward" :disabled="props.playing" tooltip-text="Step Forward" tooltip-placement="top-start"
                               :on-click="props.onStepForwardClick" aria-label="Step Forward">
              <Icon size="lg" :fixed-width="true" name="step-forward" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="play-backward" :disabled="props.playing" tooltip-text="Play Backward" tooltip-placement="top-start"
                               :on-click="props.onPlayBackwardClick" aria-label="Play Backward">
              <Icon size="lg" :fixed-width="true" name="play" flip="horizontal" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="play-forward" :disabled="props.playing" tooltip-text="Play Forward" tooltip-placement="top-start"
                               :on-click="props.onPlayForwardClick" aria-label="Play Forward">
              <Icon size="lg" :fixed-width="true" name="play" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="stop" :disabled="!props.playing" tooltip-text="Stop" tooltip-placement="top-start"
                               :on-click="props.onStopClick" aria-label="Stop">
              <Icon size="lg" :fixed-width="true" name="stop" />
            </ButtonWithTooltip>
          </div>
        </div>
      </div>
      <div class="form-group">
        <input :disabled="props.playing" type="text" class="form-control" :value="rateText" maxlength="4" size="4" @input="rateChanged" />
      </div>
    </form>
  </div>
</template>
