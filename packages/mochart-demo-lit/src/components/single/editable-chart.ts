import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { hasConfigStructureChange, NONE, ArrayOfObjectsDataProvider } from '@mochart/core';
import { chart } from '@mochart/lit';

import { LightElement } from '../misc/LightElement';
import { buttonWithTooltip, exportButtons, icon } from '../misc/templates';

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

const emptyGroupText = "Select Group(s)";

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
  @state() private filteredFocusedGroupIndex = -1;
  @state() private orderChanged = false;

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
      this.seriesValuesText = "Select a Group";
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
    if (nextState.orderChanged !== void 0) {
      this.orderChanged = nextState.orderChanged;
    }
    if (nextState.groupIndex !== void 0) {
      this.groupIndex = nextState.groupIndex;
    }
    if (nextState.seriesIndex !== void 0) {
      this.seriesIndex = nextState.seriesIndex;
    }
    if (nextState.groupValuesText !== void 0) {
      this.groupValuesText = nextState.groupValuesText;
    }
    if (nextState.seriesValuesText !== void 0) {
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
    this.updateFilteredDataState({ orderChanged: false, seriesIndex: 0, groupValuesText: emptyGroupText }, nextFilteredData, []);
  }

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
    if (nextGroupIndex !== void 0) {
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
      if (removedMap[removedObject[groupProperty]] !== void 0) {
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
    return html`<div class="btn-group">
      ${buttonWithTooltip(
        { id: 'edit-chart-count', label: '2nd Chart', pressed: this.chartCount === 2, tooltipText: (this.chartCount === 2 ? 'Hide the' : 'Show a') + ' second chart sharing the same data', tooltipPlacement: 'right', onClick: this.onChartCountToggle, ariaLabel: 'Toggle Chart Count' },
        icon({ size: 'lg', fixedWidth: true, name: this.chartCount === 2 ? 'window-maximize' : 'window-restore' })
      )}
    </div>`;
  }

  private renderModeToggle(): unknown {
    return html`<div class="btn-group">
      ${buttonWithTooltip(
        { id: 'edit-mode', label: this.selectionMode === 'group' ? 'Edit Series' : 'Edit Groups', tooltipText: this.selectionMode === 'group' ? 'Switch to editing one group at a time (step groups/series, change values)' : 'Switch to editing the set of groups (add, remove, reorder)', tooltipPlacement: 'right', onClick: this.onModeToggle, ariaLabel: 'Toggle Mode' },
        icon({ size: 'lg', fixedWidth: true, name: this.selectionMode === 'group' ? 'bullseye' : 'sliders' })
      )}
    </div>`;
  }

  private renderExportButtons(): unknown {
    return exportButtons({ idPrefix: 'edit', getContainer: () => this.querySelector('.editable-chart-content') });
  }

  private renderGroupControls(error: boolean, disableAdd: boolean, disableRemove: boolean): unknown {
    return html`<div class="chart-controls-container">
      <div class="chart-controls-buttons">
        <form class="form-inline">
          <div class="form-group">
            <div class="btn-toolbar" role="toolbar">
              ${this.renderChartCountControls()}
              ${this.renderModeToggle()}
              ${this.renderExportButtons()}
              <div class="btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-reset-groups', disabled: error || this.sequencePlaying, label: 'Reset', tooltipText: 'Restore the original group set and order', tooltipPlacement: 'right', onClick: this.resetGroups, ariaLabel: 'Reset Groups' },
                  icon({ size: 'lg', fixedWidth: true, name: 'arrow-rotate-left' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-reverse-groups', disabled: error || this.sequencePlaying, label: 'Reverse', tooltipText: 'Reverse the order of the groups', tooltipPlacement: 'right', onClick: this.reverseGroups, ariaLabel: 'Reverse Groups' },
                  icon({ size: 'lg', fixedWidth: true, name: 'right-left' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-add-groups', disabled: error || this.sequencePlaying || disableAdd, label: 'Add', tooltipText: 'Add the groups selected in the input to the chart', tooltipPlacement: 'right', onClick: this.addGroups, ariaLabel: 'Add Selected Groups' },
                  icon({ size: 'lg', fixedWidth: true, name: 'plus' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-remove-groups', disabled: error || this.sequencePlaying || disableRemove, label: 'Remove', tooltipText: 'Remove the groups selected in the input from the chart', tooltipPlacement: 'right', onClick: this.removeGroups, ariaLabel: 'Remove Selected Groups' },
                  icon({ size: 'lg', fixedWidth: true, name: 'minus' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-play-add', disabled: error || this.sequencePlaying || disableAdd, tooltipText: 'Animate adding the selected groups one at a time', tooltipPlacement: 'right', onClick: this.startAddSequence, ariaLabel: 'Play Add Selected Groups' },
                  html`${icon({ size: 'lg', name: 'play' })}<span style="padding-right: 2px;"></span>${icon({ size: 'lg', name: 'plus' })}`
                )}
                ${buttonWithTooltip(
                  { id: 'edit-play-remove', disabled: error || this.sequencePlaying || disableRemove, tooltipText: 'Animate removing the selected groups one at a time', tooltipPlacement: 'right', onClick: this.startRemoveSequence, ariaLabel: 'Play Remove Selected Groups' },
                  html`${icon({ size: 'lg', name: 'play' })}<span style="padding-right: 2px;"></span>${icon({ size: 'lg', name: 'minus' })}`
                )}
                ${buttonWithTooltip(
                  { id: 'edit-stop', disabled: error || !this.sequencePlaying, tooltipText: 'Stop the add/remove animation', tooltipPlacement: 'right', onClick: this.stopSequence, ariaLabel: 'Stop Selected Group Sequence' },
                  icon({ size: 'lg', fixedWidth: true, name: 'stop' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-select-all', disabled: error || this.sequencePlaying, label: 'Select All', tooltipText: 'Put every group into the selection input', tooltipPlacement: 'right', onClick: this.selectAllGroups, ariaLabel: 'Select All Groups' },
                  icon({ size: 'lg', fixedWidth: true, name: 'check-double' })
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
      <span class="chart-controls-input">
        <form class="form-inline">
          <input type="text" class="form-control" ?disabled=${error || this.sequencePlaying} .value=${this.groupValuesText}
                 @input=${(event: Event) => { this.groupValuesText = (event.currentTarget as HTMLInputElement).value; }} />
        </form>
      </span>
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
        <form class="form-inline">
          <div class="form-group">
            <div class="btn-toolbar" role="toolbar">
              ${this.renderChartCountControls()}
              ${this.renderModeToggle()}
              ${this.renderExportButtons()}
            </div>
          </div>
          <div class="form-group">
            <div class="btn-toolbar" role="toolbar">
              <div class="btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-group-decrease', disabled: error || groupOrderControlsDisabled || isFirstGroup, tooltipText: 'Move the focused group one position earlier', tooltipPlacement: 'right', onClick: this.decreaseGroupOrder, ariaLabel: 'Decrease Group Order' },
                  icon({ size: 'lg', fixedWidth: true, name: 'arrow-left' })
                )}
              </div>
            </div>
          </div>
          <div class="form-group">
            <span class="form-control-plaintext" style="margin-left: 5px; margin-right: 5px;">${'Group: ' + this.groupIndex}</span>
          </div>
          <div class="form-group">
            <div class="btn-toolbar" role="toolbar">
              <div class="btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-group-increase', disabled: error || groupOrderControlsDisabled || isLastGroup, tooltipText: 'Move the focused group one position later', tooltipPlacement: 'right', onClick: this.increaseGroupOrder, ariaLabel: 'Increase Group Order' },
                  icon({ size: 'lg', fixedWidth: true, name: 'arrow-right' })
                )}
              </div>
            </div>
          </div>
          <div class="form-group">
            <div class="btn-toolbar" role="toolbar">
              <div class="btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-previous-series', disabled: error || seriesControlsDisabled || !hasPrevSeries, tooltipText: 'Edit the previous series', tooltipPlacement: 'right', onClick: this.prevSeries, ariaLabel: 'Previous Series' },
                  icon({ size: 'lg', fixedWidth: true, name: 'chevron-down' })
                )}
              </div>
            </div>
          </div>
          <div class="form-group">
            <span class="form-control-plaintext" style="margin-left: 5px; margin-right: 5px;">${'Series: ' + this.seriesIndex}</span>
          </div>
          <div class="form-group">
            <div class="btn-toolbar" role="toolbar">
              <div class="btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-next-series', disabled: error || seriesControlsDisabled || !hasNextSeries, tooltipText: 'Edit the next series', tooltipPlacement: 'right', onClick: this.nextSeries, ariaLabel: 'Next Series' },
                  icon({ size: 'lg', fixedWidth: true, name: 'chevron-up' })
                )}
              </div>
              <div class="btn-group">
                ${buttonWithTooltip(
                  { id: 'edit-reset-series', disabled: error || seriesControlsDisabled, label: 'Reset', tooltipText: "Discard the edits to this series' values", tooltipPlacement: 'right', onClick: this.resetSeriesChanges, ariaLabel: 'Reset Series Changes' },
                  icon({ size: 'lg', fixedWidth: true, name: 'arrow-rotate-left' })
                )}
                ${buttonWithTooltip(
                  { id: 'edit-apply-series', disabled: error || seriesControlsDisabled, label: 'Apply', tooltipText: 'Apply the edited series values to the chart', tooltipPlacement: 'right', onClick: this.applySeriesChanges, ariaLabel: 'Apply Series Changes' },
                  icon({ size: 'lg', fixedWidth: true, name: 'check' })
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
      <span class="chart-controls-input">
        <form class="form-inline">
          <input type="text" class="form-control" ?disabled=${error || seriesControlsDisabled} .value=${this.seriesValuesText}
                 @input=${(event: Event) => { this.seriesValuesText = (event.currentTarget as HTMLInputElement).value; }} />
        </form>
      </span>
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
    return html`<div class="editable-mochart-chart">
      <div class="editable-chart-container">
        <div class="editable-chart-content">
          ${chart({
            // The chart controller picks animated vs static from the config
            // and owns focus/filter state internally. Width is explicit;
            // height tracks the container.
            style: 'flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;',
            width: this.width,
            mochartConfig: this.mochartDemoConfig.mochartConfig,
            dataProvider: this.dataProvider,
            onFocus: this.onChartFocus,
            onSeriesFilter: this.onSeriesFilter,
            onChartClick: this.onChartClick
          })}
        </div>
        <div class="editable-chart-controls">
          ${this.selectionMode === 'group'
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
