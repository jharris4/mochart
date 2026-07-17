<script lang="ts">
  import DemosTab from '../demos/DemosTab.svelte';
  import ChartsTab from './ChartsTab.svelte';
  import ErrorTab from '../misc/ErrorTab.svelte';

  import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

  interface Props {
    demoData: DemoData;
    demoMode: DemoMode;
    initialDemoId: string;
    onDemoModeChanged: OnDemoModeChanged;
    onDemoChanged: OnDemoChanged;
  }

  const eventKeyChart = 1;
  const eventKeyDemo = 2;

  function getActiveKeyForInitialDemoId(initialDemoId: string): number {
    return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
  }

  let { demoData, demoMode, initialDemoId, onDemoModeChanged, onDemoChanged }: Props = $props();

  let demoId = $state(initialDemoId);
  let activeKey = $state(getActiveKeyForInitialDemoId(initialDemoId));

  let previousInitialDemoId = initialDemoId;
  $effect.pre(() => {
    if (initialDemoId !== previousInitialDemoId) {
      previousInitialDemoId = initialDemoId;
      activeKey = getActiveKeyForInitialDemoId(initialDemoId);
      demoId = initialDemoId;
    }
  });

  function onDemoChange(nextDemoId: string) {
    demoId = nextDemoId;
    onDemoChanged(nextDemoId);
  }

  function handleSelect(nextActiveKey: number) {
    activeKey = nextActiveKey;
  }

  const isDemos = $derived(initialDemoId === 'demos');
</script>

<div class="mochart-demo-container multi">
  <div class="mochart-demo-tabs-container">
    <ul class="nav nav-tabs">
      <li class="nav-item">
        <button type="button" class={"nav-link" + (activeKey === eventKeyDemo ? " active" : "")}
                onclick={() => handleSelect(eventKeyDemo)}>
          Demos
        </button>
      </li>
      <li class="nav-item" style={isDemos ? "display: none;" : void 0}>
        <button type="button" class={"nav-link" + (activeKey === eventKeyChart ? " active" : "")}
                onclick={() => handleSelect(eventKeyChart)}>
          Chart
        </button>
      </li>
    </ul>
  </div>
  <div class="mochart-demo-content-pane">
    {#if isDemos}
      <div class="mochart-demo-content single-tab">
        <DemosTab active={activeKey === eventKeyDemo} {demoData} {demoMode} {demoId}
                  {onDemoModeChanged} {onDemoChange} />
      </div>
    {:else}
      <div class="mochart-demo-content">
        <ErrorTab active={activeKey === eventKeyDemo}>
          <DemosTab active={activeKey === eventKeyDemo} {demoData} {demoMode} {demoId}
                    {onDemoModeChanged} {onDemoChange} />
        </ErrorTab>
        <ErrorTab active={activeKey === eventKeyChart}>
          <ChartsTab active={activeKey === eventKeyChart} demoObject={demoData.demoObjectMap[demoId]} />
        </ErrorTab>
      </div>
    {/if}
  </div>
</div>
