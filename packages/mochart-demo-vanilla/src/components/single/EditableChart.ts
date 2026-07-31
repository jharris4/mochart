import { hasConfigStructureChange, NONE, ArrayOfObjectsDataProvider } from '@mochart/core';
import { exportPNG, exportSVG } from '@mochart/export';

import { applyPieSliceValue, getChartExportOptions, getGroupIndexTitle, getPieSequenceSteps, getPieSlices, getSeriesIndexTitle, demoText, isPhoneViewport, watchPhoneViewport } from '@mochart/demo-common';

import type { PieSliceInfo, ShareState } from '@mochart/demo-common';

import { buttonWithTooltip, el, icon, setChildren, withPreservedFocus } from '../misc/dom';
import { mountChart } from '../misc/chartHost';
import { exportShareMenu } from '../misc/ExportShareMenu';
import { menuDivider, overflowMenu } from '../misc/OverflowMenu';

import type { MenuItem } from '../misc/OverflowMenu';

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
  /**
   * Dismiss both of this strip's popovers. The tab that owns this chart calls it
   * on the way out: a pane is deactivated by being marked `inert` and shifted a
   * viewport-width left, and an open panel is `position: fixed` — inert stops it
   * being usable but not being *seen*, so it would hang over the pane that
   * replaced it.
   */
  closeMenus(): void;
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

  // The phone fold. Read once up front and kept current by the watcher below;
  // `sync()` re-lays the controls out from it (see placeControls).
  let isPhone = isPhoneViewport();
  const unwatchViewport = watchPhoneViewport(next => {
    isPhone = next;
    sync();
  });

  function getFilteredFocusedGroupIndex(nextFilteredData: Row[]): number {
    let nextFilteredFocusedGroupIndex = -1;
    if (focusedGroupIndex >= 0) {
      const groupProperty = mochartDemoConfig.groupProperty ?? '';
      const groupValue = data[focusedGroupIndex][groupProperty];
      const count = nextFilteredData.length;
      for (let i = 0; i < count; i++) {
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
      const count = data.length;
      for (let i = 0; i < count; i++) {
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
      applyPieSliceValue(filteredData[0], slices[sliceIndex].property, value);
      updateFilteredDataState({}, filteredData, removedData, false);
    }
  }

  function resetSliceChanges(): void {
    if (filteredData.length > 0 && data.length > 0 && slices.length > 0) {
      const property = slices[sliceIndex].property;
      applyPieSliceValue(filteredData[0], property, data[0][property] as number);
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
        const count = data.length;
        for (let i = 0; i < count; i++) {
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
    const count = data.length;
    for (let i = 0; i < count; i++) {
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
    const count = data.length;
    const filteredCount = oldFilteredData.length;
    const nextFilteredData: Row[] = [];
    for (let i = 0, fi = 0; i < count; i++) {
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
    const count = oldFilteredData.length;
    const nextFilteredData: Row[] = [];
    for (let i = 0; i < count; i++) {
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
      catch {
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
  // The phone fold's trigger. It deliberately lives inside `menuSpan` rather
  // than beside the panels: `.editable-mochart-chart` and
  // `.editable-chart-container` are `display: contents`, so their children ARE
  // the grid items of `.editable-charts` — a third child of the container would
  // start a second implicit column and knock the two plots out of row alignment
  // when two charts are shown (fixed once already in 6ad187d). Inside
  // `menuSpan` it also inherits the re-parenting sync() already does to keep
  // the menus pinned to the right of whichever panel is visible.
  const overflowMenuHandle = overflowMenu({
    text: demoText.overflowMenu.chart,
    // Opens upward over the chart (the strip is at the bottom of the pane) and
    // right-aligned.
    placement: { side: 'top', align: 'end', gap: 4 },
    // Measured against the whole trailing group, not the trigger: the
    // export/share trigger sits to the ⋯'s right, so aligning to the ⋯ alone
    // would stop the panel ~50px short of the row's end — and on a 390px phone
    // a 320px panel pushed that far left hangs off the opposite edge.
    getAnchor: () => menuSpan
  });
  const menuSpan = el('span', { className: 'chart-controls-menu' }, [overflowMenuHandle.el, exportShareMenuHandle.el]);
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
  // The three transport buttons are icon-only at every width by design, so they
  // carry `menuLabel` for the fold — without it they read as a column of bare
  // glyphs once they are inside the overflow panel.
  const playAddButton = buttonWithTooltip({
    id: 'edit-play-add', ariaLabel: demoText.editableChart.playAddGroups.aria,
    menuLabel: demoText.editableChart.playAddGroups.menuLabel,
    tooltipText: demoText.editableChart.playAddGroups.tooltip,
    onClick: startAddSequence,
    content: [icon('play', { size: 'lg' }), el('span', { style: 'padding-right: 2px;' }), icon('plus', { size: 'lg' })]
  });
  const playRemoveButton = buttonWithTooltip({
    id: 'edit-play-remove', ariaLabel: demoText.editableChart.playRemoveGroups.aria,
    menuLabel: demoText.editableChart.playRemoveGroups.menuLabel,
    tooltipText: demoText.editableChart.playRemoveGroups.tooltip,
    onClick: startRemoveSequence,
    content: [icon('play', { size: 'lg' }), el('span', { style: 'padding-right: 2px;' }), icon('minus', { size: 'lg' })]
  });
  const stopButton = buttonWithTooltip({
    id: 'edit-stop', ariaLabel: demoText.editableChart.stopSequence.aria,
    menuLabel: demoText.editableChart.stopSequence.menuLabel,
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

  // The strip's order at desktop widths; also the list the fold restores.
  const groupButtons = [
    resetGroupsButton.el, reverseGroupsButton.el, addGroupsButton.el, removeGroupsButton.el,
    playAddButton.el, playRemoveButton.el, stopButton.el, selectAllButton.el
  ];
  const groupButtonGroup = el('div', { className: 'demo-btn-group' }, groupButtons);
  const groupToolbar = el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } }, [groupButtonGroup]);

  // Menu-side homes for the loose buttons the fold takes out of the strip —
  // cached `.demo-btn-group`s; OverflowMenu.ts's header says why that shape.
  const menuOrderGroup = el('div', { className: 'demo-btn-group' });
  const menuSequenceGroup = el('div', { className: 'demo-btn-group' });
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

  // The index sits in its own fixed-width span so stepping through indexes
  // never shifts the controls to the right of the label.
  //
  // The `Group: ` / `Series: ` prefixes get a span of their own so the phone
  // tier can take them out of the layout — see `.demo-label-prefix` in the
  // stylesheet's phone block, and the width arithmetic beside the margin
  // toggle in placeControls. They are CLIPPED there, not removed: the readout
  // has no other accessible name.
  //
  // The compact spans are the phone-tier stand-ins: a bare `-1` between two
  // arrows names nothing visually, so `G` / `S` carry the meaning in the space
  // the strip can actually spare. `aria-hidden`, so the accessible name stays
  // the clipped full prefix and never doubles up as "Group: G -1". Hidden by
  // the base stylesheet at every other width.
  const groupIndexValue = el('span', { className: 'demo-index-value' });
  const seriesIndexValue = el('span', { className: 'demo-index-value' });
  const groupIndexLabel = el('span', { className: 'demo-label', style: 'margin-left: 5px; margin-right: 5px;' }, [
    el('span', { className: 'demo-label-prefix', text: demoText.editableChart.groupIndexPrefix }),
    el('span', { className: 'demo-label-prefix-compact', attrs: { 'aria-hidden': 'true' }, text: demoText.editableChart.groupIndexPrefixCompact }),
    groupIndexValue
  ]);
  const seriesIndexLabel = el('span', { className: 'demo-label', style: 'margin-left: 5px; margin-right: 5px;' }, [
    el('span', { className: 'demo-label-prefix', text: demoText.editableChart.seriesIndexPrefix }),
    el('span', { className: 'demo-label-prefix-compact', attrs: { 'aria-hidden': 'true' }, text: demoText.editableChart.seriesIndexPrefixCompact }),
    seriesIndexValue
  ]);

  const seriesInput = el('input', { className: 'demo-input', attrs: { type: 'text' } });
  seriesInput.addEventListener('input', () => {
    seriesValuesText = seriesInput.value;
    sync();
  });

  // Named (rather than inlined into the tree below) so the fold can swap its
  // contents: Reset moves into the menu on a phone, Apply stays beside the
  // input it applies. `seriesActionButtons` is also the list the unfold
  // restores, so the desktop order has exactly one definition.
  const seriesActionButtons = [resetSeriesButton.el, applySeriesButton.el];
  const seriesActionGroup = el('div', { className: 'demo-btn-group' }, seriesActionButtons);
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
        seriesActionGroup
      ])
    ])
  ]);
  // Menu-side home for Reset (a cached `.demo-btn-group` — see OverflowMenu.ts).
  const menuSeriesActionGroup = el('div', { className: 'demo-btn-group' });
  const seriesCommonToolbar = el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } });
  // Emptied by the fold (commonControls move into the menu), and an empty flex
  // item still spends one of `.demo-form-row`'s 10px column gaps — which the
  // tightest strip of the three cannot spare. placeControls hides it for the
  // duration of the fold.
  const seriesCommonField = el('div', { className: 'demo-field' }, [seriesCommonToolbar]);
  seriesForm.prepend(seriesCommonField);

  // Named so the fold can move Apply in beside the input it applies — see the
  // series branch of placeControls.
  const seriesInputForm = el('form', { className: 'demo-form-row' }, [seriesInput]);
  const seriesPanel = el('div', { className: 'chart-controls-container' }, [
    el('div', { className: 'chart-controls-buttons' }, [seriesForm]),
    el('span', { className: 'chart-controls-input' }, [seriesInputForm])
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
  // Icon-only at every width by design, so — like the group panel's transport
  // buttons — they carry `menuLabel` for the fold, which renders only inside a
  // menu and so leaves the desktop strip untouched.
  const playSliceButton = buttonWithTooltip({
    id: 'edit-play-slices', ariaLabel: demoText.editableChart.playSliceSequence.aria,
    menuLabel: demoText.editableChart.playSliceSequence.menuLabel,
    tooltipText: demoText.editableChart.playSliceSequence.tooltip,
    onClick: startSliceSequence,
    content: [icon('play', { size: 'lg', fixedWidth: true })]
  });
  const stopSliceButton = buttonWithTooltip({
    id: 'edit-stop-slices', ariaLabel: demoText.editableChart.stopSliceSequence.aria,
    menuLabel: demoText.editableChart.stopSliceSequence.menuLabel,
    tooltipText: demoText.editableChart.stopSliceSequence.tooltip,
    onClick: stopSequence,
    content: [icon('stop', { size: 'lg', fixedWidth: true })]
  });

  const sliceLabel = el('span', { className: 'demo-label', style: 'margin-left: 5px; margin-right: 5px;' });
  const sliceIndexValue = el('span', { className: 'demo-index-value' });

  const sliceInput = el('input', { className: 'demo-input', attrs: { type: 'text' } });
  sliceInput.addEventListener('input', () => {
    sliceValueText = sliceInput.value;
    sync();
  });

  const sliceCommonToolbar = el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } });
  // Same split as the series panel: Reset folds out of the action group, and
  // the whole play/stop group folds out of the toolbar (moving the group itself
  // rather than emptying it, so no empty flex item is left spending a gap).
  const sliceActionButtons = [resetSliceButton.el, applySliceButton.el];
  const sliceStepGroup = el('div', { className: 'demo-btn-group' }, [nextSliceButton.el]);
  const sliceActionGroup = el('div', { className: 'demo-btn-group' }, sliceActionButtons);
  const sliceSequenceGroup = el('div', { className: 'demo-btn-group' }, [playSliceButton.el, stopSliceButton.el]);
  const sliceToolbarGroups = [sliceStepGroup, sliceActionGroup, sliceSequenceGroup];
  const sliceToolbar = el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } }, sliceToolbarGroups);
  const menuSliceActionGroup = el('div', { className: 'demo-btn-group' });
  // The slice menu's optional tail. Built once, and empty rather than
  // `[divider, null]` when there is no second-chart button: `setItems` drops
  // nulls but keeps dividers, so the unconditional form would rule off the
  // bottom of the panel with nothing under it — which on a phone (where the
  // second chart is never offered) is the usual case, not the corner one.
  const sliceMenuTail: MenuItem[] = chartCountControl ? [menuDivider, chartCountControl] : [];
  const sliceCommonField = el('div', { className: 'demo-field' }, [sliceCommonToolbar]);
  const sliceForm = el('form', { className: 'demo-form-row' }, [
    sliceCommonField,
    el('div', { className: 'demo-field' }, [
      el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } }, [
        el('div', { className: 'demo-btn-group' }, [previousSliceButton.el])
      ])
    ]),
    el('div', { className: 'demo-field' }, [sliceLabel]),
    el('div', { className: 'demo-field' }, [sliceToolbar])
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

  /**
   * Where every shared control lives right now — the single place that moves
   * `commonControls` between the three panels' toolbars, and (on a phone) folds
   * whichever panel is showing into the overflow menu.
   *
   * Reparenting, never duplication — see OverflowMenu.ts's header.
   *
   * Only the visible panel folds. The other two are `display: none` at this
   * point, so their strips are restored unconditionally — that is also what
   * pulls their controls back out of the menu when the active panel changes
   * (switching Edit Groups → Edit Series swaps the whole item list, which
   * detaches the group panel's menu rows; the restore below re-homes them).
   */
  function placeControls(pieMode: boolean, groupMode: boolean): void {
    const foldGroup = isPhone && !pieMode && groupMode;
    const foldSeries = isPhone && !pieMode && !groupMode;
    const foldSlice = isPhone && pieMode;

    // Do this first: emptying the panel detaches whatever it was hosting, so
    // the parent-identity guards below see an honest `null` and put the
    // controls back rather than believing they are already placed.
    //
    // The slice list carries `chartCountControl` but not `modeControl`: there
    // are no group/series panels to switch to in pie mode, which is why the
    // desktop branch removes that button rather than placing it.
    overflowMenuHandle.setItems(
      foldGroup ? [menuOrderGroup, menuDivider, menuSequenceGroup, menuDivider, ...commonControls]
        : foldSeries ? [menuSeriesActionGroup, menuDivider, ...commonControls]
          : foldSlice ? [menuSliceActionGroup, menuDivider, sliceSequenceGroup, ...sliceMenuTail]
            : []);

    // Group panel. Add/Remove act on what is typed in the input beside them, so
    // they stay in the strip; everything else folds.
    setChildren(groupButtonGroup, foldGroup ? [addGroupsButton.el, removeGroupsButton.el] : groupButtons);
    if (foldGroup) {
      setChildren(menuOrderGroup, [resetGroupsButton.el, reverseGroupsButton.el, selectAllButton.el]);
      setChildren(menuSequenceGroup, [playAddButton.el, playRemoveButton.el, stopButton.el]);
    }

    // Series panel. The steppers and their readouts stay — they are how a group
    // and a series get picked at all. Apply stays visible too, but moves DOWN,
    // onto the input row beside the JSON it applies: with it gone the stepper
    // row is four buttons and two readouts, which is what lets the panel hold
    // two rows even at 320x568 (five buttons wrapped it to three). Reset is the
    // one button with no partner anywhere, so it folds into the menu. The
    // emptied action group is `display: none`d by `.demo-btn-group:empty`.
    setChildren(seriesActionGroup, foldSeries ? [] : seriesActionButtons);
    setChildren(seriesInputForm, foldSeries ? [seriesInput, applySeriesButton.el] : [seriesInput]);
    if (foldSeries) {
      setChildren(menuSeriesActionGroup, [resetSeriesButton.el]);
    }
    seriesCommonField.style.display = foldSeries ? 'none' : '';
    // The readouts' own 5px side margins go too: the folded stepper row (four
    // 44px buttons plus the two compact readouts) fits 320x568's ~274px with
    // only a few pixels to spare, and the margins' 20px would wrap the ▲
    // stepper onto a second row. The phone tier's 6px field gap either side is
    // already separation enough for a two-character readout.
    //
    // Inline, because the desktop values are inline too — a stylesheet rule
    // could not win against them without `!important`. Written on every sync
    // rather than toggled, so the desktop branch always restores the exact
    // string the elements were built with.
    const indexLabelMargin = foldSeries ? '0px' : '5px';
    groupIndexLabel.style.marginLeft = indexLabelMargin;
    groupIndexLabel.style.marginRight = indexLabelMargin;
    seriesIndexLabel.style.marginLeft = indexLabelMargin;
    seriesIndexLabel.style.marginRight = indexLabelMargin;

    // Slice panel. Same shape: steppers, readout, Apply and the input stay; the
    // play/stop pair folds as a whole group rather than being emptied, so no
    // stray empty flex item is left behind spending a gap.
    setChildren(sliceToolbar, foldSlice ? [sliceStepGroup, sliceActionGroup] : sliceToolbarGroups);
    setChildren(sliceActionGroup, foldSlice ? [applySliceButton.el] : sliceActionButtons);
    if (foldSlice) {
      setChildren(menuSliceActionGroup, [resetSliceButton.el]);
    }
    // Hidden only while folded, never merely because it is empty: above the
    // phone tier this field is empty in pie mode whenever the second chart is
    // not on offer, and that empty field's gap is part of today's layout.
    sliceCommonField.style.display = foldSlice ? 'none' : '';

    if (pieMode) {
      modeControl.remove();
      if (!foldSlice && chartCountControl && chartCountControl.parentElement !== sliceCommonToolbar) {
        sliceCommonToolbar.append(chartCountControl);
      }
    }
    else if (foldGroup || foldSeries) {
      // commonControls are hosted by the overflow panel; setItems put them there.
    }
    else if (groupMode) {
      if (commonControls[0].parentElement !== groupToolbar) {
        groupToolbar.prepend(...commonControls);
      }
    }
    else if (commonControls[0].parentElement !== seriesCommonToolbar) {
      seriesCommonToolbar.append(...commonControls);
    }
  }

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
    placeControls(pieMode, groupMode);
    groupPanel.style.display = !pieMode && groupMode ? '' : 'none';
    seriesPanel.style.display = !pieMode && !groupMode ? '' : 'none';
    slicePanel.style.display = pieMode ? '' : 'none';

    // Keep the export/share menu as the last child of the visible panel (after
    // its input), so it stays pinned to the far right of the active row.
    //
    // `withPreservedFocus` because on a phone `menuSpan` carries the overflow
    // panel too, and the press that switches panels is usually made *inside* it
    // — Edit Series is one of the rows the fold puts there. Moving the span
    // detaches the button that was just pressed, which drops focus to <body>
    // and, with it, the menu controller's ability to hand focus back to the
    // trigger when it closes a moment later.
    const activePanel = pieMode ? slicePanel : groupMode ? groupPanel : seriesPanel;
    if (menuSpan.parentElement !== activePanel) {
      withPreservedFocus(() => activePanel.append(menuSpan));
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
    overflowMenuHandle.setDisabled(!!error);

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
    groupIndexValue.textContent = '' + groupIndex;
    seriesIndexValue.textContent = '' + seriesIndex;
    groupIndexLabel.title = getGroupIndexTitle(mochartDemoConfig, filteredData, groupIndex);
    seriesIndexLabel.title = getSeriesIndexTitle(mochartDemoConfig, seriesIndex);
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
      playSliceButton.setDisabled(error || sequencePlaying || slices.length < 2);
      stopSliceButton.setDisabled(error || !sequencePlaying);
      if (slices.length > 0) {
        // The index lives in its own fixed-width span so stepping slices never
        // shifts the controls to the right; the slice name is the tooltip.
        sliceLabel.textContent = demoText.editableChart.sliceIndexPrefix;
        sliceIndexValue.textContent = '' + sliceIndex;
        sliceLabel.append(sliceIndexValue);
        sliceLabel.title = slices[sliceIndex].title;
      }
      else {
        sliceLabel.textContent = demoText.editableChart.selectASliceText;
        sliceLabel.title = '';
      }
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
    closeMenus() {
      overflowMenuHandle.close();
      exportShareMenuHandle.close();
    },
    destroy() {
      stopSequenceInternal();
      unwatchViewport();
      overflowMenuHandle.destroy();
      exportShareMenuHandle.destroy();
      chartHost.destroy();
    }
  };
}
