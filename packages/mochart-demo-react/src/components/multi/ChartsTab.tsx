import React, { useState, useRef, useEffect } from 'react';
import Icon from '../misc/Icon';

import type { MochartConfig } from '@mochart/core';
import { Chart } from '@mochart/react';
import { exportChartsPNG, exportChartsSVG } from '@mochart/export';

import { buildMochartDemoConfig, consumeShareState, demoText, getDataProvidersForDataCount } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import ButtonWithTooltip from '../misc/ButtonWithTooltip';
import ExportShareMenu from '../misc/ExportShareMenu';
import { useElementSize } from '../misc/useElementSize';

import type { Demo, DataRow, MochartDemoConfig, FilteredSeriesIds, ChartDataProviderLike } from '../../types';

const scrollWidthOffset = 20;

const defaultChartRows = 2;
const defaultChartCols = 2;

const defaultRate = 2000;

interface Props {
  demoObject: Demo;
  active?: boolean;
}

interface ChartsTabState {
  focusedGroupIndex: number;
  focusedSeriesAxisId: string | null;
  focusedSeriesId: string | null;
  filteredSeriesIds: FilteredSeriesIds;
  playing: boolean;
  mochartDemoConfig: MochartDemoConfig;
  dataProviders: ChartDataProviderLike[];
  data: DataRow[];
  dataCount: number;
  currentDataCount: number;
  chartRows: number;
  chartCols: number;
  rate: number;
  focusedGroupIndices: number[];
}

function clampGrid(value: number): number {
  return Math.min(4, Math.max(1, Math.round(value)));
}

function buildInitial(demoObject: Demo, chartRows: number, chartCols: number, rate: number, step?: number): ChartsTabState {
  const mochartDemoConfig = buildMochartDemoConfig(demoObject.config);
  const { mochartConfig } = mochartDemoConfig;
  const data = demoObject.data;
  const dataCount = data.length;
  // A shared step seeks the playback position; otherwise start on the full set.
  const currentDataCount = step !== void 0 && dataCount > 0
    ? ((Math.round(step) % dataCount) + dataCount) % dataCount
    : dataCount;
  const dataProviders = getDataProvidersForDataCount(mochartConfig, data, chartRows * chartCols, currentDataCount);
  const focusedGroupIndices = dataProviders.map(() => -1);
  return {
    focusedGroupIndex: -1,
    focusedSeriesAxisId: null,
    focusedSeriesId: null,
    filteredSeriesIds: {},
    playing: false,
    mochartDemoConfig,
    dataProviders,
    data,
    dataCount,
    currentDataCount,
    chartRows,
    chartCols,
    rate,
    focusedGroupIndices
  };
}

export default function MultiMochartChartsTab({ demoObject, active }: Props) {
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // A share link restores the grid size, playback step and interval.
  const [state, setState] = useState<ChartsTabState>(() => {
    const sharedState = consumeShareState('multi');
    const shared = sharedState && sharedState.mode === 'multi' ? sharedState : null;
    return buildInitial(
      demoObject,
      shared ? clampGrid(shared.rows) : defaultChartRows,
      shared ? clampGrid(shared.cols) : defaultChartCols,
      shared ? shared.interval : defaultRate,
      shared ? shared.step : void 0
    );
  });

  // Rebuild when the demo changes.
  const prevDemoObject = useRef(demoObject);
  if (prevDemoObject.current !== demoObject) {
    prevDemoObject.current = demoObject;
    setState(prev => buildInitial(demoObject, prev.chartRows, prev.chartCols, prev.rate));
  }

  const getFocusedGroupIndicesForValue = (dataProviders: ChartDataProviderLike[], groupValue: unknown): number[] => {
    return dataProviders.map(dataProvider => {
      let chartGroupIndex = -1;
      const groupValues = dataProvider.getGroupValues();
      const count = groupValues.length;
      for (let i = 0; i < count; i++) {
        if (groupValues[i] === groupValue) {
          chartGroupIndex = i;
          break;
        }
      }
      return chartGroupIndex;
    });
  };

  const getFocusedGroupIndices = (s: ChartsTabState, dataProviders: ChartDataProviderLike[]): number[] => {
    const { mochartDemoConfig, data, focusedGroupIndex } = s;
    const { mochartConfig } = mochartDemoConfig;
    if (focusedGroupIndex >= 0) {
      const groupValue = data[focusedGroupIndex][mochartConfig.groupAxisConfig.property ?? ''];
      return getFocusedGroupIndicesForValue(dataProviders, groupValue);
    }
    else {
      return dataProviders.map(() => -1);
    }
  };

  const onRateChange = (rate: number) => setState(prev => ({ ...prev, rate }));

  const onRowsChange = (chartRows: number) => {
    setState(prev => {
      const { mochartConfig } = prev.mochartDemoConfig;
      const currentDataCount = prev.dataCount;
      const dataProviders = getDataProvidersForDataCount(mochartConfig, prev.data, chartRows * prev.chartCols, currentDataCount);
      const focusedGroupIndices = getFocusedGroupIndices(prev, dataProviders);
      return { ...prev, chartRows, currentDataCount, dataProviders, focusedGroupIndices };
    });
  };

  const onColsChange = (chartCols: number) => {
    setState(prev => {
      const { mochartConfig } = prev.mochartDemoConfig;
      const currentDataCount = prev.dataCount;
      const dataProviders = getDataProvidersForDataCount(mochartConfig, prev.data, prev.chartRows * chartCols, currentDataCount);
      const focusedGroupIndices = getFocusedGroupIndices(prev, dataProviders);
      return { ...prev, chartCols, currentDataCount, dataProviders, focusedGroupIndices };
    });
  };

  const onStepBackwardClick = () => {
    setState(prev => {
      const { mochartConfig } = prev.mochartDemoConfig;
      const currentDataCount = prev.dataCount + (prev.currentDataCount - 1) % prev.dataCount;
      const dataProviders = getDataProvidersForDataCount(mochartConfig, prev.data, prev.chartRows * prev.chartCols, currentDataCount);
      const focusedGroupIndices = getFocusedGroupIndices(prev, dataProviders);
      return { ...prev, currentDataCount, dataProviders, focusedGroupIndices };
    });
  };

  const onStepForwardClick = () => {
    setState(prev => {
      const { mochartConfig } = prev.mochartDemoConfig;
      const currentDataCount = (prev.currentDataCount + 1) % prev.dataCount;
      const dataProviders = getDataProvidersForDataCount(mochartConfig, prev.data, prev.chartRows * prev.chartCols, currentDataCount);
      const focusedGroupIndices = getFocusedGroupIndices(prev, dataProviders);
      return { ...prev, currentDataCount, dataProviders, focusedGroupIndices };
    });
  };

  const onPlayBackwardClick = () => {
    setState(prev => ({ ...prev, playing: true }));
    intervalIdRef.current = setInterval(onStepBackwardClick, state.rate);
  };

  const onPlayForwardClick = () => {
    setState(prev => ({ ...prev, playing: true }));
    intervalIdRef.current = setInterval(onStepForwardClick, state.rate);
  };

  const onStopClick = () => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
    }
    intervalIdRef.current = null;
    setState(prev => (prev.playing ? { ...prev, playing: false } : prev));
  };

  // Stop playback when active toggles (matches the old cWRP behavior).
  useEffect(() => {
    onStopClick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Clean up the interval on unmount.
  useEffect(() => () => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  const onChartFocus = (chartIndex: number, focusData: { focusedSeriesAxisId?: string | null; focusedSeriesId?: string | null; focusedGroupIndex?: number }) => {
    const { focusedSeriesAxisId: seriesAxisId, focusedSeriesId: seriesId } = focusData;
    let groupIndex = focusData.focusedGroupIndex;
    const { mochartDemoConfig, data, dataProviders, focusedGroupIndex: currentFocusedGroupIndex } = state;
    const { mochartConfig } = mochartDemoConfig;
    let focusedGroupIndices = state.focusedGroupIndices;
    if (groupIndex !== void 0 && groupIndex >= 0) {
      const groupValue = dataProviders[chartIndex].getGroupValues()[groupIndex];
      const count = data.length;
      for (let i = 0; i < count; i++) {
        if (data[i][mochartConfig.groupAxisConfig.property ?? ''] === groupValue) {
          groupIndex = i;
          break;
        }
      }
      if (groupIndex !== currentFocusedGroupIndex) {
        focusedGroupIndices = getFocusedGroupIndicesForValue(dataProviders, groupValue);
      }
    }
    else if (currentFocusedGroupIndex >= 0) {
      focusedGroupIndices = dataProviders.map(() => -1);
    }
    const nextFocusedGroupIndex = groupIndex !== void 0 ? groupIndex : currentFocusedGroupIndex;
    const nextFocusedSeriesAxisId = seriesAxisId !== void 0 ? seriesAxisId : state.focusedSeriesAxisId;
    const nextFocusedSeriesId = seriesId !== void 0 ? seriesId : state.focusedSeriesId;
    setState(prev => ({
      ...prev,
      focusedGroupIndices,
      focusedGroupIndex: nextFocusedGroupIndex,
      focusedSeriesAxisId: nextFocusedSeriesAxisId,
      focusedSeriesId: nextFocusedSeriesId
    }));
  };

  // The chart owns filter toggling now and reports the whole map.
  const onSeriesFilter = ({ filteredSeriesIds }: { filteredSeriesIds: FilteredSeriesIds }) => {
    setState(prev => ({ ...prev, filteredSeriesIds: { ...filteredSeriesIds } }));
  };

  const { filteredSeriesIds, focusedGroupIndices, focusedSeriesAxisId, focusedSeriesId, playing, mochartDemoConfig, dataProviders, chartRows, chartCols } = state;
  const { mochartConfig } = mochartDemoConfig;

  // Measured size of the charts grid (the old code wrapped it in a sizer HOC).
  const { elementRef: gridRef, width: gridWidth, height: gridHeight } = useElementSize();

  // The whole grid exports as one tiled image; share captures the grid size,
  // playback step and interval so the link restores the same view.
  const getChartContainers = (): Element[] => {
    const grid = gridRef.current;
    return grid ? Array.from(grid.querySelectorAll('.multi-mochart-chart')) : [];
  };

  const onExportPng = () => {
    const containers = getChartContainers();
    if (containers.length > 0) {
      void exportChartsPNG(containers, { cols: state.chartCols });
    }
  };

  const onExportSvg = () => {
    const containers = getChartContainers();
    if (containers.length > 0) {
      exportChartsSVG(containers, { cols: state.chartCols });
    }
  };

  const getShareState = (): ShareState => ({
    mode: 'multi', rows: state.chartRows, cols: state.chartCols, step: state.currentDataCount, interval: state.rate
  });

  return (
    <div className={"mochart-demo-tab-container demo-layout-col chart" + (active ? " active" : "")}>
      <div className="multi-charts-sizer" ref={gridRef}>
        {gridWidth > 0 ?
          <MultiMochartCharts width={gridWidth} height={gridHeight} mochartConfig={mochartConfig} dataProviders={dataProviders}
            chartRows={chartRows} chartCols={chartCols} filteredSeriesIds={filteredSeriesIds}
            focusedGroupIndices={focusedGroupIndices} focusedSeriesAxisId={focusedSeriesAxisId} focusedSeriesId={focusedSeriesId}
            onSeriesFilter={onSeriesFilter} onChartFocus={onChartFocus} />
          : null}
      </div>
      <MultiMochartControls playing={playing} initialRows={chartRows} initialCols={chartCols} initialRate={state.rate}
        onRowsChange={onRowsChange} onColsChange={onColsChange}
        onStepBackwardClick={onStepBackwardClick} onStepForwardClick={onStepForwardClick}
        onPlayBackwardClick={onPlayBackwardClick} onPlayForwardClick={onPlayForwardClick}
        onStopClick={onStopClick} onRateChange={onRateChange}
        exportPng={onExportPng} exportSvg={onExportSvg} getShareState={getShareState} />
    </div>
  );
}

interface ChartsProps {
  width: number;
  height: number;
  mochartConfig: MochartConfig;
  dataProviders: ChartDataProviderLike[];
  chartRows: number;
  chartCols: number;
  filteredSeriesIds: FilteredSeriesIds;
  focusedGroupIndices: number[];
  focusedSeriesAxisId?: string | null;
  focusedSeriesId?: string | null;
  onSeriesFilter: (filterData: { filteredSeriesIds: FilteredSeriesIds }) => void;
  onChartFocus: (chartIndex: number, focusData: any) => void;
}

function MultiMochartCharts({ width, height, mochartConfig, dataProviders, chartRows, chartCols, onSeriesFilter, onChartFocus }: ChartsProps) {
  const chartWidth = Math.floor((width - scrollWidthOffset) / chartCols);
  const chartHeight = Math.floor(height / chartRows);

  const charts: React.ReactNode[] = [];
  const chartCount = chartRows * chartCols;
  for (let i = 0; i < chartCount; i++) {
    const chartIndex = i;
    charts.push(
      <div key={'chart-' + i} className="multi-mochart-chart">
        <Chart mochartConfig={mochartConfig} dataProvider={dataProviders[i]} width={chartWidth} height={chartHeight}
          onSeriesFilter={onSeriesFilter} onFocus={(fd) => onChartFocus(chartIndex, fd)} />
      </div>
    );
  }

  return (
    <div className="multi-charts">
      {charts}
    </div>
  );
}

interface ControlsProps {
  playing: boolean;
  initialRows: number;
  initialCols: number;
  initialRate: number;
  onRowsChange: (rows: number) => void;
  onColsChange: (cols: number) => void;
  onStepBackwardClick: () => void;
  onStepForwardClick: () => void;
  onPlayBackwardClick: () => void;
  onPlayForwardClick: () => void;
  onStopClick: () => void;
  onRateChange: (rate: number) => void;
  exportPng: () => void;
  exportSvg: () => void;
  getShareState: () => ShareState;
}

function MultiMochartControls({ playing, initialRows, initialCols, initialRate, onRowsChange, onColsChange, onStepBackwardClick, onStepForwardClick, onPlayBackwardClick, onPlayForwardClick, onStopClick, onRateChange, exportPng, exportSvg, getShareState }: ControlsProps) {
  // Seed the inputs from the (possibly share-restored) initial values.
  const [rateText, setRateText] = useState<string | number>(initialRate);
  const [rowsText, setRowsText] = useState<string | number>(initialRows);
  const [colsText, setColsText] = useState<string | number>(initialCols);

  // Input values arrive as strings and are coerced to numbers in place, so the
  // working variable is intentionally loose (matching the original demo).
  const rowsChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    let rows: any = event.target.value;
    if (!isNaN(parseFloat(rows)) && isFinite(rows)) {
      rows = +rows;
      if (rows >= 1 && rows <= 4) {
        onRowsChange(rows);
      }
    }
    setRowsText(rows);
  };

  const colsChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    let cols: any = event.target.value;
    if (!isNaN(parseFloat(cols)) && isFinite(cols)) {
      cols = +cols;
      if (cols >= 1 && cols <= 4) {
        onColsChange(cols);
      }
    }
    setColsText(cols);
  };

  const rateChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    let rate: any = event.target.value;
    if (!isNaN(parseFloat(rate)) && isFinite(rate)) {
      rate = +rate;
      if (rate >= 5 && rate <= 60000) {
        onRateChange(rate);
      }
    }
    setRateText(rate);
  };

  return (
    <div className="multi-controls">
      <form className="demo-form-row">
        <div className="demo-field">
          <label className="demo-label" htmlFor="grid-rows">{demoText.multiChartsTab.gridLabel}</label>
          <input id="grid-rows" className="demo-input" disabled={playing} type="number" min={1} max={4} value={rowsText}
            onChange={rowsChanged} aria-label={demoText.multiChartsTab.gridRowsAria} />
          <span className="demo-label">&times;</span>
          <input id="grid-cols" className="demo-input" disabled={playing} type="number" min={1} max={4} value={colsText}
            onChange={colsChanged} aria-label={demoText.multiChartsTab.gridColsAria} />
        </div>
        <div className="demo-field">
          <div className="demo-toolbar" role="toolbar">
            <div className="demo-btn-group">
              <ButtonWithTooltip id="step-back" disabled={playing} tooltipText={demoText.multiChartsTab.stepBackward.tooltip} tooltipPlacement="top-start"
                onClick={onStepBackwardClick} aria-label={demoText.multiChartsTab.stepBackward.aria}>
                <Icon size="lg" fixedWidth={true} name="backward-step" />
              </ButtonWithTooltip>
              <ButtonWithTooltip id="step-forward" disabled={playing} tooltipText={demoText.multiChartsTab.stepForward.tooltip} tooltipPlacement="top-start"
                onClick={onStepForwardClick} aria-label={demoText.multiChartsTab.stepForward.aria}>
                <Icon size="lg" fixedWidth={true} name="forward-step" />
              </ButtonWithTooltip>
              <ButtonWithTooltip id="play-backward" disabled={playing} tooltipText={demoText.multiChartsTab.playBackward.tooltip} tooltipPlacement="top-start"
                onClick={onPlayBackwardClick} aria-label={demoText.multiChartsTab.playBackward.aria}>
                <Icon size="lg" fixedWidth={true} name="play" flip="horizontal" />
              </ButtonWithTooltip>
              <ButtonWithTooltip id="play-forward" disabled={playing} tooltipText={demoText.multiChartsTab.playForward.tooltip} tooltipPlacement="top-start"
                onClick={onPlayForwardClick} aria-label={demoText.multiChartsTab.playForward.aria}>
                <Icon size="lg" fixedWidth={true} name="play" />
              </ButtonWithTooltip>
              <ButtonWithTooltip id="stop" disabled={!playing} tooltipText={demoText.multiChartsTab.stop.tooltip} tooltipPlacement="top-start"
                onClick={onStopClick} aria-label={demoText.multiChartsTab.stop.aria}>
                <Icon size="lg" fixedWidth={true} name="stop" />
              </ButtonWithTooltip>
            </div>
          </div>
        </div>
        <div className="demo-field">
          <label className="demo-label" htmlFor="multi-rate">{demoText.multiChartsTab.intervalLabel}</label>
          <input id="multi-rate" className="demo-input" disabled={playing} type="number" min={5} max={60000} step={100} value={rateText}
            onChange={rateChanged} aria-label={demoText.multiChartsTab.intervalAria} />
        </div>
        <div className="demo-field">
          <div className="demo-toolbar" role="toolbar">
            <ExportShareMenu idPrefix="multi" exportPng={exportPng} exportSvg={exportSvg} getShareState={getShareState} />
          </div>
        </div>
      </form>
    </div>
  );
}
