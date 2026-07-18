<script lang="ts">
  import DemosTab from '../demos/DemosTab.svelte';
  import ChartTab from './ChartTab.svelte';
  import ConfigTab from './ConfigTab.svelte';
  import DataTab from './DataTab.svelte';
  import ErrorTab from '../misc/ErrorTab.svelte';

  import type { DemoData, DemoMode, DemoConfig, DataRow, OnDemoModeChanged, OnDemoChanged } from '../../types';

  interface Props {
    demoData: DemoData;
    demoMode: DemoMode;
    initialDemoId: string;
    onDemoModeChanged: OnDemoModeChanged;
    onDemoChanged: OnDemoChanged;
  }

  type DataError = string | boolean | null;

  const eventKeyChart = 1;
  const eventKeyConfig = 2;
  const eventKeyData = 3;
  const eventKeyDemo = 4;

  function getActiveKeyForInitialDemoId(initialDemoId: string): number {
    return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
  }

  let { demoData, demoMode, initialDemoId, onDemoModeChanged, onDemoChanged }: Props = $props();

  let activeKey = $state(getActiveKeyForInitialDemoId(initialDemoId));

  // Config/data edits made on the Config/Data tabs stay "pending" until the
  // Chart tab is shown again (so the chart animates one combined change).
  let demoId = $state(initialDemoId);
  let pendingConfig = $state.raw<DemoConfig | null>(null);
  let pendingData = $state.raw<DataRow[] | null>(null);
  let pendingDataError = $state.raw<DataError>(false);
  let config = $state.raw<DemoConfig | null>(initialDemoId !== 'demos' ? demoData.demoObjectMap[initialDemoId].config : null);
  let data = $state.raw<DataRow[] | null>(initialDemoId !== 'demos' ? demoData.demoObjectMap[initialDemoId].data : null);
  let dataError = $state.raw<DataError>(false);
  let viewingConfig = $state.raw<DemoConfig | null>(initialDemoId !== 'demos' ? demoData.demoObjectMap[initialDemoId].config : null);
  let viewingData = $state.raw<DataRow[] | null>(initialDemoId !== 'demos' ? demoData.demoObjectMap[initialDemoId].data : null);
  let viewingDataError = $state.raw<DataError>(false);

  function chartShown() {
    if (pendingConfig !== null || pendingData !== null || pendingDataError !== null) {
      if (pendingConfig !== null) {
        viewingConfig = pendingConfig;
        pendingConfig = null;
      }
      if (pendingData !== null) {
        viewingData = pendingData;
        pendingData = null;
      }
      if (pendingDataError !== null) {
        viewingDataError = pendingDataError;
        pendingDataError = null;
      }
    }
  }

  function handleSelect(nextActiveKey: number) {
    const previousActiveKey = activeKey;
    activeKey = nextActiveKey;
    if (nextActiveKey === eventKeyChart && previousActiveKey !== eventKeyChart) {
      chartShown();
    }
  }

  // When the routed demo changes, reload its config/data (and promote them
  // straight to the visible chart, matching the react demo's lifecycle).
  let previousInitialDemoId = initialDemoId;
  $effect.pre(() => {
    if (initialDemoId !== previousInitialDemoId) {
      previousInitialDemoId = initialDemoId;
      activeKey = getActiveKeyForInitialDemoId(initialDemoId);
      demoId = initialDemoId;
      if (initialDemoId === 'demos') {
        config = null;
        data = null;
        dataError = null;
        viewingConfig = null;
        viewingData = null;
      }
      else {
        config = demoData.demoObjectMap[initialDemoId].config;
        data = demoData.demoObjectMap[initialDemoId].data;
        dataError = null;
        pendingConfig = config;
        pendingData = data;
        chartShown();
      }
    }
  });

  function onConfigChange(nextPendingConfig: DemoConfig) {
    pendingConfig = nextPendingConfig;
  }

  function onConfigReset() {
    const resetConfig = { ...demoData.demoObjectMap[demoId].config };
    pendingConfig = resetConfig;
    config = resetConfig;
  }

  function onDataChange(nextPendingData: DataRow[]) {
    pendingData = nextPendingData;
    pendingDataError = false;
  }

  function onDataError(errorMessage: string) {
    pendingDataError = errorMessage;
  }

  function onDataReset() {
    // give it a new array reference so children know to update
    pendingData = demoData.demoObjectMap[demoId].data.slice();
    pendingDataError = false;
  }

  function onDemoChange(nextDemoId: string) {
    onDemoChanged(nextDemoId);
  }

  // Applied config/data edits are held until the Chart tab is shown; badge the
  // Chart tab so it's visible that something is waiting there.
  const hasPendingChanges = $derived(activeKey !== eventKeyChart && (pendingConfig !== null || pendingData !== null));
</script>

<div class="mochart-demo-container">
  <div class="mochart-demo-tabs-container">
    <ul class="nav nav-tabs">
      <li class="nav-item">
        <button type="button" class={"nav-link" + (activeKey === eventKeyDemo ? " active" : "")}
                onclick={() => handleSelect(eventKeyDemo)}>
          Demos
        </button>
      </li>
      <li class="nav-item">
        <button type="button" class={"nav-link" + (activeKey === eventKeyChart ? " active" : "")}
                title={hasPendingChanges ? "Applied changes are waiting — switch here to see them" : void 0}
                onclick={() => handleSelect(eventKeyChart)}>
          Chart{#if hasPendingChanges}<span class="mochart-pending-badge" aria-hidden="true"></span>{/if}
        </button>
      </li>
      <li class="nav-item">
        <button type="button" class={"nav-link" + (activeKey === eventKeyConfig ? " active" : "")}
                onclick={() => handleSelect(eventKeyConfig)}>
          Config
        </button>
      </li>
      <li class="nav-item">
        <button type="button" class={"nav-link" + (activeKey === eventKeyData ? " active" : "")}
                onclick={() => handleSelect(eventKeyData)}>
          Data
        </button>
      </li>
    </ul>
  </div>
  {#if initialDemoId === 'demos'}
    <div class="mochart-demo-content-pane">
      <div class="mochart-demo-content single-tab">
        <DemosTab active={activeKey === eventKeyDemo} {demoData} {demoMode} {demoId}
                  {onDemoModeChanged} {onDemoChange} />
      </div>
    </div>
  {:else}
    <div class="mochart-demo-content-pane">
      <div class="mochart-demo-content">
        <ErrorTab active={activeKey === eventKeyDemo}>
          <DemosTab active={activeKey === eventKeyDemo} {demoData} {demoMode} {demoId}
                    {onDemoModeChanged} {onDemoChange} />
        </ErrorTab>
        <ErrorTab active={activeKey === eventKeyChart}>
          <ChartTab active={activeKey === eventKeyChart} config={viewingConfig} data={viewingData} dataError={viewingDataError} />
        </ErrorTab>
        <ErrorTab active={activeKey === eventKeyConfig}>
          <ConfigTab active={activeKey === eventKeyConfig} config={config!} {onConfigChange} {onConfigReset} />
        </ErrorTab>
        <ErrorTab active={activeKey === eventKeyData}>
          <DataTab active={activeKey === eventKeyData} config={viewingConfig!} data={data!}
                   {onDataChange} {onDataError} {onDataReset} />
        </ErrorTab>
      </div>
    </div>
  {/if}
</div>
