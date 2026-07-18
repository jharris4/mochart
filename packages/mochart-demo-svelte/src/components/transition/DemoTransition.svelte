<script lang="ts">

  import { buildMochartDemoConfig, defaultTransitionConfig, demoText, getTransitionDataProviders, getTransitionMochartConfig } from '@mochart/demo-common';

  import TransitionChartTab from './TransitionChartTab.svelte';
  import TransitionConfigTab from './TransitionConfigTab.svelte';

  import type { TransitionConfig } from '../../types';

  const eventKeyChart = 1;
  const eventKeyConfig = 2;

  let activeKey = $state(eventKeyChart);

  let transitionConfig = $state.raw<TransitionConfig>(defaultTransitionConfig);
  let mochartConfig = $state.raw(getTransitionMochartConfig(defaultTransitionConfig));
  let dataProviders = $state.raw(getTransitionDataProviders(defaultTransitionConfig));

  function handleSelect(nextActiveKey: number) {
    activeKey = nextActiveKey;
  }

  function onUpdateConfig(nextTransitionConfig: TransitionConfig) {
    transitionConfig = nextTransitionConfig;
    mochartConfig = getTransitionMochartConfig(nextTransitionConfig);
    dataProviders = getTransitionDataProviders(nextTransitionConfig);
  }

  function onResetConfig() {
    transitionConfig = defaultTransitionConfig;
    mochartConfig = getTransitionMochartConfig(defaultTransitionConfig);
    dataProviders = getTransitionDataProviders(defaultTransitionConfig);
  }
</script>

<div class="mochart-demo-container multi">
  <div class="mochart-demo-tabs-container">
    <ul class="nav nav-tabs">
      <li class="nav-item">
        <button type="button" class={"nav-link" + (activeKey === eventKeyChart ? " active" : "")}
                onclick={() => handleSelect(eventKeyChart)}>
          {demoText.tabs.chart}
        </button>
      </li>
      <li class="nav-item">
        <button type="button" class={"nav-link" + (activeKey === eventKeyConfig ? " active" : "")}
                onclick={() => handleSelect(eventKeyConfig)}>
          {demoText.tabs.transitionConfig}
        </button>
      </li>
    </ul>
  </div>
  <div class="mochart-demo-content-pane">
    <div class="mochart-demo-content">
      <TransitionChartTab {mochartConfig} {dataProviders} active={activeKey === eventKeyChart} />
      <TransitionConfigTab {transitionConfig} onUpdate={onUpdateConfig} onReset={onResetConfig}
                           active={activeKey === eventKeyConfig} />
    </div>
  </div>
</div>
