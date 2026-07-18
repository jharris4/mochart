
import { buildMochartDemoConfig, getDataProvidersForDataCount } from '@mochart/demo-common';

import { el, observeSize, setActiveClass } from '../misc/dom';
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

export function chartsTab(props: ChartsTabProps): ChartsTabHandle {
  let demoObject = props.demoObject;
  let active = props.active ?? false;

  let intervalId: ReturnType<typeof setInterval> | null = null;

  let playing = false;
  let chartRows = defaultChartRows;
  let chartCols = defaultChartCols;
  let rate = defaultRate;
  let mochartDemoConfig = buildMochartDemoConfig(demoObject.config);
  let data = demoObject.data;
  let dataCount = demoObject.data.length;
  let currentDataCount = demoObject.data.length;
  let dataProviders = getDataProvidersForDataCount(
    mochartDemoConfig.mochartConfig, demoObject.data, defaultChartRows * defaultChartCols, demoObject.data.length);
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
    void focusedSeriesAxisId;
    void focusedSeriesId;
    void filteredSeriesIds;
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
    void focusedGroupIndices;
    syncCharts();
  }

  function onRateChange(nextRate: number): void {
    rate = nextRate;
  }

  function onRowsChange(nextChartRows: number): void {
    chartRows = nextChartRows;
    currentDataCount = dataCount;
    refreshDataProviders();
  }

  function onColsChange(nextChartCols: number): void {
    chartCols = nextChartCols;
    currentDataCount = dataCount;
    refreshDataProviders();
  }

  function onStepBackwardClick(): void {
    currentDataCount = dataCount + (currentDataCount - 1) % dataCount;
    refreshDataProviders();
  }

  function onStepForwardClick(): void {
    currentDataCount = (currentDataCount + 1) % dataCount;
    refreshDataProviders();
  }

  function onPlayBackwardClick(): void {
    playing = true;
    intervalId = setInterval(onStepBackwardClick, rate);
    controls.setPlaying(true);
  }

  function onPlayForwardClick(): void {
    playing = true;
    intervalId = setInterval(onStepForwardClick, rate);
    controls.setPlaying(true);
  }

  function onStopClick(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    intervalId = null;
    playing = false;
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
  }

  // The chart owns filter toggling now and reports the whole map.
  function onSeriesFilter({ filteredSeriesIds: nextFilteredSeriesIds }: { filteredSeriesIds: FilteredSeriesIds }): void {
    filteredSeriesIds = { ...nextFilteredSeriesIds };
  }

  const chartsGrid = el('div', { className: 'multi-charts' });
  const sizer = el('div', { className: 'multi-charts-sizer' }, [chartsGrid]);
  const controls = chartsControls({
    onRowsChange, onColsChange,
    onStepBackwardClick, onStepForwardClick,
    onPlayBackwardClick, onPlayForwardClick,
    onStopClick, onRateChange
  });

  const container = el('div', {
    className: 'mochart-demo-tab-container col chart' + (active ? ' active' : '')
  }, [sizer, controls.el]);

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
    while (chartHosts.length < dataProviders.length) {
      const i = chartHosts.length;
      const host = mountChart({
        mochartConfig: mochartDemoConfig.mochartConfig,
        dataProvider: dataProviders[i],
        width: chartWidth,
        height: chartHeight,
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
        currentDataCount = dataCount;
        dataProviders = getDataProvidersForDataCount(mochartDemoConfig.mochartConfig, data, chartRows * chartCols, currentDataCount);
        focusedGroupIndices = dataProviders.map(() => -1);
        syncCharts();
      }
    },
    destroy() {
      onStopClick();
      stopObserving();
      destroyCharts();
    }
  };
}
