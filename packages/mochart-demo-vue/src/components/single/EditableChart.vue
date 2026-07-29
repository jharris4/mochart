<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';

import { hasConfigStructureChange, NONE, ArrayOfObjectsDataProvider } from '@mochart/core';
import { Chart } from '@mochart/vue';
import { exportPNG, exportSVG } from '@mochart/export';

import { applyPieSliceValue, getChartExportOptions, getPieSequenceSteps, getPieSlices, demoText } from '@mochart/demo-common';
import type { PieSliceInfo, ShareState } from '@mochart/demo-common';

import ButtonWithTooltip from '../misc/ButtonWithTooltip.vue';
import ExportShareMenu from '../misc/ExportShareMenu.vue';
import Icon from '../misc/Icon.vue';

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

const props = withDefaults(defineProps<Props>(), {
  dataError: false,
  focusedSeriesAxisId: null,
  focusedSeriesId: null
});

// Working copies of the demo data; mutated in place by the group/series
// editing controls (same pattern as the react demo's instance fields).
let filteredData: Row[] = [];
let removedData: Row[] = [];
let sequenceId: ReturnType<typeof setInterval> | null = null;

const dataProvider = shallowRef<EditableDataProvider | null>(null);
const chartContentElement = ref<HTMLDivElement | null>(null);
const groupIndex = ref(-1);
const groupValuesText = ref("");
const seriesIndex = ref(0);
const seriesValuesText = ref("");
const selectionMode = ref('group');
const sequencePlaying = ref(false);
// pie-mode slice editing: slices are the series, so the group machinery has
// nothing to operate on and a single slice panel replaces both panels
const slices = shallowRef<PieSliceInfo[]>([]);
const sliceIndex = ref(0);
const sliceValueText = ref("");
const filteredFocusedGroupIndex = ref(-1);
const orderChanged = ref(false);

function getFilteredFocusedGroupIndex(nextFilteredData: Row[]): number {
  let nextFilteredFocusedGroupIndex = -1;
  if (props.focusedGroupIndex >= 0) {
    const groupProperty = props.mochartDemoConfig.groupProperty ?? '';
    const groupValue = props.data[props.focusedGroupIndex][groupProperty];
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
    groupIndex.value = -1;
    seriesValuesText.value = demoText.editableChart.selectAGroupText;
  }
  filteredFocusedGroupIndex.value = props.dataError ? -1 : getFilteredFocusedGroupIndex(nextFilteredData);
  if (!props.dataError && props.mochartDemoConfig.mochartConfig.validation.valid) {
    dataProvider.value = new ArrayOfObjectsDataProvider(nextFilteredData, props.mochartDemoConfig.mochartConfig.groupAxisConfig.property ?? '');
  }
  else if (props.dataError) {
    dataProvider.value = { getError: () => props.dataError };
  }
  else {
    dataProvider.value = null;
  }
  if (nextState.orderChanged !== undefined) {
    orderChanged.value = nextState.orderChanged;
  }
  if (nextState.groupIndex !== undefined) {
    groupIndex.value = nextState.groupIndex;
  }
  if (nextState.seriesIndex !== undefined) {
    seriesIndex.value = nextState.seriesIndex;
  }
  if (nextState.groupValuesText !== undefined) {
    groupValuesText.value = nextState.groupValuesText;
  }
  if (nextState.seriesValuesText !== undefined) {
    seriesValuesText.value = nextState.seriesValuesText;
  }
}

function initData() {
  const nextFilteredData = [];
  if (props.data && !props.dataError) {
    let i, count = props.data.length;
    for (i = 0; i < count; i++) {
      nextFilteredData.push(Object.assign({}, props.data[i]));
    }
  }
  slices.value = props.mochartDemoConfig.pieMode ? getPieSlices(props.mochartDemoConfig.mochartConfig) : [];
  if (sliceIndex.value >= slices.value.length) {
    sliceIndex.value = 0;
  }
  sliceValueText.value = getSliceValueText(nextFilteredData);
  updateFilteredDataState({ orderChanged: false, seriesIndex: 0, groupValuesText: emptyGroupText }, nextFilteredData, []);
}

function getSliceValueText(rows: Row[]): string {
  if (slices.value.length === 0 || rows.length === 0) {
    return "";
  }
  const value = rows[0][slices.value[sliceIndex.value].property];
  return value === undefined || value === null ? "" : String(value);
}

function selectSlice(nextSliceIndex: number) {
  if (nextSliceIndex >= 0 && nextSliceIndex < slices.value.length) {
    sliceIndex.value = nextSliceIndex;
    sliceValueText.value = getSliceValueText(filteredData);
  }
}

function onChartSliceClick({ seriesId }: { seriesId: string }) {
  selectSlice(slices.value.findIndex(slice => slice.id === seriesId));
}

function applySliceChanges() {
  const value = parseFloat(sliceValueText.value);
  if (!isNaN(value) && isFinite(value) && filteredData.length > 0 && slices.value.length > 0) {
    applyPieSliceValue(filteredData[0], slices.value, slices.value[sliceIndex.value].property, value);
    updateFilteredDataState({}, filteredData, removedData, false);
  }
}

function resetSliceChanges() {
  if (filteredData.length > 0 && props.data.length > 0 && slices.value.length > 0) {
    const property = slices.value[sliceIndex.value].property;
    applyPieSliceValue(filteredData[0], slices.value, property, props.data[0][property] as number);
    sliceValueText.value = getSliceValueText(filteredData);
    updateFilteredDataState({}, filteredData, removedData, false);
  }
}

// The pie analog of the group add/remove sequences: suppress the slices one
// at a time (via the shared legend filter, so the remaining slices re-sweep
// and center totals count along), then restore them.
function startSliceSequence() {
  const steps = getPieSequenceSteps(slices.value.map(slice => slice.id));
  if (steps.length > 0) {
    sequencePlaying.value = true;
    let stepCount = 0;
    sequenceId = setInterval(() => {
      props.onSeriesFilter({ filteredSeriesIds: steps[stepCount] });
      if (stepCount < steps.length - 1) {
        stepCount++;
      }
      else {
        stopSequence();
      }
    }, 2000);
  }
}

initData();

watch(
  () => [props.data, props.dataError, props.mochartDemoConfig, props.focusedGroupIndex, props.isActive] as const,
  ([nextData, nextDataError, nextMochartDemoConfig, nextFocusedGroupIndex, nextIsActive],
   [previousData, previousDataError, previousMochartDemoConfig, previousFocusedGroupIndex]) => {
    if (nextData !== previousData || nextDataError !== previousDataError ||
        (nextMochartDemoConfig !== previousMochartDemoConfig &&
         hasConfigStructureChange(previousMochartDemoConfig.mochartConfig, nextMochartDemoConfig.mochartConfig))) {
      initData();
    }
    else if (nextFocusedGroupIndex !== previousFocusedGroupIndex) {
      filteredFocusedGroupIndex.value = getFilteredFocusedGroupIndex(filteredData);
    }
    if (nextIsActive === false) {
      stopSequence();
    }
  }
);

// mochart's ManagedChart reports focus with the new payload shape; adapt it
// to the { seriesAxisId, seriesId, groupIndex } shape this demo tracks.
function onChartFocus({ focusedSeriesAxisId: seriesAxisId, focusedSeriesId: seriesId, focusedGroupIndex: chartGroupIndex }: { focusedSeriesAxisId?: string | null; focusedSeriesId?: string | null; focusedGroupIndex?: number }) {
  onLocalFocus({ seriesAxisId, seriesId, groupIndex: chartGroupIndex });
}

function onLocalFocus({ seriesAxisId, seriesId, groupIndex: nextGroupIndex }: FocusPayload) {
  if (nextGroupIndex !== undefined) {
    const nextFilteredFocusedGroupIndex = nextGroupIndex;
    let newFocusedGroupIndex = -1;
    if (nextFilteredFocusedGroupIndex >= 0) {
      const groupProperty = props.mochartDemoConfig.groupProperty ?? '';
      const groupValue = filteredData[nextFilteredFocusedGroupIndex][groupProperty];
      let i, count = props.data.length;
      for (i = 0; i < count; i++) {
        if (props.data[i][groupProperty] === groupValue) {
          newFocusedGroupIndex = i;
          break;
        }
      }
    }
    filteredFocusedGroupIndex.value = nextFilteredFocusedGroupIndex;
    props.onFocus({ seriesAxisId, seriesId, groupIndex: newFocusedGroupIndex });
  }
  else {
    props.onFocus({ seriesAxisId, seriesId, groupIndex: nextGroupIndex });
  }
}

function onChartClick({ groupIndex: clickedGroupIndex }: { groupIndex: number }) {
  const groupProperty = props.mochartDemoConfig.groupProperty ?? '';
  const clickedGroupValue = "" + filteredData[clickedGroupIndex][groupProperty];
  if (selectionMode.value === 'series') {
    groupIndex.value = clickedGroupIndex;
    seriesValuesText.value = getSeriesValuesText(props.mochartDemoConfig, filteredData, clickedGroupIndex, seriesIndex.value);
  }
  else if (selectionMode.value === 'group') {
    const dataGroupValues: any[] = [];
    let i, count = filteredData.length;
    for (i = 0; i < count; i++) {
      dataGroupValues.push(filteredData[i][groupProperty]);
    }
    let parsedGroupValues = groupValuesText.value === emptyGroupText ? [] : groupValuesText.value.split(',');
    parsedGroupValues = parsedGroupValues.filter((parsedGroupValue) => dataGroupValues.indexOf(parsedGroupValue) !== -1 || dataGroupValues.indexOf(+parsedGroupValue) !== -1);
    const clickedIndex = parsedGroupValues.indexOf(clickedGroupValue);
    if (clickedIndex === -1) {
      parsedGroupValues = parsedGroupValues.concat(clickedGroupValue);
    }
    else {
      parsedGroupValues.splice(clickedIndex, 1);
    }
    groupValuesText.value = parsedGroupValues.length === 0 ? emptyGroupText : parsedGroupValues.join(',');
  }
}

function onModeToggle() {
  selectionMode.value = selectionMode.value === 'group' ? 'series' : 'group';
}

function selectAllGroups() {
  const groupProperty = props.mochartDemoConfig.groupProperty ?? '';
  const allGroupValues: any[] = [];
  let i, count = props.data.length;
  for (i = 0; i < count; i++) {
    allGroupValues.push(props.data[i][groupProperty]);
  }
  groupValuesText.value = allGroupValues.join(',');
}

function resetGroups() {
  const groupProperty = props.mochartDemoConfig.groupProperty ?? '';
  const groupToObjectMap: Record<string, Row> = {};
  removedData.forEach(removedObject => {
    groupToObjectMap[removedObject[groupProperty]] = removedObject;
  });
  filteredData.forEach(oldObject => {
    groupToObjectMap[oldObject[groupProperty]] = oldObject;
  });
  const nextFilteredData = props.data.map(o => groupToObjectMap[o[groupProperty]]);
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
    if (groupIndex.value > 0) {
      const nextFilteredData = filteredData.slice();
      const temp = nextFilteredData[groupIndex.value - 1];
      nextFilteredData[groupIndex.value - 1] = nextFilteredData[groupIndex.value];
      nextFilteredData[groupIndex.value] = temp;
      updateFilteredDataState({ orderChanged: true, groupIndex: groupIndex.value - 1 }, nextFilteredData, removedData, false);
    }
  }
}

function increaseGroupOrder() {
  if (filteredData && filteredData.length > 1) {
    if (groupIndex.value < filteredData.length - 1) {
      const nextFilteredData = filteredData.slice();
      const temp = nextFilteredData[groupIndex.value + 1];
      nextFilteredData[groupIndex.value + 1] = nextFilteredData[groupIndex.value];
      nextFilteredData[groupIndex.value] = temp;
      updateFilteredDataState({ orderChanged: true, groupIndex: groupIndex.value + 1 }, nextFilteredData, removedData, false);
    }
  }
}

function addGroups() {
  const oldFilteredData = filteredData;
  const oldRemovedData = removedData;
  const groupProperty = props.mochartDemoConfig.groupProperty ?? '';
  const groupValuesToAdd = groupValuesText.value === emptyGroupText ? [] : groupValuesText.value.split(",");
  const groupValueToAddMap: Record<string, boolean> = {};
  groupValuesToAdd.forEach(groupValueToAdd => {
    groupValueToAddMap[groupValueToAdd] = true;
  });
  const removedMap: Record<string, Row> = {};
  oldRemovedData.forEach(removedObject => {
    removedMap[removedObject[groupProperty]] = removedObject;
  });
  let i, fi, count = props.data.length, filteredCount = oldFilteredData.length;
  const nextFilteredData: Row[] = [];
  for (i = 0, fi = 0; i < count; i++) {
    if (fi < filteredCount) {
      if (props.data[i][groupProperty] !== oldFilteredData[fi][groupProperty]) {
        if (groupValueToAddMap[props.data[i][groupProperty]] === true) {
          nextFilteredData.push(removedMap[props.data[i][groupProperty]]);
          delete removedMap[props.data[i][groupProperty]];
        }
      }
      else {
        nextFilteredData.push(oldFilteredData[fi]);
        fi++;
      }
    }
    else if (groupValueToAddMap[props.data[i][groupProperty]] === true) {
      nextFilteredData.push(removedMap[props.data[i][groupProperty]]);
      delete removedMap[props.data[i][groupProperty]];
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

function removeGroups() {
  const oldFilteredData = filteredData;
  const nextRemovedData = removedData;
  const groupProperty = props.mochartDemoConfig.groupProperty ?? '';
  const groupValuesToRemove = groupValuesText.value === emptyGroupText ? [] : groupValuesText.value.split(",");
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
  const groupProperty = props.mochartDemoConfig.groupProperty ?? '';
  const groupValuesToAdd = groupValuesText.value === emptyGroupText ? [] : groupValuesText.value.split(",");
  const groupValueToAddMap: Record<string, boolean> = {};
  groupValuesToAdd.forEach(groupValueToAdd => {
    groupValueToAddMap[groupValueToAdd] = true;
  });
  const removedIndexMap: Record<string, number> = {};
  oldRemovedData.forEach((removedObject, removedIndex) => {
    removedIndexMap[removedObject[groupProperty]] = removedIndex;
  });
  const groupObjectsToAdd: { removedIndex: number; dataIndex: number }[] = [];
  let i, fi, count = props.data.length, filteredCount = oldFilteredData.length;
  for (i = 0, fi = 0; i < count; i++) {
    if (fi < filteredCount) {
      if (props.data[i][groupProperty] !== oldFilteredData[fi][groupProperty]) {
        if (groupValueToAddMap[props.data[i][groupProperty]] === true) {
          groupObjectsToAdd.push({
            removedIndex: removedIndexMap[props.data[i][groupProperty]] - groupObjectsToAdd.length,
            dataIndex: fi + groupObjectsToAdd.length
          });
        }
      }
      else {
        fi++;
      }
    }
    else if (groupValueToAddMap[props.data[i][groupProperty]] === true) {
      groupObjectsToAdd.push({
        removedIndex: removedIndexMap[props.data[i][groupProperty]] - groupObjectsToAdd.length,
        dataIndex: fi + groupObjectsToAdd.length
      });
    }
  }
  if (groupObjectsToAdd.length > 0) {
    sequencePlaying.value = true;
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
  const groupProperty = props.mochartDemoConfig.groupProperty ?? '';
  const groupValuesToRemove = groupValuesText.value === emptyGroupText ? [] : groupValuesText.value.split(",");
  const groupValueToRemoveMap: Record<string, boolean> = {};
  groupValuesToRemove.forEach(groupValueToRemove => {
    groupValueToRemoveMap[groupValueToRemove] = true;
  });
  const removedIndexMap: Record<string, number> = {};
  oldRemovedData.forEach((removedObject, removedIndex) => {
    removedIndexMap[removedObject[groupProperty]] = removedIndex;
  });
  const groupObjectsToRemove: { removedIndex: number; dataIndex: number }[] = [];
  let i, fi, ri, count = props.data.length, filteredCount = oldFilteredData.length;
  for (i = 0, fi = 0, ri = 0; i < count && fi < filteredCount; i++) {
    if (props.data[i][groupProperty] === oldFilteredData[fi][groupProperty]) {
      if (groupValueToRemoveMap[props.data[i][groupProperty]] === true) {
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
    sequencePlaying.value = true;
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
  sequencePlaying.value = false;
}

function stopSequenceInternal() {
  if (sequenceId !== null) {
    clearInterval(sequenceId);
    sequenceId = null;
  }
}

function prevSeries() {
  if (groupIndex.value !== -1 && seriesIndex.value > 0) {
    seriesIndex.value--;
    seriesValuesText.value = getSeriesValuesText(props.mochartDemoConfig, filteredData, groupIndex.value, seriesIndex.value);
  }
}

function nextSeries() {
  const { seriesCount } = props.mochartDemoConfig;
  if (groupIndex.value !== -1 && seriesIndex.value < seriesCount - 1) {
    seriesIndex.value++;
    seriesValuesText.value = getSeriesValuesText(props.mochartDemoConfig, filteredData, groupIndex.value, seriesIndex.value);
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
  const filteredDataObject = filteredData[groupIndex.value];
  const { mochartConfig } = props.mochartDemoConfig;
  const { seriesConfigs } = mochartConfig;
  if (seriesConfigs.length > 0) {
    try {
      const dataObject = JSON.parse(seriesValuesText.value);
      const seriesConfig = seriesConfigs[seriesIndex.value];
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
  const { mochartConfig } = props.mochartDemoConfig;
  const groupProperty = props.mochartDemoConfig.groupProperty ?? '';
  const { seriesConfigs } = mochartConfig;
  if (seriesConfigs.length > 0) {
    const filteredDataObject = filteredData[groupIndex.value];
    const filteredGroupValue = filteredDataObject[groupProperty];
    let i, count = props.data.length, dataObject: Row | null = null;
    for (i = 0; i < count; i++) {
      if (props.data[i][groupProperty] === filteredGroupValue) {
        dataObject = props.data[i];
      }
    }
    const seriesConfig = seriesConfigs[seriesIndex.value];
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
    updateFilteredDataState({ seriesValuesText: getSeriesValuesText(props.mochartDemoConfig, filteredData, groupIndex.value, seriesIndex.value) }, filteredData, removedData, false);
  }
}

onBeforeUnmount(() => {
  stopSequenceInternal();
});

const chartDataError = computed(() => !!(dataProvider.value && dataProvider.value.getError && dataProvider.value.getError()));
const configError = computed(() => !props.mochartDemoConfig.valid);
const error = computed(() => chartDataError.value || configError.value);
const filteredGroupValues = computed<any[]>(() => error.value || !dataProvider.value?.getGroupValues ? [] : dataProvider.value.getGroupValues());
const selectedGroupValues = computed(() => (error.value || groupValuesText.value === emptyGroupText) ? [] : groupValuesText.value.split(','));
const filteredGroupMap = computed(() => filteredGroupValues.value.reduce<Record<string, boolean>>((map, group) => { map[group] = true; return map; }, {}));
const disableRemove = computed(() => orderChanged.value || !selectedGroupValues.value.some(group => filteredGroupMap.value[group]));
const disableAdd = computed(() => orderChanged.value || !selectedGroupValues.value.some(group => !filteredGroupMap.value[group]));

const seriesControlsDisabled = computed(() => sequencePlaying.value || groupIndex.value === -1);
const groupOrderControlsDisabled = computed(() => sequencePlaying.value || groupIndex.value === -1);
const isFirstGroup = computed(() => groupIndex.value === 0);
const isLastGroup = computed(() => groupIndex.value === filteredGroupValues.value.length - 1);
const hasPrevSeries = computed(() => seriesIndex.value > 0);
const hasNextSeries = computed(() => seriesIndex.value < props.mochartDemoConfig.seriesCount - 1);

// pie mode shows only the slice panel; the group/series machinery has
// nothing to edit there
const pieMode = computed(() => props.mochartDemoConfig.pieMode);
const sliceControlsDisabled = computed(() => sequencePlaying.value || slices.value.length === 0);

// The export/share menu sits at the far right of the controls row. Share is
// only offered on the chart flagged for it (the first, when two are shown).
function onExportPng() {
  const container = chartContentElement.value;
  if (container) {
    void exportPNG(container, getChartExportOptions());
  }
}

function onExportSvg() {
  const container = chartContentElement.value;
  if (container) {
    exportSVG(container, getChartExportOptions());
  }
}

function getSingleShareState(): ShareState {
  return { mode: 'single', config: props.mochartDemoConfig.config, data: props.data };
}
</script>

<template>
  <div class="editable-mochart-chart">
    <div class="editable-chart-container">
      <div class="editable-chart-content" ref="chartContentElement">
        <!-- ManagedChart (behind mochart-vue's Chart) picks animated vs static
             from the config. Focus/filter is controlled by the parent ChartTab
             so the 1–2 charts stay in sync; the group index is translated into
             this chart's filtered-data coordinates (filteredFocusedGroupIndex).
             Width is explicit; height tracks the container. -->
        <Chart style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;"
               :width="props.width" :mochart-config="props.mochartDemoConfig.mochartConfig" :data-provider="dataProvider"
               :filtered-series-ids="props.filteredSeriesIds" :focused-group-index="filteredFocusedGroupIndex"
               :focused-series-axis-id="props.focusedSeriesAxisId ?? null" :focused-series-id="props.focusedSeriesId ?? null"
               :on-focus="onChartFocus" :on-series-filter="props.onSeriesFilter" :on-chart-click="onChartClick" :on-slice-click="onChartSliceClick" />
      </div>
      <div class="editable-chart-controls">
        <!-- Pie-mode slice panel — replaces both panels when slices are the
             series: click a slice (or step prev/next) to select it, edit its
             value, or play the suppress/restore sequence. -->
        <div v-if="pieMode" class="chart-controls-container">
          <div class="chart-controls-buttons">
            <form class="demo-form-row">
              <div class="demo-field">
                <div class="demo-toolbar" role="toolbar">
                  <div v-if="props.showChartCountControls" class="demo-btn-group">
                    <ButtonWithTooltip id="edit-chart-count" :label="demoText.editableChart.secondChart.label" :pressed="props.chartCount === 2"
                                       :tooltip-text="props.chartCount === 2 ? demoText.editableChart.secondChart.tooltipHide : demoText.editableChart.secondChart.tooltipShow" tooltip-placement="right"
                                       :on-click="props.onChartCountToggle" :aria-label="demoText.editableChart.secondChart.aria">
                      <Icon size="lg" :fixed-width="true" :name="props.chartCount === 2 ? 'window-maximize' : 'window-restore'" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
              <div class="demo-field">
                <div class="demo-toolbar" role="toolbar">
                  <div class="demo-btn-group">
                    <ButtonWithTooltip id="edit-previous-slice" :disabled="error || sliceControlsDisabled || sliceIndex === 0" :tooltip-text="demoText.editableChart.previousSlice.tooltip" tooltip-placement="right"
                                       :on-click="() => selectSlice(sliceIndex - 1)" :aria-label="demoText.editableChart.previousSlice.aria">
                      <Icon size="lg" :fixed-width="true" name="chevron-left" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
              <div class="demo-field">
                <span class="demo-label" style="margin-left: 5px; margin-right: 5px;">{{ slices.length > 0 ? demoText.editableChart.slicePrefix + slices[sliceIndex].title : demoText.editableChart.selectASliceText }}</span>
              </div>
              <div class="demo-field">
                <div class="demo-toolbar" role="toolbar">
                  <div class="demo-btn-group">
                    <ButtonWithTooltip id="edit-next-slice" :disabled="error || sliceControlsDisabled || sliceIndex >= slices.length - 1" :tooltip-text="demoText.editableChart.nextSlice.tooltip" tooltip-placement="right"
                                       :on-click="() => selectSlice(sliceIndex + 1)" :aria-label="demoText.editableChart.nextSlice.aria">
                      <Icon size="lg" :fixed-width="true" name="chevron-right" />
                    </ButtonWithTooltip>
                  </div>
                  <div class="demo-btn-group">
                    <ButtonWithTooltip id="edit-reset-slice" :disabled="error || sliceControlsDisabled" :label="demoText.editableChart.resetSlice.label" :tooltip-text="demoText.editableChart.resetSlice.tooltip" tooltip-placement="right"
                                       :on-click="resetSliceChanges" :aria-label="demoText.editableChart.resetSlice.aria">
                      <Icon size="lg" :fixed-width="true" name="arrow-rotate-left" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-apply-slice" :disabled="error || sliceControlsDisabled" :label="demoText.editableChart.applySlice.label" :tooltip-text="demoText.editableChart.applySlice.tooltip" tooltip-placement="right"
                                       :on-click="applySliceChanges" :aria-label="demoText.editableChart.applySlice.aria">
                      <Icon size="lg" :fixed-width="true" name="check" />
                    </ButtonWithTooltip>
                  </div>
                  <div class="demo-btn-group">
                    <ButtonWithTooltip id="edit-play-slices" :disabled="error || sequencePlaying || slices.length < 3" :tooltip-text="demoText.editableChart.playSliceSequence.tooltip" tooltip-placement="right"
                                       :on-click="startSliceSequence" :aria-label="demoText.editableChart.playSliceSequence.aria">
                      <Icon size="lg" :fixed-width="true" name="play" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-stop-slices" :disabled="error || !sequencePlaying" :tooltip-text="demoText.editableChart.stopSliceSequence.tooltip" tooltip-placement="right"
                                       :on-click="stopSequence" :aria-label="demoText.editableChart.stopSliceSequence.aria">
                      <Icon size="lg" :fixed-width="true" name="stop" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <span class="chart-controls-input">
            <form class="demo-form-row">
              <input type="text" class="demo-input" :disabled="error || sliceControlsDisabled" v-model="sliceValueText" />
            </form>
          </span>
          <span class="chart-controls-menu">
            <ExportShareMenu id-prefix="edit" :disabled="error"
                             :export-png="onExportPng" :export-svg="onExportSvg"
                             :get-share-state="props.showShareButton ? getSingleShareState : undefined" />
          </span>
        </div>
        <div v-else-if="selectionMode === 'group'" class="chart-controls-container">
          <div class="chart-controls-buttons">
            <form class="demo-form-row">
              <div class="demo-field">
                <div class="demo-toolbar" role="toolbar">
                  <div v-if="props.showChartCountControls" class="demo-btn-group">
                    <ButtonWithTooltip id="edit-chart-count" :label="demoText.editableChart.secondChart.label" :pressed="props.chartCount === 2"
                                       :tooltip-text="props.chartCount === 2 ? demoText.editableChart.secondChart.tooltipHide : demoText.editableChart.secondChart.tooltipShow" tooltip-placement="right"
                                       :on-click="props.onChartCountToggle" :aria-label="demoText.editableChart.secondChart.aria">
                      <Icon size="lg" :fixed-width="true" :name="props.chartCount === 2 ? 'window-maximize' : 'window-restore'" />
                    </ButtonWithTooltip>
                  </div>
                  <div class="demo-btn-group">
                    <ButtonWithTooltip id="edit-mode" :label="selectionMode === 'group' ? demoText.editableChart.editMode.labelToSeries : demoText.editableChart.editMode.labelToGroups"
                                       :tooltip-text="selectionMode === 'group'
                                         ? demoText.editableChart.editMode.tooltipToSeries
                                         : demoText.editableChart.editMode.tooltipToGroups" tooltip-placement="right"
                                       :on-click="onModeToggle" :aria-label="demoText.editableChart.editMode.aria">
                      <Icon size="lg" :fixed-width="true" :name="selectionMode === 'group' ? 'bullseye' : 'sliders'" />
                    </ButtonWithTooltip>
                  </div>
                  <div class="demo-btn-group">
                    <ButtonWithTooltip id="edit-reset-groups" :disabled="error || sequencePlaying" :label="demoText.editableChart.resetGroups.label" :tooltip-text="demoText.editableChart.resetGroups.tooltip" tooltip-placement="right"
                                       :on-click="resetGroups" :aria-label="demoText.editableChart.resetGroups.aria">
                      <Icon size="lg" :fixed-width="true" name="arrow-rotate-left" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-reverse-groups" :disabled="error || sequencePlaying" :label="demoText.editableChart.reverseGroups.label" :tooltip-text="demoText.editableChart.reverseGroups.tooltip" tooltip-placement="right"
                                       :on-click="reverseGroups" :aria-label="demoText.editableChart.reverseGroups.aria">
                      <Icon size="lg" :fixed-width="true" name="right-left" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-add-groups" :disabled="error || sequencePlaying || disableAdd" :label="demoText.editableChart.addGroups.label" :tooltip-text="demoText.editableChart.addGroups.tooltip" tooltip-placement="right"
                                       :on-click="addGroups" :aria-label="demoText.editableChart.addGroups.aria">
                      <Icon size="lg" :fixed-width="true" name="plus" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-remove-groups" :disabled="error || sequencePlaying || disableRemove" :label="demoText.editableChart.removeGroups.label" :tooltip-text="demoText.editableChart.removeGroups.tooltip" tooltip-placement="right"
                                       :on-click="removeGroups" :aria-label="demoText.editableChart.removeGroups.aria">
                      <Icon size="lg" :fixed-width="true" name="minus" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-play-add" :disabled="error || sequencePlaying || disableAdd" :tooltip-text="demoText.editableChart.playAddGroups.tooltip" tooltip-placement="right"
                                       :on-click="startAddSequence" :aria-label="demoText.editableChart.playAddGroups.aria">
                      <Icon size="lg" name="play" /><span style="padding-right: 2px;"></span><Icon size="lg" name="plus" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-play-remove" :disabled="error || sequencePlaying || disableRemove" :tooltip-text="demoText.editableChart.playRemoveGroups.tooltip" tooltip-placement="right"
                                       :on-click="startRemoveSequence" :aria-label="demoText.editableChart.playRemoveGroups.aria">
                      <Icon size="lg" name="play" /><span style="padding-right: 2px;"></span><Icon size="lg" name="minus" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-stop" :disabled="error || !sequencePlaying" :tooltip-text="demoText.editableChart.stopSequence.tooltip" tooltip-placement="right"
                                       :on-click="stopSequence" :aria-label="demoText.editableChart.stopSequence.aria">
                      <Icon size="lg" :fixed-width="true" name="stop" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-select-all" :disabled="error || sequencePlaying" :label="demoText.editableChart.selectAllGroups.label" :tooltip-text="demoText.editableChart.selectAllGroups.tooltip" tooltip-placement="right"
                                       :on-click="selectAllGroups" :aria-label="demoText.editableChart.selectAllGroups.aria">
                      <Icon size="lg" :fixed-width="true" name="check-double" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <span class="chart-controls-input">
            <form class="demo-form-row">
              <input type="text" class="demo-input" :disabled="error || sequencePlaying" v-model="groupValuesText" />
            </form>
          </span>
          <span class="chart-controls-menu">
            <ExportShareMenu id-prefix="edit" :disabled="error"
                             :export-png="onExportPng" :export-svg="onExportSvg"
                             :get-share-state="props.showShareButton ? getSingleShareState : undefined" />
          </span>
        </div>
        <div v-else class="chart-controls-container">
          <div class="chart-controls-buttons">
            <form class="demo-form-row">
              <div class="demo-field">
                <div class="demo-toolbar" role="toolbar">
                  <div v-if="props.showChartCountControls" class="demo-btn-group">
                    <ButtonWithTooltip id="edit-chart-count" :label="demoText.editableChart.secondChart.label" :pressed="props.chartCount === 2"
                                       :tooltip-text="props.chartCount === 2 ? demoText.editableChart.secondChart.tooltipHide : demoText.editableChart.secondChart.tooltipShow" tooltip-placement="right"
                                       :on-click="props.onChartCountToggle" :aria-label="demoText.editableChart.secondChart.aria">
                      <Icon size="lg" :fixed-width="true" :name="props.chartCount === 2 ? 'window-maximize' : 'window-restore'" />
                    </ButtonWithTooltip>
                  </div>
                  <div class="demo-btn-group">
                    <ButtonWithTooltip id="edit-mode" :label="selectionMode === 'group' ? demoText.editableChart.editMode.labelToSeries : demoText.editableChart.editMode.labelToGroups"
                                       :tooltip-text="selectionMode === 'group'
                                         ? demoText.editableChart.editMode.tooltipToSeries
                                         : demoText.editableChart.editMode.tooltipToGroups" tooltip-placement="right"
                                       :on-click="onModeToggle" :aria-label="demoText.editableChart.editMode.aria">
                      <Icon size="lg" :fixed-width="true" :name="selectionMode === 'group' ? 'bullseye' : 'sliders'" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
              <div class="demo-field">
                <div class="demo-toolbar" role="toolbar">
                  <div class="demo-btn-group">
                    <ButtonWithTooltip id="edit-group-decrease" :disabled="error || groupOrderControlsDisabled || isFirstGroup" :tooltip-text="demoText.editableChart.decreaseGroupOrder.tooltip" tooltip-placement="right"
                                       :on-click="decreaseGroupOrder" :aria-label="demoText.editableChart.decreaseGroupOrder.aria">
                      <Icon size="lg" :fixed-width="true" name="arrow-left" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
              <div class="demo-field">
                <span class="demo-label" style="margin-left: 5px; margin-right: 5px;">{{ demoText.editableChart.groupIndexPrefix + groupIndex }}</span>
              </div>
              <div class="demo-field">
                <div class="demo-toolbar" role="toolbar">
                  <div class="demo-btn-group">
                    <ButtonWithTooltip id="edit-group-increase" :disabled="error || groupOrderControlsDisabled || isLastGroup" :tooltip-text="demoText.editableChart.increaseGroupOrder.tooltip" tooltip-placement="right"
                                       :on-click="increaseGroupOrder" :aria-label="demoText.editableChart.increaseGroupOrder.aria">
                      <Icon size="lg" :fixed-width="true" name="arrow-right" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
              <div class="demo-field">
                <div class="demo-toolbar" role="toolbar">
                  <div class="demo-btn-group">
                    <ButtonWithTooltip id="edit-previous-series" :disabled="error || seriesControlsDisabled || !hasPrevSeries" :tooltip-text="demoText.editableChart.previousSeries.tooltip" tooltip-placement="right"
                                       :on-click="prevSeries" :aria-label="demoText.editableChart.previousSeries.aria">
                      <Icon size="lg" :fixed-width="true" name="chevron-down" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
              <div class="demo-field">
                <span class="demo-label" style="margin-left: 5px; margin-right: 5px;">{{ demoText.editableChart.seriesIndexPrefix + seriesIndex }}</span>
              </div>
              <div class="demo-field">
                <div class="demo-toolbar" role="toolbar">
                  <div class="demo-btn-group">
                    <ButtonWithTooltip id="edit-next-series" :disabled="error || seriesControlsDisabled || !hasNextSeries" :tooltip-text="demoText.editableChart.nextSeries.tooltip" tooltip-placement="right"
                                       :on-click="nextSeries" :aria-label="demoText.editableChart.nextSeries.aria">
                      <Icon size="lg" :fixed-width="true" name="chevron-up" />
                    </ButtonWithTooltip>
                  </div>
                  <div class="demo-btn-group">
                    <ButtonWithTooltip id="edit-reset-series" :disabled="error || seriesControlsDisabled" :tooltip-text="demoText.editableChart.resetSeries.tooltip" tooltip-placement="right"
                                       :on-click="resetSeriesChanges" :aria-label="demoText.editableChart.resetSeries.aria">
                      <Icon size="lg" :fixed-width="true" name="arrow-rotate-left" />
                    </ButtonWithTooltip>
                    <ButtonWithTooltip id="edit-apply-series" :disabled="error || seriesControlsDisabled" :tooltip-text="demoText.editableChart.applySeries.tooltip" tooltip-placement="right"
                                       :on-click="applySeriesChanges" :aria-label="demoText.editableChart.applySeries.aria">
                      <Icon size="lg" :fixed-width="true" name="check" />
                    </ButtonWithTooltip>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <span class="chart-controls-input">
            <form class="demo-form-row">
              <input type="text" class="demo-input" :disabled="error || seriesControlsDisabled" v-model="seriesValuesText" />
            </form>
          </span>
          <span class="chart-controls-menu">
            <ExportShareMenu id-prefix="edit" :disabled="error"
                             :export-png="onExportPng" :export-svg="onExportSvg"
                             :get-share-state="props.showShareButton ? getSingleShareState : undefined" />
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
