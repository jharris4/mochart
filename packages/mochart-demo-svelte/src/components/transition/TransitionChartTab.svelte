<script lang="ts">
  import { untrack } from 'svelte';

  import { Chart } from 'mochart-svelte';
  import type { MochartConfig } from 'mochart';

  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import Icon from '../misc/Icon.svelte';

  import type { ChartDataProviderLike } from '../../types';

  interface Props {
    active?: boolean;
    mochartConfig: MochartConfig;
    dataProviders: ChartDataProviderLike[];
  }

  let { active = false, mochartConfig, dataProviders }: Props = $props();

  let dataProviderIndex = $state(0);

  let previousMochartConfig = mochartConfig;
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
  <div class="transition-chart-sizer">
    <Chart style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;"
           {mochartConfig} dataProvider={dataProviders[dataProviderIndex]} />
  </div>
  <div class="transition-controls">
    <form class="form-inline">
      <div class="form-group">
        <div class="btn-toolbar" role="toolbar">
          <div class="btn-group">
            <ButtonWithTooltip id="transition-back" tooltipText="Step Backward" tooltipPlacement="top-start"
                               onClick={onStepBack} aria-label="Step Backward">
              <Icon size="lg" fixedWidth={true} name="step-backward" />
            </ButtonWithTooltip>
            <ButtonWithTooltip id="transition-forward" tooltipText="Step Forward" tooltipPlacement="top-start"
                               onClick={onStepForward} aria-label="Step Forward">
              <Icon size="lg" fixedWidth={true} name="step-forward" />
            </ButtonWithTooltip>
          </div>
        </div>
      </div>
    </form>
  </div>
</div>
