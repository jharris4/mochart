import React, { useState, useRef } from 'react';
import sizer from 'react-sizer';

import { hasConfigStructureChange } from '@mochart/core';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import EditableChart from './EditableChart';

import type { DemoConfig, DataRow, MochartDemoConfig, FilteredSeriesIds, FocusData } from '../../types';

const minChartWidthForSecondChart = 480;
const scrollWidthOffset = 20;
const defaultChartCount = 1;

interface Props {
  width: number;
  config?: DemoConfig | null;
  data?: DataRow[] | null;
  dataError?: string | boolean | null;
  active?: boolean;
}

interface FocusState {
  focusedSeriesAxisId: string | null;
  focusedSeriesId: string | null;
  focusedGroupIndex: number;
  filteredSeriesIds: FilteredSeriesIds;
}

interface ChartTabState {
  chartCount: number;
  focusedSeriesAxisId: string | null;
  focusedSeriesId: string | null;
  focusedGroupIndex: number;
  filteredSeriesIds: FilteredSeriesIds;
  mochartDemoConfig: MochartDemoConfig | null;
}

function MochartChartTab({ width, config = null, data = null, dataError = false, active }: Props) {
  // Authoritative focus/filter values (the old instance fields), mirrored to
  // state for rendering.
  const focus = useRef<FocusState>({
    focusedSeriesAxisId: null,
    focusedSeriesId: null,
    focusedGroupIndex: -1,
    filteredSeriesIds: {}
  });

  const initFocusAndFiltered = () => {
    focus.current.focusedSeriesAxisId = null;
    focus.current.focusedSeriesId = null;
    focus.current.focusedGroupIndex = -1;
    focus.current.filteredSeriesIds = {};
  };

  const [state, setState] = useState<ChartTabState>(() => ({
    chartCount: defaultChartCount,
    focusedSeriesAxisId: focus.current.focusedSeriesAxisId,
    focusedSeriesId: focus.current.focusedSeriesId,
    focusedGroupIndex: focus.current.focusedGroupIndex,
    filteredSeriesIds: focus.current.filteredSeriesIds,
    mochartDemoConfig: config ? buildMochartDemoConfig(config) : null
  }));

  // Mirror the old UNSAFE_componentWillReceiveProps derived-state logic: rebuild
  // the demo config and reset focus/filter on structural config change or data
  // error; remap the focused group index onto new data.
  const prev = useRef({ config, data, dataError });
  if (prev.current.config !== config || prev.current.data !== data || prev.current.dataError !== dataError) {
    const { config: oldConfig, data: oldData, dataError: oldDataError } = prev.current;
    prev.current = { config, data, dataError };

    const before = { ...focus.current };
    let nextMochartDemoConfig = state.mochartDemoConfig;

    if (dataError || config !== oldConfig) {
      let configChanged = false;
      if (config !== oldConfig) {
        nextMochartDemoConfig = config ? buildMochartDemoConfig(config) : null;
        if (nextMochartDemoConfig && state.mochartDemoConfig) {
          configChanged = hasConfigStructureChange(state.mochartDemoConfig.mochartConfig, nextMochartDemoConfig.mochartConfig);
        }
      }
      if (dataError || configChanged) {
        initFocusAndFiltered();
      }
    }
    else if (data !== oldData) {
      const mdc = state.mochartDemoConfig;
      if (mdc) {
        const { configValidation, mochartConfig } = mdc;
        const { valid } = configValidation;
        if (!oldDataError && oldData && data && valid) {
          if (focus.current.focusedGroupIndex >= 0) {
            const property = mochartConfig.groupAxisConfig.property ?? '';
            const groupValue = oldData[focus.current.focusedGroupIndex][property];
            let newFocusedGroupIndex = -1;
            for (let i = 0; i < data.length; i++) {
              if (data[i][property] === groupValue) {
                newFocusedGroupIndex = i;
                break;
              }
            }
            focus.current.focusedGroupIndex = newFocusedGroupIndex;
          }
        }
        else {
          initFocusAndFiltered();
        }
      }
    }

    if (focus.current.focusedSeriesAxisId !== before.focusedSeriesAxisId ||
        focus.current.focusedSeriesId !== before.focusedSeriesId ||
        focus.current.focusedGroupIndex !== before.focusedGroupIndex ||
        focus.current.filteredSeriesIds !== before.filteredSeriesIds ||
        config !== oldConfig) {
      setState(prevState => ({
        ...prevState,
        focusedSeriesAxisId: focus.current.focusedSeriesAxisId,
        focusedSeriesId: focus.current.focusedSeriesId,
        focusedGroupIndex: focus.current.focusedGroupIndex,
        filteredSeriesIds: focus.current.filteredSeriesIds,
        mochartDemoConfig: nextMochartDemoConfig
      }));
    }
  }

  const onFocus = (focusData: FocusData = {}) => {
    const { seriesAxisId, seriesId, groupIndex } = focusData;
    if (seriesAxisId !== void 0) {
      focus.current.focusedSeriesAxisId = seriesAxisId;
    }
    if (seriesId !== void 0) {
      focus.current.focusedSeriesId = seriesId;
    }
    if (groupIndex !== void 0) {
      focus.current.focusedGroupIndex = groupIndex;
    }
    setState(prevState => ({
      ...prevState,
      focusedSeriesAxisId: focus.current.focusedSeriesAxisId,
      focusedSeriesId: focus.current.focusedSeriesId,
      focusedGroupIndex: focus.current.focusedGroupIndex
    }));
  };

  // The chart owns filter toggling now and reports the whole map.
  const onSeriesFilter = ({ filteredSeriesIds }: { filteredSeriesIds: FilteredSeriesIds }) => {
    focus.current.filteredSeriesIds = { ...filteredSeriesIds };
    setState(prevState => ({ ...prevState, filteredSeriesIds: focus.current.filteredSeriesIds }));
  };

  const onChartCountToggle = () => setState(prevState => ({ ...prevState, chartCount: prevState.chartCount === 1 ? 2 : 1 }));

  const { chartCount, filteredSeriesIds, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId, mochartDemoConfig } = state;

  const charts: React.ReactNode[] = [];
  if (mochartDemoConfig) {
    const allowedChartCount = Math.floor(width / 2) > minChartWidthForSecondChart ? 2 : 1;
    const adjustedChartCount = Math.min(chartCount, allowedChartCount);
    const chartWidth = Math.floor((width - scrollWidthOffset) / adjustedChartCount);

    for (let i = 0; i < adjustedChartCount; i++) {
      charts.push(
        <EditableChart key={'chart-' + i} chartCount={chartCount} showChartCountControls={allowedChartCount > 1 && i === 0}
          width={chartWidth} mochartDemoConfig={mochartDemoConfig} data={data ?? []} dataError={dataError}
          isActive={active} filteredSeriesIds={filteredSeriesIds} focusedGroupIndex={focusedGroupIndex}
          focusedSeriesAxisId={focusedSeriesAxisId} focusedSeriesId={focusedSeriesId} onChartCountToggle={onChartCountToggle}
          onFocus={onFocus} onSeriesFilter={onSeriesFilter} />
      );
    }
  }

  return (
    <div className={"mochart-demo-tab-container row chart" + (active ? " active" : "")}>
      <div className="editable-charts-sizer">
        <div className="editable-charts">
          {charts}
        </div>
      </div>
    </div>
  );
}

const SizerMochartChartTab = sizer()(MochartChartTab);

export default SizerMochartChartTab;
