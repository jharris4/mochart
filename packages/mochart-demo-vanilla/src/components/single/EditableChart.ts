import { hasConfigStructureChange, NONE, ArrayOfObjectsDataProvider } from 'mochart';

import { buttonWithTooltip, el, icon } from '../misc/dom';
import { mountChart } from '../misc/chartHost';
import { exportButtons } from '../misc/ExportButtons';

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
  focusedGroupIndex: number;
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

const emptyGroupText = 'Select Group(s)';

export function editableChart(props: EditableChartProps): EditableChartHandle {
  const { onFocus, onSeriesFilter, onChartCountToggle, showChartCountControls } = props;

  let width = props.width;
  let mochartDemoConfig = props.mochartDemoConfig;
  let data = props.data;
  let dataError = props.dataError ?? false;
  let chartCount = props.chartCount;
  let focusedGroupIndex = props.focusedGroupIndex;

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
      seriesValuesText = 'Select a Group';
    }
    filteredFocusedGroupIndex = dataError ? -1 : getFilteredFocusedGroupIndex(nextFilteredData);
    void filteredFocusedGroupIndex;
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
    updateFilteredDataState({ orderChanged: false, seriesIndex: 0, groupValuesText: emptyGroupText }, nextFilteredData, []);
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
      onFocus: onChartFocus,
      onSeriesFilter,
      onChartClick
    },
    { style: 'flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;' }
  );

  const chartContentElement = el('div', { className: 'editable-chart-content' }, [chartHost.el]);

  // Common controls shared by both panels; moved into whichever panel is
  // visible (the framework demos render them per-branch instead).
  const chartCountButton = showChartCountControls ? buttonWithTooltip({
    id: 'edit-chart-count', label: '2nd Chart', pressed: chartCount === 2, ariaLabel: 'Toggle Chart Count',
    tooltipText: (chartCount === 2 ? 'Hide the' : 'Show a') + ' second chart sharing the same data',
    onClick: onChartCountToggle,
    content: [icon(chartCount === 2 ? 'window-maximize' : 'window-restore', { size: 'lg', fixedWidth: true })]
  }) : null;
  const modeButton = buttonWithTooltip({
    id: 'edit-mode', label: 'Edit Series', ariaLabel: 'Toggle Mode',
    tooltipText: 'Switch to editing one group at a time (step groups/series, change values)',
    onClick: onModeToggle,
    content: [icon('bullseye', { size: 'lg', fixedWidth: true })]
  });
  const exportGroup = exportButtons('edit', () => chartContentElement);
  const commonControls = [
    ...(chartCountButton ? [el('div', { className: 'btn-group' }, [chartCountButton.el])] : []),
    el('div', { className: 'btn-group' }, [modeButton.el]),
    exportGroup.el
  ];

  // Group-mode panel
  const resetGroupsButton = buttonWithTooltip({
    id: 'edit-reset-groups', label: 'Reset', ariaLabel: 'Reset Groups',
    tooltipText: 'Restore the original group set and order',
    onClick: resetGroups,
    content: [icon('arrow-rotate-left', { size: 'lg', fixedWidth: true })]
  });
  const reverseGroupsButton = buttonWithTooltip({
    id: 'edit-reverse-groups', label: 'Reverse', ariaLabel: 'Reverse Groups',
    tooltipText: 'Reverse the order of the groups',
    onClick: reverseGroups,
    content: [icon('right-left', { size: 'lg', fixedWidth: true })]
  });
  const addGroupsButton = buttonWithTooltip({
    id: 'edit-add-groups', label: 'Add', ariaLabel: 'Add Selected Groups',
    tooltipText: 'Add the groups selected in the input to the chart',
    onClick: addGroups,
    content: [icon('plus', { size: 'lg', fixedWidth: true })]
  });
  const removeGroupsButton = buttonWithTooltip({
    id: 'edit-remove-groups', label: 'Remove', ariaLabel: 'Remove Selected Groups',
    tooltipText: 'Remove the groups selected in the input from the chart',
    onClick: removeGroups,
    content: [icon('minus', { size: 'lg', fixedWidth: true })]
  });
  const playAddButton = buttonWithTooltip({
    id: 'edit-play-add', ariaLabel: 'Play Add Selected Groups',
    tooltipText: 'Animate adding the selected groups one at a time',
    onClick: startAddSequence,
    content: [icon('play', { size: 'lg' }), el('span', { style: 'padding-right: 2px;' }), icon('plus', { size: 'lg' })]
  });
  const playRemoveButton = buttonWithTooltip({
    id: 'edit-play-remove', ariaLabel: 'Play Remove Selected Groups',
    tooltipText: 'Animate removing the selected groups one at a time',
    onClick: startRemoveSequence,
    content: [icon('play', { size: 'lg' }), el('span', { style: 'padding-right: 2px;' }), icon('minus', { size: 'lg' })]
  });
  const stopButton = buttonWithTooltip({
    id: 'edit-stop', ariaLabel: 'Stop Selected Group Sequence',
    tooltipText: 'Stop the add/remove animation',
    onClick: stopSequence,
    content: [icon('stop', { size: 'lg', fixedWidth: true })]
  });
  const selectAllButton = buttonWithTooltip({
    id: 'edit-select-all', label: 'Select All', ariaLabel: 'Select All Groups',
    tooltipText: 'Put every group into the selection input',
    onClick: selectAllGroups,
    content: [icon('check-double', { size: 'lg', fixedWidth: true })]
  });

  const groupInput = el('input', { className: 'form-control', attrs: { type: 'text' } });
  groupInput.addEventListener('input', () => {
    groupValuesText = groupInput.value;
    sync();
  });

  const groupToolbar = el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, [
    el('div', { className: 'btn-group' }, [
      resetGroupsButton.el, reverseGroupsButton.el, addGroupsButton.el, removeGroupsButton.el,
      playAddButton.el, playRemoveButton.el, stopButton.el, selectAllButton.el
    ])
  ]);
  const groupPanel = el('div', { className: 'chart-controls-container' }, [
    el('div', { className: 'chart-controls-buttons' }, [
      el('form', { className: 'form-inline' }, [
        el('div', { className: 'form-group' }, [groupToolbar])
      ])
    ]),
    el('span', { className: 'chart-controls-input' }, [
      el('form', { className: 'form-inline' }, [groupInput])
    ])
  ]);

  // Series-mode panel
  const groupDecreaseButton = buttonWithTooltip({
    id: 'edit-group-decrease', ariaLabel: 'Decrease Group Order',
    tooltipText: 'Move the focused group one position earlier',
    onClick: decreaseGroupOrder,
    content: [icon('arrow-left', { size: 'lg', fixedWidth: true })]
  });
  const groupIncreaseButton = buttonWithTooltip({
    id: 'edit-group-increase', ariaLabel: 'Increase Group Order',
    tooltipText: 'Move the focused group one position later',
    onClick: increaseGroupOrder,
    content: [icon('arrow-right', { size: 'lg', fixedWidth: true })]
  });
  const previousSeriesButton = buttonWithTooltip({
    id: 'edit-previous-series', ariaLabel: 'Previous Series',
    tooltipText: 'Edit the previous series',
    onClick: prevSeries,
    content: [icon('chevron-down', { size: 'lg', fixedWidth: true })]
  });
  const nextSeriesButton = buttonWithTooltip({
    id: 'edit-next-series', ariaLabel: 'Next Series',
    tooltipText: 'Edit the next series',
    onClick: nextSeries,
    content: [icon('chevron-up', { size: 'lg', fixedWidth: true })]
  });
  const resetSeriesButton = buttonWithTooltip({
    id: 'edit-reset-series', label: 'Reset', ariaLabel: 'Reset Series Changes',
    tooltipText: "Discard the edits to this series' values",
    onClick: resetSeriesChanges,
    content: [icon('arrow-rotate-left', { size: 'lg', fixedWidth: true })]
  });
  const applySeriesButton = buttonWithTooltip({
    id: 'edit-apply-series', label: 'Apply', ariaLabel: 'Apply Series Changes',
    tooltipText: 'Apply the edited series values to the chart',
    onClick: applySeriesChanges,
    content: [icon('check', { size: 'lg', fixedWidth: true })]
  });

  const groupIndexLabel = el('span', { className: 'form-control-plaintext', style: 'margin-left: 5px; margin-right: 5px;' });
  const seriesIndexLabel = el('span', { className: 'form-control-plaintext', style: 'margin-left: 5px; margin-right: 5px;' });

  const seriesInput = el('input', { className: 'form-control', attrs: { type: 'text' } });
  seriesInput.addEventListener('input', () => {
    seriesValuesText = seriesInput.value;
    sync();
  });

  const seriesForm = el('form', { className: 'form-inline' }, [
    el('div', { className: 'form-group' }, [
      el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, [
        el('div', { className: 'btn-group' }, [groupDecreaseButton.el])
      ])
    ]),
    el('div', { className: 'form-group' }, [groupIndexLabel]),
    el('div', { className: 'form-group' }, [
      el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, [
        el('div', { className: 'btn-group' }, [groupIncreaseButton.el])
      ])
    ]),
    el('div', { className: 'form-group' }, [
      el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, [
        el('div', { className: 'btn-group' }, [previousSeriesButton.el])
      ])
    ]),
    el('div', { className: 'form-group' }, [seriesIndexLabel]),
    el('div', { className: 'form-group' }, [
      el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, [
        el('div', { className: 'btn-group' }, [nextSeriesButton.el]),
        el('div', { className: 'btn-group' }, [resetSeriesButton.el, applySeriesButton.el])
      ])
    ])
  ]);
  const seriesCommonToolbar = el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } });
  seriesForm.prepend(el('div', { className: 'form-group' }, [seriesCommonToolbar]));

  const seriesPanel = el('div', { className: 'chart-controls-container' }, [
    el('div', { className: 'chart-controls-buttons' }, [seriesForm]),
    el('span', { className: 'chart-controls-input' }, [
      el('form', { className: 'form-inline' }, [seriesInput])
    ])
  ]);

  const controls = el('div', { className: 'editable-chart-controls' }, [groupPanel, seriesPanel]);
  const container = el('div', { className: 'editable-mochart-chart' }, [
    el('div', { className: 'editable-chart-container' }, [chartContentElement, controls])
  ]);

  // -------------------------------------------------------------------------
  // sync — recompute derived state and patch the DOM
  // -------------------------------------------------------------------------

  let lastChartProps: { width: number; mochartConfig: unknown; dataProvider: unknown } | null = null;

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

    // panel visibility + common controls placement
    const groupMode = selectionMode === 'group';
    groupPanel.style.display = groupMode ? '' : 'none';
    seriesPanel.style.display = groupMode ? 'none' : '';
    if (groupMode) {
      if (commonControls[0].parentElement !== groupToolbar) {
        groupToolbar.prepend(...commonControls);
      }
    }
    else if (commonControls[0].parentElement !== seriesCommonToolbar) {
      seriesCommonToolbar.append(...commonControls);
    }

    modeButton.setLabel(groupMode ? 'Edit Series' : 'Edit Groups');
    modeButton.setTooltip(groupMode
      ? 'Switch to editing one group at a time (step groups/series, change values)'
      : 'Switch to editing the set of groups (add, remove, reorder)');
    modeButton.setContent([icon(groupMode ? 'bullseye' : 'sliders', { size: 'lg', fixedWidth: true })]);
    if (chartCountButton) {
      chartCountButton.setPressed(chartCount === 2);
      chartCountButton.setTooltip((chartCount === 2 ? 'Hide the' : 'Show a') + ' second chart sharing the same data');
      chartCountButton.setContent([icon(chartCount === 2 ? 'window-maximize' : 'window-restore', { size: 'lg', fixedWidth: true })]);
    }
    exportGroup.setDisabled(!!error);

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
    groupIndexLabel.textContent = 'Group: ' + groupIndex;
    seriesIndexLabel.textContent = 'Series: ' + seriesIndex;
    seriesInput.disabled = error || seriesControlsDisabled;
    if (seriesInput.value !== seriesValuesText) {
      seriesInput.value = seriesValuesText;
    }

    // chart props
    if (lastChartProps === null || lastChartProps.width !== width ||
        lastChartProps.mochartConfig !== mochartDemoConfig.mochartConfig ||
        lastChartProps.dataProvider !== dataProvider) {
      lastChartProps = { width, mochartConfig: mochartDemoConfig.mochartConfig, dataProvider };
      chartHost.update({
        width,
        mochartConfig: mochartDemoConfig.mochartConfig,
        dataProvider,
        onFocus: onChartFocus,
        onSeriesFilter,
        onChartClick
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
      focusedGroupIndex = next.focusedGroupIndex;

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
      chartHost.destroy();
    }
  };
}
