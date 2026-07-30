<script lang="ts">
  import { untrack } from 'svelte';

  import { buildMochartDemoConfig, demoText } from '@mochart/demo-common';
  import type { SwitchableDemoMode } from '@mochart/demo-common';

  import RandomContent from './RandomContent.svelte';
  import BackToDemosButton from '../misc/BackToDemosButton.svelte';
  import ModeSwitcher from '../misc/ModeSwitcher.svelte';
  import NotesMenu from '../misc/NotesMenu.svelte';
  import SiteRootButton from '../misc/SiteRootButton.svelte';
  import ThemeToggleButton from '../misc/ThemeToggleButton.svelte';

  import type { DemoData } from '../../types';

  interface Props {
    demoData: DemoData;
    initialDemoId: string;
    siteRootUrl?: string;
    onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
    onBackToDemos: () => void;
    randomId: number;
    incrementRandomId: () => void;
    decrementRandomId: () => void;
  }

  const eventKeyChart = 1;
  const eventKeyConfig = 2;
  const eventKeyData = 3;

  let {
    demoData,
    initialDemoId,
    siteRootUrl = undefined,
    onModeChanged,
    onBackToDemos,
    randomId,
    incrementRandomId,
    decrementRandomId
  }: Props = $props();

  function buildStateForDemo(demoId: string) {
    const demo = demoData.demoObjectMap[demoId];
    return {
      mochartDemoConfig: buildMochartDemoConfig(demo.config),
      randomConfig: Object.assign({}, demo.random, { valid: true }),
      generator: demo.generator
    };
  }

  // Props intentionally seed local state with their initial value only; the
  // $effect.pre below re-syncs everything when the routed demo changes.
  // svelte-ignore state_referenced_locally
  const initialState = buildStateForDemo(initialDemoId);

  let activeKey = $state(eventKeyChart);
  let mochartDemoConfig = $state.raw(initialState.mochartDemoConfig);
  let randomConfig = $state.raw(initialState.randomConfig);
  let generator = $state.raw(initialState.generator);

  // svelte-ignore state_referenced_locally
  let previousInitialDemoId = initialDemoId;
  $effect.pre(() => {
    const nextInitialDemoId = initialDemoId;
    untrack(() => {
      if (nextInitialDemoId !== previousInitialDemoId) {
        previousInitialDemoId = nextInitialDemoId;
        const nextState = buildStateForDemo(nextInitialDemoId);
        activeKey = eventKeyChart;
        mochartDemoConfig = nextState.mochartDemoConfig;
        randomConfig = nextState.randomConfig;
        generator = nextState.generator;
      }
    });
  });

  function handleSelect(nextActiveKey: number) {
    activeKey = nextActiveKey;
  }
</script>

<div class="mochart-demo-container multi">
  <div class="mochart-demo-tabs-container">
    <div class="mochart-demo-nav-group">
      <SiteRootButton {siteRootUrl} />
      <BackToDemosButton {onBackToDemos} />
      <ul class="demo-tabs">
        <li class="demo-tab-item">
          <button type="button" class={"demo-tab" + (activeKey === eventKeyChart ? " active" : "")}
                  onclick={() => handleSelect(eventKeyChart)}>
            {demoText.tabs.chart}
          </button>
        </li>
        <li class="demo-tab-item">
          <button type="button" class={"demo-tab" + (activeKey === eventKeyConfig ? " active" : "")}
                  onclick={() => handleSelect(eventKeyConfig)}>
            {demoText.tabs.randomConfig}
          </button>
        </li>
        <li class="demo-tab-item">
          <button type="button" class={"demo-tab" + (activeKey === eventKeyData ? " active" : "")}
                  onclick={() => handleSelect(eventKeyData)}>
            {demoText.tabs.data}
          </button>
        </li>
      </ul>
      <NotesMenu title={demoData.demoObjectMap[initialDemoId].title} notes={demoData.demoObjectMap[initialDemoId].notes} />
    </div>
    <div class="mochart-demo-nav-group">
      <ModeSwitcher demoMode="random" {onModeChanged} />
      <ThemeToggleButton />
    </div>
  </div>
  <div class="mochart-demo-content-pane">
    <RandomContent {mochartDemoConfig} initialRandomConfig={randomConfig} {generator}
                   {activeKey} eventKeys={{ eventKeyChart, eventKeyConfig, eventKeyData }}
                   {randomId} {incrementRandomId} {decrementRandomId} />
  </div>
</div>
