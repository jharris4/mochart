<script>
  import { untrack, onDestroy } from 'svelte';

  import { hasConfigStructureChange, NONE, ArrayOfObjectsDataProvider } from 'mochart';
  import { Chart } from 'mochart-svelte';

  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import Icon from '../misc/Icon.svelte';

  const emptyGroupText = "Select Group(s)";

  let {
    width,
    mochartDemoConfig,
    data,
    dataError = false,
    isActive,
    chartCount,
    showChartCountControls,
    filteredSeriesIds,
    focusedGroupIndex,
    focusedSeriesAxisId = null,
    focusedSeriesId = null,
    onFocus,
    onSeriesFilter,
    onChartCountToggle
  } = $props();

  // Working copies of the demo data; mutated in place by the group/series
  // editing controls (same pattern as the react demo's instance fields).
  let filteredData = null;
  let removedData = null;
  let sequenceId = null;

  let dataProvider = $state.raw(null);
  let groupIndex = $state(-1);
  let groupValuesText = $state("");
  let seriesIndex = $state(0);
  let seriesValuesText = $state("");
  let selectionMode = $state('group');
  let sequencePlaying = $state(false);
  let filteredFocusedGroupIndex = $state(-1);
  let orderChanged = $state(false);

  function getFilteredFocusedGroupIndex(nextFilteredData) {
    let nextFilteredFocusedGroupIndex = -1;
    if (focusedGroupIndex >= 0) {
      const { groupProperty } = mochartDemoConfig;
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

  function updateFilteredDataState(nextState, nextFilteredData, nextRemovedData, resetGroupIndex = true) {
    filteredData = nextFilteredData;
    removedData = nextRemovedData;
    if (resetGroupIndex === true) {
      groupIndex = -1;
      seriesValuesText = "Select a Group";
    }
    filteredFocusedGroupIndex = dataError ? -1 : getFilteredFocusedGroupIndex(nextFilteredData);
    if (!dataError && mochartDemoConfig.mochartConfig.validation.valid) {
      dataProvider = new ArrayOfObjectsDataProvider(nextFilteredData, mochartDemoConfig.mochartConfig.groupAxisConfig.property);
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

  let previousData = data;
  let previousDataError = dataError;
  let previousMochartDemoConfig = mochartDemoConfig;
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
  function onChartFocus({ focusedSeriesAxisId: seriesAxisId, focusedSeriesId: seriesId, focusedGroupIndex: chartGroupIndex }) {
    onLocalFocus({ seriesAxisId, seriesId, groupIndex: chartGroupIndex });
  }

  function onLocalFocus({ seriesAxisId, seriesId, groupIndex: nextGroupIndex }) {
    if (nextGroupIndex !== void 0) {
      const nextFilteredFocusedGroupIndex = nextGroupIndex;
      let newFocusedGroupIndex = -1;
      if (nextFilteredFocusedGroupIndex >= 0) {
        const { groupProperty } = mochartDemoConfig;
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

  function onChartClick({ groupIndex: clickedGroupIndex }) {
    const { groupProperty } = mochartDemoConfig;
    const clickedGroupValue = "" + filteredData[clickedGroupIndex][groupProperty];
    if (selectionMode === 'series') {
      groupIndex = clickedGroupIndex;
      seriesValuesText = getSeriesValuesText(mochartDemoConfig, filteredData, clickedGroupIndex, seriesIndex);
    }
    else if (selectionMode === 'group') {
      const dataGroupValues = [];
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
    const { groupProperty } = mochartDemoConfig;
    const allGroupValues = [];
    let i, count = data.length;
    for (i = 0; i < count; i++) {
      allGroupValues.push(data[i][groupProperty]);
    }
    groupValuesText = allGroupValues.join(',');
  }

  function resetGroups() {
    const { groupProperty } = mochartDemoConfig;
    const groupToObjectMap = {};
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
    const { groupProperty } = mochartDemoConfig;
    const groupValuesToAdd = groupValuesText === emptyGroupText ? [] : groupValuesText.split(",");
    const groupValueToAddMap = {};
    groupValuesToAdd.forEach(groupValueToAdd => {
      groupValueToAddMap[groupValueToAdd] = true;
    });
    const removedMap = {};
    oldRemovedData.forEach(removedObject => {
      removedMap[removedObject[groupProperty]] = removedObject;
    });
    let i, fi, count = data.length, filteredCount = oldFilteredData.length;
    const nextFilteredData = [];
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
    const nextRemovedData = [];
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
    const { groupProperty } = mochartDemoConfig;
    const groupValuesToRemove = groupValuesText === emptyGroupText ? [] : groupValuesText.split(",");
    const groupValueToRemoveMap = {};
    groupValuesToRemove.forEach(groupValueToRemove => {
      groupValueToRemoveMap[groupValueToRemove] = true;
    });
    let i, count = oldFilteredData.length;
    const nextFilteredData = [];
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
    const { groupProperty } = mochartDemoConfig;
    const groupValuesToAdd = groupValuesText === emptyGroupText ? [] : groupValuesText.split(",");
    const groupValueToAddMap = {};
    groupValuesToAdd.forEach(groupValueToAdd => {
      groupValueToAddMap[groupValueToAdd] = true;
    });
    const removedIndexMap = {};
    oldRemovedData.forEach((removedObject, removedIndex) => {
      removedIndexMap[removedObject[groupProperty]] = removedIndex;
    });
    const groupObjectsToAdd = [];
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
    const { groupProperty } = mochartDemoConfig;
    const groupValuesToRemove = groupValuesText === emptyGroupText ? [] : groupValuesText.split(",");
    const groupValueToRemoveMap = {};
    groupValuesToRemove.forEach(groupValueToRemove => {
      groupValueToRemoveMap[groupValueToRemove] = true;
    });
    const removedIndexMap = {};
    oldRemovedData.forEach((removedObject, removedIndex) => {
      removedIndexMap[removedObject[groupProperty]] = removedIndex;
    });
    const groupObjectsToRemove = [];
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

  function getSeriesValuesText({ mochartConfig }, currentFilteredData, currentGroupIndex, currentSeriesIndex) {
    const dataObject = currentFilteredData[currentGroupIndex];
    const { seriesConfigs } = mochartConfig;
    if (seriesConfigs.length > 0) {
      const seriesConfig = seriesConfigs[currentSeriesIndex];
      const { property, rangeProperty, markerProperty, labelProperty, colorProperty } = seriesConfig;
      const seriesValuesTextObject = {};
      seriesValuesTextObject['p'] = dataObject[property];
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
        filteredDataObject[property] = dataObject['p'];
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
    const { mochartConfig, groupProperty } = mochartDemoConfig;
    const { seriesConfigs } = mochartConfig;
    if (seriesConfigs.length > 0) {
      const filteredDataObject = filteredData[groupIndex];
      const filteredGroupValue = filteredDataObject[groupProperty];
      let i, count = data.length, dataObject = null;
      for (i = 0; i < count; i++) {
        if (data[i][groupProperty] === filteredGroupValue) {
          dataObject = data[i];
        }
      }
      const seriesConfig = seriesConfigs[seriesIndex];
      const { property, rangeProperty, markerProperty, labelProperty, colorProperty } = seriesConfig;
      filteredDataObject[property] = dataObject[property];
      if (rangeProperty !== NONE) {
        filteredDataObject[rangeProperty] = dataObject[rangeProperty];
      }
      if (markerProperty !== NONE) {
        filteredDataObject[markerProperty] = dataObject[markerProperty];
      }
      if (labelProperty !== NONE) {
        filteredDataObject[labelProperty] = dataObject[labelProperty];
      }
      if (colorProperty !== NONE) {
        filteredDataObject[colorProperty] = dataObject[colorProperty];
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
  const filteredGroupValues = $derived(error ? [] : dataProvider.getGroupValues());
  const selectedGroupValues = $derived((error || groupValuesText === emptyGroupText) ? [] : groupValuesText.split(','));
  const filteredGroupMap = $derived(filteredGroupValues.reduce((map, group) => { map[group] = true; return map; }, {}));
  const disableRemove = $derived(orderChanged || !selectedGroupValues.some(group => filteredGroupMap[group]));
  const disableAdd = $derived(orderChanged || !selectedGroupValues.some(group => !filteredGroupMap[group]));

  const seriesControlsDisabled = $derived(sequencePlaying || groupIndex === -1);
  const groupOrderControlsDisabled = $derived(sequencePlaying || groupIndex === -1);
  const isFirstGroup = $derived(groupIndex === 0);
  const isLastGroup = $derived(groupIndex === filteredGroupValues.length - 1);
  const hasPrevSeries = $derived(seriesIndex > 0);
  const hasNextSeries = $derived(seriesIndex < mochartDemoConfig.seriesCount - 1);
</script>

{#snippet commonControls()}
  {#if showChartCountControls}
    <div class="btn-group">
      <ButtonWithTooltip id="edit-chart-count" tooltipText={(chartCount === 2 ? "Hide" : "Show") + " 2nd Chart"} tooltipPlacement="right"
                         onClick={onChartCountToggle} aria-label="Toggle Chart Count">
        <Icon size="lg" fixedWidth={true} name={chartCount === 2 ? "window-maximize" : "window-restore"} />
      </ButtonWithTooltip>
    </div>
  {/if}
  <div class="btn-group">
    <ButtonWithTooltip id="edit-mode" tooltipText={selectionMode === 'group' ? "Enter Single Group Mode" : "Enter Multi Group Mode"} tooltipPlacement="right"
                       onClick={onModeToggle} aria-label="Toggle Mode">
      <Icon size="lg" fixedWidth={true} name={selectionMode === 'group' ? "bullseye" : "sliders"} />
    </ButtonWithTooltip>
  </div>
{/snippet}

<div class="editable-mochart-chart">
  <div class="editable-chart-container">
    <div class="editable-chart-content">
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
                    <ButtonWithTooltip id="edit-reset-groups" disabled={error || sequencePlaying} tooltipText="Reset Groups" tooltipPlacement="right"
                                       onClick={resetGroups} aria-label="Reset Groups">
                      <Icon size="lg" fixedWidth={true} name="undo" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-reverse-groups" disabled={error || sequencePlaying} tooltipText="Reverse Groups" tooltipPlacement="right"
                                       onClick={reverseGroups} aria-label="Reverse Groups">
                      <Icon size="lg" fixedWidth={true} name="exchange" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-add-groups" disabled={error || sequencePlaying || disableAdd} tooltipText="Add Selected Groups" tooltipPlacement="right"
                                       onClick={addGroups} aria-label="Add Selected Groups">
                      <Icon size="lg" fixedWidth={true} name="plus" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-remove-groups" disabled={error || sequencePlaying || disableRemove} tooltipText="Remove Selected Groups" tooltipPlacement="right"
                                       onClick={removeGroups} aria-label="Remove Selected Groups">
                      <Icon size="lg" fixedWidth={true} name="minus" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-play-add" disabled={error || sequencePlaying || disableAdd} tooltipText="Play Add Selected Groups" tooltipPlacement="right"
                                       onClick={startAddSequence} aria-label="Play Add Selected Groups">
                      <Icon size="lg" name="play" /><span style="padding-right: 2px;"></span><Icon size="lg" name="plus" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-play-remove" disabled={error || sequencePlaying || disableRemove} tooltipText="Play Remove Selected Groups" tooltipPlacement="right"
                                       onClick={startRemoveSequence} aria-label="Play Remove Selected Groups">
                      <Icon size="lg" name="play" /><span style="padding-right: 2px;"></span><Icon size="lg" name="minus" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-stop" disabled={error || !sequencePlaying} tooltipText="Stop Selected Group Sequence" tooltipPlacement="right"
                                       onClick={stopSequence} aria-label="Stop Selected Group Sequence">
                      <Icon size="lg" fixedWidth={true} name="stop" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-select-all" disabled={error || sequencePlaying} tooltipText="Select All Groups" tooltipPlacement="right"
                                       onClick={selectAllGroups} aria-label="Select All Groups">
                      <Icon size="lg" fixedWidth={true} name="magnet" />
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
                    <ButtonWithTooltip id="edit-group-decrease" disabled={error || groupOrderControlsDisabled || isFirstGroup} tooltipText="Decrease Group Order" tooltipPlacement="right"
                                       onClick={decreaseGroupOrder} aria-label="Decrease Group Order">
                      <Icon size="lg" fixedWidth={true} name="arrow-left" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <span class="form-control-plaintext" style="margin-left: 5px; margin-right: 5px;">{'Group: ' + groupIndex}</span>
              </div>
              <div class="form-group">
                <div class="btn-toolbar" role="toolbar">
                  <div class="btn-group">
                    <ButtonWithTooltip id="edit-group-increase" disabled={error || groupOrderControlsDisabled || isLastGroup} tooltipText="Increase Group Order" tooltipPlacement="right"
                                       onClick={increaseGroupOrder} aria-label="Increase Group Order">
                      <Icon size="lg" fixedWidth={true} name="arrow-right" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <div class="btn-toolbar" role="toolbar">
                  <div class="btn-group">
                    <ButtonWithTooltip id="edit-previous-series" disabled={error || seriesControlsDisabled || !hasPrevSeries} tooltipText="Previous Series" tooltipPlacement="right"
                                       onClick={prevSeries} aria-label="Previous Series">
                      <Icon size="lg" fixedWidth={true} name="chevron-down" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <span class="form-control-plaintext" style="margin-left: 5px; margin-right: 5px;">{'Series: ' + seriesIndex}</span>
              </div>
              <div class="form-group">
                <div class="btn-toolbar" role="toolbar">
                  <div class="btn-group">
                    <ButtonWithTooltip id="edit-next-series" disabled={error || seriesControlsDisabled || !hasNextSeries} tooltipText="Next Series" tooltipPlacement="right"
                                       onClick={nextSeries} aria-label="Next Series">
                      <Icon size="lg" fixedWidth={true} name="chevron-up" />
                    </ButtonWithTooltip>
                  </div>
                  <div class="btn-group">
                    <ButtonWithTooltip id="edit-reset-series" disabled={error || seriesControlsDisabled} tooltipText="Reset Series Changes" tooltipPlacement="right"
                                       onClick={resetSeriesChanges} aria-label="Reset Series Changes">
                      <Icon size="lg" fixedWidth={true} name="undo" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-apply-series" disabled={error || seriesControlsDisabled} tooltipText="Apply Series Changes" tooltipPlacement="right"
                                       onClick={applySeriesChanges} aria-label="Apply Series Changes">
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
        </div>
      {/if}
    </div>
  </div>
</div>
