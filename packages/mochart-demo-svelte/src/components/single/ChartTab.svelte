<script lang="ts">
  import { untrack } from 'svelte';

  import { hasConfigStructureChange } from 'mochart';

  import buildMochartDemoConfig from '../../config/mochartDemoConfig';

  import EditableChart from './EditableChart.svelte';

  import type { DemoConfig, DataRow, MochartDemoConfig, FocusData, FilteredSeriesIds } from '../../types';

  interface Props {
    config?: DemoConfig | null;
    data?: DataRow[] | null;
    dataError?: string | boolean | null;
    active?: boolean;
  }

  const minChartWidthForSecondChart = 480;
  const scrollWidthOffset = 20;
  const defaultChartCount = 1;

  let { config = null, data = null, dataError = false, active = false }: Props = $props();

  // Measured width of the tab (the react demo wrapped this tab in the
  // react-sizer HOC for the same purpose).
  let width = $state(0);

  let chartCount = $state(defaultChartCount);
  let focusedSeriesAxisId = $state.raw<string | null>(null);
  let focusedSeriesId = $state.raw<string | null>(null);
  let focusedGroupIndex = $state(-1);
  let filteredSeriesIds = $state.raw<FilteredSeriesIds>({});
  let mochartDemoConfig = $state.raw<MochartDemoConfig | null>(config ? buildMochartDemoConfig(config) : null);

  function resetFocusAndFiltered() {
    focusedSeriesAxisId = null;
    focusedSeriesId = null;
    focusedGroupIndex = -1;
    filteredSeriesIds = {};
  }

  // Mirror the react lifecycle: a config change rebuilds the demo config and
  // resets focus/filter state when the structure changed (or on data errors);
  // a data change remaps the focused group index onto the new data.
  let previousConfig = config;
  let previousData = data;
  let previousDataError = dataError;
  $effect.pre(() => {
    const nextConfig = config;
    const nextData = data;
    const nextDataError = dataError;
    untrack(() => {
      if (nextDataError || nextConfig !== previousConfig) {
        let configChanged = false;
        if (nextConfig !== previousConfig) {
          const nextDemoConfig = nextConfig ? buildMochartDemoConfig(nextConfig) : null;
          if (nextDemoConfig && mochartDemoConfig) {
            configChanged = hasConfigStructureChange(mochartDemoConfig.mochartConfig, nextDemoConfig.mochartConfig);
          }
          mochartDemoConfig = nextDemoConfig;
        }
        if (nextDataError || configChanged) {
          resetFocusAndFiltered();
        }
      }
      else if (nextData !== previousData) {
        const { configValidation, mochartConfig } = mochartDemoConfig ?? {};
        const valid = configValidation?.valid ?? false;
        if (!previousDataError && previousData && nextData && valid && mochartConfig) {
          if (focusedGroupIndex >= 0) {
            const property = mochartConfig.groupAxisConfig.property ?? '';
            const groupValue = previousData[focusedGroupIndex][property];
            let newFocusedGroupIndex = -1;
            let i, count = nextData.length;
            for (i = 0; i < count; i++) {
              if (nextData[i][property] === groupValue) {
                newFocusedGroupIndex = i;
                break;
              }
            }
            focusedGroupIndex = newFocusedGroupIndex;
          }
        }
        else {
          resetFocusAndFiltered();
        }
      }
      previousConfig = nextConfig;
      previousData = nextData;
      previousDataError = nextDataError;
    });
  });

  function onFocus(focusData: FocusData = {}) {
    const { seriesAxisId, seriesId, groupIndex } = focusData;
    if (seriesAxisId !== void 0) {
      focusedSeriesAxisId = seriesAxisId;
    }
    if (seriesId !== void 0) {
      focusedSeriesId = seriesId;
    }
    if (groupIndex !== void 0) {
      focusedGroupIndex = groupIndex;
    }
  }

  // The chart owns filter toggling now and reports the whole map.
  function onSeriesFilter({ filteredSeriesIds: nextFilteredSeriesIds }: { filteredSeriesIds: FilteredSeriesIds }) {
    filteredSeriesIds = { ...nextFilteredSeriesIds };
  }

  function onChartCountToggle() {
    chartCount = chartCount === 1 ? 2 : 1;
  }

  const allowedChartCount = $derived(Math.floor(width / 2) > minChartWidthForSecondChart ? 2 : 1);
  const adjustedChartCount = $derived(Math.min(chartCount, allowedChartCount));
  const chartWidth = $derived(Math.floor((width - scrollWidthOffset) / adjustedChartCount));
</script>

<div class={"mochart-demo-tab-container row chart" + (active ? " active" : "")} bind:clientWidth={width}>
  <div class="editable-charts-sizer">
    <div class="editable-charts">
      {#if mochartDemoConfig && width > 0}
        {#each { length: adjustedChartCount } as _, i (i)}
          <EditableChart chartCount={chartCount} showChartCountControls={allowedChartCount > 1 && i === 0}
            width={chartWidth} {mochartDemoConfig} data={data ?? []} {dataError}
            isActive={active} {filteredSeriesIds} {focusedGroupIndex}
            {focusedSeriesAxisId} {focusedSeriesId} {onChartCountToggle}
            {onFocus} {onSeriesFilter} />
        {/each}
      {/if}
    </div>
  </div>
</div>
