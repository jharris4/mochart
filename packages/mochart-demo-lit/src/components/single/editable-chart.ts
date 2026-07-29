import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { hasConfigStructureChange, NONE, ArrayOfObjectsDataProvider } from '@mochart/core';
import { chart } from '@mochart/lit';
import type { ChartProps } from '@mochart/lit';
import { exportPNG, exportSVG } from '@mochart/export';
import { applyPieSliceValue, getChartExportOptions, getPieSequenceSteps, getPieSlices, demoText } from '@mochart/demo-common';
import type { PieSliceInfo } from '@mochart/demo-common';

import { LightElement } from '../misc/LightElement';
import { buttonWithTooltip, icon } from '../misc/templates';
import '../misc/export-share-menu';

import type { MochartDemoConfig, FilteredSeriesIds, FocusData } from '../../types';

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

const emptyGroupText = demoText.editableChart.emptyGroupText;

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

@customElement('editable-chart')
export class EditableChart extends LightElement {
  @property({ attribute: false }) width = 0;
  @property({ attribute: false }) mochartDemoConfig!: MochartDemoConfig;
  @property({ attribute: false }) data: Row[] = [];
  @property({ attribute: false }) dataError: string | boolean | null = false;
  @property({ attribute: false }) isActive = false;
  @property({ attribute: false }) chartCount = 1;
  @property({ attribute: false }) showChartCountControls = false;
  /** Set on the chart instance that should render the share button. */
  @property({ attribute: false }) showShareButton = false;
  @property({ attribute: false }) filteredSeriesIds: FilteredSeriesIds = {};
  @property({ attribute: false }) focusedGroupIndex = -1;
  @property({ attribute: false }) focusedSeriesAxisId: string | null = null;
  @property({ attribute: false }) focusedSeriesId: string | null = null;
  @property({ attribute: false }) onFocus!: (focusData: FocusData) => void;
  @property({ attribute: false }) onSeriesFilter!: (filterData: { filteredSeriesIds: FilteredSeriesIds }) => void;
  @property({ attribute: false }) onChartCountToggle!: () => void;

  // Working copies of the demo data; mutated in place by the group/series
  // editing controls (same pattern as the react demo's instance fields).
  private filteredData: Row[] = [];
  private removedData: Row[] = [];
  private sequenceId: ReturnType<typeof setInterval> | null = null;

  @state() private dataProvider: EditableDataProvider | null = null;
  @state() private groupIndex = -1;
  @state() private groupValuesText = "";
  @state() private seriesIndex = 0;
  @state() private seriesValuesText = "";
  @state() private selectionMode = 'group';
  @state() private sequencePlaying = false;
  // pie-mode slice editing: slices are the series, so the group machinery has
  // nothing to operate on and a single slice panel replaces both panels
  @state() private slices: PieSliceInfo[] = [];
  @state() private sliceIndex = 0;
  @state() private sliceValueText = "";
  @state() private filteredFocusedGroupIndex = -1;
  @state() private orderChanged = false;

  // Translate the parent's focused group index (in full-data coordinates)
  // into this chart's filtered-data coordinates by group value.
  private getFilteredFocusedGroupIndex(nextFilteredData: Row[]): number {
    let nextFilteredFocusedGroupIndex = -1;
    if (this.focusedGroupIndex >= 0) {
      const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
      const groupValue = this.data[this.focusedGroupIndex][groupProperty];
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

  private updateFilteredDataState(
    nextState: { orderChanged?: boolean; groupIndex?: number; seriesIndex?: number; groupValuesText?: string; seriesValuesText?: string },
    nextFilteredData: Row[],
    nextRemovedData: Row[],
    resetGroupIndex = true
  ): void {
    this.filteredData = nextFilteredData;
    this.removedData = nextRemovedData;
    if (resetGroupIndex === true) {
      this.groupIndex = -1;
      this.seriesValuesText = demoText.editableChart.selectAGroupText;
    }
    this.filteredFocusedGroupIndex = this.dataError ? -1 : this.getFilteredFocusedGroupIndex(nextFilteredData);
    if (!this.dataError && this.mochartDemoConfig.mochartConfig.validation.valid) {
      this.dataProvider = new ArrayOfObjectsDataProvider(nextFilteredData, this.mochartDemoConfig.mochartConfig.groupAxisConfig.property ?? '');
    }
    else if (this.dataError) {
      this.dataProvider = { getError: () => this.dataError };
    }
    else {
      this.dataProvider = null;
    }
    if (nextState.orderChanged !== undefined) {
      this.orderChanged = nextState.orderChanged;
    }
    if (nextState.groupIndex !== undefined) {
      this.groupIndex = nextState.groupIndex;
    }
    if (nextState.seriesIndex !== undefined) {
      this.seriesIndex = nextState.seriesIndex;
    }
    if (nextState.groupValuesText !== undefined) {
      this.groupValuesText = nextState.groupValuesText;
    }
    if (nextState.seriesValuesText !== undefined) {
      this.seriesValuesText = nextState.seriesValuesText;
    }
  }

  private initData(): void {
    const nextFilteredData = [];
    if (this.data && !this.dataError) {
      let i, count = this.data.length;
      for (i = 0; i < count; i++) {
        nextFilteredData.push(Object.assign({}, this.data[i]));
      }
    }
    this.slices = this.mochartDemoConfig.pieMode ? getPieSlices(this.mochartDemoConfig.mochartConfig) : [];
    if (this.sliceIndex >= this.slices.length) {
      this.sliceIndex = 0;
    }
    this.sliceValueText = this.getSliceValueText(nextFilteredData);
    this.updateFilteredDataState({ orderChanged: false, seriesIndex: 0, groupValuesText: emptyGroupText }, nextFilteredData, []);
  }

  private getSliceValueText(rows: Row[]): string {
    if (this.slices.length === 0 || rows.length === 0) {
      return "";
    }
    const value = rows[0][this.slices[this.sliceIndex].property];
    return value === undefined || value === null ? "" : String(value);
  }

  private selectSlice(nextSliceIndex: number): void {
    if (nextSliceIndex >= 0 && nextSliceIndex < this.slices.length) {
      this.sliceIndex = nextSliceIndex;
      this.sliceValueText = this.getSliceValueText(this.filteredData);
    }
  }

  private onChartSliceClick = ({ seriesId }: { seriesId: string }): void => {
    this.selectSlice(this.slices.findIndex(slice => slice.id === seriesId));
  };

  private applySliceChanges = (): void => {
    const value = parseFloat(this.sliceValueText);
    if (!isNaN(value) && isFinite(value) && this.filteredData.length > 0 && this.slices.length > 0) {
      applyPieSliceValue(this.filteredData[0], this.slices, this.slices[this.sliceIndex].property, value);
      this.updateFilteredDataState({}, this.filteredData, this.removedData, false);
    }
  };

  private resetSliceChanges = (): void => {
    if (this.filteredData.length > 0 && this.data.length > 0 && this.slices.length > 0) {
      const property = this.slices[this.sliceIndex].property;
      applyPieSliceValue(this.filteredData[0], this.slices, property, this.data[0][property] as number);
      this.sliceValueText = this.getSliceValueText(this.filteredData);
      this.updateFilteredDataState({}, this.filteredData, this.removedData, false);
    }
  };

  // The pie analog of the group add/remove sequences: suppress the slices one
  // at a time (via the shared legend filter, so the remaining slices re-sweep
  // and center totals count along), then restore them.
  private startSliceSequence = (): void => {
    const steps = getPieSequenceSteps(this.slices.map(slice => slice.id));
    if (steps.length > 0) {
      this.sequencePlaying = true;
      let stepCount = 0;
      this.sequenceId = setInterval(() => {
        this.onSeriesFilter({ filteredSeriesIds: steps[stepCount] });
        if (stepCount < steps.length - 1) {
          stepCount++;
        }
        else {
          this.stopSequence();
        }
      }, 2000);
    }
  };

  override willUpdate(changed: PropertyValues<this>): void {
    if (!this.hasUpdated) {
      this.initData();
      return;
    }
    const previousMochartDemoConfig = changed.has('mochartDemoConfig')
      ? (changed.get('mochartDemoConfig') as MochartDemoConfig)
      : this.mochartDemoConfig;
    if (changed.has('data') || changed.has('dataError') ||
        (changed.has('mochartDemoConfig') &&
         hasConfigStructureChange(previousMochartDemoConfig.mochartConfig, this.mochartDemoConfig.mochartConfig))) {
      this.initData();
    }
    else if (changed.has('focusedGroupIndex')) {
      this.filteredFocusedGroupIndex = this.getFilteredFocusedGroupIndex(this.filteredData);
    }
    if (changed.has('isActive') && this.isActive === false) {
      this.stopSequence();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopSequenceInternal();
  }

  // mochart's ManagedChart reports focus with the new payload shape; adapt it
  // to the { seriesAxisId, seriesId, groupIndex } shape this demo tracks.
  private onChartFocus = ({ focusedSeriesAxisId: seriesAxisId, focusedSeriesId: seriesId, focusedGroupIndex: chartGroupIndex }: { focusedSeriesAxisId?: string | null; focusedSeriesId?: string | null; focusedGroupIndex?: number }): void => {
    this.onLocalFocus({ seriesAxisId, seriesId, groupIndex: chartGroupIndex });
  };

  private onLocalFocus({ seriesAxisId, seriesId, groupIndex: nextGroupIndex }: FocusPayload): void {
    if (nextGroupIndex !== undefined) {
      const nextFilteredFocusedGroupIndex = nextGroupIndex;
      let newFocusedGroupIndex = -1;
      if (nextFilteredFocusedGroupIndex >= 0) {
        const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
        const groupValue = this.filteredData[nextFilteredFocusedGroupIndex][groupProperty];
        let i, count = this.data.length;
        for (i = 0; i < count; i++) {
          if (this.data[i][groupProperty] === groupValue) {
            newFocusedGroupIndex = i;
            break;
          }
        }
      }
      this.filteredFocusedGroupIndex = nextFilteredFocusedGroupIndex;
      this.onFocus({ seriesAxisId, seriesId, groupIndex: newFocusedGroupIndex });
    }
    else {
      this.onFocus({ seriesAxisId, seriesId, groupIndex: nextGroupIndex });
    }
  }

  private onChartClick = ({ groupIndex: clickedGroupIndex }: { groupIndex: number }): void => {
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const clickedGroupValue = "" + this.filteredData[clickedGroupIndex][groupProperty];
    if (this.selectionMode === 'series') {
      this.groupIndex = clickedGroupIndex;
      this.seriesValuesText = getSeriesValuesText(this.mochartDemoConfig, this.filteredData, clickedGroupIndex, this.seriesIndex);
    }
    else if (this.selectionMode === 'group') {
      const dataGroupValues: any[] = [];
      let i, count = this.filteredData.length;
      for (i = 0; i < count; i++) {
        dataGroupValues.push(this.filteredData[i][groupProperty]);
      }
      let parsedGroupValues = this.groupValuesText === emptyGroupText ? [] : this.groupValuesText.split(',');
      parsedGroupValues = parsedGroupValues.filter((parsedGroupValue) => dataGroupValues.indexOf(parsedGroupValue) !== -1 || dataGroupValues.indexOf(+parsedGroupValue) !== -1);
      const clickedIndex = parsedGroupValues.indexOf(clickedGroupValue);
      if (clickedIndex === -1) {
        parsedGroupValues = parsedGroupValues.concat(clickedGroupValue);
      }
      else {
        parsedGroupValues.splice(clickedIndex, 1);
      }
      this.groupValuesText = parsedGroupValues.length === 0 ? emptyGroupText : parsedGroupValues.join(',');
    }
  };

  private onModeToggle = (): void => {
    this.selectionMode = this.selectionMode === 'group' ? 'series' : 'group';
  };

  private selectAllGroups = (): void => {
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const allGroupValues: any[] = [];
    let i, count = this.data.length;
    for (i = 0; i < count; i++) {
      allGroupValues.push(this.data[i][groupProperty]);
    }
    this.groupValuesText = allGroupValues.join(',');
  };

  private resetGroups = (): void => {
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const groupToObjectMap: Record<string, Row> = {};
    this.removedData.forEach(removedObject => {
      groupToObjectMap[removedObject[groupProperty]] = removedObject;
    });
    this.filteredData.forEach(oldObject => {
      groupToObjectMap[oldObject[groupProperty]] = oldObject;
    });
    const nextFilteredData = this.data.map(o => groupToObjectMap[o[groupProperty]]);
    this.updateFilteredDataState({ orderChanged: false }, nextFilteredData, []);
  };

  private reverseGroups = (): void => {
    if (this.filteredData && this.filteredData.length > 1) {
      const nextFilteredData = this.filteredData.slice().reverse();
      this.updateFilteredDataState({ orderChanged: true }, nextFilteredData, this.removedData);
    }
  };

  private decreaseGroupOrder = (): void => {
    if (this.filteredData && this.filteredData.length > 1) {
      if (this.groupIndex > 0) {
        const nextFilteredData = this.filteredData.slice();
        const temp = nextFilteredData[this.groupIndex - 1];
        nextFilteredData[this.groupIndex - 1] = nextFilteredData[this.groupIndex];
        nextFilteredData[this.groupIndex] = temp;
        this.updateFilteredDataState({ orderChanged: true, groupIndex: this.groupIndex - 1 }, nextFilteredData, this.removedData, false);
      }
    }
  };

  private increaseGroupOrder = (): void => {
    if (this.filteredData && this.filteredData.length > 1) {
      if (this.groupIndex < this.filteredData.length - 1) {
        const nextFilteredData = this.filteredData.slice();
        const temp = nextFilteredData[this.groupIndex + 1];
        nextFilteredData[this.groupIndex + 1] = nextFilteredData[this.groupIndex];
        nextFilteredData[this.groupIndex] = temp;
        this.updateFilteredDataState({ orderChanged: true, groupIndex: this.groupIndex + 1 }, nextFilteredData, this.removedData, false);
      }
    }
  };

  private addGroups = (): void => {
    const oldFilteredData = this.filteredData;
    const oldRemovedData = this.removedData;
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const groupValuesToAdd = this.groupValuesText === emptyGroupText ? [] : this.groupValuesText.split(",");
    const groupValueToAddMap: Record<string, boolean> = {};
    groupValuesToAdd.forEach(groupValueToAdd => {
      groupValueToAddMap[groupValueToAdd] = true;
    });
    const removedMap: Record<string, Row> = {};
    oldRemovedData.forEach(removedObject => {
      removedMap[removedObject[groupProperty]] = removedObject;
    });
    let i, fi, count = this.data.length, filteredCount = oldFilteredData.length;
    const nextFilteredData: Row[] = [];
    for (i = 0, fi = 0; i < count; i++) {
      if (fi < filteredCount) {
        if (this.data[i][groupProperty] !== oldFilteredData[fi][groupProperty]) {
          if (groupValueToAddMap[this.data[i][groupProperty]] === true) {
            nextFilteredData.push(removedMap[this.data[i][groupProperty]]);
            delete removedMap[this.data[i][groupProperty]];
          }
        }
        else {
          nextFilteredData.push(oldFilteredData[fi]);
          fi++;
        }
      }
      else if (groupValueToAddMap[this.data[i][groupProperty]] === true) {
        nextFilteredData.push(removedMap[this.data[i][groupProperty]]);
        delete removedMap[this.data[i][groupProperty]];
      }
    }
    const nextRemovedData: Row[] = [];
    oldRemovedData.forEach(removedObject => {
      if (removedMap[removedObject[groupProperty]] !== undefined) {
        nextRemovedData.push(removedMap[removedObject[groupProperty]]);
      }
    });
    this.updateFilteredDataState({}, nextFilteredData, nextRemovedData);
  };

  private removeGroups = (): void => {
    const oldFilteredData = this.filteredData;
    const nextRemovedData = this.removedData;
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const groupValuesToRemove = this.groupValuesText === emptyGroupText ? [] : this.groupValuesText.split(",");
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
    this.updateFilteredDataState({}, nextFilteredData, nextRemovedData);
  };

  private startAddSequence = (): void => {
    const oldFilteredData = this.filteredData;
    const oldRemovedData = this.removedData;
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const groupValuesToAdd = this.groupValuesText === emptyGroupText ? [] : this.groupValuesText.split(",");
    const groupValueToAddMap: Record<string, boolean> = {};
    groupValuesToAdd.forEach(groupValueToAdd => {
      groupValueToAddMap[groupValueToAdd] = true;
    });
    const removedIndexMap: Record<string, number> = {};
    oldRemovedData.forEach((removedObject, removedIndex) => {
      removedIndexMap[removedObject[groupProperty]] = removedIndex;
    });
    const groupObjectsToAdd: { removedIndex: number; dataIndex: number }[] = [];
    let i, fi, count = this.data.length, filteredCount = oldFilteredData.length;
    for (i = 0, fi = 0; i < count; i++) {
      if (fi < filteredCount) {
        if (this.data[i][groupProperty] !== oldFilteredData[fi][groupProperty]) {
          if (groupValueToAddMap[this.data[i][groupProperty]] === true) {
            groupObjectsToAdd.push({
              removedIndex: removedIndexMap[this.data[i][groupProperty]] - groupObjectsToAdd.length,
              dataIndex: fi + groupObjectsToAdd.length
            });
          }
        }
        else {
          fi++;
        }
      }
      else if (groupValueToAddMap[this.data[i][groupProperty]] === true) {
        groupObjectsToAdd.push({
          removedIndex: removedIndexMap[this.data[i][groupProperty]] - groupObjectsToAdd.length,
          dataIndex: fi + groupObjectsToAdd.length
        });
      }
    }
    if (groupObjectsToAdd.length > 0) {
      this.sequencePlaying = true;
      let addCount = 0;
      this.sequenceId = setInterval(() => {
        oldFilteredData.splice(groupObjectsToAdd[addCount].dataIndex, 0, oldRemovedData.splice(groupObjectsToAdd[addCount].removedIndex, 1)[0]);
        this.updateFilteredDataState({}, oldFilteredData, oldRemovedData);
        if (addCount < groupObjectsToAdd.length - 1) {
          addCount++;
        }
        else {
          this.stopSequence();
        }
      }, 2000);
    }
  };

  private startRemoveSequence = (): void => {
    const oldFilteredData = this.filteredData;
    const oldRemovedData = this.removedData;
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const groupValuesToRemove = this.groupValuesText === emptyGroupText ? [] : this.groupValuesText.split(",");
    const groupValueToRemoveMap: Record<string, boolean> = {};
    groupValuesToRemove.forEach(groupValueToRemove => {
      groupValueToRemoveMap[groupValueToRemove] = true;
    });
    const removedIndexMap: Record<string, number> = {};
    oldRemovedData.forEach((removedObject, removedIndex) => {
      removedIndexMap[removedObject[groupProperty]] = removedIndex;
    });
    const groupObjectsToRemove: { removedIndex: number; dataIndex: number }[] = [];
    let i, fi, ri, count = this.data.length, filteredCount = oldFilteredData.length;
    for (i = 0, fi = 0, ri = 0; i < count && fi < filteredCount; i++) {
      if (this.data[i][groupProperty] === oldFilteredData[fi][groupProperty]) {
        if (groupValueToRemoveMap[this.data[i][groupProperty]] === true) {
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
      this.sequencePlaying = true;
      let removeCount = 0;
      this.sequenceId = setInterval(() => {
        oldRemovedData.splice(groupObjectsToRemove[removeCount].removedIndex, 0, oldFilteredData.splice(groupObjectsToRemove[removeCount].dataIndex, 1)[0]);
        this.updateFilteredDataState({}, oldFilteredData, oldRemovedData);
        if (removeCount < groupObjectsToRemove.length - 1) {
          removeCount++;
        }
        else {
          this.stopSequence();
        }
      }, 2000);
    }
  };

  private stopSequence = (): void => {
    this.stopSequenceInternal();
    this.sequencePlaying = false;
  };

  private stopSequenceInternal(): void {
    if (this.sequenceId !== null) {
      clearInterval(this.sequenceId);
      this.sequenceId = null;
    }
  }

  private prevSeries = (): void => {
    if (this.groupIndex !== -1 && this.seriesIndex > 0) {
      this.seriesIndex--;
      this.seriesValuesText = getSeriesValuesText(this.mochartDemoConfig, this.filteredData, this.groupIndex, this.seriesIndex);
    }
  };

  private nextSeries = (): void => {
    const { seriesCount } = this.mochartDemoConfig;
    if (this.groupIndex !== -1 && this.seriesIndex < seriesCount - 1) {
      this.seriesIndex++;
      this.seriesValuesText = getSeriesValuesText(this.mochartDemoConfig, this.filteredData, this.groupIndex, this.seriesIndex);
    }
  };

  private applySeriesChanges = (): void => {
    const filteredDataObject = this.filteredData[this.groupIndex];
    const { mochartConfig } = this.mochartDemoConfig;
    const { seriesConfigs } = mochartConfig;
    if (seriesConfigs.length > 0) {
      try {
        const dataObject = JSON.parse(this.seriesValuesText);
        const seriesConfig = seriesConfigs[this.seriesIndex];
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
        this.updateFilteredDataState({}, this.filteredData, this.removedData, false);
      }
      catch (error) {

      }
    }
  };

  private resetSeriesChanges = (): void => {
    const { mochartConfig } = this.mochartDemoConfig;
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const { seriesConfigs } = mochartConfig;
    if (seriesConfigs.length > 0) {
      const filteredDataObject = this.filteredData[this.groupIndex];
      const filteredGroupValue = filteredDataObject[groupProperty];
      let i, count = this.data.length, dataObject: Row | null = null;
      for (i = 0; i < count; i++) {
        if (this.data[i][groupProperty] === filteredGroupValue) {
          dataObject = this.data[i];
        }
      }
      const seriesConfig = seriesConfigs[this.seriesIndex];
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
      this.updateFilteredDataState({ seriesValuesText: getSeriesValuesText(this.mochartDemoConfig, this.filteredData, this.groupIndex, this.seriesIndex) }, this.filteredData, this.removedData, false);
    }
  };

  private renderChartCountControls(): unknown {
    if (!this.showChartCountControls) {
      return nothing;
    }
    return html`<div class="demo-btn-group">
      ${buttonWithTooltip(
        { id: 'edit-chart-count', label: demoText.editableChart.secondChart.label, pressed: this.chartCount === 2, tooltipText: this.chartCount === 2 ? demoText.editableChart.secondChart.tooltipHide : demoText.editableChart.secondChart.tooltipShow, tooltipPlacement: 'right', onClick: this.onChartCountToggle, ariaLabel: demoText.editableChart.secondChart.aria },
        icon({ size: 'lg', fixedWidth: true, name: this.chartCount === 2 ? 'window-maximize' : 'window-restore' })
      )}
    </div>`;
  }

  private renderModeToggle(): unknown {
    return html`<div class="demo-btn-group">
      ${buttonWithTooltip(
        { id: 'edit-mode', label: this.selectionMode === 'group' ? demoText.editableChart.editMode.labelToSeries : demoText.editableChart.editMode.labelToGroups, tooltipText: this.selectionMode === 'group' ? demoText.editableChart.editMode.tooltipToSeries : demoText.editableChart.editMode.tooltipToGroups, tooltipPlacement: 'right', onClick: this.onModeToggle, ariaLabel: demoText.editableChart.editMode.aria },
        icon({ size: 'lg', fixedWidth: true, name: this.selectionMode === 'group' ? 'bullseye' : 'sliders' })
      )}
    </div>`;
  }

  // The export/share menu sits at the far right of the controls row (past the
  // group/series input). Share is only offered on the chart flagged for it (the
  // first, when two are shown).
  private renderExportShareMenu(error: boolean): unknown {
    return html`<span class="chart-controls-menu">
      <export-share-menu .idPrefix=${'edit'} .disabled=${error}
        .exportPng=${() => { const container = this.querySelector('.editable-chart-content'); if (container) { void exportPNG(container, getChartExportOptions()); } }}
        .exportSvg=${() => { const container = this.querySelector('.editable-chart-content'); if (container) { exportSVG(container, getChartExportOptions()); } }}
        .getShareState=${this.showShareButton ? () => ({ mode: 'single', config: this.mochartDemoConfig.config, data: this.data }) : undefined}></export-share-menu>
    </span>`;
  }

  private renderGroupControls(error: boolean, disableAdd: boolean, disableRemove: boolean): unknown {
    return html`<div class="chart-controls-container">
      <div class="chart-controls-buttons">
        <form class="demo-form-row">
          <div class="demo-field">
            <div class="demo-toolbar" role="toolbar">
              ${this.renderChartCountControls()}
              ${this.renderModeToggle()}
              <div class="demo-btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-reset-groups', disabled: error || this.sequencePlaying, label: demoText.editableChart.resetGroups.label, tooltipText: demoText.editableChart.resetGroups.tooltip, tooltipPlacement: 'right', onClick: this.resetGroups, ariaLabel: demoText.editableChart.resetGroups.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'arrow-rotate-left' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-reverse-groups', disabled: error || this.sequencePlaying, label: demoText.editableChart.reverseGroups.label, tooltipText: demoText.editableChart.reverseGroups.tooltip, tooltipPlacement: 'right', onClick: this.reverseGroups, ariaLabel: demoText.editableChart.reverseGroups.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'right-left' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-add-groups', disabled: error || this.sequencePlaying || disableAdd, label: demoText.editableChart.addGroups.label, tooltipText: demoText.editableChart.addGroups.tooltip, tooltipPlacement: 'right', onClick: this.addGroups, ariaLabel: demoText.editableChart.addGroups.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'plus' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-remove-groups', disabled: error || this.sequencePlaying || disableRemove, label: demoText.editableChart.removeGroups.label, tooltipText: demoText.editableChart.removeGroups.tooltip, tooltipPlacement: 'right', onClick: this.removeGroups, ariaLabel: demoText.editableChart.removeGroups.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'minus' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-play-add', disabled: error || this.sequencePlaying || disableAdd, tooltipText: demoText.editableChart.playAddGroups.tooltip, tooltipPlacement: 'right', onClick: this.startAddSequence, ariaLabel: demoText.editableChart.playAddGroups.aria },
                  html`${icon({ size: 'lg', name: 'play' })}<span style="padding-right: 2px;"></span>${icon({ size: 'lg', name: 'plus' })}`
                )}
                ${buttonWithTooltip(
                  { id: 'edit-play-remove', disabled: error || this.sequencePlaying || disableRemove, tooltipText: demoText.editableChart.playRemoveGroups.tooltip, tooltipPlacement: 'right', onClick: this.startRemoveSequence, ariaLabel: demoText.editableChart.playRemoveGroups.aria },
                  html`${icon({ size: 'lg', name: 'play' })}<span style="padding-right: 2px;"></span>${icon({ size: 'lg', name: 'minus' })}`
                )}
                ${buttonWithTooltip(
                  { id: 'edit-stop', disabled: error || !this.sequencePlaying, tooltipText: demoText.editableChart.stopSequence.tooltip, tooltipPlacement: 'right', onClick: this.stopSequence, ariaLabel: demoText.editableChart.stopSequence.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'stop' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-select-all', disabled: error || this.sequencePlaying, label: demoText.editableChart.selectAllGroups.label, tooltipText: demoText.editableChart.selectAllGroups.tooltip, tooltipPlacement: 'right', onClick: this.selectAllGroups, ariaLabel: demoText.editableChart.selectAllGroups.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'check-double' })
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
      <span class="chart-controls-input">
        <form class="demo-form-row">
          <input type="text" class="demo-input" ?disabled=${error || this.sequencePlaying} .value=${this.groupValuesText}
                 @input=${(event: Event) => { this.groupValuesText = (event.currentTarget as HTMLInputElement).value; }} />
        </form>
      </span>
      ${this.renderExportShareMenu(error)}
    </div>`;
  }

  private renderSeriesControls(error: boolean): unknown {
    const filteredGroupValuesCount = this.dataProvider?.getGroupValues ? this.dataProvider.getGroupValues().length : 0;
    const seriesControlsDisabled = this.sequencePlaying || this.groupIndex === -1;
    const groupOrderControlsDisabled = this.sequencePlaying || this.groupIndex === -1;
    const isFirstGroup = this.groupIndex === 0;
    const isLastGroup = this.groupIndex === filteredGroupValuesCount - 1;
    const hasPrevSeries = this.seriesIndex > 0;
    const hasNextSeries = this.seriesIndex < this.mochartDemoConfig.seriesCount - 1;
    return html`<div class="chart-controls-container">
      <div class="chart-controls-buttons">
        <form class="demo-form-row">
          <div class="demo-field">
            <div class="demo-toolbar" role="toolbar">
              ${this.renderChartCountControls()}
              ${this.renderModeToggle()}
            </div>
          </div>
          <div class="demo-field">
            <div class="demo-toolbar" role="toolbar">
              <div class="demo-btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-group-decrease', disabled: error || groupOrderControlsDisabled || isFirstGroup, tooltipText: demoText.editableChart.decreaseGroupOrder.tooltip, tooltipPlacement: 'right', onClick: this.decreaseGroupOrder, ariaLabel: demoText.editableChart.decreaseGroupOrder.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'arrow-left' })
                )}
              </div>
            </div>
          </div>
          <div class="demo-field">
            <span class="demo-label" style="margin-left: 5px; margin-right: 5px;">${demoText.editableChart.groupIndexPrefix}<span class="demo-index-value">${this.groupIndex}</span></span>
          </div>
          <div class="demo-field">
            <div class="demo-toolbar" role="toolbar">
              <div class="demo-btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-group-increase', disabled: error || groupOrderControlsDisabled || isLastGroup, tooltipText: demoText.editableChart.increaseGroupOrder.tooltip, tooltipPlacement: 'right', onClick: this.increaseGroupOrder, ariaLabel: demoText.editableChart.increaseGroupOrder.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'arrow-right' })
                )}
              </div>
            </div>
          </div>
          <div class="demo-field">
            <div class="demo-toolbar" role="toolbar">
              <div class="demo-btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-previous-series', disabled: error || seriesControlsDisabled || !hasPrevSeries, tooltipText: demoText.editableChart.previousSeries.tooltip, tooltipPlacement: 'right', onClick: this.prevSeries, ariaLabel: demoText.editableChart.previousSeries.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'chevron-down' })
                )}
              </div>
            </div>
          </div>
          <div class="demo-field">
            <span class="demo-label" style="margin-left: 5px; margin-right: 5px;">${demoText.editableChart.seriesIndexPrefix}<span class="demo-index-value">${this.seriesIndex}</span></span>
          </div>
          <div class="demo-field">
            <div class="demo-toolbar" role="toolbar">
              <div class="demo-btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-next-series', disabled: error || seriesControlsDisabled || !hasNextSeries, tooltipText: demoText.editableChart.nextSeries.tooltip, tooltipPlacement: 'right', onClick: this.nextSeries, ariaLabel: demoText.editableChart.nextSeries.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'chevron-up' })
                )}
              </div>
              <div class="demo-btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-reset-series', disabled: error || seriesControlsDisabled, label: demoText.editableChart.resetSeries.label, tooltipText: demoText.editableChart.resetSeries.tooltip, tooltipPlacement: 'right', onClick: this.resetSeriesChanges, ariaLabel: demoText.editableChart.resetSeries.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'arrow-rotate-left' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-apply-series', disabled: error || seriesControlsDisabled, label: demoText.editableChart.applySeries.label, tooltipText: demoText.editableChart.applySeries.tooltip, tooltipPlacement: 'right', onClick: this.applySeriesChanges, ariaLabel: demoText.editableChart.applySeries.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'check' })
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
      <span class="chart-controls-input">
        <form class="demo-form-row">
          <input type="text" class="demo-input" ?disabled=${error || seriesControlsDisabled} .value=${this.seriesValuesText}
                 @input=${(event: Event) => { this.seriesValuesText = (event.currentTarget as HTMLInputElement).value; }} />
        </form>
      </span>
      ${this.renderExportShareMenu(error)}
    </div>`;
  }

  // Pie-mode slice panel — replaces both panels when slices are the series:
  // click a slice (or step prev/next) to select it, edit its value, or play
  // the suppress/restore sequence.
  private renderSliceControls(error: boolean): unknown {
    const sliceControlsDisabled = error || this.sequencePlaying || this.slices.length === 0;
    return html`<div class="chart-controls-container">
      <div class="chart-controls-buttons">
        <form class="demo-form-row">
          <div class="demo-field">
            <div class="demo-toolbar" role="toolbar">
              ${this.renderChartCountControls()}
            </div>
          </div>
          <div class="demo-field">
            <div class="demo-toolbar" role="toolbar">
              <div class="demo-btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-previous-slice', disabled: sliceControlsDisabled || this.sliceIndex === 0, tooltipText: demoText.editableChart.previousSlice.tooltip, tooltipPlacement: 'right', onClick: () => this.selectSlice(this.sliceIndex - 1), ariaLabel: demoText.editableChart.previousSlice.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'chevron-left' })
                )}
              </div>
            </div>
          </div>
          <div class="demo-field">
            <span class="demo-label" style="margin-left: 5px; margin-right: 5px;" title=${this.slices.length > 0 ? this.slices[this.sliceIndex].title : ''}>${this.slices.length > 0
              ? html`${demoText.editableChart.sliceIndexPrefix}<span class="demo-index-value">${this.sliceIndex}</span>`
              : demoText.editableChart.selectASliceText}</span>
          </div>
          <div class="demo-field">
            <div class="demo-toolbar" role="toolbar">
              <div class="demo-btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-next-slice', disabled: sliceControlsDisabled || this.sliceIndex >= this.slices.length - 1, tooltipText: demoText.editableChart.nextSlice.tooltip, tooltipPlacement: 'right', onClick: () => this.selectSlice(this.sliceIndex + 1), ariaLabel: demoText.editableChart.nextSlice.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'chevron-right' })
                )}
              </div>
              <div class="demo-btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-reset-slice', disabled: sliceControlsDisabled, label: demoText.editableChart.resetSlice.label, tooltipText: demoText.editableChart.resetSlice.tooltip, tooltipPlacement: 'right', onClick: this.resetSliceChanges, ariaLabel: demoText.editableChart.resetSlice.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'arrow-rotate-left' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-apply-slice', disabled: sliceControlsDisabled, label: demoText.editableChart.applySlice.label, tooltipText: demoText.editableChart.applySlice.tooltip, tooltipPlacement: 'right', onClick: this.applySliceChanges, ariaLabel: demoText.editableChart.applySlice.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'check' })
                )}
              </div>
              <div class="demo-btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-play-slices', disabled: error || this.sequencePlaying || this.slices.length < 3, tooltipText: demoText.editableChart.playSliceSequence.tooltip, tooltipPlacement: 'right', onClick: this.startSliceSequence, ariaLabel: demoText.editableChart.playSliceSequence.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'play' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-stop-slices', disabled: error || !this.sequencePlaying, tooltipText: demoText.editableChart.stopSliceSequence.tooltip, tooltipPlacement: 'right', onClick: this.stopSequence, ariaLabel: demoText.editableChart.stopSliceSequence.aria },
                  icon({ size: 'lg', fixedWidth: true, name: 'stop' })
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
      <span class="chart-controls-input">
        <form class="demo-form-row">
          <input type="text" class="demo-input" ?disabled=${sliceControlsDisabled} .value=${this.sliceValueText}
                 @input=${(event: Event) => { this.sliceValueText = (event.currentTarget as HTMLInputElement).value; }} />
        </form>
      </span>
      ${this.renderExportShareMenu(error)}
    </div>`;
  }

  override render(): unknown {
    const chartDataError = !!(this.dataProvider && this.dataProvider.getError && this.dataProvider.getError());
    const configError = !this.mochartDemoConfig.valid;
    const error = chartDataError || configError;
    const filteredGroupValues: any[] = error || !this.dataProvider?.getGroupValues ? [] : this.dataProvider.getGroupValues();
    const selectedGroupValues = (error || this.groupValuesText === emptyGroupText) ? [] : this.groupValuesText.split(',');
    const filteredGroupMap = filteredGroupValues.reduce<Record<string, boolean>>((map, group) => { map[group] = true; return map; }, {});
    const disableRemove = this.orderChanged || !selectedGroupValues.some(group => filteredGroupMap[group]);
    const disableAdd = this.orderChanged || !selectedGroupValues.some(group => !filteredGroupMap[group]);
    // The chart controller picks animated vs static from the config.
    // Focus/filter is controlled by the parent chart-tab so the 1–2
    // charts stay in sync; the group index is translated into this
    // chart's filtered-data coordinates (filteredFocusedGroupIndex).
    // Width is explicit; height tracks the container.
    const chartProps: ChartProps = {
      style: 'flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;',
      width: this.width,
      mochartConfig: this.mochartDemoConfig.mochartConfig,
      dataProvider: this.dataProvider,
      filteredSeriesIds: this.filteredSeriesIds,
      focusedGroupIndex: this.filteredFocusedGroupIndex,
      focusedSeriesAxisId: this.focusedSeriesAxisId ?? null,
      focusedSeriesId: this.focusedSeriesId ?? null,
      onFocus: this.onChartFocus,
      onSeriesFilter: this.onSeriesFilter,
      onChartClick: this.onChartClick,
      onSliceClick: this.onChartSliceClick
    };
    return html`<div class="editable-mochart-chart">
      <div class="editable-chart-container">
        <div class="editable-chart-content">
          ${chart(chartProps)}
        </div>
        <div class="editable-chart-controls">
          ${this.mochartDemoConfig.pieMode
            ? this.renderSliceControls(error)
            : this.selectionMode === 'group'
              ? this.renderGroupControls(error, disableAdd, disableRemove)
              : this.renderSeriesControls(error)}
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'editable-chart': EditableChart;
  }
}
