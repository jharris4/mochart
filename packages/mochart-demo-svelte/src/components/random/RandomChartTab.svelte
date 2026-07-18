<script lang="ts">
  import { untrack, onDestroy } from 'svelte';

  import { Chart } from '@mochart/svelte';
  import type { MochartConfig } from '@mochart/core';

  import { demoText } from '@mochart/demo-common';

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

  // Intentional initial-value capture; the $effect.pre below re-syncs it.
  // svelte-ignore state_referenced_locally
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
            <ButtonWithTooltip id="randomize-back" disabled={playing} label={demoText.randomChartTab.back.label}
                               tooltipText={demoText.randomChartTab.back.tooltip} tooltipPlacement="top-start"
                               onClick={onRandomizeBack} aria-label={demoText.randomChartTab.back.aria}>
              <Icon size="lg" fixedWidth={true} name="dice" flip="horizontal" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="randomize-next" disabled={playing} label={demoText.randomChartTab.randomize.label}
                               tooltipText={demoText.randomChartTab.randomize.tooltip} tooltipPlacement="top-start"
                               onClick={onRandomizeNext} aria-label={demoText.randomChartTab.randomize.aria}>
              <Icon size="lg" fixedWidth={true} name="dice" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="play" disabled={playing} tooltipText={demoText.randomChartTab.play.tooltip} tooltipPlacement="top-start"
                               onClick={onPlayClick} aria-label={demoText.randomChartTab.play.aria}>
              <Icon size="lg" fixedWidth={true} name="play" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="stop" disabled={!playing} tooltipText={demoText.randomChartTab.stop.tooltip} tooltipPlacement="top-start"
                               onClick={onStopClick} aria-label={demoText.randomChartTab.stop.aria}>
              <Icon size="lg" fixedWidth={true} name="stop" />
            </ButtonWithTooltip>
          </div>
          <div class="form-group">
            <label class="form-control-plaintext" for="random-rate">{demoText.randomChartTab.intervalLabel}</label>
            <input id="random-rate" disabled={playing} type="number" min="5" max="60000" step="100" class="form-control" value={rateText}
                   oninput={rateChanged} aria-label={demoText.randomChartTab.intervalAria} />
          </div>
        </div>
        <div class="btn-toolbar ml-2" role="toolbar">
          <ExportButtons idPrefix="random" getContainer={() => chartSizerElement} />
          <div class="btn-group">
            <ButtonWithTooltip id="reuse" disabled={playing} label={demoText.randomChartTab.reuse.label} pressed={applyReuse}
                               tooltipText={demoText.randomChartTab.reuse.tooltip} tooltipPlacement="top-start"
                               onClick={toggleApplyReuse} aria-label={demoText.randomChartTab.reuse.aria}>
              <Icon size="lg" fixedWidth={true} name="recycle" />
            </ButtonWithTooltip>
          </div>
        </div>
      </div>
    </form>
  </div>
</div>
