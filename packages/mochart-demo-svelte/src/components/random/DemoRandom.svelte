<script lang="ts">
  import { untrack } from 'svelte';

  import buildMochartDemoConfig from '../../config/mochartDemoConfig';

  import DemosTab from '../demos/DemosTab.svelte';
  import RandomContent from './RandomContent.svelte';
  import ErrorTab from '../misc/ErrorTab.svelte';

  import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

  interface Props {
    demoData: DemoData;
    demoMode: DemoMode;
    initialDemoId: string;
    onDemoModeChanged: OnDemoModeChanged;
    onDemoChanged: OnDemoChanged;
    randomId: number;
    incrementRandomId: () => void;
    decrementRandomId: () => void;
  }

  const eventKeyChart = 1;
  const eventKeyDemo = 2;
  const eventKeyConfig = 3;
  const eventKeyData = 4;

  function getActiveKeyForInitialDemoId(initialDemoId: string): number {
    return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
  }

  let {
    demoData,
    demoMode,
    initialDemoId,
    onDemoModeChanged,
    onDemoChanged,
    randomId,
    incrementRandomId,
    decrementRandomId
  }: Props = $props();

  function buildStateForDemo(demoId: string) {
    const config = demoData.demoObjectMap[demoId].config;
    return {
      mochartDemoConfig: buildMochartDemoConfig(config),
      randomConfig: Object.assign({}, demoData.demoObjectMap[demoId].random, { valid: true })
    };
  }

  // Props intentionally seed local state with their initial value only; the
  // $effect.pre below re-syncs everything when the routed demo changes.
  // svelte-ignore state_referenced_locally
  const initialState = initialDemoId !== 'demos' ? buildStateForDemo(initialDemoId) : { mochartDemoConfig: null, randomConfig: null };

  // svelte-ignore state_referenced_locally
  let demoId = $state(initialDemoId);
  // svelte-ignore state_referenced_locally
  let activeKey = $state(getActiveKeyForInitialDemoId(initialDemoId));
  let mochartDemoConfig = $state.raw(initialState.mochartDemoConfig);
  let randomConfig = $state.raw(initialState.randomConfig);

  // svelte-ignore state_referenced_locally
  let previousInitialDemoId = initialDemoId;
  $effect.pre(() => {
    const nextInitialDemoId = initialDemoId;
    untrack(() => {
      if (nextInitialDemoId !== 'demos' && nextInitialDemoId !== previousInitialDemoId) {
        const nextState = buildStateForDemo(nextInitialDemoId);
        demoId = nextInitialDemoId;
        activeKey = getActiveKeyForInitialDemoId(nextInitialDemoId);
        mochartDemoConfig = nextState.mochartDemoConfig;
        randomConfig = nextState.randomConfig;
      }
      else if (nextInitialDemoId !== previousInitialDemoId) {
        demoId = nextInitialDemoId;
        activeKey = getActiveKeyForInitialDemoId(nextInitialDemoId);
      }
      previousInitialDemoId = nextInitialDemoId;
    });
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
      <li class="nav-item" style={isDemos ? "display: none;" : void 0}>
        <button type="button" class={"nav-link" + (activeKey === eventKeyConfig ? " active" : "")}
                onclick={() => handleSelect(eventKeyConfig)}>
          Random Config
        </button>
      </li>
      <li class="nav-item" style={isDemos ? "display: none;" : void 0}>
        <button type="button" class={"nav-link" + (activeKey === eventKeyData ? " active" : "")}
                onclick={() => handleSelect(eventKeyData)}>
          Data
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
      <RandomContent {demoData} mochartDemoConfig={mochartDemoConfig!} initialRandomConfig={randomConfig!}
                     {demoMode} {initialDemoId} {demoId}
                     {onDemoModeChanged} {onDemoChange} {activeKey}
                     eventKeys={{ eventKeyChart, eventKeyDemo, eventKeyConfig, eventKeyData }}
                     {randomId} {incrementRandomId} {decrementRandomId} />
    {/if}
  </div>
</div>
