<script lang="ts">
  import { untrack, onDestroy } from 'svelte';

  import { Chart } from 'mochart-svelte';
  import type { MochartConfig } from 'mochart';

  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import ExportButtons from '../misc/ExportButtons.svelte';
  import Icon from '../misc/Icon.svelte';

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

  type InputEvent = Event & { currentTarget: EventTarget & HTMLInputElement };

  const defaultRate = 2000;

  let {
    active = false,
    mochartConfig,
    dataProvider,
    onRandomizeBack,
    onRandomizeNext,
    applyReuse,
    toggleApplyReuse
  }: Props = $props();

  let intervalId: ReturnType<typeof setInterval> | null = null;

  let chartSizerElement = $state<HTMLDivElement | null>(null);

  let playing = $state(false);
  let rate = $state(defaultRate);
  let rateText = $state('' + defaultRate);

  let previousActive = active;
  $effect.pre(() => {
    const nextActive = active;
    untrack(() => {
      if (nextActive !== previousActive) {
        previousActive = nextActive;
        onStopClick();
      }
    });
  });

  function onPlayClick() {
    playing = true;
    intervalId = setInterval(onRandomizeNext, rate);
  }

  function onStopClick() {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    intervalId = null;
    playing = false;
  }

  function rateChanged(event: InputEvent) {
    let nextRateText: any = event.currentTarget.value;
    if (!isNaN(parseFloat(nextRateText)) && isFinite(nextRateText)) {
      nextRateText = +nextRateText;
      if (nextRateText >= 5 && nextRateText <= 60000) {
        rate = nextRateText;
      }
    }
    rateText = nextRateText;
  }

  onDestroy(() => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  });
</script>

<div class={"mochart-demo-tab-container col chart" + (active ? " active" : "")}>
  <div class="random-chart-sizer" bind:this={chartSizerElement}>
    <Chart style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;"
           {mochartConfig} {dataProvider} />
  </div>
  <div class="random-controls">
    <form class="form-inline">
      <div class="form-group">
        <div class="btn-toolbar" role="toolbar">
          <div class="btn-group">
            <ButtonWithTooltip id="randomize-back" disabled={playing} label="Back"
                               tooltipText="Go back to the previous random dataset" tooltipPlacement="top-start"
                               onClick={onRandomizeBack} aria-label="Randomize Back">
              <Icon size="lg" fixedWidth={true} name="dice" flip="horizontal" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="randomize-next" disabled={playing} label="Randomize"
                               tooltipText="Generate the next random dataset" tooltipPlacement="top-start"
                               onClick={onRandomizeNext} aria-label="Randomize Next">
              <Icon size="lg" fixedWidth={true} name="dice" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="play" disabled={playing} tooltipText="Keep generating random datasets at the interval" tooltipPlacement="top-start"
                               onClick={onPlayClick} aria-label="Play Randomize">
              <Icon size="lg" fixedWidth={true} name="play" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="stop" disabled={!playing} tooltipText="Stop generating" tooltipPlacement="top-start"
                               onClick={onStopClick} aria-label="Stop">
              <Icon size="lg" fixedWidth={true} name="stop" />
            </ButtonWithTooltip>
          </div>
          <div class="form-group">
            <label class="form-control-plaintext" for="random-rate">Interval (ms):</label>
            <input id="random-rate" disabled={playing} type="number" min="5" max="60000" step="100" class="form-control" value={rateText}
                   oninput={rateChanged} aria-label="Randomize interval in milliseconds" />
          </div>
        </div>
        <div class="btn-toolbar ml-2" role="toolbar">
          <ExportButtons idPrefix="random" getContainer={() => chartSizerElement} />
          <div class="btn-group">
            <ButtonWithTooltip id="reuse" disabled={playing} label="Reuse" pressed={applyReuse}
                               tooltipText="Keep part of the data the same between randomizations (the config's reuse settings), so transitions animate with continuity — off generates fully independent datasets" tooltipPlacement="top-start"
                               onClick={toggleApplyReuse} aria-label="Reuse">
              <Icon size="lg" fixedWidth={true} name="recycle" />
            </ButtonWithTooltip>
          </div>
        </div>
      </div>
    </form>
  </div>
</div>
