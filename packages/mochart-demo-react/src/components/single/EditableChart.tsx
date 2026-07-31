import React, { useState, useRef, useEffect } from 'react';
import Icon from '../misc/Icon';

import { hasConfigStructureChange, NONE, ArrayOfObjectsDataProvider } from '@mochart/core';
import { Chart } from '@mochart/react';
import { exportPNG, exportSVG } from '@mochart/export';

import { applyPieSliceValue, getChartExportOptions, getGroupIndexTitle, getPieSequenceSteps, getPieSlices, getSeriesIndexTitle, demoText } from '@mochart/demo-common';

import type { PieSliceInfo } from '@mochart/demo-common';

import ButtonWithTooltip from '../misc/ButtonWithTooltip';
import ExportShareMenu from '../misc/ExportShareMenu';
import OverflowMenu, { MenuDivider } from '../misc/OverflowMenu';
import { usePhoneViewport } from '../misc/usePhoneViewport';

import type { MochartDemoConfig, FilteredSeriesIds, FocusData } from '../../types';

// The binding forwards all props through to the core chart, but its typed

const emptyGroupText = demoText.editableChart.emptyGroupText;

// Mutable working rows are keyed by config-driven property names, so their
// value type is intentionally loose.
type Row = Record<string, any>;

interface EditableDataProvider {
  getGroupValues?: (...args: any[]) => any;
  getSeriesValue?: (...args: any[]) => any;
  getError?: (...args: any[]) => any;
}

interface FocusPayload {
  seriesAxisId?: string | null;
  seriesId?: string | null;
  groupIndex?: number;
}

interface Props {
  width: number;
  mochartDemoConfig: MochartDemoConfig;
  data: Row[];
  dataError?: string | boolean | null;
  isActive?: boolean;
  chartCount: number;
  showChartCountControls: boolean;
  /** Set on the chart instance that should render the share button. */
  showShareButton?: boolean;
  filteredSeriesIds: FilteredSeriesIds;
  focusedGroupIndex: number;
  focusedSeriesAxisId?: string | null;
  focusedSeriesId?: string | null;
  onFocus: (focusData: FocusData) => void;
  onSeriesFilter: (filterData: { filteredSeriesIds: FilteredSeriesIds }) => void;
  onChartCountToggle: () => void;
}

interface EditableState {
  dataProvider: EditableDataProvider | null;
  groupIndex: number;
  groupValuesText: string;
  seriesIndex: number;
  seriesValuesText: string;
  selectionMode: string;
  filteredData: Row[] | null;
  sequencePlaying: boolean;
  filteredFocusedGroupIndex: number;
  orderChanged: boolean;
  // pie-mode slice editing: slices are the series, so the group machinery has
  // nothing to operate on and a single slice panel replaces both panels
  slices: PieSliceInfo[];
  sliceIndex: number;
  sliceValueText: string;
}

function getSeriesValuesText({ mochartConfig }: MochartDemoConfig, filteredData: Row[], groupIndex: number, seriesIndex: number): string {
  const dataObject = filteredData[groupIndex];
  const { seriesConfigs } = mochartConfig;
  if (seriesConfigs.length > 0) {
    const seriesConfig = seriesConfigs[seriesIndex];
    const { property, rangeProperty, markerProperty, labelProperty, colorProperty } = seriesConfig;
    const seriesValuesTextObject: Record<string, unknown> = {};
    seriesValuesTextObject['p'] = dataObject[property!];
    if (rangeProperty !== NONE) {
      seriesValuesTextObject['r'] = dataObject[rangeProperty];
    }
    if (markerProperty !== NONE) {
      seriesValuesTextObject['m'] = dataObject[markerProperty];
    }
    if (labelProperty !== NONE) {
      seriesValuesTextObject['l'] = dataObject[labelProperty];
    }
    if (colorProperty !== NONE) {
      seriesValuesTextObject['c'] = dataObject[colorProperty];
    }
    return JSON.stringify(seriesValuesTextObject);
  }
  else {
    return "";
  }
}

function getSliceValueText(slices: PieSliceInfo[], sliceIndex: number, rows: Row[]): string {
  if (slices.length === 0 || rows.length === 0) {
    return "";
  }
  const value = rows[0][slices[sliceIndex].property];
  return value === undefined || value === null ? "" : String(value);
}

export default function EditableChart(props: Props) {
  // Keep the latest props reachable from the timer callbacks / render-phase
  // derived-state logic (the old `this.props`).
  const propsRef = useRef(props);
  propsRef.current = props;

  // Non-reactive working copies (the old instance fields).
  const chartContentRef = useRef<HTMLDivElement>(null);
  const filteredDataRef = useRef<Row[]>([]);
  const removedDataRef = useRef<Row[]>([]);
  const sequenceIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function getFilteredFocusedGroupIndex(filteredData: Row[]): number {
    const { mochartDemoConfig, data, focusedGroupIndex } = propsRef.current;
    let filteredFocusedGroupIndex = -1;
    if (focusedGroupIndex >= 0) {
      const groupProperty = mochartDemoConfig.groupProperty ?? '';
      const groupValue = data[focusedGroupIndex][groupProperty];
      const count = filteredData.length;
      for (let i = 0; i < count; i++) {
        if (filteredData[i][groupProperty] === groupValue) {
          filteredFocusedGroupIndex = i;
          break;
        }
      }
    }
    return filteredFocusedGroupIndex;
  }

  function buildFilteredState(prev: EditableState, partial: Partial<EditableState>, filteredData: Row[], removedData: Row[], resetGroupIndex: boolean): EditableState {
    const { mochartDemoConfig, dataError } = propsRef.current;
    filteredDataRef.current = filteredData;
    removedDataRef.current = removedData;
    const next: EditableState = { ...prev, ...partial };
    if (resetGroupIndex === true) {
      next.groupIndex = -1;
      next.seriesValuesText = demoText.editableChart.selectAGroupText;
    }
    next.filteredFocusedGroupIndex = dataError ? -1 : getFilteredFocusedGroupIndex(filteredData);
    next.filteredData = filteredData;
    if (!dataError && mochartDemoConfig.mochartConfig.validation.valid) {
      next.dataProvider = new ArrayOfObjectsDataProvider(filteredData, mochartDemoConfig.mochartConfig.groupAxisConfig.property ?? '');
    }
    else if (dataError) {
      next.dataProvider = { getError: () => dataError };
    }
    else {
      next.dataProvider = null;
    }
    return next;
  }

  const updateFilteredDataState = (partial: Partial<EditableState>, filteredData: Row[], removedData: Row[], resetGroupIndex = true) => {
    setState(prev => buildFilteredState(prev, partial, filteredData, removedData, resetGroupIndex));
  };

  const [state, setState] = useState<EditableState>(() => {
    const { data, dataError, mochartDemoConfig } = props;
    const slices = mochartDemoConfig.pieMode ? getPieSlices(mochartDemoConfig.mochartConfig) : [];
    const base: EditableState = {
      dataProvider: null,
      groupIndex: -1,
      groupValuesText: "",
      seriesIndex: 0,
      seriesValuesText: "",
      selectionMode: 'group',
      filteredData: null,
      sequencePlaying: false,
      filteredFocusedGroupIndex: -1,
      orderChanged: false,
      slices,
      sliceIndex: 0,
      sliceValueText: ""
    };
    const filteredData: Row[] = [];
    if (data && !dataError) {
      for (let i = 0; i < data.length; i++) {
        filteredData.push(Object.assign({}, data[i]));
      }
    }
    return buildFilteredState(base, {
      orderChanged: false, seriesIndex: 0, groupValuesText: emptyGroupText,
      sliceValueText: getSliceValueText(slices, 0, filteredData)
    }, filteredData, [], true);
  });

  function initData() {
    const { data, dataError, mochartDemoConfig } = propsRef.current;
    const filteredData: Row[] = [];
    if (data && !dataError) {
      for (let i = 0; i < data.length; i++) {
        filteredData.push(Object.assign({}, data[i]));
      }
    }
    const slices = mochartDemoConfig.pieMode ? getPieSlices(mochartDemoConfig.mochartConfig) : [];
    setState(prev => {
      const sliceIndex = prev.sliceIndex >= slices.length ? 0 : prev.sliceIndex;
      return buildFilteredState(prev, {
        orderChanged: false, seriesIndex: 0, groupValuesText: emptyGroupText,
        slices, sliceIndex, sliceValueText: getSliceValueText(slices, sliceIndex, filteredData)
      }, filteredData, [], true);
    });
  }

  // Reload/remap derived state when the demo config or data changes (the old
  // UNSAFE_componentWillReceiveProps behavior).
  const prevData = useRef(props.data);
  const prevDataError = useRef(props.dataError);
  const prevMochartDemoConfig = useRef(props.mochartDemoConfig);
  const prevFocusedGroupIndex = useRef(props.focusedGroupIndex);
  {
    const { data, dataError, mochartDemoConfig, focusedGroupIndex } = props;
    const pd = prevData.current;
    const pde = prevDataError.current;
    const pmdc = prevMochartDemoConfig.current;
    const pfgi = prevFocusedGroupIndex.current;
    if (pd !== data || pde !== dataError || pmdc !== mochartDemoConfig || pfgi !== focusedGroupIndex) {
      prevData.current = data;
      prevDataError.current = dataError;
      prevMochartDemoConfig.current = mochartDemoConfig;
      prevFocusedGroupIndex.current = focusedGroupIndex;
      if (data !== pd || dataError !== pde ||
          (mochartDemoConfig !== pmdc && hasConfigStructureChange(pmdc.mochartConfig, mochartDemoConfig.mochartConfig))) {
        initData();
      }
      else if (focusedGroupIndex !== pfgi) {
        setState(prev => ({ ...prev, filteredFocusedGroupIndex: getFilteredFocusedGroupIndex(filteredDataRef.current) }));
      }
    }
  }

  const stopSequenceInternal = () => {
    if (sequenceIdRef.current !== null) {
      clearInterval(sequenceIdRef.current);
      sequenceIdRef.current = null;
    }
  };

  const stopSequence = () => {
    stopSequenceInternal();
    setState(prev => (prev.sequencePlaying ? { ...prev, sequencePlaying: false } : prev));
  };

  // Stop any running sequence when the tab becomes inactive.
  useEffect(() => {
    if (props.isActive === false) {
      stopSequence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isActive]);

  // Clean up the interval on unmount.
  useEffect(() => stopSequenceInternal, []);

  const { mochartDemoConfig } = props;

  // mochart's ManagedChart reports focus with the new payload shape; adapt it
  // to the { seriesAxisId, seriesId, groupIndex } shape this demo tracks.
  const onChartFocus = ({ focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex }: { focusedSeriesAxisId?: string | null; focusedSeriesId?: string | null; focusedGroupIndex?: number }) => {
    onLocalFocus({ seriesAxisId: focusedSeriesAxisId, seriesId: focusedSeriesId, groupIndex: focusedGroupIndex });
  };

  const onLocalFocus = ({ seriesAxisId, seriesId, groupIndex }: FocusPayload) => {
    const { data, onFocus } = propsRef.current;
    if (groupIndex !== undefined) {
      const filteredFocusedGroupIndex = groupIndex;
      let newFocusedGroupIndex = -1;
      if (filteredFocusedGroupIndex >= 0) {
        const groupProperty = mochartDemoConfig.groupProperty ?? '';
        const filteredData = filteredDataRef.current;
        const groupValue = filteredData[filteredFocusedGroupIndex][groupProperty];
        const count = data.length;
        for (let i = 0; i < count; i++) {
          if (data[i][groupProperty] === groupValue) {
            newFocusedGroupIndex = i;
            break;
          }
        }
      }
      setState(prev => ({ ...prev, filteredFocusedGroupIndex }));
      onFocus({ seriesAxisId, seriesId, groupIndex: newFocusedGroupIndex });
    }
    else {
      onFocus({ seriesAxisId, seriesId, groupIndex });
    }
  };

  const onChartClick = ({ groupIndex }: { groupIndex: number }) => {
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const { filteredData, selectionMode, groupValuesText, seriesIndex } = state;
    if (filteredData === null) {
      return;
    }
    const clickedGroupValue = "" + filteredData[groupIndex][groupProperty];
    if (selectionMode === 'series') {
      const seriesValuesText = getSeriesValuesText(mochartDemoConfig, filteredData, groupIndex, seriesIndex);
      setState(prev => ({ ...prev, groupIndex, seriesValuesText }));
    }
    else if (selectionMode === 'group') {
      const dataGroupValues: any[] = [];
      const count = filteredData.length;
      for (let i = 0; i < count; i++) {
        dataGroupValues.push(filteredData[i][groupProperty]);
      }
      let parsedGroupValues = groupValuesText === emptyGroupText ? [] : groupValuesText.split(',');
      parsedGroupValues = parsedGroupValues.filter((parsedGroupValue) => dataGroupValues.indexOf(parsedGroupValue) !== -1 || dataGroupValues.indexOf(+parsedGroupValue) !== -1);
      const clickedIndex = parsedGroupValues.indexOf(clickedGroupValue);
      if (clickedIndex === -1) {
        parsedGroupValues = parsedGroupValues.concat(clickedGroupValue);
      }
      else {
        parsedGroupValues.splice(clickedIndex, 1);
      }
      setState(prev => ({ ...prev, groupValuesText: parsedGroupValues.length === 0 ? emptyGroupText : parsedGroupValues.join(',') }));
    }
  };

  const onModeToggle = () => setState(prev => ({ ...prev, selectionMode: prev.selectionMode === 'group' ? 'series' : 'group' }));

  const selectAllGroups = () => {
    const { data } = props;
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const allGroupValues: any[] = [];
    const count = data.length;
    for (let i = 0; i < count; i++) {
      allGroupValues.push(data[i][groupProperty]);
    }
    setState(prev => ({ ...prev, groupValuesText: allGroupValues.join(',') }));
  };

  const resetGroups = () => {
    const { data } = props;
    const oldFilteredData = filteredDataRef.current;
    const removedData = removedDataRef.current;
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const groupToObjectMap: Record<string, Row> = {};
    removedData.forEach(removedObject => {
      groupToObjectMap[removedObject[groupProperty]] = removedObject;
    });
    oldFilteredData.forEach(oldObject => {
      groupToObjectMap[oldObject[groupProperty]] = oldObject;
    });
    const filteredData = data.map(o => groupToObjectMap[o[groupProperty]]);
    updateFilteredDataState({ orderChanged: false }, filteredData, []);
  };

  const reverseGroups = () => {
    const oldFilteredData = filteredDataRef.current;
    const removedData = removedDataRef.current;
    if (oldFilteredData && oldFilteredData.length > 1) {
      const filteredData = oldFilteredData.slice().reverse();
      updateFilteredDataState({ orderChanged: true }, filteredData, removedData);
    }
  };

  const decreaseGroupOrder = () => {
    const oldFilteredData = filteredDataRef.current;
    const removedData = removedDataRef.current;
    if (oldFilteredData && oldFilteredData.length > 1) {
      const { groupIndex } = state;
      if (groupIndex > 0) {
        const filteredData = oldFilteredData.slice();
        const temp = filteredData[groupIndex - 1];
        filteredData[groupIndex - 1] = filteredData[groupIndex];
        filteredData[groupIndex] = temp;
        updateFilteredDataState({ orderChanged: true, groupIndex: groupIndex - 1 }, filteredData, removedData, false);
      }
    }
  };

  const increaseGroupOrder = () => {
    const oldFilteredData = filteredDataRef.current;
    const removedData = removedDataRef.current;
    if (oldFilteredData && oldFilteredData.length > 1) {
      const { groupIndex } = state;
      if (groupIndex < oldFilteredData.length - 1) {
        const filteredData = oldFilteredData.slice();
        const temp = filteredData[groupIndex + 1];
        filteredData[groupIndex + 1] = filteredData[groupIndex];
        filteredData[groupIndex] = temp;
        updateFilteredDataState({ orderChanged: true, groupIndex: groupIndex + 1 }, filteredData, removedData, false);
      }
    }
  };

  const groupValuesChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const groupValuesText = event.target.value;
    setState(prev => ({ ...prev, groupValuesText }));
  };

  const addGroups = () => {
    const { data } = props;
    const oldFilteredData = filteredDataRef.current;
    const oldRemovedData = removedDataRef.current;
    const { groupValuesText } = state;
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const groupValuesToAdd = groupValuesText === emptyGroupText ? [] : groupValuesText.split(",");
    const groupValueToAddMap: Record<string, boolean> = {};
    groupValuesToAdd.forEach(groupValueToAdd => {
      groupValueToAddMap[groupValueToAdd] = true;
    });
    const removedMap: Record<string, Row> = {};
    oldRemovedData.forEach(removedObject => {
      removedMap[removedObject[groupProperty]] = removedObject;
    });
    const count = data.length;
    const filteredCount = oldFilteredData.length;
    const filteredData: Row[] = [];
    for (let i = 0, fi = 0; i < count; i++) {
      if (fi < filteredCount) {
        if (data[i][groupProperty] !== oldFilteredData[fi][groupProperty]) {
          if (groupValueToAddMap[data[i][groupProperty]] === true) {
            filteredData.push(removedMap[data[i][groupProperty]]);
            delete removedMap[data[i][groupProperty]];
          }
        }
        else {
          filteredData.push(oldFilteredData[fi]);
          fi++;
        }
      }
      else if (groupValueToAddMap[data[i][groupProperty]] === true) {
        filteredData.push(removedMap[data[i][groupProperty]]);
        delete removedMap[data[i][groupProperty]];
      }
    }
    const removedData: Row[] = [];
    oldRemovedData.forEach(removedObject => {
      if (removedMap[removedObject[groupProperty]] !== undefined) {
        removedData.push(removedMap[removedObject[groupProperty]]);
      }
    });
    updateFilteredDataState({}, filteredData, removedData);
  };

  const removeGroups = () => {
    const oldFilteredData = filteredDataRef.current;
    const removedData = removedDataRef.current;
    const { groupValuesText } = state;
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const groupValuesToRemove = groupValuesText === emptyGroupText ? [] : groupValuesText.split(",");
    const groupValueToRemoveMap: Record<string, boolean> = {};
    groupValuesToRemove.forEach(groupValueToRemove => {
      groupValueToRemoveMap[groupValueToRemove] = true;
    });
    const count = oldFilteredData.length;
    const filteredData: Row[] = [];
    for (let i = 0; i < count; i++) {
      if (groupValueToRemoveMap[oldFilteredData[i][groupProperty]] !== true) {
        filteredData.push(oldFilteredData[i]);
      }
      else {
        removedData.push(oldFilteredData[i]);
      }
    }
    updateFilteredDataState({}, filteredData, removedData);
  };

  const startAddSequence = () => {
    const { data } = props;
    const oldFilteredData = filteredDataRef.current;
    const oldRemovedData = removedDataRef.current;
    const { groupValuesText } = state;
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const groupValuesToAdd = groupValuesText === emptyGroupText ? [] : groupValuesText.split(",");
    const groupValueToAddMap: Record<string, boolean> = {};
    groupValuesToAdd.forEach(groupValueToAdd => {
      groupValueToAddMap[groupValueToAdd] = true;
    });
    const removedIndexMap: Record<string, number> = {};
    oldRemovedData.forEach((removedObject, removedIndex) => {
      removedIndexMap[removedObject[groupProperty]] = removedIndex;
    });
    const groupObjectsToAdd: { removedIndex: number; dataIndex: number }[] = [];
    const count = data.length;
    const filteredCount = oldFilteredData.length;
    for (let i = 0, fi = 0; i < count; i++) {
      if (fi < filteredCount) {
        if (data[i][groupProperty] !== oldFilteredData[fi][groupProperty]) {
          if (groupValueToAddMap[data[i][groupProperty]] === true) {
            groupObjectsToAdd.push({
              removedIndex: removedIndexMap[data[i][groupProperty]] - groupObjectsToAdd.length,
              dataIndex: fi + groupObjectsToAdd.length
            });
          }
        }
        else {
          fi++;
        }
      }
      else if (groupValueToAddMap[data[i][groupProperty]] === true) {
        groupObjectsToAdd.push({
          removedIndex: removedIndexMap[data[i][groupProperty]] - groupObjectsToAdd.length,
          dataIndex: fi + groupObjectsToAdd.length
        });
      }
    }
    if (groupObjectsToAdd.length > 0) {
      setState(prev => ({ ...prev, sequencePlaying: true }));
      let addCount = 0;
      sequenceIdRef.current = setInterval(() => {
        oldFilteredData.splice(groupObjectsToAdd[addCount].dataIndex, 0, oldRemovedData.splice(groupObjectsToAdd[addCount].removedIndex, 1)[0]);
        updateFilteredDataState({}, oldFilteredData, oldRemovedData);
        if (addCount < groupObjectsToAdd.length - 1) {
          addCount++;
        }
        else {
          stopSequence();
        }
      }, 2000);
    }
  };

  const startRemoveSequence = () => {
    const { data } = props;
    const oldFilteredData = filteredDataRef.current;
    const oldRemovedData = removedDataRef.current;
    const { groupValuesText } = state;
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const groupValuesToRemove = groupValuesText === emptyGroupText ? [] : groupValuesText.split(",");
    const groupValueToRemoveMap: Record<string, boolean> = {};
    groupValuesToRemove.forEach(groupValueToRemove => {
      groupValueToRemoveMap[groupValueToRemove] = true;
    });
    const removedIndexMap: Record<string, number> = {};
    oldRemovedData.forEach((removedObject, removedIndex) => {
      removedIndexMap[removedObject[groupProperty]] = removedIndex;
    });
    const groupObjectsToRemove: { removedIndex: number; dataIndex: number }[] = [];
    const count = data.length;
    const filteredCount = oldFilteredData.length;
    for (let i = 0, fi = 0, ri = 0; i < count && fi < filteredCount; i++) {
      if (data[i][groupProperty] === oldFilteredData[fi][groupProperty]) {
        if (groupValueToRemoveMap[data[i][groupProperty]] === true) {
          groupObjectsToRemove.push({
            removedIndex: ri,
            dataIndex: fi - groupObjectsToRemove.length
          });
          ri++;
        }
        fi++;
      }
      else {
        ri++;
      }
    }
    if (groupObjectsToRemove.length > 0) {
      setState(prev => ({ ...prev, sequencePlaying: true }));
      let removeCount = 0;
      sequenceIdRef.current = setInterval(() => {
        oldRemovedData.splice(groupObjectsToRemove[removeCount].removedIndex, 0, oldFilteredData.splice(groupObjectsToRemove[removeCount].dataIndex, 1)[0]);
        updateFilteredDataState({}, oldFilteredData, oldRemovedData);
        if (removeCount < groupObjectsToRemove.length - 1) {
          removeCount++;
        }
        else {
          stopSequence();
        }
      }, 2000);
    }
  };

  const prevSeries = () => {
    const { groupIndex } = state;
    const filteredData = filteredDataRef.current;
    let { seriesIndex } = state;
    if (groupIndex !== -1 && seriesIndex > 0) {
      seriesIndex--;
      const seriesValuesText = getSeriesValuesText(mochartDemoConfig, filteredData, groupIndex, seriesIndex);
      setState(prev => ({ ...prev, seriesIndex, seriesValuesText }));
    }
  };

  const nextSeries = () => {
    const { groupIndex } = state;
    const filteredData = filteredDataRef.current;
    const { seriesCount } = mochartDemoConfig;
    let { seriesIndex } = state;
    if (groupIndex !== -1 && seriesIndex < seriesCount - 1) {
      seriesIndex++;
      const seriesValuesText = getSeriesValuesText(mochartDemoConfig, filteredData, groupIndex, seriesIndex);
      setState(prev => ({ ...prev, seriesIndex, seriesValuesText }));
    }
  };

  const seriesValuesChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const seriesValuesText = event.target.value;
    setState(prev => ({ ...prev, seriesValuesText }));
  };

  const applySeriesChanges = () => {
    const filteredData = filteredDataRef.current;
    const removedData = removedDataRef.current;
    const { groupIndex, seriesIndex, seriesValuesText } = state;
    const filteredDataObject = filteredData[groupIndex];
    const { mochartConfig } = mochartDemoConfig;
    const { seriesConfigs } = mochartConfig;
    if (seriesConfigs.length > 0) {
      try {
        const dataObject = JSON.parse(seriesValuesText);
        const seriesConfig = seriesConfigs[seriesIndex];
        const { property, rangeProperty, markerProperty, labelProperty, colorProperty } = seriesConfig;
        filteredDataObject[property!] = dataObject['p'];
        if (rangeProperty !== NONE) {
          filteredDataObject[rangeProperty] = dataObject['r'];
        }
        if (markerProperty !== NONE) {
          filteredDataObject[markerProperty] = dataObject['m'];
        }
        if (labelProperty !== NONE) {
          filteredDataObject[labelProperty] = dataObject['l'];
        }
        if (colorProperty !== NONE) {
          filteredDataObject[colorProperty] = dataObject['c'];
        }
        updateFilteredDataState({}, filteredData, removedData, false);
      }
      catch (error) {
        // ignore invalid JSON
      }
    }
  };

  const resetSeriesChanges = () => {
    const filteredData = filteredDataRef.current;
    const removedData = removedDataRef.current;
    const { data } = props;
    const { groupIndex, seriesIndex } = state;
    const { mochartConfig } = mochartDemoConfig;
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const { seriesConfigs } = mochartConfig;
    if (seriesConfigs.length > 0) {
      const filteredDataObject = filteredData[groupIndex];
      const filteredGroupValue = filteredDataObject[groupProperty];
      const count = data.length;
      let dataObject: Row | null = null;
      for (let i = 0; i < count; i++) {
        if (data[i][groupProperty] === filteredGroupValue) {
          dataObject = data[i];
        }
      }
      const seriesConfig = seriesConfigs[seriesIndex];
      const { property, rangeProperty, markerProperty, labelProperty, colorProperty } = seriesConfig;
      filteredDataObject[property!] = dataObject![property!];
      if (rangeProperty !== NONE) {
        filteredDataObject[rangeProperty] = dataObject![rangeProperty];
      }
      if (markerProperty !== NONE) {
        filteredDataObject[markerProperty] = dataObject![markerProperty];
      }
      if (labelProperty !== NONE) {
        filteredDataObject[labelProperty] = dataObject![labelProperty];
      }
      if (colorProperty !== NONE) {
        filteredDataObject[colorProperty] = dataObject![colorProperty];
      }
      updateFilteredDataState({ seriesValuesText: getSeriesValuesText(mochartDemoConfig, filteredData, groupIndex, seriesIndex) }, filteredData, removedData, false);
    }
  };

  const selectSlice = (sliceIndex: number) => {
    const { slices } = state;
    if (sliceIndex >= 0 && sliceIndex < slices.length) {
      const sliceValueText = getSliceValueText(slices, sliceIndex, filteredDataRef.current);
      setState(prev => ({ ...prev, sliceIndex, sliceValueText }));
    }
  };

  const onChartSliceClick = ({ seriesId }: { seriesId: string }) => {
    selectSlice(state.slices.findIndex(slice => slice.id === seriesId));
  };

  const sliceValueChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sliceValueText = event.target.value;
    setState(prev => ({ ...prev, sliceValueText }));
  };

  const applySliceChanges = () => {
    const filteredData = filteredDataRef.current;
    const removedData = removedDataRef.current;
    const { slices, sliceIndex, sliceValueText } = state;
    const value = parseFloat(sliceValueText);
    if (!isNaN(value) && isFinite(value) && filteredData.length > 0 && slices.length > 0) {
      applyPieSliceValue(filteredData[0], slices[sliceIndex].property, value);
      updateFilteredDataState({}, filteredData, removedData, false);
    }
  };

  const resetSliceChanges = () => {
    const { data } = props;
    const filteredData = filteredDataRef.current;
    const removedData = removedDataRef.current;
    const { slices, sliceIndex } = state;
    if (filteredData.length > 0 && data.length > 0 && slices.length > 0) {
      const property = slices[sliceIndex].property;
      applyPieSliceValue(filteredData[0], property, data[0][property] as number);
      updateFilteredDataState({ sliceValueText: getSliceValueText(slices, sliceIndex, filteredData) }, filteredData, removedData, false);
    }
  };

  // The pie analog of the group add/remove sequences: suppress the slices one
  // at a time (via the shared legend filter, so the remaining slices re-sweep
  // and center totals count along), then restore them.
  const startSliceSequence = () => {
    const { slices } = state;
    const steps = getPieSequenceSteps(slices.map(slice => slice.id));
    if (steps.length > 0) {
      setState(prev => ({ ...prev, sequencePlaying: true }));
      let stepCount = 0;
      sequenceIdRef.current = setInterval(() => {
        propsRef.current.onSeriesFilter({ filteredSeriesIds: steps[stepCount] });
        if (stepCount < steps.length - 1) {
          stepCount++;
        }
        else {
          stopSequence();
        }
      }, 2000);
    }
  };

  // The phone fold. Which panel folds — and what each sends to the overflow
  // menu — mirrors the vanilla port's placeControls; the react expression of
  // "reparent, never duplicate" is that every control renders in exactly one
  // of the two places from the same element (see OverflowMenu.tsx).
  const isPhone = usePhoneViewport();
  const menuSpanRef = useRef<HTMLSpanElement>(null);

  const {
    width, chartCount, showChartCountControls, showShareButton, onChartCountToggle, onSeriesFilter,
    filteredSeriesIds, focusedSeriesAxisId, focusedSeriesId
  } = props;
  const {
    sequencePlaying, selectionMode, dataProvider, groupValuesText, groupIndex, seriesIndex, seriesValuesText, orderChanged,
    filteredFocusedGroupIndex, slices, sliceIndex, sliceValueText
  } = state;

  const dataError = !!(dataProvider && dataProvider.getError && dataProvider.getError());
  const configError = !mochartDemoConfig.valid;
  const error = dataError || configError;
  const filteredGroupValues: any[] = error || !dataProvider?.getGroupValues ? [] : dataProvider.getGroupValues();
  const selectedGroupValues = (error || groupValuesText === emptyGroupText) ? [] : groupValuesText.split(',');
  const filteredGroupMap = filteredGroupValues.reduce<Record<string, boolean>>((map, group) => { map[group] = true; return map; }, {});
  const disableRemove = orderChanged || !selectedGroupValues.some(group => filteredGroupMap[group]);
  const disableAdd = orderChanged || !selectedGroupValues.some(group => !filteredGroupMap[group]);

  const modeControlContent = (
    <div className="demo-btn-group" key="modeControls">
      <ButtonWithTooltip id="edit-mode" label={selectionMode === 'group' ? demoText.editableChart.editMode.labelToSeries : demoText.editableChart.editMode.labelToGroups}
        tooltipText={selectionMode === 'group'
          ? demoText.editableChart.editMode.tooltipToSeries
          : demoText.editableChart.editMode.tooltipToGroups} tooltipPlacement="right"
        onClick={onModeToggle} aria-label={demoText.editableChart.editMode.aria}>
        <Icon size="lg" fixedWidth={true} name={selectionMode === 'group' ? "bullseye" : "sliders"} />
      </ButtonWithTooltip>
    </div>
  );

  const onExportPng = () => {
    const container = chartContentRef.current;
    if (container) {
      void exportPNG(container, getChartExportOptions());
    }
  };

  const onExportSvg = () => {
    const container = chartContentRef.current;
    if (container) {
      exportSVG(container, getChartExportOptions());
    }
  };

  // The export/share menu sits at the end of the controls row. Share is only
  // offered on the chart flagged for it (the first, when two are shown).
  const exportShareControlContent = (
    <ExportShareMenu key="exportShareControls" idPrefix="edit" disabled={error}
      active={props.isActive !== false}
      exportPng={onExportPng} exportSvg={onExportSvg}
      getShareState={showShareButton ? () => {
        const { mochartDemoConfig, data } = propsRef.current;
        return { mode: 'single', config: mochartDemoConfig.config, data };
      } : undefined} />
  );

  const foldSlice = isPhone && mochartDemoConfig.pieMode;
  const foldGroup = isPhone && !mochartDemoConfig.pieMode && selectionMode === 'group';
  const foldSeries = isPhone && !mochartDemoConfig.pieMode && selectionMode !== 'group';

  // The strip's trailing menus, pushed to the far right of the controls row.
  // The ⋯ renders only while its panel is folded, and it lives INSIDE the
  // `.chart-controls-menu` span: the panel anchors to the whole span because
  // the export trigger sits to the ⋯'s right, so aligning to the ⋯ alone would
  // stop the panel short of the row's end and hang it off the left edge.
  const controlsMenu = (overflowChildren: React.ReactNode) => (
    <span className="chart-controls-menu" ref={menuSpanRef}>
      {overflowChildren !== null ? (
        <OverflowMenu text={demoText.overflowMenu.chart}
          placement={{ side: 'top', align: 'end', gap: 4 }}
          anchorRef={menuSpanRef} disabled={error} active={props.isActive !== false}>
          {overflowChildren}
        </OverflowMenu>
      ) : null}
      {exportShareControlContent}
    </span>
  );

  const chartCountControlContent = showChartCountControls ? (
    <div className="demo-btn-group" key="chartCountControls">
      <ButtonWithTooltip id="edit-chart-count" label={demoText.editableChart.secondChart.label} pressed={chartCount === 2}
        tooltipText={chartCount === 2 ? demoText.editableChart.secondChart.tooltipHide : demoText.editableChart.secondChart.tooltipShow} tooltipPlacement="right"
        onClick={onChartCountToggle} aria-label={demoText.editableChart.secondChart.aria}>
        <Icon size="lg" fixedWidth={true} name={chartCount === 2 ? "window-maximize" : "window-restore"} />
      </ButtonWithTooltip>
    </div>
  ) : null;

  let commonControlContent: React.ReactNode;
  if (chartCountControlContent) {
    commonControlContent = [chartCountControlContent, modeControlContent];
  }
  else {
    commonControlContent = [modeControlContent];
  }

  let controlContent: React.ReactNode;
  if (mochartDemoConfig.pieMode) {
    // Pie-mode slice panel — replaces both panels (and the mode toggle) when
    // slices are the series: click a slice (or step prev/next) to select it,
    // edit its value, or play the suppress/restore sequence.
    //
    // The fold keeps the steppers, the readout, Apply and the input; Reset and
    // the play/stop pair go to the menu, with the 2nd-chart toggle as the tail
    // (never offered on a phone, but the fold can run in a narrow window).
    const sliceControlsDisabled = error || sequencePlaying || slices.length === 0;
    const resetSliceButton = (
      <ButtonWithTooltip id="edit-reset-slice" disabled={sliceControlsDisabled} label={demoText.editableChart.resetSlice.label}
        tooltipText={demoText.editableChart.resetSlice.tooltip} tooltipPlacement="right"
        onClick={resetSliceChanges} aria-label={demoText.editableChart.resetSlice.aria}>
        <Icon size="lg" fixedWidth={true} name="arrow-rotate-left" />
      </ButtonWithTooltip>
    );
    const sliceSequenceGroup = (
      <div className="demo-btn-group">
        <ButtonWithTooltip id="edit-play-slices" disabled={error || sequencePlaying || slices.length < 2}
          menuLabel={demoText.editableChart.playSliceSequence.menuLabel}
          tooltipText={demoText.editableChart.playSliceSequence.tooltip} tooltipPlacement="right"
          onClick={startSliceSequence} aria-label={demoText.editableChart.playSliceSequence.aria}>
          <Icon size="lg" fixedWidth={true} name="play" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="edit-stop-slices" disabled={error || !sequencePlaying}
          menuLabel={demoText.editableChart.stopSliceSequence.menuLabel}
          tooltipText={demoText.editableChart.stopSliceSequence.tooltip} tooltipPlacement="right"
          onClick={stopSequence} aria-label={demoText.editableChart.stopSliceSequence.aria}>
          <Icon size="lg" fixedWidth={true} name="stop" />
        </ButtonWithTooltip>
      </div>
    );
    controlContent = (
      <div className="chart-controls-container">
        <div className="chart-controls-buttons">
          <form className="demo-form-row">
            {foldSlice ? null : (
              // Kept on desktop even when empty — the empty field's gap is
              // part of the unfolded layout.
              <div className="demo-field">
                <div className="demo-toolbar" role="toolbar">
                  {chartCountControlContent}
                </div>
              </div>
            )}
            <div className="demo-field">
              <div className="demo-toolbar" role="toolbar">
                <div className="demo-btn-group">
                  <ButtonWithTooltip id="edit-previous-slice" disabled={sliceControlsDisabled || sliceIndex === 0}
                    tooltipText={demoText.editableChart.previousSlice.tooltip} tooltipPlacement="right"
                    onClick={() => selectSlice(sliceIndex - 1)} aria-label={demoText.editableChart.previousSlice.aria}>
                    <Icon size="lg" fixedWidth={true} name="chevron-left" />
                  </ButtonWithTooltip>
                </div>
              </div>
            </div>
            <div className="demo-field">
              <span className="demo-label" style={{ marginLeft: 5, marginRight: 5 }} title={slices.length > 0 ? slices[sliceIndex].title : undefined}>
                {slices.length > 0
                  ? <>{demoText.editableChart.sliceIndexPrefix}<span className="demo-index-value">{sliceIndex}</span></>
                  : demoText.editableChart.selectASliceText}
              </span>
            </div>
            <div className="demo-field">
              <div className="demo-toolbar" role="toolbar">
                <div className="demo-btn-group">
                  <ButtonWithTooltip id="edit-next-slice" disabled={sliceControlsDisabled || sliceIndex >= slices.length - 1}
                    tooltipText={demoText.editableChart.nextSlice.tooltip} tooltipPlacement="right"
                    onClick={() => selectSlice(sliceIndex + 1)} aria-label={demoText.editableChart.nextSlice.aria}>
                    <Icon size="lg" fixedWidth={true} name="chevron-right" />
                  </ButtonWithTooltip>
                </div>
                <div className="demo-btn-group">
                  {foldSlice ? null : resetSliceButton}
                  <ButtonWithTooltip id="edit-apply-slice" disabled={sliceControlsDisabled} label={demoText.editableChart.applySlice.label}
                    tooltipText={demoText.editableChart.applySlice.tooltip} tooltipPlacement="right"
                    onClick={applySliceChanges} aria-label={demoText.editableChart.applySlice.aria}>
                    <Icon size="lg" fixedWidth={true} name="check" />
                  </ButtonWithTooltip>
                </div>
                {foldSlice ? null : sliceSequenceGroup}
              </div>
            </div>
          </form>
        </div>
        <span className="chart-controls-input">
          <form className="demo-form-row">
            <input type="text" className="demo-input" disabled={sliceControlsDisabled} value={sliceValueText} onChange={sliceValueChanged} />
          </form>
        </span>
        {controlsMenu(foldSlice ? (
          <>
            <div className="demo-btn-group">{resetSliceButton}</div>
            <MenuDivider />
            {sliceSequenceGroup}
            {chartCountControlContent !== null ? <><MenuDivider />{chartCountControlContent}</> : null}
          </>
        ) : null)}
      </div>
    );
  }
  else if (selectionMode === 'group') {
    // The fold keeps Add and Remove — they act on what is typed in the input
    // beside them — plus the input; everything else goes to the menu, split
    // into the same sections the vanilla port uses (order edits, then the
    // sequence transport, then the shared controls).
    const resetGroupsButton = (
      <ButtonWithTooltip id="edit-reset-groups" disabled={error || sequencePlaying} label={demoText.editableChart.resetGroups.label}
        tooltipText={demoText.editableChart.resetGroups.tooltip} tooltipPlacement="right"
        onClick={resetGroups} aria-label={demoText.editableChart.resetGroups.aria}>
        <Icon size="lg" fixedWidth={true} name="arrow-rotate-left" />
      </ButtonWithTooltip>
    );
    const reverseGroupsButton = (
      <ButtonWithTooltip id="edit-reverse-groups" disabled={error || sequencePlaying} label={demoText.editableChart.reverseGroups.label}
        tooltipText={demoText.editableChart.reverseGroups.tooltip} tooltipPlacement="right"
        onClick={reverseGroups} aria-label={demoText.editableChart.reverseGroups.aria}>
        <Icon size="lg" fixedWidth={true} name="right-left" />
      </ButtonWithTooltip>
    );
    const addGroupsButton = (
      <ButtonWithTooltip id="edit-add-groups" disabled={error || sequencePlaying || disableAdd} label={demoText.editableChart.addGroups.label}
        tooltipText={demoText.editableChart.addGroups.tooltip} tooltipPlacement="right"
        onClick={addGroups} aria-label={demoText.editableChart.addGroups.aria}>
        <Icon size="lg" fixedWidth={true} name="plus" />
      </ButtonWithTooltip>
    );
    const removeGroupsButton = (
      <ButtonWithTooltip id="edit-remove-groups" disabled={error || sequencePlaying || disableRemove} label={demoText.editableChart.removeGroups.label}
        tooltipText={demoText.editableChart.removeGroups.tooltip} tooltipPlacement="right"
        onClick={removeGroups} aria-label={demoText.editableChart.removeGroups.aria}>
        <Icon size="lg" fixedWidth={true} name="minus" />
      </ButtonWithTooltip>
    );
    const playAddButton = (
      <ButtonWithTooltip id="edit-play-add" disabled={error || sequencePlaying || disableAdd}
        menuLabel={demoText.editableChart.playAddGroups.menuLabel}
        tooltipText={demoText.editableChart.playAddGroups.tooltip} tooltipPlacement="right"
        onClick={startAddSequence} aria-label={demoText.editableChart.playAddGroups.aria}>
        <Icon size="lg" name="play" /><span style={{ paddingRight: 2 }}></span><Icon size="lg" name="plus" />
      </ButtonWithTooltip>
    );
    const playRemoveButton = (
      <ButtonWithTooltip id="edit-play-remove" disabled={error || sequencePlaying || disableRemove}
        menuLabel={demoText.editableChart.playRemoveGroups.menuLabel}
        tooltipText={demoText.editableChart.playRemoveGroups.tooltip} tooltipPlacement="right"
        onClick={startRemoveSequence} aria-label={demoText.editableChart.playRemoveGroups.aria}>
        <Icon size="lg" name="play" /><span style={{ paddingRight: 2 }}></span><Icon size="lg" name="minus" />
      </ButtonWithTooltip>
    );
    const stopButton = (
      <ButtonWithTooltip id="edit-stop" disabled={error || !sequencePlaying}
        menuLabel={demoText.editableChart.stopSequence.menuLabel}
        tooltipText={demoText.editableChart.stopSequence.tooltip} tooltipPlacement="right"
        onClick={stopSequence} aria-label={demoText.editableChart.stopSequence.aria}>
        <Icon size="lg" fixedWidth={true} name="stop" />
      </ButtonWithTooltip>
    );
    const selectAllButton = (
      <ButtonWithTooltip id="edit-select-all" disabled={error || sequencePlaying} label={demoText.editableChart.selectAllGroups.label}
        tooltipText={demoText.editableChart.selectAllGroups.tooltip} tooltipPlacement="right"
        onClick={selectAllGroups} aria-label={demoText.editableChart.selectAllGroups.aria}>
        <Icon size="lg" fixedWidth={true} name="check-double" />
      </ButtonWithTooltip>
    );
    controlContent = (
      <div className="chart-controls-container">
        <div className="chart-controls-buttons">
          <form className="demo-form-row">
            <div className="demo-field">
              <div className="demo-toolbar" role="toolbar">
                {foldGroup ? null : commonControlContent}
                <div className="demo-btn-group">
                  {foldGroup
                    ? <>{addGroupsButton}{removeGroupsButton}</>
                    : <>{resetGroupsButton}{reverseGroupsButton}{addGroupsButton}{removeGroupsButton}{playAddButton}{playRemoveButton}{stopButton}{selectAllButton}</>}
                </div>
              </div>
            </div>
          </form>
        </div>
        <span className="chart-controls-input">
          <form className="demo-form-row">
            <input type="text" className="demo-input" disabled={error || sequencePlaying} value={groupValuesText} onChange={groupValuesChanged} />
          </form>
        </span>
        {controlsMenu(foldGroup ? (
          <>
            <div className="demo-btn-group">{resetGroupsButton}{reverseGroupsButton}{selectAllButton}</div>
            <MenuDivider />
            <div className="demo-btn-group">{playAddButton}{playRemoveButton}{stopButton}</div>
            <MenuDivider />
            {commonControlContent}
          </>
        ) : null)}
      </div>
    );
  }
  else {
    const groupIndexText = demoText.editableChart.groupIndexPrefix;
    const seriesIndexText = demoText.editableChart.seriesIndexPrefix;
    // the index labels are fixed-width, so which group/series is selected is
    // named by the native tooltip instead
    const groupIndexTitle = getGroupIndexTitle(mochartDemoConfig, filteredDataRef.current, groupIndex);
    const seriesIndexTitle = getSeriesIndexTitle(mochartDemoConfig, seriesIndex);
    const seriesControlsDisabled = sequencePlaying || groupIndex === -1;
    const groupOrderControlsDisabled = sequencePlaying || groupIndex === -1;
    const isFirstGroup = groupIndex === 0;
    const isLastGroup = groupIndex === filteredGroupValues.length - 1;
    const hasPrevSeries = seriesIndex > 0;
    const hasNextSeries = seriesIndex < mochartDemoConfig.seriesCount - 1;

    // The fold keeps the steppers and their readouts — they are how a group
    // and a series get picked at all. Apply stays visible too, but moves DOWN,
    // onto the input row beside the JSON it applies: with it out of the
    // stepper row the panel holds two rows even at 320x568. Reset is the one
    // button with no partner anywhere, so it folds into the menu. The readout
    // prefixes shrink to their one-letter, aria-hidden stand-ins there (the
    // full prefixes are sr-only clipped by the phone tier and keep carrying
    // the accessible name), and the labels drop their 5px side margins — the
    // phone tier's 6px field gap is separation enough, and the margins' 20px
    // would wrap the ▲ stepper onto a second row at 320px.
    const resetSeriesButton = (
      <ButtonWithTooltip id="edit-reset-series" disabled={error || seriesControlsDisabled} label={demoText.editableChart.resetSeries.label}
        tooltipText={demoText.editableChart.resetSeries.tooltip} tooltipPlacement="right"
        onClick={resetSeriesChanges} aria-label={demoText.editableChart.resetSeries.aria}>
        <Icon size="lg" fixedWidth={true} name="arrow-rotate-left" />
      </ButtonWithTooltip>
    );
    const applySeriesButton = (
      <ButtonWithTooltip id="edit-apply-series" disabled={error || seriesControlsDisabled} label={demoText.editableChart.applySeries.label}
        tooltipText={demoText.editableChart.applySeries.tooltip} tooltipPlacement="right"
        onClick={applySeriesChanges} aria-label={demoText.editableChart.applySeries.aria}>
        <Icon size="lg" fixedWidth={true} name="check" />
      </ButtonWithTooltip>
    );
    const indexLabelMargin = foldSeries ? 0 : 5;
    controlContent = (
      <div className="chart-controls-container">
        <div className="chart-controls-buttons">
          <form className="demo-form-row">
            {foldSeries ? null : (
              <div className="demo-field">
                <div className="demo-toolbar" role="toolbar">
                  {commonControlContent}
                </div>
              </div>
            )}
            <div className="demo-field">
              <div className="demo-toolbar" role="toolbar">
                <div className="demo-btn-group">
                  <ButtonWithTooltip id="edit-group-decrease" disabled={error || groupOrderControlsDisabled || isFirstGroup}
                    tooltipText={demoText.editableChart.decreaseGroupOrder.tooltip} tooltipPlacement="right"
                    onClick={decreaseGroupOrder} aria-label={demoText.editableChart.decreaseGroupOrder.aria}>
                    <Icon size="lg" fixedWidth={true} name="arrow-left" />
                  </ButtonWithTooltip>
                </div>
              </div>
            </div>
            <div className="demo-field">
              <span className="demo-label" style={{ marginLeft: indexLabelMargin, marginRight: indexLabelMargin }} title={groupIndexTitle}>
                <span className="demo-label-prefix">{groupIndexText}</span>
                <span className="demo-label-prefix-compact" aria-hidden="true">{demoText.editableChart.groupIndexPrefixCompact}</span>
                <span className="demo-index-value">{groupIndex}</span>
              </span>
            </div>
            <div className="demo-field">
              <div className="demo-toolbar" role="toolbar">
                <div className="demo-btn-group">
                  <ButtonWithTooltip id="edit-group-increase" disabled={error || groupOrderControlsDisabled || isLastGroup}
                    tooltipText={demoText.editableChart.increaseGroupOrder.tooltip} tooltipPlacement="right"
                    onClick={increaseGroupOrder} aria-label={demoText.editableChart.increaseGroupOrder.aria}>
                    <Icon size="lg" fixedWidth={true} name="arrow-right" />
                  </ButtonWithTooltip>
                </div>
              </div>
            </div>
            <div className="demo-field">
              <div className="demo-toolbar" role="toolbar">
                <div className="demo-btn-group">
                  <ButtonWithTooltip id="edit-previous-series" disabled={error || seriesControlsDisabled || !hasPrevSeries}
                    tooltipText={demoText.editableChart.previousSeries.tooltip} tooltipPlacement="right"
                    onClick={prevSeries} aria-label={demoText.editableChart.previousSeries.aria}>
                    <Icon size="lg" fixedWidth={true} name="chevron-down" />
                  </ButtonWithTooltip>
                </div>
              </div>
            </div>
            <div className="demo-field">
              <span className="demo-label" style={{ marginLeft: indexLabelMargin, marginRight: indexLabelMargin }} title={seriesIndexTitle}>
                <span className="demo-label-prefix">{seriesIndexText}</span>
                <span className="demo-label-prefix-compact" aria-hidden="true">{demoText.editableChart.seriesIndexPrefixCompact}</span>
                <span className="demo-index-value">{seriesIndex}</span>
              </span>
            </div>
            <div className="demo-field">
              <div className="demo-toolbar" role="toolbar">
                <div className="demo-btn-group">
                  <ButtonWithTooltip id="edit-next-series" disabled={error || seriesControlsDisabled || !hasNextSeries}
                    tooltipText={demoText.editableChart.nextSeries.tooltip} tooltipPlacement="right"
                    onClick={nextSeries} aria-label={demoText.editableChart.nextSeries.aria}>
                    <Icon size="lg" fixedWidth={true} name="chevron-up" />
                  </ButtonWithTooltip>
                </div>
                {foldSeries ? null : (
                  <div className="demo-btn-group">
                    {resetSeriesButton}
                    {applySeriesButton}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
        <span className="chart-controls-input">
          <form className="demo-form-row">
            <input type="text" className="demo-input" disabled={error || seriesControlsDisabled} value={seriesValuesText} onChange={seriesValuesChanged} />
            {foldSeries ? applySeriesButton : null}
          </form>
        </span>
        {controlsMenu(foldSeries ? (
          <>
            <div className="demo-btn-group">{resetSeriesButton}</div>
            <MenuDivider />
            {commonControlContent}
          </>
        ) : null)}
      </div>
    );
  }

  const { mochartConfig } = mochartDemoConfig;
  // Width comes from the parent as an explicit prop; Chart self-measures the
  // available height (the old code used a sizer HOC for the same purpose).
  // Focus/filter is controlled by the parent ChartTab so the 1–2 charts stay
  // in sync; the group index is translated into this chart's filtered-data
  // coordinates (filteredFocusedGroupIndex).
  const chartContent = (
    <Chart style={{ flex: '1 1 auto', minWidth: 0, minHeight: 0, overflow: 'hidden' }}
      width={width} mochartConfig={mochartConfig} dataProvider={dataProvider}
      filteredSeriesIds={filteredSeriesIds} focusedGroupIndex={filteredFocusedGroupIndex}
      focusedSeriesAxisId={focusedSeriesAxisId ?? null} focusedSeriesId={focusedSeriesId ?? null}
      onFocus={onChartFocus} onSeriesFilter={onSeriesFilter} onChartClick={onChartClick} onSliceClick={onChartSliceClick} />
  );

  return (
    <div className="editable-mochart-chart">
      <div className="editable-chart-container">
        <div className="editable-chart-content" ref={chartContentRef}>
          {chartContent}
        </div>
        <div className="editable-chart-controls">
          {controlContent}
        </div>
      </div>
    </div>
  );
}
