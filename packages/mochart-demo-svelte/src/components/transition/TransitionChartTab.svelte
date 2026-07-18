<script lang="ts">
  import { untrack } from 'svelte';

  import { Chart } from '@mochart/svelte';
  import type { MochartConfig } from '@mochart/core';

  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import ExportButtons from '../misc/ExportButtons.svelte';
  import Icon from '../misc/Icon.svelte';

  import type { ChartDataProviderLike } from '../../types';

  interface Props {
    active?: boolean;
    mochartConfig: MochartConfig;
    dataProviders: ChartDataProviderLike[];
  }

  let { active = false, mochartConfig, dataProviders }: Props = $props();

  let dataProviderIndex = $state(0);
  let chartSizerElement = $state<HTMLDivElement | null>(null);

  // Props intentionally seed the previous-value snapshots with their initial
  // value only; the $effect.pre below re-syncs on later prop changes.
  // svelte-ignore state_referenced_locally
  let previousMochartConfig = mochartConfig;
  // svelte-ignore state_referenced_locally
  let previousDataProviders = dataProviders;
  $effect.pre(() => {
    const nextMochartConfig = mochartConfig;
    const nextDataProviders = dataProviders;
    untrack(() => {
      if (nextMochartConfig !== previousMochartConfig || nextDataProviders !== previousDataProviders) {
        previousMochartConfig = nextMochartConfig;
        previousDataProviders = nextDataProviders;
        dataProviderIndex = 0;
      }
    });
  });

  function onStepBack() {
    if (dataProviders.length > 1) {
      if (dataProviderIndex === 0) {
        dataProviderIndex = dataProviders.length - 1;
      }
      else {
        dataProviderIndex--;
      }
    }
  }

  function onStepForward() {
    if (dataProviders.length > 1) {
      if (dataProviderIndex === dataProviders.length - 1) {
        dataProviderIndex = 0;
      }
      else {
        dataProviderIndex++;
      }
    }
  }
</script>

<div class={"mochart-demo-tab-container col chart" + (active ? " active" : "")}>
  <div class="transition-chart-sizer" bind:this={chartSizerElement}>
    <Chart style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;"
           {mochartConfig} dataProvider={dataProviders[dataProviderIndex]} />
  </div>
  <div class="transition-controls">
    <form class="form-inline">
      <div class="form-group">
        <div class="btn-toolbar" role="toolbar">
          <div class="btn-group">
            <ButtonWithTooltip id="transition-back" label="Back" tooltipText="Transition to the previous dataset" tooltipPlacement="top-start"
                               onClick={onStepBack} aria-label="Step Backward">
              <Icon size="lg" fixedWidth={true} name="backward-step" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="transition-forward" label="Next" tooltipText="Transition to the next dataset" tooltipPlacement="top-start"
                               onClick={onStepForward} aria-label="Step Forward">
              <Icon size="lg" fixedWidth={true} name="forward-step" />
            </ButtonWithTooltip>
          </div>
          <ExportButtons idPrefix="transition" getContainer={() => chartSizerElement} />
        </div>
      </div>
    </form>
  </div>
</div>
