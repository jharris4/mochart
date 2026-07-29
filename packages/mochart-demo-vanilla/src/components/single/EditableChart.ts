import { hasConfigStructureChange, NONE, ArrayOfObjectsDataProvider } from '@mochart/core';
import { exportPNG, exportSVG } from '@mochart/export';

import { applyPieSliceValue, getChartExportOptions, getPieSequenceSteps, getPieSlices, demoText } from '@mochart/demo-common';

import type { PieSliceInfo, ShareState } from '@mochart/demo-common';

import { buttonWithTooltip, el, icon } from '../misc/dom';
import { mountChart } from '../misc/chartHost';
import { exportShareMenu } from '../misc/ExportShareMenu';

import type { MochartDemoConfig, FilteredSeriesIds, FocusData } from '../../types';

// Mutable working rows are keyed by config-driven property names, so their
// value type is intentionally loose.
type Row = Record<string, any>;

export interface EditableChartProps {
  width: number;
  mochartDemoConfig: MochartDemoConfig;
  data: Row[];
  dataError?: string | boolean | null;
  isActive: boolean;
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

export interface EditableChartUpdate {
  width: number;
  mochartDemoConfig: MochartDemoConfig;
  data: Row[];
  dataError?: string | boolean | null;
  isActive: boolean;
  chartCount: number;
  filteredSeriesIds: FilteredSeriesIds;
  focusedGroupIndex: number;
  focusedSeriesAxisId?: string | null;
  focusedSeriesId?: string | null;
}

export interface EditableChartHandle {
  el: HTMLElement;
  update(next: EditableChartUpdate): void;
  destroy(): void;
}

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

const emptyGroupText = demoText.editableChart.emptyGroupText;

export function editableChart(props: EditableChartProps): EditableChartHandle {
  const { onFocus, onSeriesFilter, onChartCountToggle, showChartCountControls } = props;

  let width = props.width;
  let mochartDemoConfig = props.mochartDemoConfig;
  let data = props.data;
  let dataError = props.dataError ?? false;
  let chartCount = props.chartCount;
  let filteredSeriesIds = props.filteredSeriesIds;
  let focusedGroupIndex = props.focusedGroupIndex;
  let focusedSeriesAxisId = props.focusedSeriesAxisId ?? null;
  let focusedSeriesId = props.focusedSeriesId ?? null;

  // Working copies of the demo data; mutated in place by the group/series
  // editing controls (same pattern as the framework demos).
  let filteredData: Row[] = [];
  let removedData: Row[] = [];
  let sequenceId: ReturnType<typeof setInterval> | null = null;

  let dataProvider: EditableDataProvider | null = null;
  let groupIndex = -1;
  let groupValuesText = '';
  let seriesIndex = 0;
  let seriesValuesText = '';
  let selectionMode = 'group';
  let sequencePlaying = false;
  // pie-mode slice editing: slices are the series, so the group machinery has
  // nothing to operate on and a single slice panel replaces both panels
  let slices: PieSliceInfo[] = [];
  let sliceIndex = 0;
  let sliceValueText = '';
  let filteredFocusedGroupIndex = -1;
  let orderChanged = false;

  function getFilteredFocusedGroupIndex(nextFilteredData: Row[]): number {
    let nextFilteredFocusedGroupIndex = -1;
    if (focusedGroupIndex >= 0) {
      const groupProperty = mochartDemoConfig.groupProperty ?? '';
      const groupValue = data[focusedGroupIndex][groupProperty];
      let i, count = nextFilteredData.length;
      for (i = 0; i < count; i++) {
        if (nextFilteredData[i][groupProperty] === groupValue) {
          nextFilteredFocusedGroupIndex = i;
          break;
        }
      }
    }
    return nextFilteredFocusedGroupIndex;
  }

  function updateFilteredDataState(
    nextState: { orderChanged?: boolean; groupIndex?: number; seriesIndex?: number; groupValuesText?: string; seriesValuesText?: string },
    nextFilteredData: Row[],
    nextRemovedData: Row[],
    resetGroupIndex = true
  ): void {
    filteredData = nextFilteredData;
    removedData = nextRemovedData;
    if (resetGroupIndex === true) {
      groupIndex = -1;
      seriesValuesText = demoText.editableChart.selectAGroupText;
    }
    filteredFocusedGroupIndex = dataError ? -1 : getFilteredFocusedGroupIndex(nextFilteredData);
    if (!dataError && mochartDemoConfig.mochartConfig.validation.valid) {
      dataProvider = new ArrayOfObjectsDataProvider(nextFilteredData, mochartDemoConfig.mochartConfig.groupAxisConfig.property ?? '');
    }
    else if (dataError) {
      dataProvider = { getError: () => dataError };
    }
    else {
      dataProvider = null;
    }
    if (nextState.orderChanged !== undefined) {
      orderChanged = nextState.orderChanged;
    }
    if (nextState.groupIndex !== undefined) {
      groupIndex = nextState.groupIndex;
    }
    if (nextState.seriesIndex !== undefined) {
      seriesIndex = nextState.seriesIndex;
    }
    if (nextState.groupValuesText !== undefined) {
      groupValuesText = nextState.groupValuesText;
    }
    if (nextState.seriesValuesText !== undefined) {
      seriesValuesText = nextState.seriesValuesText;
    }
    sync();
  }

  function initData(): void {
    const nextFilteredData = [];
    if (data && !dataError) {
      let i, count = data.length;
      for (i = 0; i < count; i++) {
        nextFilteredData.push(Object.assign({}, data[i]));
      }
    }
    slices = mochartDemoConfig.pieMode ? getPieSlices(mochartDemoConfig.mochartConfig) : [];
    if (sliceIndex >= slices.length) {
      sliceIndex = 0;
    }
    sliceValueText = getSliceValueText(nextFilteredData);
    updateFilteredDataState({ orderChanged: false, seriesIndex: 0, groupValuesText: emptyGroupText }, nextFilteredData, []);
  }

  function getSliceValueText(rows: Row[]): string {
    if (slices.length === 0 || rows.length === 0) {
      return '';
    }
    const value = rows[0][slices[sliceIndex].property];
    return value === undefined || value === null ? '' : String(value);
  }

  function selectSlice(nextSliceIndex: number): void {
    if (nextSliceIndex >= 0 && nextSliceIndex < slices.length) {
      sliceIndex = nextSliceIndex;
      sliceValueText = getSliceValueText(filteredData);
      sync();
    }
  }

  function onChartSliceClick({ seriesId }: { seriesId: string }): void {
    selectSlice(slices.findIndex(slice => slice.id === seriesId));
  }

  function applySliceChanges(): void {
    const value = parseFloat(sliceValueText);
    if (!isNaN(value) && isFinite(value) && filteredData.length > 0 && slices.length > 0) {
      applyPieSliceValue(filteredData[0], slices, slices[sliceIndex].property, value);
      updateFilteredDataState({}, filteredData, removedData, false);
    }
  }

  function resetSliceChanges(): void {
    if (filteredData.length > 0 && data.length > 0 && slices.length > 0) {
      const property = slices[sliceIndex].property;
      applyPieSliceValue(filteredData[0], slices, property, data[0][property] as number);
      sliceValueText = getSliceValueText(filteredData);
      updateFilteredDataState({}, filteredData, removedData, false);
    }
  }

  // The pie analog of the group add/remove sequences: suppress the slices one
  // at a time (via the shared legend filter, so the remaining slices re-sweep
  // and center totals count along), then restore them.
  function startSliceSequence(): void {
    const steps = getPieSequenceSteps(slices.map(slice => slice.id));
    if (steps.length > 0) {
      sequencePlaying = true;
      let stepCount = 0;
      sequenceId = setInterval(() => {
        onSeriesFilter({ filteredSeriesIds: steps[stepCount] });
        if (stepCount < steps.length - 1) {
          stepCount++;
        }
        else {
          stopSequence();
        }
      }, 2000);
      sync();
    }
  }

  // mochart reports focus with the new payload shape; adapt it to the
  // { seriesAxisId, seriesId, groupIndex } shape this demo tracks.
  function onChartFocus({ focusedSeriesAxisId: seriesAxisId, focusedSeriesId: seriesId, focusedGroupIndex: chartGroupIndex }: { focusedSeriesAxisId?: string | null; focusedSeriesId?: string | null; focusedGroupIndex?: number }): void {
    onLocalFocus({ seriesAxisId, seriesId, groupIndex: chartGroupIndex });
  }

  function onLocalFocus({ seriesAxisId, seriesId, groupIndex: nextGroupIndex }: FocusPayload): void {
    if (nextGroupIndex !== undefined) {
      const nextFilteredFocusedGroupIndex = nextGroupIndex;
      let newFocusedGroupIndex = -1;
      if (nextFilteredFocusedGroupIndex >= 0) {
        const groupProperty = mochartDemoConfig.groupProperty ?? '';
        const groupValue = filteredData[nextFilteredFocusedGroupIndex][groupProperty];
        let i, count = data.length;
        for (i = 0; i < count; i++) {
          if (data[i][groupProperty] === groupValue) {
            newFocusedGroupIndex = i;
            break;
          }
        }
      }
      filteredFocusedGroupIndex = nextFilteredFocusedGroupIndex;
      onFocus({ seriesAxisId, seriesId, groupIndex: newFocusedGroupIndex });
    }
    else {
      onFocus({ seriesAxisId, seriesId, groupIndex: nextGroupIndex });
    }
  }

  function onChartClick({ groupIndex: clickedGroupIndex }: { groupIndex: number }): void {
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const clickedGroupValue = '' + filteredData[clickedGroupIndex][groupProperty];
    if (selectionMode === 'series') {
      groupIndex = clickedGroupIndex;
      seriesValuesText = getSeriesValuesText(mochartDemoConfig, filteredData, clickedGroupIndex, seriesIndex);
    }
    else if (selectionMode === 'group') {
      const dataGroupValues: any[] = [];
      let i, count = filteredData.length;
      for (i = 0; i < count; i++) {
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
      groupValuesText = parsedGroupValues.length === 0 ? emptyGroupText : parsedGroupValues.join(',');
    }
    sync();
  }

  function onModeToggle(): void {
    selectionMode = selectionMode === 'group' ? 'series' : 'group';
    sync();
  }

  function selectAllGroups(): void {
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const allGroupValues: any[] = [];
    let i, count = data.length;
    for (i = 0; i < count; i++) {
      allGroupValues.push(data[i][groupProperty]);
    }
    groupValuesText = allGroupValues.join(',');
    sync();
  }

  function resetGroups(): void {
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const groupToObjectMap: Record<string, Row> = {};
    removedData.forEach(removedObject => {
      groupToObjectMap[removedObject[groupProperty]] = removedObject;
    });
    filteredData.forEach(oldObject => {
      groupToObjectMap[oldObject[groupProperty]] = oldObject;
    });
    const nextFilteredData = data.map(o => groupToObjectMap[o[groupProperty] as string]);
    updateFilteredDataState({ orderChanged: false }, nextFilteredData, []);
  }

  function reverseGroups(): void {
    if (filteredData && filteredData.length > 1) {
      const nextFilteredData = filteredData.slice().reverse();
      updateFilteredDataState({ orderChanged: true }, nextFilteredData, removedData);
    }
  }

  function decreaseGroupOrder(): void {
    if (filteredData && filteredData.length > 1 && groupIndex > 0) {
      const nextFilteredData = filteredData.slice();
      const temp = nextFilteredData[groupIndex - 1];
      nextFilteredData[groupIndex - 1] = nextFilteredData[groupIndex];
      nextFilteredData[groupIndex] = temp;
      updateFilteredDataState({ orderChanged: true, groupIndex: groupIndex - 1 }, nextFilteredData, removedData, false);
    }
  }

  function increaseGroupOrder(): void {
    if (filteredData && filteredData.length > 1 && groupIndex < filteredData.length - 1) {
      const nextFilteredData = filteredData.slice();
      const temp = nextFilteredData[groupIndex + 1];
      nextFilteredData[groupIndex + 1] = nextFilteredData[groupIndex];
      nextFilteredData[groupIndex] = temp;
      updateFilteredDataState({ orderChanged: true, groupIndex: groupIndex + 1 }, nextFilteredData, removedData, false);
    }
  }

  function addGroups(): void {
    const oldFilteredData = filteredData;
    const oldRemovedData = removedData;
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const groupValuesToAdd = groupValuesText === emptyGroupText ? [] : groupValuesText.split(',');
    const groupValueToAddMap: Record<string, boolean> = {};
    groupValuesToAdd.forEach(groupValueToAdd => {
      groupValueToAddMap[groupValueToAdd] = true;
    });
    const removedMap: Record<string, Row> = {};
    oldRemovedData.forEach(removedObject => {
      removedMap[removedObject[groupProperty]] = removedObject;
    });
    let i, fi, count = data.length, filteredCount = oldFilteredData.length;
    const nextFilteredData: Row[] = [];
    for (i = 0, fi = 0; i < count; i++) {
      if (fi < filteredCount) {
        if (data[i][groupProperty] !== oldFilteredData[fi][groupProperty]) {
          if (groupValueToAddMap[data[i][groupProperty]] === true) {
            nextFilteredData.push(removedMap[data[i][groupProperty]]);
            delete removedMap[data[i][groupProperty]];
          }
        }
        else {
          nextFilteredData.push(oldFilteredData[fi]);
          fi++;
        }
      }
      else if (groupValueToAddMap[data[i][groupProperty]] === true) {
        nextFilteredData.push(removedMap[data[i][groupProperty]]);
        delete removedMap[data[i][groupProperty]];
      }
    }
    const nextRemovedData: Row[] = [];
    oldRemovedData.forEach(removedObject => {
      if (removedMap[removedObject[groupProperty]] !== undefined) {
        nextRemovedData.push(removedMap[removedObject[groupProperty]]);
      }
    });
    updateFilteredDataState({}, nextFilteredData, nextRemovedData);
  }

  function removeGroups(): void {
    const oldFilteredData = filteredData;
    const nextRemovedData = removedData;
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const groupValuesToRemove = groupValuesText === emptyGroupText ? [] : groupValuesText.split(',');
    const groupValueToRemoveMap: Record<string, boolean> = {};
    groupValuesToRemove.forEach(groupValueToRemove => {
      groupValueToRemoveMap[groupValueToRemove] = true;
    });
    let i, count = oldFilteredData.length;
    const nextFilteredData: Row[] = [];
    for (i = 0; i < count; i++) {
      if (groupValueToRemoveMap[oldFilteredData[i][groupProperty]] !== true) {
        nextFilteredData.push(oldFilteredData[i]);
      }
      else {
        nextRemovedData.push(oldFilteredData[i]);
      }
    }
    updateFilteredDataState({}, nextFilteredData, nextRemovedData);
  }

  function startAddSequence(): void {
    const oldFilteredData = filteredData;
    const oldRemovedData = removedData;
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const groupValuesToAdd = groupValuesText === emptyGroupText ? [] : groupValuesText.split(',');
    const groupValueToAddMap: Record<string, boolean> = {};
    groupValuesToAdd.forEach(groupValueToAdd => {
      groupValueToAddMap[groupValueToAdd] = true;
    });
    const removedIndexMap: Record<string, number> = {};
    oldRemovedData.forEach((removedObject, removedIndex) => {
      removedIndexMap[removedObject[groupProperty]] = removedIndex;
    });
    const groupObjectsToAdd: { removedIndex: number; dataIndex: number }[] = [];
    let i, fi, count = data.length, filteredCount = oldFilteredData.length;
    for (i = 0, fi = 0; i < count; i++) {
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
      sequencePlaying = true;
      let addCount = 0;
      sequenceId = setInterval(() => {
        oldFilteredData.splice(groupObjectsToAdd[addCount].dataIndex, 0, oldRemovedData.splice(groupObjectsToAdd[addCount].removedIndex, 1)[0]);
        updateFilteredDataState({}, oldFilteredData, oldRemovedData);
        if (addCount < groupObjectsToAdd.length - 1) {
          addCount++;
        }
        else {
          stopSequence();
        }
      }, 2000);
      sync();
    }
  }

  function startRemoveSequence(): void {
    const oldFilteredData = filteredData;
    const oldRemovedData = removedData;
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const groupValuesToRemove = groupValuesText === emptyGroupText ? [] : groupValuesText.split(',');
    const groupValueToRemoveMap: Record<string, boolean> = {};
    groupValuesToRemove.forEach(groupValueToRemove => {
      groupValueToRemoveMap[groupValueToRemove] = true;
    });
    const removedIndexMap: Record<string, number> = {};
    oldRemovedData.forEach((removedObject, removedIndex) => {
      removedIndexMap[removedObject[groupProperty]] = removedIndex;
    });
    const groupObjectsToRemove: { removedIndex: number; dataIndex: number }[] = [];
    let i, fi, ri, count = data.length, filteredCount = oldFilteredData.length;
    for (i = 0, fi = 0, ri = 0; i < count && fi < filteredCount; i++) {
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
      sequencePlaying = true;
      let removeCount = 0;
      sequenceId = setInterval(() => {
        oldRemovedData.splice(groupObjectsToRemove[removeCount].removedIndex, 0, oldFilteredData.splice(groupObjectsToRemove[removeCount].dataIndex, 1)[0]);
        updateFilteredDataState({}, oldFilteredData, oldRemovedData);
        if (removeCount < groupObjectsToRemove.length - 1) {
          removeCount++;
        }
        else {
          stopSequence();
        }
      }, 2000);
      sync();
    }
  }

  function stopSequence(): void {
    stopSequenceInternal();
    sequencePlaying = false;
    sync();
  }

  function stopSequenceInternal(): void {
    if (sequenceId !== null) {
      clearInterval(sequenceId);
      sequenceId = null;
    }
  }

  function prevSeries(): void {
    if (groupIndex !== -1 && seriesIndex > 0) {
      seriesIndex--;
      seriesValuesText = getSeriesValuesText(mochartDemoConfig, filteredData, groupIndex, seriesIndex);
      sync();
    }
  }

  function nextSeries(): void {
    const { seriesCount } = mochartDemoConfig;
    if (groupIndex !== -1 && seriesIndex < seriesCount - 1) {
      seriesIndex++;
      seriesValuesText = getSeriesValuesText(mochartDemoConfig, filteredData, groupIndex, seriesIndex);
      sync();
    }
  }

  function getSeriesValuesText({ mochartConfig }: MochartDemoConfig, currentFilteredData: Row[], currentGroupIndex: number, currentSeriesIndex: number): string {
    const dataObject = currentFilteredData[currentGroupIndex];
    const { seriesConfigs } = mochartConfig;
    if (seriesConfigs.length > 0) {
      const seriesConfig = seriesConfigs[currentSeriesIndex];
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
      return '';
    }
  }

  function applySeriesChanges(): void {
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
        // invalid JSON in the series input — ignore, matching the other demos
      }
    }
  }

  function resetSeriesChanges(): void {
    const { mochartConfig } = mochartDemoConfig;
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const { seriesConfigs } = mochartConfig;
    if (seriesConfigs.length > 0) {
      const filteredDataObject = filteredData[groupIndex];
      const filteredGroupValue = filteredDataObject[groupProperty];
      let i, count = data.length, dataObject: Row | null = null;
      for (i = 0; i < count; i++) {
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
  }

  // -------------------------------------------------------------------------
  // DOM
  // -------------------------------------------------------------------------

  const chartHost = mountChart(
    {
      width,
      mochartConfig: mochartDemoConfig.mochartConfig,
      dataProvider,
      filteredSeriesIds,
      focusedGroupIndex: filteredFocusedGroupIndex,
      focusedSeriesAxisId,
      focusedSeriesId,
      onFocus: onChartFocus,
      onSeriesFilter,
      onChartClick,
      onSliceClick: onChartSliceClick
    },
    { style: 'flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;' }
  );

  const chartContentElement = el('div', { className: 'editable-chart-content' }, [chartHost.el]);

  // Common controls shared by both panels; moved into whichever panel is
  // visible (the framework demos render them per-branch instead).
  const chartCountButton = showChartCountControls ? buttonWithTooltip({
    id: 'edit-chart-count', label: demoText.editableChart.secondChart.label, pressed: chartCount === 2, ariaLabel: demoText.editableChart.secondChart.aria,
    tooltipText: chartCount === 2 ? demoText.editableChart.secondChart.tooltipHide : demoText.editableChart.secondChart.tooltipShow,
    onClick: onChartCountToggle,
    content: [icon(chartCount === 2 ? 'window-maximize' : 'window-restore', { size: 'lg', fixedWidth: true })]
  }) : null;
  const modeButton = buttonWithTooltip({
    id: 'edit-mode', label: demoText.editableChart.editMode.labelToSeries, ariaLabel: demoText.editableChart.editMode.aria,
    tooltipText: demoText.editableChart.editMode.tooltipToSeries,
    onClick: onModeToggle,
    content: [icon('bullseye', { size: 'lg', fixedWidth: true })]
  });
  // The export/share menu sits at the far right of the controls row (past the
  // group/series input). Share is only offered on the chart flagged for it
  // (the first, when two are shown).
  const exportShareMenuHandle = exportShareMenu({
    idPrefix: 'edit',
    exportPng: () => { void exportPNG(chartContentElement, getChartExportOptions()); },
    exportSvg: () => { exportSVG(chartContentElement, getChartExportOptions()); },
    getShareState: props.showShareButton
      ? (): ShareState => ({ mode: 'single', config: mochartDemoConfig.config, data })
      : undefined
  });
  const menuSpan = el('span', { className: 'chart-controls-menu' }, [exportShareMenuHandle.el]);
  const chartCountControl = chartCountButton ? el('div', { className: 'demo-btn-group' }, [chartCountButton.el]) : null;
  const modeControl = el('div', { className: 'demo-btn-group' }, [modeButton.el]);
  const commonControls = [...(chartCountControl ? [chartCountControl] : []), modeControl];

  // Group-mode panel
  const resetGroupsButton = buttonWithTooltip({
    id: 'edit-reset-groups', label: demoText.editableChart.resetGroups.label, ariaLabel: demoText.editableChart.resetGroups.aria,
    tooltipText: demoText.editableChart.resetGroups.tooltip,
    onClick: resetGroups,
    content: [icon('arrow-rotate-left', { size: 'lg', fixedWidth: true })]
  });
  const reverseGroupsButton = buttonWithTooltip({
    id: 'edit-reverse-groups', label: demoText.editableChart.reverseGroups.label, ariaLabel: demoText.editableChart.reverseGroups.aria,
    tooltipText: demoText.editableChart.reverseGroups.tooltip,
    onClick: reverseGroups,
    content: [icon('right-left', { size: 'lg', fixedWidth: true })]
  });
  const addGroupsButton = buttonWithTooltip({
    id: 'edit-add-groups', label: demoText.editableChart.addGroups.label, ariaLabel: demoText.editableChart.addGroups.aria,
    tooltipText: demoText.editableChart.addGroups.tooltip,
    onClick: addGroups,
    content: [icon('plus', { size: 'lg', fixedWidth: true })]
  });
  const removeGroupsButton = buttonWithTooltip({
    id: 'edit-remove-groups', label: demoText.editableChart.removeGroups.label, ariaLabel: demoText.editableChart.removeGroups.aria,
    tooltipText: demoText.editableChart.removeGroups.tooltip,
    onClick: removeGroups,
    content: [icon('minus', { size: 'lg', fixedWidth: true })]
  });
  const playAddButton = buttonWithTooltip({
    id: 'edit-play-add', ariaLabel: demoText.editableChart.playAddGroups.aria,
    tooltipText: demoText.editableChart.playAddGroups.tooltip,
    onClick: startAddSequence,
    content: [icon('play', { size: 'lg' }), el('span', { style: 'padding-right: 2px;' }), icon('plus', { size: 'lg' })]
  });
  const playRemoveButton = buttonWithTooltip({
    id: 'edit-play-remove', ariaLabel: demoText.editableChart.playRemoveGroups.aria,
    tooltipText: demoText.editableChart.playRemoveGroups.tooltip,
    onClick: startRemoveSequence,
    content: [icon('play', { size: 'lg' }), el('span', { style: 'padding-right: 2px;' }), icon('minus', { size: 'lg' })]
  });
  const stopButton = buttonWithTooltip({
    id: 'edit-stop', ariaLabel: demoText.editableChart.stopSequence.aria,
    tooltipText: demoText.editableChart.stopSequence.tooltip,
    onClick: stopSequence,
    content: [icon('stop', { size: 'lg', fixedWidth: true })]
  });
  const selectAllButton = buttonWithTooltip({
    id: 'edit-select-all', label: demoText.editableChart.selectAllGroups.label, ariaLabel: demoText.editableChart.selectAllGroups.aria,
    tooltipText: demoText.editableChart.selectAllGroups.tooltip,
    onClick: selectAllGroups,
    content: [icon('check-double', { size: 'lg', fixedWidth: true })]
  });

  const groupInput = el('input', { className: 'demo-input', attrs: { type: 'text' } });
  groupInput.addEventListener('input', () => {
    groupValuesText = groupInput.value;
    sync();
  });

  const groupToolbar = el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } }, [
    el('div', { className: 'demo-btn-group' }, [
      resetGroupsButton.el, reverseGroupsButton.el, addGroupsButton.el, removeGroupsButton.el,
      playAddButton.el, playRemoveButton.el, stopButton.el, selectAllButton.el
    ])
  ]);
  const groupPanel = el('div', { className: 'chart-controls-container' }, [
    el('div', { className: 'chart-controls-buttons' }, [
      el('form', { className: 'demo-form-row' }, [
        el('div', { className: 'demo-field' }, [groupToolbar])
      ])
    ]),
    el('span', { className: 'chart-controls-input' }, [
      el('form', { className: 'demo-form-row' }, [groupInput])
    ])
  ]);

  // Series-mode panel
  const groupDecreaseButton = buttonWithTooltip({
    id: 'edit-group-decrease', ariaLabel: demoText.editableChart.decreaseGroupOrder.aria,
    tooltipText: demoText.editableChart.decreaseGroupOrder.tooltip,
    onClick: decreaseGroupOrder,
    content: [icon('arrow-left', { size: 'lg', fixedWidth: true })]
  });
  const groupIncreaseButton = buttonWithTooltip({
    id: 'edit-group-increase', ariaLabel: demoText.editableChart.increaseGroupOrder.aria,
    tooltipText: demoText.editableChart.increaseGroupOrder.tooltip,
    onClick: increaseGroupOrder,
    content: [icon('arrow-right', { size: 'lg', fixedWidth: true })]
  });
  const previousSeriesButton = buttonWithTooltip({
    id: 'edit-previous-series', ariaLabel: demoText.editableChart.previousSeries.aria,
    tooltipText: demoText.editableChart.previousSeries.tooltip,
    onClick: prevSeries,
    content: [icon('chevron-down', { size: 'lg', fixedWidth: true })]
  });
  const nextSeriesButton = buttonWithTooltip({
    id: 'edit-next-series', ariaLabel: demoText.editableChart.nextSeries.aria,
    tooltipText: demoText.editableChart.nextSeries.tooltip,
    onClick: nextSeries,
    content: [icon('chevron-up', { size: 'lg', fixedWidth: true })]
  });
  const resetSeriesButton = buttonWithTooltip({
    id: 'edit-reset-series', label: demoText.editableChart.resetSeries.label, ariaLabel: demoText.editableChart.resetSeries.aria,
    tooltipText: demoText.editableChart.resetSeries.tooltip,
    onClick: resetSeriesChanges,
    content: [icon('arrow-rotate-left', { size: 'lg', fixedWidth: true })]
  });
  const applySeriesButton = buttonWithTooltip({
    id: 'edit-apply-series', label: demoText.editableChart.applySeries.label, ariaLabel: demoText.editableChart.applySeries.aria,
    tooltipText: demoText.editableChart.applySeries.tooltip,
    onClick: applySeriesChanges,
    content: [icon('check', { size: 'lg', fixedWidth: true })]
  });

  const groupIndexLabel = el('span', { className: 'demo-label', style: 'margin-left: 5px; margin-right: 5px;' });
  const seriesIndexLabel = el('span', { className: 'demo-label', style: 'margin-left: 5px; margin-right: 5px;' });

  const seriesInput = el('input', { className: 'demo-input', attrs: { type: 'text' } });
  seriesInput.addEventListener('input', () => {
    seriesValuesText = seriesInput.value;
    sync();
  });

  const seriesForm = el('form', { className: 'demo-form-row' }, [
    el('div', { className: 'demo-field' }, [
      el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } }, [
        el('div', { className: 'demo-btn-group' }, [groupDecreaseButton.el])
      ])
    ]),
    el('div', { className: 'demo-field' }, [groupIndexLabel]),
    el('div', { className: 'demo-field' }, [
      el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } }, [
        el('div', { className: 'demo-btn-group' }, [groupIncreaseButton.el])
      ])
    ]),
    el('div', { className: 'demo-field' }, [
      el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } }, [
        el('div', { className: 'demo-btn-group' }, [previousSeriesButton.el])
      ])
    ]),
    el('div', { className: 'demo-field' }, [seriesIndexLabel]),
    el('div', { className: 'demo-field' }, [
      el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } }, [
        el('div', { className: 'demo-btn-group' }, [nextSeriesButton.el]),
        el('div', { className: 'demo-btn-group' }, [resetSeriesButton.el, applySeriesButton.el])
      ])
    ])
  ]);
  const seriesCommonToolbar = el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } });
  seriesForm.prepend(el('div', { className: 'demo-field' }, [seriesCommonToolbar]));

  const seriesPanel = el('div', { className: 'chart-controls-container' }, [
    el('div', { className: 'chart-controls-buttons' }, [seriesForm]),
    el('span', { className: 'chart-controls-input' }, [
      el('form', { className: 'demo-form-row' }, [seriesInput])
    ])
  ]);

  // Pie-mode slice panel — replaces both panels when slices are the series:
  // click a slice (or step prev/next) to select it, edit its value, or play
  // the suppress/restore sequence.
  const previousSliceButton = buttonWithTooltip({
    id: 'edit-previous-slice', ariaLabel: demoText.editableChart.previousSlice.aria,
    tooltipText: demoText.editableChart.previousSlice.tooltip,
    onClick: () => selectSlice(sliceIndex - 1),
    content: [icon('chevron-left', { size: 'lg', fixedWidth: true })]
  });
  const nextSliceButton = buttonWithTooltip({
    id: 'edit-next-slice', ariaLabel: demoText.editableChart.nextSlice.aria,
    tooltipText: demoText.editableChart.nextSlice.tooltip,
    onClick: () => selectSlice(sliceIndex + 1),
    content: [icon('chevron-right', { size: 'lg', fixedWidth: true })]
  });
  const resetSliceButton = buttonWithTooltip({
    id: 'edit-reset-slice', label: demoText.editableChart.resetSlice.label, ariaLabel: demoText.editableChart.resetSlice.aria,
    tooltipText: demoText.editableChart.resetSlice.tooltip,
    onClick: resetSliceChanges,
    content: [icon('arrow-rotate-left', { size: 'lg', fixedWidth: true })]
  });
  const applySliceButton = buttonWithTooltip({
    id: 'edit-apply-slice', label: demoText.editableChart.applySlice.label, ariaLabel: demoText.editableChart.applySlice.aria,
    tooltipText: demoText.editableChart.applySlice.tooltip,
    onClick: applySliceChanges,
    content: [icon('check', { size: 'lg', fixedWidth: true })]
  });
  const playSliceButton = buttonWithTooltip({
    id: 'edit-play-slices', ariaLabel: demoText.editableChart.playSliceSequence.aria,
    tooltipText: demoText.editableChart.playSliceSequence.tooltip,
    onClick: startSliceSequence,
    content: [icon('play', { size: 'lg', fixedWidth: true })]
  });
  const stopSliceButton = buttonWithTooltip({
    id: 'edit-stop-slices', ariaLabel: demoText.editableChart.stopSliceSequence.aria,
    tooltipText: demoText.editableChart.stopSliceSequence.tooltip,
    onClick: stopSequence,
    content: [icon('stop', { size: 'lg', fixedWidth: true })]
  });

  const sliceLabel = el('span', { className: 'demo-label', style: 'margin-left: 5px; margin-right: 5px;' });

  const sliceInput = el('input', { className: 'demo-input', attrs: { type: 'text' } });
  sliceInput.addEventListener('input', () => {
    sliceValueText = sliceInput.value;
    sync();
  });

  const sliceCommonToolbar = el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } });
  const sliceForm = el('form', { className: 'demo-form-row' }, [
    el('div', { className: 'demo-field' }, [sliceCommonToolbar]),
    el('div', { className: 'demo-field' }, [
      el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } }, [
        el('div', { className: 'demo-btn-group' }, [previousSliceButton.el])
      ])
    ]),
    el('div', { className: 'demo-field' }, [sliceLabel]),
    el('div', { className: 'demo-field' }, [
      el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } }, [
        el('div', { className: 'demo-btn-group' }, [nextSliceButton.el]),
        el('div', { className: 'demo-btn-group' }, [resetSliceButton.el, applySliceButton.el]),
        el('div', { className: 'demo-btn-group' }, [playSliceButton.el, stopSliceButton.el])
      ])
    ])
  ]);
  const slicePanel = el('div', { className: 'chart-controls-container' }, [
    el('div', { className: 'chart-controls-buttons' }, [sliceForm]),
    el('span', { className: 'chart-controls-input' }, [
      el('form', { className: 'demo-form-row' }, [sliceInput])
    ])
  ]);

  const controls = el('div', { className: 'editable-chart-controls' }, [groupPanel, seriesPanel, slicePanel]);
  const container = el('div', { className: 'editable-mochart-chart' }, [
    el('div', { className: 'editable-chart-container' }, [chartContentElement, controls])
  ]);

  // -------------------------------------------------------------------------
  // sync — recompute derived state and patch the DOM
  // -------------------------------------------------------------------------

  let lastChartProps: {
    width: number;
    mochartConfig: unknown;
    dataProvider: unknown;
    filteredSeriesIds: FilteredSeriesIds;
    focusedGroupIndex: number;
    focusedSeriesAxisId: string | null;
    focusedSeriesId: string | null;
  } | null = null;

  function sync(): void {
    const chartDataError = !!(dataProvider && dataProvider.getError && dataProvider.getError());
    const configError = !mochartDemoConfig.valid;
    const error = chartDataError || configError;
    const filteredGroupValues: any[] = error || !dataProvider?.getGroupValues ? [] : dataProvider.getGroupValues();
    const selectedGroupValues = (error || groupValuesText === emptyGroupText) ? [] : groupValuesText.split(',');
    const filteredGroupMap = filteredGroupValues.reduce<Record<string, boolean>>((map, group) => { map[group] = true; return map; }, {});
    const disableRemove = orderChanged || !selectedGroupValues.some(group => filteredGroupMap[group]);
    const disableAdd = orderChanged || !selectedGroupValues.some(group => !filteredGroupMap[group]);
    const seriesControlsDisabled = sequencePlaying || groupIndex === -1;
    const groupOrderControlsDisabled = sequencePlaying || groupIndex === -1;
    const isFirstGroup = groupIndex === 0;
    const isLastGroup = groupIndex === filteredGroupValues.length - 1;
    const hasPrevSeries = seriesIndex > 0;
    const hasNextSeries = seriesIndex < mochartDemoConfig.seriesCount - 1;

    // panel visibility + common controls placement (pie mode shows only the
    // slice panel; the group/series machinery has nothing to edit there)
    const pieMode = mochartDemoConfig.pieMode;
    const groupMode = selectionMode === 'group';
    groupPanel.style.display = !pieMode && groupMode ? '' : 'none';
    seriesPanel.style.display = !pieMode && !groupMode ? '' : 'none';
    slicePanel.style.display = pieMode ? '' : 'none';
    if (pieMode) {
      modeControl.remove();
      if (chartCountControl && chartCountControl.parentElement !== sliceCommonToolbar) {
        sliceCommonToolbar.append(chartCountControl);
      }
    }
    else if (groupMode) {
      if (commonControls[0].parentElement !== groupToolbar) {
        groupToolbar.prepend(...commonControls);
      }
    }
    else if (commonControls[0].parentElement !== seriesCommonToolbar) {
      seriesCommonToolbar.append(...commonControls);
    }

    // Keep the export/share menu as the last child of the visible panel (after
    // its input), so it stays pinned to the far right of the active row.
    const activePanel = pieMode ? slicePanel : groupMode ? groupPanel : seriesPanel;
    if (menuSpan.parentElement !== activePanel) {
      activePanel.append(menuSpan);
    }

    modeButton.setLabel(groupMode ? demoText.editableChart.editMode.labelToSeries : demoText.editableChart.editMode.labelToGroups);
    modeButton.setTooltip(groupMode
      ? demoText.editableChart.editMode.tooltipToSeries
      : demoText.editableChart.editMode.tooltipToGroups);
    modeButton.setContent([icon(groupMode ? 'bullseye' : 'sliders', { size: 'lg', fixedWidth: true })]);
    if (chartCountButton) {
      chartCountButton.setPressed(chartCount === 2);
      chartCountButton.setTooltip(chartCount === 2 ? demoText.editableChart.secondChart.tooltipHide : demoText.editableChart.secondChart.tooltipShow);
      chartCountButton.setContent([icon(chartCount === 2 ? 'window-maximize' : 'window-restore', { size: 'lg', fixedWidth: true })]);
    }
    exportShareMenuHandle.setDisabled(!!error);

    resetGroupsButton.setDisabled(error || sequencePlaying);
    reverseGroupsButton.setDisabled(error || sequencePlaying);
    addGroupsButton.setDisabled(error || sequencePlaying || disableAdd);
    removeGroupsButton.setDisabled(error || sequencePlaying || disableRemove);
    playAddButton.setDisabled(error || sequencePlaying || disableAdd);
    playRemoveButton.setDisabled(error || sequencePlaying || disableRemove);
    stopButton.setDisabled(error || !sequencePlaying);
    selectAllButton.setDisabled(error || sequencePlaying);
    groupInput.disabled = error || sequencePlaying;
    if (groupInput.value !== groupValuesText) {
      groupInput.value = groupValuesText;
    }

    groupDecreaseButton.setDisabled(error || groupOrderControlsDisabled || isFirstGroup);
    groupIncreaseButton.setDisabled(error || groupOrderControlsDisabled || isLastGroup);
    previousSeriesButton.setDisabled(error || seriesControlsDisabled || !hasPrevSeries);
    nextSeriesButton.setDisabled(error || seriesControlsDisabled || !hasNextSeries);
    resetSeriesButton.setDisabled(error || seriesControlsDisabled);
    applySeriesButton.setDisabled(error || seriesControlsDisabled);
    groupIndexLabel.textContent = demoText.editableChart.groupIndexPrefix + groupIndex;
    seriesIndexLabel.textContent = demoText.editableChart.seriesIndexPrefix + seriesIndex;
    seriesInput.disabled = error || seriesControlsDisabled;
    if (seriesInput.value !== seriesValuesText) {
      seriesInput.value = seriesValuesText;
    }

    if (pieMode) {
      const sliceControlsDisabled = error || sequencePlaying || slices.length === 0;
      previousSliceButton.setDisabled(sliceControlsDisabled || sliceIndex === 0);
      nextSliceButton.setDisabled(sliceControlsDisabled || sliceIndex >= slices.length - 1);
      resetSliceButton.setDisabled(sliceControlsDisabled);
      applySliceButton.setDisabled(sliceControlsDisabled);
      playSliceButton.setDisabled(error || sequencePlaying || slices.length < 3);
      stopSliceButton.setDisabled(error || !sequencePlaying);
      sliceLabel.textContent = slices.length > 0 ? demoText.editableChart.sliceIndexPrefix + sliceIndex : demoText.editableChart.selectASliceText;
      sliceLabel.title = slices.length > 0 ? slices[sliceIndex].title : '';
      sliceInput.disabled = sliceControlsDisabled;
      if (sliceInput.value !== sliceValueText) {
        sliceInput.value = sliceValueText;
      }
    }

    // chart props
    if (lastChartProps === null || lastChartProps.width !== width ||
        lastChartProps.mochartConfig !== mochartDemoConfig.mochartConfig ||
        lastChartProps.dataProvider !== dataProvider ||
        lastChartProps.filteredSeriesIds !== filteredSeriesIds ||
        lastChartProps.focusedGroupIndex !== filteredFocusedGroupIndex ||
        lastChartProps.focusedSeriesAxisId !== focusedSeriesAxisId ||
        lastChartProps.focusedSeriesId !== focusedSeriesId) {
      lastChartProps = {
        width,
        mochartConfig: mochartDemoConfig.mochartConfig,
        dataProvider,
        filteredSeriesIds,
        focusedGroupIndex: filteredFocusedGroupIndex,
        focusedSeriesAxisId,
        focusedSeriesId
      };
      chartHost.update({
        width,
        mochartConfig: mochartDemoConfig.mochartConfig,
        dataProvider,
        filteredSeriesIds,
        focusedGroupIndex: filteredFocusedGroupIndex,
        focusedSeriesAxisId,
        focusedSeriesId,
        onFocus: onChartFocus,
        onSeriesFilter,
        onChartClick,
        onSliceClick: onChartSliceClick
      });
    }
  }

  initData();

  return {
    el: container,
    update(next: EditableChartUpdate) {
      const configStructureChanged = next.mochartDemoConfig !== mochartDemoConfig &&
        hasConfigStructureChange(mochartDemoConfig.mochartConfig, next.mochartDemoConfig.mochartConfig);
      const dataChanged = next.data !== data || (next.dataError ?? false) !== dataError;
      const focusChanged = next.focusedGroupIndex !== focusedGroupIndex;

      width = next.width;
      mochartDemoConfig = next.mochartDemoConfig;
      data = next.data;
      dataError = next.dataError ?? false;
      chartCount = next.chartCount;
      filteredSeriesIds = next.filteredSeriesIds;
      focusedGroupIndex = next.focusedGroupIndex;
      focusedSeriesAxisId = next.focusedSeriesAxisId ?? null;
      focusedSeriesId = next.focusedSeriesId ?? null;

      if (dataChanged || configStructureChanged) {
        initData();
      }
      else if (focusChanged) {
        filteredFocusedGroupIndex = getFilteredFocusedGroupIndex(filteredData);
        sync();
      }
      else {
        sync();
      }
      if (next.isActive === false) {
        stopSequence();
      }
    },
    destroy() {
      stopSequenceInternal();
      exportShareMenuHandle.destroy();
      chartHost.destroy();
    }
  };
}
