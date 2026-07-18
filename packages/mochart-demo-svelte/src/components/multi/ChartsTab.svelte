<script lang="ts">
  import { untrack, onDestroy } from 'svelte';

  import { ArrayOfObjectsDataProvider } from '@mochart/core';
  import type { MochartConfig } from '@mochart/core';
  import { Chart } from '@mochart/svelte';

  import { buildMochartDemoConfig } from '@mochart/demo-common';

  import ChartsControls from './ChartsControls.svelte';

  import type { Demo, DataRow, FilteredSeriesIds, ChartDataProviderLike } from '../../types';

  interface Props {
    demoObject: Demo;
    active?: boolean;
  }

  const scrollWidthOffset = 20;

  const defaultChartRows = 2;
  const defaultChartCols = 2;

  const defaultRate = 2000;

  function getChartDataCount(data: DataRow[], currentDataCount: number, i: number): number {
    const dataCount = data.length;
    let chartDataCount = (dataCount + currentDataCount - i) % dataCount;
    if (chartDataCount === 0) {
      chartDataCount = dataCount;
    }
    return chartDataCount;
  }

  function getDataProvidersForDataCount(mochartConfig: MochartConfig, data: DataRow[], chartCount: number, currentDataCount: number): ChartDataProviderLike[] {
    const dataProviders: ChartDataProviderLike[] = [];
    let i, chartDataCount;
    const groupProperty = mochartConfig.groupAxisConfig.property ?? '';
    for (i = 0; i < chartCount; i++) {
      chartDataCount = getChartDataCount(data, currentDataCount, i);
      dataProviders.push(new ArrayOfObjectsDataProvider(data.slice(0, chartDataCount), groupProperty));
    }
    return dataProviders;
  }

  let { demoObject, active = false }: Props = $props();

  let intervalId: ReturnType<typeof setInterval> | null = null;

  let playing = $state(false);
  let chartRows = $state(defaultChartRows);
  let chartCols = $state(defaultChartCols);
  let rate = $state(defaultRate);
  // Props intentionally seed local state with their initial value only; the
  // $effect.pre below re-syncs everything when the demo changes.
  // svelte-ignore state_referenced_locally
  let mochartDemoConfig = $state.raw(buildMochartDemoConfig(demoObject.config));
  // svelte-ignore state_referenced_locally
  let data = $state.raw(demoObject.data);
  // svelte-ignore state_referenced_locally
  let dataCount = $state(demoObject.data.length);
  // svelte-ignore state_referenced_locally
  let currentDataCount = $state(demoObject.data.length);
  // svelte-ignore state_referenced_locally
  let dataProviders = $state.raw(getDataProvidersForDataCount(
    mochartDemoConfig.mochartConfig, demoObject.data, defaultChartRows * defaultChartCols, demoObject.data.length));
  // svelte-ignore state_referenced_locally
  let focusedGroupIndices = $state.raw<number[]>(dataProviders.map(() => -1));
  let focusedGroupIndex = $state(-1);
  let focusedSeriesAxisId = $state.raw<string | null>(null);
  let focusedSeriesId = $state.raw<string | null>(null);
  let filteredSeriesIds = $state.raw<FilteredSeriesIds>({});

  function initFocusAndFiltered() {
    focusedGroupIndex = -1;
    focusedSeriesAxisId = null;
    focusedSeriesId = null;
    filteredSeriesIds = {};
  }

  // svelte-ignore state_referenced_locally
  let previousDemoObject = demoObject;
  // svelte-ignore state_referenced_locally
  let previousActive = active;
  $effect.pre(() => {
    const nextDemoObject = demoObject;
    const nextActive = active;
    untrack(() => {
      if (nextDemoObject !== previousDemoObject) {
        previousDemoObject = nextDemoObject;
        mochartDemoConfig = buildMochartDemoConfig(nextDemoObject.config);
        initFocusAndFiltered();
        playing = false;
        data = nextDemoObject.data;
        dataCount = data.length;
        currentDataCount = dataCount;
        dataProviders = getDataProvidersForDataCount(mochartDemoConfig.mochartConfig, data, chartRows * chartCols, currentDataCount);
        focusedGroupIndices = dataProviders.map(() => -1);
      }
      if (nextActive !== previousActive) {
        previousActive = nextActive;
        onStopClick();
      }
    });
  });

  function onRateChange(nextRate: number) {
    rate = nextRate;
  }

  function onRowsChange(nextChartRows: number) {
    chartRows = nextChartRows;
    currentDataCount = dataCount;
    dataProviders = getDataProvidersForDataCount(mochartDemoConfig.mochartConfig, data, chartRows * chartCols, currentDataCount);
    focusedGroupIndices = getFocusedGroupIndices(dataProviders);
  }

  function onColsChange(nextChartCols: number) {
    chartCols = nextChartCols;
    currentDataCount = dataCount;
    dataProviders = getDataProvidersForDataCount(mochartDemoConfig.mochartConfig, data, chartRows * chartCols, currentDataCount);
    focusedGroupIndices = getFocusedGroupIndices(dataProviders);
  }

  function onStepBackwardClick() {
    currentDataCount = dataCount + (currentDataCount - 1) % dataCount;
    dataProviders = getDataProvidersForDataCount(mochartDemoConfig.mochartConfig, data, chartRows * chartCols, currentDataCount);
    focusedGroupIndices = getFocusedGroupIndices(dataProviders);
  }

  function onStepForwardClick() {
    currentDataCount = (currentDataCount + 1) % dataCount;
    dataProviders = getDataProvidersForDataCount(mochartDemoConfig.mochartConfig, data, chartRows * chartCols, currentDataCount);
    focusedGroupIndices = getFocusedGroupIndices(dataProviders);
  }

  function getFocusedGroupIndices(nextDataProviders: ChartDataProviderLike[]): number[] {
    const { mochartConfig } = mochartDemoConfig;
    if (focusedGroupIndex >= 0) {
      const groupValue = data[focusedGroupIndex][mochartConfig.groupAxisConfig.property ?? ''];
      return getFocusedGroupIndicesForValue(nextDataProviders, groupValue);
    }
    else {
      return nextDataProviders.map(() => -1);
    }
  }

  function getFocusedGroupIndicesForValue(nextDataProviders: ChartDataProviderLike[], groupValue: unknown): number[] {
    let count, i;
    return nextDataProviders.map(dataProvider => {
      let chartGroupIndex = -1;
      const groupValues = dataProvider.getGroupValues();
      count = groupValues.length;
      for (i = 0; i < count; i++) {
        if (groupValues[i] === groupValue) {
          chartGroupIndex = i;
          break;
        }
      }
      return chartGroupIndex;
    });
  }

  function onPlayBackwardClick() {
    playing = true;
    intervalId = setInterval(onStepBackwardClick, rate);
  }

  function onPlayForwardClick() {
    playing = true;
    intervalId = setInterval(onStepForwardClick, rate);
  }

  function onStopClick() {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    intervalId = null;
    playing = false;
  }

  onDestroy(() => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  });

  function onChartFocus(chartIndex: number, focusData: { focusedSeriesAxisId?: string | null; focusedSeriesId?: string | null; focusedGroupIndex?: number }) {
    const { focusedSeriesAxisId: seriesAxisId, focusedSeriesId: seriesId } = focusData;
    let groupIndex = focusData.focusedGroupIndex;
    const { mochartConfig } = mochartDemoConfig;
    let nextFocusedGroupIndices = focusedGroupIndices;
    if (groupIndex !== void 0 && groupIndex >= 0) {
      const groupValue = dataProviders[chartIndex].getGroupValues()[groupIndex];
      let i, count = data.length;
      for (i = 0; i < count; i++) {
        if (data[i][mochartConfig.groupAxisConfig.property ?? ''] === groupValue) {
          groupIndex = i;
          break;
        }
      }
      if (groupIndex !== focusedGroupIndex) {
        nextFocusedGroupIndices = getFocusedGroupIndicesForValue(dataProviders, groupValue);
      }
    }
    else if (focusedGroupIndex >= 0) {
      nextFocusedGroupIndices = dataProviders.map(() => -1);
    }
    if (groupIndex !== void 0) {
      focusedGroupIndex = groupIndex;
    }
    if (seriesAxisId !== void 0) {
      focusedSeriesAxisId = seriesAxisId;
    }
    if (seriesId !== void 0) {
      focusedSeriesId = seriesId;
    }
    focusedGroupIndices = nextFocusedGroupIndices;
  }

  // The chart owns filter toggling now and reports the whole map.
  function onSeriesFilter({ filteredSeriesIds: nextFilteredSeriesIds }: { filteredSeriesIds: FilteredSeriesIds }) {
    filteredSeriesIds = { ...nextFilteredSeriesIds };
  }

  // Measured size of the charts grid (react-sizer equivalent).
  let gridWidth = $state(0);
  let gridHeight = $state(0);

  const chartWidth = $derived(Math.floor((gridWidth - scrollWidthOffset) / chartCols));
  const chartHeight = $derived(Math.floor(gridHeight / chartRows));
</script>

<div class={"mochart-demo-tab-container col chart" + (active ? " active" : "")}>
  <div class="multi-charts-sizer" bind:clientWidth={gridWidth} bind:clientHeight={gridHeight}>
    {#if gridWidth > 0}
      <div class="multi-charts">
        {#each dataProviders as dataProvider, i (i)}
          <div class="multi-mochart-chart">
            <Chart mochartConfig={mochartDemoConfig.mochartConfig} {dataProvider}
                   width={chartWidth} height={chartHeight}
                   {onSeriesFilter} onFocus={(focusData) => onChartFocus(i, focusData)} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
  <ChartsControls {playing} {onRowsChange} {onColsChange}
                  {onStepBackwardClick} {onStepForwardClick}
                  {onPlayBackwardClick} {onPlayForwardClick}
                  {onStopClick} {onRateChange} />
</div>
