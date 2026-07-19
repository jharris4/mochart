<script lang="ts">
  import { untrack, onDestroy } from 'svelte';

  import { hasConfigStructureChange, NONE, ArrayOfObjectsDataProvider } from '@mochart/core';
  import { demoText } from '@mochart/demo-common';
  import { exportPNG, exportSVG } from '@mochart/export';
  import { Chart } from '@mochart/svelte';

  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import ExportShareMenu from '../misc/ExportShareMenu.svelte';
  import Icon from '../misc/Icon.svelte';

  import type { MochartDemoConfig, FilteredSeriesIds, FocusData } from '../../types';

  // Mutable working rows are keyed by config-driven property names, so their
  // value type is intentionally loose.
  type Row = Record<string, any>;

  interface Props {
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

  let {
    width,
    mochartDemoConfig,
    data,
    dataError = false,
    isActive,
    chartCount,
    showChartCountControls,
    showShareButton = false,
    filteredSeriesIds,
    focusedGroupIndex,
    focusedSeriesAxisId = null,
    focusedSeriesId = null,
    onFocus,
    onSeriesFilter,
    onChartCountToggle
  }: Props = $props();

  let chartContentElement = $state<HTMLDivElement | null>(null);

  // Working copies of the demo data; mutated in place by the group/series
  // editing controls (same pattern as the react demo's instance fields).
  let filteredData: Row[] = [];
  let removedData: Row[] = [];
  let sequenceId: ReturnType<typeof setInterval> | null = null;

  let dataProvider = $state.raw<EditableDataProvider | null>(null);
  let groupIndex = $state(-1);
  let groupValuesText = $state("");
  let seriesIndex = $state(0);
  let seriesValuesText = $state("");
  let selectionMode = $state('group');
  let sequencePlaying = $state(false);
  let filteredFocusedGroupIndex = $state(-1);
  let orderChanged = $state(false);

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
  ) {
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
    if (nextState.orderChanged !== void 0) {
      orderChanged = nextState.orderChanged;
    }
    if (nextState.groupIndex !== void 0) {
      groupIndex = nextState.groupIndex;
    }
    if (nextState.seriesIndex !== void 0) {
      seriesIndex = nextState.seriesIndex;
    }
    if (nextState.groupValuesText !== void 0) {
      groupValuesText = nextState.groupValuesText;
    }
    if (nextState.seriesValuesText !== void 0) {
      seriesValuesText = nextState.seriesValuesText;
    }
  }

  function initData() {
    const nextFilteredData = [];
    if (data && !dataError) {
      let i, count = data.length;
      for (i = 0; i < count; i++) {
        nextFilteredData.push(Object.assign({}, data[i]));
      }
    }
    updateFilteredDataState({ orderChanged: false, seriesIndex: 0, groupValuesText: emptyGroupText }, nextFilteredData, []);
  }

  initData();

  // Props intentionally seed the previous-value snapshots with their initial
  // value only; the $effect.pre below re-syncs on later prop changes.
  // svelte-ignore state_referenced_locally
  let previousData = data;
  // svelte-ignore state_referenced_locally
  let previousDataError = dataError;
  // svelte-ignore state_referenced_locally
  let previousMochartDemoConfig = mochartDemoConfig;
  // svelte-ignore state_referenced_locally
  let previousFocusedGroupIndex = focusedGroupIndex;
  $effect.pre(() => {
    const nextData = data;
    const nextDataError = dataError;
    const nextMochartDemoConfig = mochartDemoConfig;
    const nextFocusedGroupIndex = focusedGroupIndex;
    const nextIsActive = isActive;
    untrack(() => {
      if (nextData !== previousData || nextDataError !== previousDataError ||
          (nextMochartDemoConfig !== previousMochartDemoConfig &&
           hasConfigStructureChange(previousMochartDemoConfig.mochartConfig, nextMochartDemoConfig.mochartConfig))) {
        previousData = nextData;
        previousDataError = nextDataError;
        previousMochartDemoConfig = nextMochartDemoConfig;
        previousFocusedGroupIndex = nextFocusedGroupIndex;
        initData();
      }
      else if (nextFocusedGroupIndex !== previousFocusedGroupIndex) {
        previousFocusedGroupIndex = nextFocusedGroupIndex;
        filteredFocusedGroupIndex = getFilteredFocusedGroupIndex(filteredData);
      }
      previousData = nextData;
      previousDataError = nextDataError;
      previousMochartDemoConfig = nextMochartDemoConfig;
      if (nextIsActive === false) {
        stopSequence();
      }
    });
  });

  // mochart's ManagedChart reports focus with the new payload shape; adapt it
  // to the { seriesAxisId, seriesId, groupIndex } shape this demo tracks.
  function onChartFocus({ focusedSeriesAxisId: seriesAxisId, focusedSeriesId: seriesId, focusedGroupIndex: chartGroupIndex }: { focusedSeriesAxisId?: string | null; focusedSeriesId?: string | null; focusedGroupIndex?: number }) {
    onLocalFocus({ seriesAxisId, seriesId, groupIndex: chartGroupIndex });
  }

  function onLocalFocus({ seriesAxisId, seriesId, groupIndex: nextGroupIndex }: FocusPayload) {
    if (nextGroupIndex !== void 0) {
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

  function onChartClick({ groupIndex: clickedGroupIndex }: { groupIndex: number }) {
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const clickedGroupValue = "" + filteredData[clickedGroupIndex][groupProperty];
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
  }

  function onModeToggle() {
    selectionMode = selectionMode === 'group' ? 'series' : 'group';
  }

  function selectAllGroups() {
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const allGroupValues: any[] = [];
    let i, count = data.length;
    for (i = 0; i < count; i++) {
      allGroupValues.push(data[i][groupProperty]);
    }
    groupValuesText = allGroupValues.join(',');
  }

  function resetGroups() {
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const groupToObjectMap: Record<string, Row> = {};
    removedData.forEach(removedObject => {
      groupToObjectMap[removedObject[groupProperty]] = removedObject;
    });
    filteredData.forEach(oldObject => {
      groupToObjectMap[oldObject[groupProperty]] = oldObject;
    });
    const nextFilteredData = data.map(o => groupToObjectMap[o[groupProperty]]);
    updateFilteredDataState({ orderChanged: false }, nextFilteredData, []);
  }

  function reverseGroups() {
    if (filteredData && filteredData.length > 1) {
      const nextFilteredData = filteredData.slice().reverse();
      updateFilteredDataState({ orderChanged: true }, nextFilteredData, removedData);
    }
  }

  function decreaseGroupOrder() {
    if (filteredData && filteredData.length > 1) {
      if (groupIndex > 0) {
        const nextFilteredData = filteredData.slice();
        const temp = nextFilteredData[groupIndex - 1];
        nextFilteredData[groupIndex - 1] = nextFilteredData[groupIndex];
        nextFilteredData[groupIndex] = temp;
        updateFilteredDataState({ orderChanged: true, groupIndex: groupIndex - 1 }, nextFilteredData, removedData, false);
      }
    }
  }

  function increaseGroupOrder() {
    if (filteredData && filteredData.length > 1) {
      if (groupIndex < filteredData.length - 1) {
        const nextFilteredData = filteredData.slice();
        const temp = nextFilteredData[groupIndex + 1];
        nextFilteredData[groupIndex + 1] = nextFilteredData[groupIndex];
        nextFilteredData[groupIndex] = temp;
        updateFilteredDataState({ orderChanged: true, groupIndex: groupIndex + 1 }, nextFilteredData, removedData, false);
      }
    }
  }

  function addGroups() {
    const oldFilteredData = filteredData;
    const oldRemovedData = removedData;
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
      if (removedMap[removedObject[groupProperty]] !== void 0) {
        nextRemovedData.push(removedMap[removedObject[groupProperty]]);
      }
    });
    updateFilteredDataState({}, nextFilteredData, nextRemovedData);
  }

  function removeGroups() {
    const oldFilteredData = filteredData;
    const nextRemovedData = removedData;
    const groupProperty = mochartDemoConfig.groupProperty ?? '';
    const groupValuesToRemove = groupValuesText === emptyGroupText ? [] : groupValuesText.split(",");
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

  function startAddSequence() {
    const oldFilteredData = filteredData;
    const oldRemovedData = removedData;
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
    }
  }

  function startRemoveSequence() {
    const oldFilteredData = filteredData;
    const oldRemovedData = removedData;
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
    }
  }

  function stopSequence() {
    stopSequenceInternal();
    sequencePlaying = false;
  }

  function stopSequenceInternal() {
    if (sequenceId !== null) {
      clearInterval(sequenceId);
      sequenceId = null;
    }
  }

  function prevSeries() {
    if (groupIndex !== -1 && seriesIndex > 0) {
      seriesIndex--;
      seriesValuesText = getSeriesValuesText(mochartDemoConfig, filteredData, groupIndex, seriesIndex);
    }
  }

  function nextSeries() {
    const { seriesCount } = mochartDemoConfig;
    if (groupIndex !== -1 && seriesIndex < seriesCount - 1) {
      seriesIndex++;
      seriesValuesText = getSeriesValuesText(mochartDemoConfig, filteredData, groupIndex, seriesIndex);
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
      return "";
    }
  }

  function applySeriesChanges() {
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

      }
    }
  }

  function resetSeriesChanges() {
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

  onDestroy(() => {
    stopSequenceInternal();
  });

  const chartDataError = $derived(!!(dataProvider && dataProvider.getError && dataProvider.getError()));
  const configError = $derived(!mochartDemoConfig.valid);
  const error = $derived(chartDataError || configError);
  const filteredGroupValues = $derived<any[]>(error || !dataProvider?.getGroupValues ? [] : dataProvider.getGroupValues());
  const selectedGroupValues = $derived((error || groupValuesText === emptyGroupText) ? [] : groupValuesText.split(','));
  const filteredGroupMap = $derived(filteredGroupValues.reduce<Record<string, boolean>>((map, group) => { map[group] = true; return map; }, {}));
  const disableRemove = $derived(orderChanged || !selectedGroupValues.some(group => filteredGroupMap[group]));
  const disableAdd = $derived(orderChanged || !selectedGroupValues.some(group => !filteredGroupMap[group]));

  const seriesControlsDisabled = $derived(sequencePlaying || groupIndex === -1);
  const groupOrderControlsDisabled = $derived(sequencePlaying || groupIndex === -1);
  const isFirstGroup = $derived(groupIndex === 0);
  const isLastGroup = $derived(groupIndex === filteredGroupValues.length - 1);
  const hasPrevSeries = $derived(seriesIndex > 0);
  const hasNextSeries = $derived(seriesIndex < mochartDemoConfig.seriesCount - 1);

  function onExportPng() {
    if (chartContentElement) {
      void exportPNG(chartContentElement);
    }
  }

  function onExportSvg() {
    if (chartContentElement) {
      exportSVG(chartContentElement);
    }
  }
</script>

{#snippet commonControls()}
  {#if showChartCountControls}
    <div class="btn-group">
      <ButtonWithTooltip id="edit-chart-count" label={demoText.editableChart.secondChart.label} pressed={chartCount === 2}
                         tooltipText={chartCount === 2 ? demoText.editableChart.secondChart.tooltipHide : demoText.editableChart.secondChart.tooltipShow} tooltipPlacement="right"
                         onClick={onChartCountToggle} aria-label={demoText.editableChart.secondChart.aria}>
        <Icon size="lg" fixedWidth={true} name={chartCount === 2 ? "window-maximize" : "window-restore"} />
      </ButtonWithTooltip>
    </div>
  {/if}
  <div class="btn-group">
    <ButtonWithTooltip id="edit-mode" label={selectionMode === 'group' ? demoText.editableChart.editMode.labelToSeries : demoText.editableChart.editMode.labelToGroups}
                       tooltipText={selectionMode === 'group'
                         ? demoText.editableChart.editMode.tooltipToSeries
                         : demoText.editableChart.editMode.tooltipToGroups} tooltipPlacement="right"
                       onClick={onModeToggle} aria-label={demoText.editableChart.editMode.aria}>
      <Icon size="lg" fixedWidth={true} name={selectionMode === 'group' ? "bullseye" : "sliders"} />
    </ButtonWithTooltip>
  </div>
{/snippet}

{#snippet exportShareMenu()}
  <!-- Pushed to the far right of the controls row (past the group/series input).
       Share is only offered on the chart flagged for it (the first, when two
       are shown). -->
  <span class="chart-controls-menu">
    <ExportShareMenu idPrefix="edit" disabled={!!error} exportPng={onExportPng} exportSvg={onExportSvg}
                     getShareState={showShareButton ? () => ({ mode: 'single', config: mochartDemoConfig.config, data }) : void 0} />
  </span>
{/snippet}

<div class="editable-mochart-chart">
  <div class="editable-chart-container">
    <div class="editable-chart-content" bind:this={chartContentElement}>
      <!-- ManagedChart (behind mochart-svelte's Chart) picks animated vs static
           from the config and owns focus/filter state internally. Width is
           explicit; height tracks the container. -->
      <Chart style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;"
             {width} mochartConfig={mochartDemoConfig.mochartConfig} {dataProvider}
             onFocus={onChartFocus} {onSeriesFilter} {onChartClick} />
    </div>
    <div class="editable-chart-controls">
      {#if selectionMode === 'group'}
        <div class="chart-controls-container">
          <div class="chart-controls-buttons">
            <form class="form-inline">
              <div class="form-group">
                <div class="btn-toolbar" role="toolbar">
                  {@render commonControls()}
                  <div class="btn-group">
                    <ButtonWithTooltip id="edit-reset-groups" disabled={error || sequencePlaying} label={demoText.editableChart.resetGroups.label}
                                       tooltipText={demoText.editableChart.resetGroups.tooltip} tooltipPlacement="right"
                                       onClick={resetGroups} aria-label={demoText.editableChart.resetGroups.aria}>
                      <Icon size="lg" fixedWidth={true} name="arrow-rotate-left" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-reverse-groups" disabled={error || sequencePlaying} label={demoText.editableChart.reverseGroups.label}
                                       tooltipText={demoText.editableChart.reverseGroups.tooltip} tooltipPlacement="right"
                                       onClick={reverseGroups} aria-label={demoText.editableChart.reverseGroups.aria}>
                      <Icon size="lg" fixedWidth={true} name="right-left" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-add-groups" disabled={error || sequencePlaying || disableAdd} label={demoText.editableChart.addGroups.label}
                                       tooltipText={demoText.editableChart.addGroups.tooltip} tooltipPlacement="right"
                                       onClick={addGroups} aria-label={demoText.editableChart.addGroups.aria}>
                      <Icon size="lg" fixedWidth={true} name="plus" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-remove-groups" disabled={error || sequencePlaying || disableRemove} label={demoText.editableChart.removeGroups.label}
                                       tooltipText={demoText.editableChart.removeGroups.tooltip} tooltipPlacement="right"
                                       onClick={removeGroups} aria-label={demoText.editableChart.removeGroups.aria}>
                      <Icon size="lg" fixedWidth={true} name="minus" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-play-add" disabled={error || sequencePlaying || disableAdd}
                                       tooltipText={demoText.editableChart.playAddGroups.tooltip} tooltipPlacement="right"
                                       onClick={startAddSequence} aria-label={demoText.editableChart.playAddGroups.aria}>
                      <Icon size="lg" name="play" /><span style="padding-right: 2px;"></span><Icon size="lg" name="plus" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-play-remove" disabled={error || sequencePlaying || disableRemove}
                                       tooltipText={demoText.editableChart.playRemoveGroups.tooltip} tooltipPlacement="right"
                                       onClick={startRemoveSequence} aria-label={demoText.editableChart.playRemoveGroups.aria}>
                      <Icon size="lg" name="play" /><span style="padding-right: 2px;"></span><Icon size="lg" name="minus" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-stop" disabled={error || !sequencePlaying}
                                       tooltipText={demoText.editableChart.stopSequence.tooltip} tooltipPlacement="right"
                                       onClick={stopSequence} aria-label={demoText.editableChart.stopSequence.aria}>
                      <Icon size="lg" fixedWidth={true} name="stop" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-select-all" disabled={error || sequencePlaying} label={demoText.editableChart.selectAllGroups.label}
                                       tooltipText={demoText.editableChart.selectAllGroups.tooltip} tooltipPlacement="right"
                                       onClick={selectAllGroups} aria-label={demoText.editableChart.selectAllGroups.aria}>
                      <Icon size="lg" fixedWidth={true} name="check-double" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <span class="chart-controls-input">
            <form class="form-inline">
              <input type="text" class="form-control" disabled={error || sequencePlaying} bind:value={groupValuesText} />
            </form>
          </span>
          {@render exportShareMenu()}
        </div>
      {:else}
        <div class="chart-controls-container">
          <div class="chart-controls-buttons">
            <form class="form-inline">
              <div class="form-group">
                <div class="btn-toolbar" role="toolbar">
                  {@render commonControls()}
                </div>
              </div>
              <div class="form-group">
                <div class="btn-toolbar" role="toolbar">
                  <div class="btn-group">
                    <ButtonWithTooltip id="edit-group-decrease" disabled={error || groupOrderControlsDisabled || isFirstGroup}
                                       tooltipText={demoText.editableChart.decreaseGroupOrder.tooltip} tooltipPlacement="right"
                                       onClick={decreaseGroupOrder} aria-label={demoText.editableChart.decreaseGroupOrder.aria}>
                      <Icon size="lg" fixedWidth={true} name="arrow-left" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <span class="form-control-plaintext" style="margin-left: 5px; margin-right: 5px;">{demoText.editableChart.groupIndexPrefix + groupIndex}</span>
              </div>
              <div class="form-group">
                <div class="btn-toolbar" role="toolbar">
                  <div class="btn-group">
                    <ButtonWithTooltip id="edit-group-increase" disabled={error || groupOrderControlsDisabled || isLastGroup}
                                       tooltipText={demoText.editableChart.increaseGroupOrder.tooltip} tooltipPlacement="right"
                                       onClick={increaseGroupOrder} aria-label={demoText.editableChart.increaseGroupOrder.aria}>
                      <Icon size="lg" fixedWidth={true} name="arrow-right" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <div class="btn-toolbar" role="toolbar">
                  <div class="btn-group">
                    <ButtonWithTooltip id="edit-previous-series" disabled={error || seriesControlsDisabled || !hasPrevSeries}
                                       tooltipText={demoText.editableChart.previousSeries.tooltip} tooltipPlacement="right"
                                       onClick={prevSeries} aria-label={demoText.editableChart.previousSeries.aria}>
                      <Icon size="lg" fixedWidth={true} name="chevron-down" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <span class="form-control-plaintext" style="margin-left: 5px; margin-right: 5px;">{demoText.editableChart.seriesIndexPrefix + seriesIndex}</span>
              </div>
              <div class="form-group">
                <div class="btn-toolbar" role="toolbar">
                  <div class="btn-group">
                    <ButtonWithTooltip id="edit-next-series" disabled={error || seriesControlsDisabled || !hasNextSeries}
                                       tooltipText={demoText.editableChart.nextSeries.tooltip} tooltipPlacement="right"
                                       onClick={nextSeries} aria-label={demoText.editableChart.nextSeries.aria}>
                      <Icon size="lg" fixedWidth={true} name="chevron-up" />
                    </ButtonWithTooltip>
                  </div>
                  <div class="btn-group">
                    <ButtonWithTooltip id="edit-reset-series" disabled={error || seriesControlsDisabled} label={demoText.editableChart.resetSeries.label}
                                       tooltipText={demoText.editableChart.resetSeries.tooltip} tooltipPlacement="right"
                                       onClick={resetSeriesChanges} aria-label={demoText.editableChart.resetSeries.aria}>
                      <Icon size="lg" fixedWidth={true} name="arrow-rotate-left" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-apply-series" disabled={error || seriesControlsDisabled} label={demoText.editableChart.applySeries.label}
                                       tooltipText={demoText.editableChart.applySeries.tooltip} tooltipPlacement="right"
                                       onClick={applySeriesChanges} aria-label={demoText.editableChart.applySeries.aria}>
                      <Icon size="lg" fixedWidth={true} name="check" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <span class="chart-controls-input">
            <form class="form-inline">
              <input type="text" class="form-control" disabled={error || seriesControlsDisabled} bind:value={seriesValuesText} />
            </form>
          </span>
          {@render exportShareMenu()}
        </div>
      {/if}
    </div>
  </div>
</div>
