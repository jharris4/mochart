
import { getChartExportOptions, buildMochartDemoConfig, consumeShareState, getDataProvidersForDataCount, getPieSlices, getPieStepCycle, getPieStepSuppressedIds } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';
import { exportChartsPNG, exportChartsSVG } from '@mochart/export';

import { el, observeSize, setActiveClass, tabContainer } from '../misc/dom';
import { mountChart } from '../misc/chartHost';
import type { ChartHostHandle } from '../misc/chartHost';
import { chartsControls } from './ChartsControls';

import type { Demo, FilteredSeriesIds, ChartDataProviderLike } from '../../types';

export interface ChartsTabProps {
  demoObject: Demo;
  active?: boolean;
}

export interface ChartsTabHandle {
  el: HTMLElement;
  setActive(active: boolean): void;
  setDemoObject(demoObject: Demo): void;
  destroy(): void;
}

const scrollWidthOffset = 20;
const defaultChartRows = 2;
const defaultChartCols = 2;
const defaultRate = 2000;

function clampGrid(value: number): number {
  return Math.min(4, Math.max(1, Math.round(value)));
}

export function chartsTab(props: ChartsTabProps): ChartsTabHandle {
  let demoObject = props.demoObject;
  let active = props.active ?? false;

  let intervalId: ReturnType<typeof setInterval> | null = null;

  // A share link restores the grid size, playback step and interval.
  const shared = consumeShareState('multi');
  const sharedMulti = shared && shared.mode === 'multi' ? shared : null;

  let chartRows = sharedMulti ? clampGrid(sharedMulti.rows) : defaultChartRows;
  let chartCols = sharedMulti ? clampGrid(sharedMulti.cols) : defaultChartCols;
  let rate = sharedMulti ? sharedMulti.interval : defaultRate;
  let mochartDemoConfig = buildMochartDemoConfig(demoObject.config);
  let data = demoObject.data;
  let dataCount = demoObject.data.length;
  // Pie mode steps a suppression pattern instead of data prefixes: chart i at
  // step s suppresses the last (s + i) mod cycle slices, so the grid shows
  // different-sized views of the same pie and stepping animates all charts.
  let sliceIds = mochartDemoConfig.pieMode ? getPieSlices(mochartDemoConfig.mochartConfig).map(slice => slice.id) : [];
  const stepCycle = () => mochartDemoConfig.pieMode ? getPieStepCycle(sliceIds) : dataCount;
  // A shared step seeks the playback position; otherwise start on the full set
  // (pie mode starts at step 0 — the grid's staggered initial view).
  let currentDataCount = sharedMulti && stepCycle() > 0
    ? ((Math.round(sharedMulti.step) % stepCycle()) + stepCycle()) % stepCycle()
    : (mochartDemoConfig.pieMode ? 0 : dataCount);
  let dataProviders = getDataProvidersForDataCount(
    mochartDemoConfig.mochartConfig, demoObject.data, chartRows * chartCols, currentDataCount);
  let focusedGroupIndices: number[] = dataProviders.map(() => -1);
  let focusedGroupIndex = -1;
  let focusedSeriesAxisId: string | null = null;
  let focusedSeriesId: string | null = null;
  let filteredSeriesIds: FilteredSeriesIds = {};

  // Measured size of the charts grid.
  let gridWidth = 0;
  let gridHeight = 0;

  let chartHosts: ChartHostHandle[] = [];

  function initFocusAndFiltered(): void {
    focusedGroupIndex = -1;
    focusedSeriesAxisId = null;
    focusedSeriesId = null;
    filteredSeriesIds = {};
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

  function refreshDataProviders(): void {
    dataProviders = getDataProvidersForDataCount(mochartDemoConfig.mochartConfig, data, chartRows * chartCols, currentDataCount);
    focusedGroupIndices = getFocusedGroupIndices(dataProviders);
    syncCharts();
  }

  function onRateChange(nextRate: number): void {
    rate = nextRate;
  }

  function resetStep(): number {
    return mochartDemoConfig.pieMode ? 0 : dataCount;
  }

  function onRowsChange(nextChartRows: number): void {
    chartRows = nextChartRows;
    currentDataCount = resetStep();
    refreshDataProviders();
  }

  function onColsChange(nextChartCols: number): void {
    chartCols = nextChartCols;
    currentDataCount = resetStep();
    refreshDataProviders();
  }

  function onStepBackwardClick(): void {
    const cycle = stepCycle();
    currentDataCount = mochartDemoConfig.pieMode
      ? (currentDataCount - 1 + cycle) % cycle
      : cycle + (currentDataCount - 1) % cycle;
    refreshDataProviders();
  }

  function onStepForwardClick(): void {
    currentDataCount = (currentDataCount + 1) % stepCycle();
    refreshDataProviders();
  }

  function onPlayBackwardClick(): void {
    intervalId = setInterval(onStepBackwardClick, rate);
    controls.setPlaying(true);
  }

  function onPlayForwardClick(): void {
    intervalId = setInterval(onStepForwardClick, rate);
    controls.setPlaying(true);
  }

  function onStopClick(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    intervalId = null;
    controls.setPlaying(false);
  }

  function onChartFocus(chartIndex: number, focusData: { focusedSeriesAxisId?: string | null; focusedSeriesId?: string | null; focusedGroupIndex?: number }): void {
    const { focusedSeriesAxisId: seriesAxisId, focusedSeriesId: seriesId } = focusData;
    let groupIndex = focusData.focusedGroupIndex;
    const { mochartConfig } = mochartDemoConfig;
    let nextFocusedGroupIndices = focusedGroupIndices;
    if (groupIndex !== undefined && groupIndex >= 0) {
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
    if (groupIndex !== undefined) {
      focusedGroupIndex = groupIndex;
    }
    if (seriesAxisId !== undefined) {
      focusedSeriesAxisId = seriesAxisId;
    }
    if (seriesId !== undefined) {
      focusedSeriesId = seriesId;
    }
    focusedGroupIndices = nextFocusedGroupIndices;
    syncCharts();
  }

  // The chart owns filter toggling now and reports the whole map.
  function onSeriesFilter({ filteredSeriesIds: nextFilteredSeriesIds }: { filteredSeriesIds: FilteredSeriesIds }): void {
    filteredSeriesIds = { ...nextFilteredSeriesIds };
    syncCharts();
  }

  const chartsGrid = el('div', { className: 'multi-charts' });
  const sizer = el('div', { className: 'multi-charts-sizer' }, [chartsGrid]);

  // The whole grid exports as one tiled image; share captures the grid size,
  // playback step and interval so the link restores the same view.
  function getChartContainers(): Element[] {
    return Array.from(chartsGrid.querySelectorAll('.multi-mochart-chart'));
  }

  function onExportPng(): void {
    const containers = getChartContainers();
    if (containers.length > 0) {
      void exportChartsPNG(containers, { cols: chartCols, ...getChartExportOptions() });
    }
  }

  function onExportSvg(): void {
    const containers = getChartContainers();
    if (containers.length > 0) {
      exportChartsSVG(containers, { cols: chartCols, ...getChartExportOptions() });
    }
  }

  function getShareState(): ShareState {
    return { mode: 'multi', rows: chartRows, cols: chartCols, step: currentDataCount, interval: rate };
  }

  const controls = chartsControls({
    onRowsChange, onColsChange,
    onStepBackwardClick, onStepForwardClick,
    onPlayBackwardClick, onPlayForwardClick,
    onStopClick, onRateChange,
    initialRows: chartRows,
    initialCols: chartCols,
    initialRate: rate,
    exportPng: onExportPng,
    exportSvg: onExportSvg,
    getShareState
  });

  const container = tabContainer('demo-layout-col chart', active, [sizer, controls.el]);

  const stopObserving = observeSize(sizer, (nextWidth, nextHeight) => {
    gridWidth = nextWidth;
    gridHeight = nextHeight;
    syncCharts();
  });

  function destroyCharts(): void {
    for (const host of chartHosts) {
      host.destroy();
    }
    chartHosts = [];
    chartsGrid.replaceChildren();
  }

  function syncCharts(): void {
    if (gridWidth <= 0) {
      destroyCharts();
      return;
    }
    const chartWidth = Math.floor((gridWidth - scrollWidthOffset) / chartCols);
    const chartHeight = Math.floor(gridHeight / chartRows);

    while (chartHosts.length > dataProviders.length) {
      const host = chartHosts.pop()!;
      host.destroy();
      host.el.parentElement?.remove();
    }
    // Pie mode unions the stepper's per-chart suppression with the user's
    // legend filtering, so the legend stays interactive while stepping.
    const chartFilteredSeriesIds = (i: number): FilteredSeriesIds => mochartDemoConfig.pieMode
      ? { ...filteredSeriesIds, ...getPieStepSuppressedIds(sliceIds, i, currentDataCount) }
      : filteredSeriesIds;

    while (chartHosts.length < dataProviders.length) {
      const i = chartHosts.length;
      const host = mountChart({
        mochartConfig: mochartDemoConfig.mochartConfig,
        dataProvider: dataProviders[i],
        width: chartWidth,
        height: chartHeight,
        filteredSeriesIds: chartFilteredSeriesIds(i),
        focusedGroupIndex: focusedGroupIndices[i] ?? -1,
        focusedSeriesAxisId: focusedSeriesAxisId ?? null,
        focusedSeriesId: focusedSeriesId ?? null,
        onSeriesFilter,
        onFocus: (focusData: any) => onChartFocus(i, focusData)
      });
      chartHosts.push(host);
      chartsGrid.append(el('div', { className: 'multi-mochart-chart' }, [host.el]));
    }
    chartHosts.forEach((host, i) => {
      host.update({
        mochartConfig: mochartDemoConfig.mochartConfig,
        dataProvider: dataProviders[i],
        width: chartWidth,
        height: chartHeight,
        filteredSeriesIds: chartFilteredSeriesIds(i),
        focusedGroupIndex: focusedGroupIndices[i] ?? -1,
        focusedSeriesAxisId: focusedSeriesAxisId ?? null,
        focusedSeriesId: focusedSeriesId ?? null,
        onSeriesFilter,
        onFocus: (focusData: any) => onChartFocus(i, focusData)
      });
    });
  }

  return {
    el: container,
    setActive(nextActive: boolean) {
      if (nextActive !== active) {
        active = nextActive;
        setActiveClass(container, nextActive);
        onStopClick();
      }
    },
    setDemoObject(nextDemoObject: Demo) {
      if (nextDemoObject !== demoObject) {
        demoObject = nextDemoObject;
        mochartDemoConfig = buildMochartDemoConfig(nextDemoObject.config);
        initFocusAndFiltered();
        onStopClick();
        data = nextDemoObject.data;
        dataCount = data.length;
        sliceIds = mochartDemoConfig.pieMode ? getPieSlices(mochartDemoConfig.mochartConfig).map(slice => slice.id) : [];
        currentDataCount = resetStep();
        dataProviders = getDataProvidersForDataCount(mochartDemoConfig.mochartConfig, data, chartRows * chartCols, currentDataCount);
        focusedGroupIndices = dataProviders.map(() => -1);
        syncCharts();
      }
    },
    destroy() {
      onStopClick();
      stopObserving();
      controls.destroy();
      destroyCharts();
    }
  };
}
