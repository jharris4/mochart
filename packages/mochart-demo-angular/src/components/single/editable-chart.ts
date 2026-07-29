import { Component, ElementRef, Input, ViewChild, signal } from '@angular/core';
import type { OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';

import { hasConfigStructureChange, NONE, ArrayOfObjectsDataProvider } from '@mochart/core';
import { exportPNG, exportSVG } from '@mochart/export';

import { Chart } from '@mochart/angular';

import { applyPieSliceValue, getChartExportOptions, getPieSequenceSteps, getPieSlices, demoText } from '@mochart/demo-common';

import type { PieSliceInfo } from '@mochart/demo-common';

import { ButtonWithTooltip } from '../misc/button-with-tooltip';
import { ExportShareMenu } from '../misc/export-share-menu';
import { Icon } from '../misc/icon';

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
const selectAGroupText = demoText.editableChart.selectAGroupText;

@Component({
  selector: 'app-editable-chart',
  imports: [Chart, ButtonWithTooltip, ExportShareMenu, Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div class="editable-mochart-chart">
      <div class="editable-chart-container">
        <div class="editable-chart-content" #chartContent>
          <!-- ManagedChart (behind mochart-angular's Chart) picks animated vs
               static from the config and owns focus/filter state internally.
               Width is explicit; height tracks the container. -->
          <mochart-chart style="flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden;"
                         [width]="width" [mochartConfig]="mochartDemoConfig.mochartConfig" [dataProvider]="dataProvider()"
                         [filteredSeriesIds]="filteredSeriesIds" [focusedGroupIndex]="filteredFocusedGroupIndex()"
                         [focusedSeriesAxisId]="focusedSeriesAxisId ?? null" [focusedSeriesId]="focusedSeriesId ?? null"
                         (focus)="onChartFocus($event)" (seriesFilter)="onSeriesFilter($event)" (chartClick)="onChartClick($event)"
                         (sliceClick)="onChartSliceClick($event)" />
        </div>
        <div class="editable-chart-controls">
          <!-- Pie-mode slice panel — replaces both panels when slices are the
               series: click a slice (or step prev/next) to select it, edit its
               value, or play the suppress/restore sequence. -->
          @if (mochartDemoConfig.pieMode) {
            <div class="chart-controls-container">
              <div class="chart-controls-buttons">
                <form class="demo-form-row">
                  <div class="demo-field">
                    <div class="demo-toolbar" role="toolbar">
                      @if (showChartCountControls) {
                        <div class="demo-btn-group">
                          <app-button-with-tooltip id="edit-chart-count" [label]="text.secondChart.label" [pressed]="chartCount === 2"
                                                   [tooltipText]="chartCount === 2 ? text.secondChart.tooltipHide : text.secondChart.tooltipShow" tooltipPlacement="right"
                                                   [onClick]="onChartCountToggle" [aria-label]="text.secondChart.aria">
                            <app-icon size="lg" [fixedWidth]="true" [name]="chartCount === 2 ? 'window-maximize' : 'window-restore'" />
                          </app-button-with-tooltip>
                        </div>
                      }
                    </div>
                  </div>
                  <div class="demo-field">
                    <div class="demo-toolbar" role="toolbar">
                      <div class="demo-btn-group">
                        <app-button-with-tooltip id="edit-previous-slice" [disabled]="sliceControlsDisabled || sliceIndex() === 0" [tooltipText]="text.previousSlice.tooltip" tooltipPlacement="right"
                                                 [onClick]="prevSlice" [aria-label]="text.previousSlice.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="chevron-left" />
                        </app-button-with-tooltip>
                      </div>
                    </div>
                  </div>
                  <div class="demo-field">
                    <span class="demo-label" style="margin-left: 5px; margin-right: 5px;">{{ sliceLabelText }}</span>
                  </div>
                  <div class="demo-field">
                    <div class="demo-toolbar" role="toolbar">
                      <div class="demo-btn-group">
                        <app-button-with-tooltip id="edit-next-slice" [disabled]="sliceControlsDisabled || sliceIndex() >= slices().length - 1" [tooltipText]="text.nextSlice.tooltip" tooltipPlacement="right"
                                                 [onClick]="nextSlice" [aria-label]="text.nextSlice.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="chevron-right" />
                        </app-button-with-tooltip>
                      </div>
                      <div class="demo-btn-group">
                        <app-button-with-tooltip id="edit-reset-slice" [disabled]="sliceControlsDisabled" [label]="text.resetSlice.label" [tooltipText]="text.resetSlice.tooltip" tooltipPlacement="right"
                                                 [onClick]="resetSliceChanges" [aria-label]="text.resetSlice.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="arrow-rotate-left" />
                        </app-button-with-tooltip>
                        <app-button-with-tooltip id="edit-apply-slice" [disabled]="sliceControlsDisabled" [label]="text.applySlice.label" [tooltipText]="text.applySlice.tooltip" tooltipPlacement="right"
                                                 [onClick]="applySliceChanges" [aria-label]="text.applySlice.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="check" />
                        </app-button-with-tooltip>
                      </div>
                      <div class="demo-btn-group">
                        <app-button-with-tooltip id="edit-play-slices" [disabled]="error || sequencePlaying() || slices().length < 3" [tooltipText]="text.playSliceSequence.tooltip" tooltipPlacement="right"
                                                 [onClick]="startSliceSequence" [aria-label]="text.playSliceSequence.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="play" />
                        </app-button-with-tooltip>
                        <app-button-with-tooltip id="edit-stop-slices" [disabled]="error || !sequencePlaying()" [tooltipText]="text.stopSliceSequence.tooltip" tooltipPlacement="right"
                                                 [onClick]="stopSequence" [aria-label]="text.stopSliceSequence.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="stop" />
                        </app-button-with-tooltip>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              <span class="chart-controls-input">
                <form class="demo-form-row">
                  <input type="text" class="demo-input" [disabled]="sliceControlsDisabled"
                         [value]="sliceValueText()" (input)="onSliceValueInput($event)" />
                </form>
              </span>
              <span class="chart-controls-menu">
                <app-export-share-menu idPrefix="edit" [disabled]="error"
                                       [exportPng]="onExportPng" [exportSvg]="onExportSvg"
                                       [getShareState]="showShareButton ? getShareState : undefined" />
              </span>
            </div>
          } @else if (selectionMode() === 'group') {
            <div class="chart-controls-container">
              <div class="chart-controls-buttons">
                <form class="demo-form-row">
                  <div class="demo-field">
                    <div class="demo-toolbar" role="toolbar">
                      @if (showChartCountControls) {
                        <div class="demo-btn-group">
                          <app-button-with-tooltip id="edit-chart-count" [label]="text.secondChart.label" [pressed]="chartCount === 2"
                                                   [tooltipText]="chartCount === 2 ? text.secondChart.tooltipHide : text.secondChart.tooltipShow" tooltipPlacement="right"
                                                   [onClick]="onChartCountToggle" [aria-label]="text.secondChart.aria">
                            <app-icon size="lg" [fixedWidth]="true" [name]="chartCount === 2 ? 'window-maximize' : 'window-restore'" />
                          </app-button-with-tooltip>
                        </div>
                      }
                      <div class="demo-btn-group">
                        <app-button-with-tooltip id="edit-mode" [label]="selectionMode() === 'group' ? text.editMode.labelToSeries : text.editMode.labelToGroups"
                                                 [tooltipText]="selectionMode() === 'group'
                                                   ? text.editMode.tooltipToSeries
                                                   : text.editMode.tooltipToGroups" tooltipPlacement="right"
                                                 [onClick]="onModeToggle" [aria-label]="text.editMode.aria">
                          <app-icon size="lg" [fixedWidth]="true" [name]="selectionMode() === 'group' ? 'bullseye' : 'sliders'" />
                        </app-button-with-tooltip>
                      </div>
                      <div class="demo-btn-group">
                        <app-button-with-tooltip id="edit-reset-groups" [disabled]="error || sequencePlaying()" [label]="text.resetGroups.label" [tooltipText]="text.resetGroups.tooltip" tooltipPlacement="right"
                                                 [onClick]="resetGroups" [aria-label]="text.resetGroups.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="arrow-rotate-left" />
                        </app-button-with-tooltip>
                        <app-button-with-tooltip id="edit-reverse-groups" [disabled]="error || sequencePlaying()" [label]="text.reverseGroups.label" [tooltipText]="text.reverseGroups.tooltip" tooltipPlacement="right"
                                                 [onClick]="reverseGroups" [aria-label]="text.reverseGroups.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="right-left" />
                        </app-button-with-tooltip>
                        <app-button-with-tooltip id="edit-add-groups" [disabled]="error || sequencePlaying() || disableAdd" [label]="text.addGroups.label" [tooltipText]="text.addGroups.tooltip" tooltipPlacement="right"
                                                 [onClick]="addGroups" [aria-label]="text.addGroups.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="plus" />
                        </app-button-with-tooltip>
                        <app-button-with-tooltip id="edit-remove-groups" [disabled]="error || sequencePlaying() || disableRemove" [label]="text.removeGroups.label" [tooltipText]="text.removeGroups.tooltip" tooltipPlacement="right"
                                                 [onClick]="removeGroups" [aria-label]="text.removeGroups.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="minus" />
                        </app-button-with-tooltip>
                        <app-button-with-tooltip id="edit-play-add" [disabled]="error || sequencePlaying() || disableAdd" [tooltipText]="text.playAddGroups.tooltip" tooltipPlacement="right"
                                                 [onClick]="startAddSequence" [aria-label]="text.playAddGroups.aria">
                          <app-icon size="lg" name="play" /><span style="padding-right: 2px;"></span><app-icon size="lg" name="plus" />
                        </app-button-with-tooltip>
                        <app-button-with-tooltip id="edit-play-remove" [disabled]="error || sequencePlaying() || disableRemove" [tooltipText]="text.playRemoveGroups.tooltip" tooltipPlacement="right"
                                                 [onClick]="startRemoveSequence" [aria-label]="text.playRemoveGroups.aria">
                          <app-icon size="lg" name="play" /><span style="padding-right: 2px;"></span><app-icon size="lg" name="minus" />
                        </app-button-with-tooltip>
                        <app-button-with-tooltip id="edit-stop" [disabled]="error || !sequencePlaying()" [tooltipText]="text.stopSequence.tooltip" tooltipPlacement="right"
                                                 [onClick]="stopSequence" [aria-label]="text.stopSequence.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="stop" />
                        </app-button-with-tooltip>
                        <app-button-with-tooltip id="edit-select-all" [disabled]="error || sequencePlaying()" [label]="text.selectAllGroups.label" [tooltipText]="text.selectAllGroups.tooltip" tooltipPlacement="right"
                                                 [onClick]="selectAllGroups" [aria-label]="text.selectAllGroups.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="check-double" />
                        </app-button-with-tooltip>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              <span class="chart-controls-input">
                <form class="demo-form-row">
                  <input type="text" class="demo-input" [disabled]="error || sequencePlaying()"
                         [value]="groupValuesText()" (input)="onGroupValuesInput($event)" />
                </form>
              </span>
              <span class="chart-controls-menu">
                <app-export-share-menu idPrefix="edit" [disabled]="error"
                                       [exportPng]="onExportPng" [exportSvg]="onExportSvg"
                                       [getShareState]="showShareButton ? getShareState : undefined" />
              </span>
            </div>
          } @else {
            <div class="chart-controls-container">
              <div class="chart-controls-buttons">
                <form class="demo-form-row">
                  <div class="demo-field">
                    <div class="demo-toolbar" role="toolbar">
                      @if (showChartCountControls) {
                        <div class="demo-btn-group">
                          <app-button-with-tooltip id="edit-chart-count" [label]="text.secondChart.label" [pressed]="chartCount === 2"
                                                   [tooltipText]="chartCount === 2 ? text.secondChart.tooltipHide : text.secondChart.tooltipShow" tooltipPlacement="right"
                                                   [onClick]="onChartCountToggle" [aria-label]="text.secondChart.aria">
                            <app-icon size="lg" [fixedWidth]="true" [name]="chartCount === 2 ? 'window-maximize' : 'window-restore'" />
                          </app-button-with-tooltip>
                        </div>
                      }
                      <div class="demo-btn-group">
                        <app-button-with-tooltip id="edit-mode" [label]="selectionMode() === 'group' ? text.editMode.labelToSeries : text.editMode.labelToGroups"
                                                 [tooltipText]="selectionMode() === 'group'
                                                   ? text.editMode.tooltipToSeries
                                                   : text.editMode.tooltipToGroups" tooltipPlacement="right"
                                                 [onClick]="onModeToggle" [aria-label]="text.editMode.aria">
                          <app-icon size="lg" [fixedWidth]="true" [name]="selectionMode() === 'group' ? 'bullseye' : 'sliders'" />
                        </app-button-with-tooltip>
                      </div>
                    </div>
                  </div>
                  <div class="demo-field">
                    <div class="demo-toolbar" role="toolbar">
                      <div class="demo-btn-group">
                        <app-button-with-tooltip id="edit-group-decrease" [disabled]="error || groupOrderControlsDisabled || isFirstGroup" [tooltipText]="text.decreaseGroupOrder.tooltip" tooltipPlacement="right"
                                                 [onClick]="decreaseGroupOrder" [aria-label]="text.decreaseGroupOrder.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="arrow-left" />
                        </app-button-with-tooltip>
                      </div>
                    </div>
                  </div>
                  <div class="demo-field">
                    <span class="demo-label" style="margin-left: 5px; margin-right: 5px;">{{ text.groupIndexPrefix + groupIndex() }}</span>
                  </div>
                  <div class="demo-field">
                    <div class="demo-toolbar" role="toolbar">
                      <div class="demo-btn-group">
                        <app-button-with-tooltip id="edit-group-increase" [disabled]="error || groupOrderControlsDisabled || isLastGroup" [tooltipText]="text.increaseGroupOrder.tooltip" tooltipPlacement="right"
                                                 [onClick]="increaseGroupOrder" [aria-label]="text.increaseGroupOrder.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="arrow-right" />
                        </app-button-with-tooltip>
                      </div>
                    </div>
                  </div>
                  <div class="demo-field">
                    <div class="demo-toolbar" role="toolbar">
                      <div class="demo-btn-group">
                        <app-button-with-tooltip id="edit-previous-series" [disabled]="error || seriesControlsDisabled || !hasPrevSeries" [tooltipText]="text.previousSeries.tooltip" tooltipPlacement="right"
                                                 [onClick]="prevSeries" [aria-label]="text.previousSeries.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="chevron-down" />
                        </app-button-with-tooltip>
                      </div>
                    </div>
                  </div>
                  <div class="demo-field">
                    <span class="demo-label" style="margin-left: 5px; margin-right: 5px;">{{ text.seriesIndexPrefix + seriesIndex() }}</span>
                  </div>
                  <div class="demo-field">
                    <div class="demo-toolbar" role="toolbar">
                      <div class="demo-btn-group">
                        <app-button-with-tooltip id="edit-next-series" [disabled]="error || seriesControlsDisabled || !hasNextSeries" [tooltipText]="text.nextSeries.tooltip" tooltipPlacement="right"
                                                 [onClick]="nextSeries" [aria-label]="text.nextSeries.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="chevron-up" />
                        </app-button-with-tooltip>
                      </div>
                      <div class="demo-btn-group">
                        <app-button-with-tooltip id="edit-reset-series" [disabled]="error || seriesControlsDisabled" [tooltipText]="text.resetSeries.tooltip" tooltipPlacement="right"
                                                 [onClick]="resetSeriesChanges" [aria-label]="text.resetSeries.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="arrow-rotate-left" />
                        </app-button-with-tooltip>
                        <app-button-with-tooltip id="edit-apply-series" [disabled]="error || seriesControlsDisabled" [tooltipText]="text.applySeries.tooltip" tooltipPlacement="right"
                                                 [onClick]="applySeriesChanges" [aria-label]="text.applySeries.aria">
                          <app-icon size="lg" [fixedWidth]="true" name="check" />
                        </app-button-with-tooltip>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              <span class="chart-controls-input">
                <form class="demo-form-row">
                  <input type="text" class="demo-input" [disabled]="error || seriesControlsDisabled"
                         [value]="seriesValuesText()" (input)="onSeriesValuesInput($event)" />
                </form>
              </span>
              <span class="chart-controls-menu">
                <app-export-share-menu idPrefix="edit" [disabled]="error"
                                       [exportPng]="onExportPng" [exportSvg]="onExportSvg"
                                       [getShareState]="showShareButton ? getShareState : undefined" />
              </span>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class EditableChart implements OnInit, OnChanges, OnDestroy {
  readonly text = demoText.editableChart;

  @Input({ required: true }) width!: number;
  @Input({ required: true }) mochartDemoConfig!: MochartDemoConfig;
  @Input({ required: true }) data!: Row[];

  getShareState = (): { mode: 'single'; config: Record<string, unknown>; data: Row[] } => ({ mode: 'single', config: this.mochartDemoConfig.config, data: this.data });
  @Input() dataError: string | boolean | null = false;
  @Input({ required: true }) isActive!: boolean;
  @Input({ required: true }) chartCount!: number;
  @Input({ required: true }) showChartCountControls!: boolean;
  /** Set on the chart instance that should render the share button. */
  @Input() showShareButton = false;
  @Input({ required: true }) filteredSeriesIds!: FilteredSeriesIds;
  @Input({ required: true }) focusedGroupIndex!: number;
  @Input() focusedSeriesAxisId: string | null = null;
  @Input() focusedSeriesId: string | null = null;
  @Input({ required: true }) onFocus!: (focusData: FocusData) => void;
  @Input({ required: true }) onSeriesFilter!: (filterData: { filteredSeriesIds: FilteredSeriesIds }) => void;
  @Input({ required: true }) onChartCountToggle!: () => void;

  @ViewChild('chartContent', { static: true }) chartContentElement!: ElementRef<HTMLDivElement>;

  // Working copies of the demo data; mutated in place by the group/series
  // editing controls (same pattern as the react demo's instance fields).
  private filteredData: Row[] = [];
  private removedData: Row[] = [];
  private sequenceId: ReturnType<typeof setInterval> | null = null;

  dataProvider = signal<EditableDataProvider | null>(null);
  groupIndex = signal(-1);
  groupValuesText = signal('');
  seriesIndex = signal(0);
  seriesValuesText = signal('');
  selectionMode = signal('group');
  sequencePlaying = signal(false);
  // pie-mode slice editing: slices are the series, so the group machinery has
  // nothing to operate on and a single slice panel replaces both panels
  slices = signal<PieSliceInfo[]>([]);
  sliceIndex = signal(0);
  sliceValueText = signal('');
  filteredFocusedGroupIndex = signal(-1);
  orderChanged = signal(false);

  getChartContent = (): Element | null => this.chartContentElement?.nativeElement ?? null;

  onExportPng = (): void => {
    const container = this.getChartContent();
    if (container) {
      void exportPNG(container, getChartExportOptions());
    }
  };

  onExportSvg = (): void => {
    const container = this.getChartContent();
    if (container) {
      exportSVG(container, getChartExportOptions());
    }
  };

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
      this.groupIndex.set(-1);
      this.seriesValuesText.set(selectAGroupText);
    }
    this.filteredFocusedGroupIndex.set(this.dataError ? -1 : this.getFilteredFocusedGroupIndex(nextFilteredData));
    if (!this.dataError && this.mochartDemoConfig.mochartConfig.validation.valid) {
      this.dataProvider.set(new ArrayOfObjectsDataProvider(nextFilteredData, this.mochartDemoConfig.mochartConfig.groupAxisConfig.property ?? ''));
    }
    else if (this.dataError) {
      this.dataProvider.set({ getError: () => this.dataError });
    }
    else {
      this.dataProvider.set(null);
    }
    if (nextState.orderChanged !== undefined) {
      this.orderChanged.set(nextState.orderChanged);
    }
    if (nextState.groupIndex !== undefined) {
      this.groupIndex.set(nextState.groupIndex);
    }
    if (nextState.seriesIndex !== undefined) {
      this.seriesIndex.set(nextState.seriesIndex);
    }
    if (nextState.groupValuesText !== undefined) {
      this.groupValuesText.set(nextState.groupValuesText);
    }
    if (nextState.seriesValuesText !== undefined) {
      this.seriesValuesText.set(nextState.seriesValuesText);
    }
  }

  private initData(): void {
    const nextFilteredData: Row[] = [];
    if (this.data && !this.dataError) {
      let i, count = this.data.length;
      for (i = 0; i < count; i++) {
        nextFilteredData.push(Object.assign({}, this.data[i]));
      }
    }
    this.slices.set(this.mochartDemoConfig.pieMode ? getPieSlices(this.mochartDemoConfig.mochartConfig) : []);
    if (this.sliceIndex() >= this.slices().length) {
      this.sliceIndex.set(0);
    }
    this.sliceValueText.set(this.getSliceValueText(nextFilteredData));
    this.updateFilteredDataState({ orderChanged: false, seriesIndex: 0, groupValuesText: emptyGroupText }, nextFilteredData, []);
  }

  ngOnInit(): void {
    this.initData();
  }

  // Mirror the vue watch on [data, dataError, mochartDemoConfig,
  // focusedGroupIndex, isActive].
  ngOnChanges(changes: SimpleChanges): void {
    if (Object.values(changes).some(change => change.firstChange)) {
      return;
    }
    const configChange = changes['mochartDemoConfig'];
    if (changes['data'] || changes['dataError'] ||
        (configChange &&
         hasConfigStructureChange((configChange.previousValue as MochartDemoConfig).mochartConfig, this.mochartDemoConfig.mochartConfig))) {
      this.initData();
    }
    else if (changes['focusedGroupIndex']) {
      this.filteredFocusedGroupIndex.set(this.getFilteredFocusedGroupIndex(this.filteredData));
    }
    if (changes['isActive'] && this.isActive === false) {
      this.stopSequence();
    }
  }

  // mochart's ManagedChart reports focus with the new payload shape; adapt it
  // to the { seriesAxisId, seriesId, groupIndex } shape this demo tracks.
  onChartFocus({ focusedSeriesAxisId: seriesAxisId, focusedSeriesId: seriesId, focusedGroupIndex: chartGroupIndex }: { focusedSeriesAxisId?: string | null; focusedSeriesId?: string | null; focusedGroupIndex?: number }): void {
    this.onLocalFocus({ seriesAxisId, seriesId, groupIndex: chartGroupIndex });
  }

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
      this.filteredFocusedGroupIndex.set(nextFilteredFocusedGroupIndex);
      this.onFocus({ seriesAxisId, seriesId, groupIndex: newFocusedGroupIndex });
    }
    else {
      this.onFocus({ seriesAxisId, seriesId, groupIndex: nextGroupIndex });
    }
  }

  onChartClick({ groupIndex: clickedGroupIndex }: { groupIndex: number }): void {
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const clickedGroupValue = '' + this.filteredData[clickedGroupIndex][groupProperty];
    if (this.selectionMode() === 'series') {
      this.groupIndex.set(clickedGroupIndex);
      this.seriesValuesText.set(this.getSeriesValuesText(this.mochartDemoConfig, this.filteredData, clickedGroupIndex, this.seriesIndex()));
    }
    else if (this.selectionMode() === 'group') {
      const dataGroupValues: any[] = [];
      let i, count = this.filteredData.length;
      for (i = 0; i < count; i++) {
        dataGroupValues.push(this.filteredData[i][groupProperty]);
      }
      let parsedGroupValues = this.groupValuesText() === emptyGroupText ? [] : this.groupValuesText().split(',');
      parsedGroupValues = parsedGroupValues.filter((parsedGroupValue) => dataGroupValues.indexOf(parsedGroupValue) !== -1 || dataGroupValues.indexOf(+parsedGroupValue) !== -1);
      const clickedIndex = parsedGroupValues.indexOf(clickedGroupValue);
      if (clickedIndex === -1) {
        parsedGroupValues = parsedGroupValues.concat(clickedGroupValue);
      }
      else {
        parsedGroupValues.splice(clickedIndex, 1);
      }
      this.groupValuesText.set(parsedGroupValues.length === 0 ? emptyGroupText : parsedGroupValues.join(','));
    }
  }

  onGroupValuesInput(event: Event): void {
    this.groupValuesText.set((event.currentTarget as HTMLInputElement).value);
  }

  onSeriesValuesInput(event: Event): void {
    this.seriesValuesText.set((event.currentTarget as HTMLInputElement).value);
  }

  onSliceValueInput(event: Event): void {
    this.sliceValueText.set((event.currentTarget as HTMLInputElement).value);
  }

  onModeToggle = (): void => {
    this.selectionMode.set(this.selectionMode() === 'group' ? 'series' : 'group');
  };

  selectAllGroups = (): void => {
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const allGroupValues: any[] = [];
    let i, count = this.data.length;
    for (i = 0; i < count; i++) {
      allGroupValues.push(this.data[i][groupProperty]);
    }
    this.groupValuesText.set(allGroupValues.join(','));
  };

  resetGroups = (): void => {
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

  reverseGroups = (): void => {
    if (this.filteredData && this.filteredData.length > 1) {
      const nextFilteredData = this.filteredData.slice().reverse();
      this.updateFilteredDataState({ orderChanged: true }, nextFilteredData, this.removedData);
    }
  };

  decreaseGroupOrder = (): void => {
    if (this.filteredData && this.filteredData.length > 1) {
      if (this.groupIndex() > 0) {
        const nextFilteredData = this.filteredData.slice();
        const temp = nextFilteredData[this.groupIndex() - 1];
        nextFilteredData[this.groupIndex() - 1] = nextFilteredData[this.groupIndex()];
        nextFilteredData[this.groupIndex()] = temp;
        this.updateFilteredDataState({ orderChanged: true, groupIndex: this.groupIndex() - 1 }, nextFilteredData, this.removedData, false);
      }
    }
  };

  increaseGroupOrder = (): void => {
    if (this.filteredData && this.filteredData.length > 1) {
      if (this.groupIndex() < this.filteredData.length - 1) {
        const nextFilteredData = this.filteredData.slice();
        const temp = nextFilteredData[this.groupIndex() + 1];
        nextFilteredData[this.groupIndex() + 1] = nextFilteredData[this.groupIndex()];
        nextFilteredData[this.groupIndex()] = temp;
        this.updateFilteredDataState({ orderChanged: true, groupIndex: this.groupIndex() + 1 }, nextFilteredData, this.removedData, false);
      }
    }
  };

  addGroups = (): void => {
    const oldFilteredData = this.filteredData;
    const oldRemovedData = this.removedData;
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const groupValuesToAdd = this.groupValuesText() === emptyGroupText ? [] : this.groupValuesText().split(',');
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

  removeGroups = (): void => {
    const oldFilteredData = this.filteredData;
    const nextRemovedData = this.removedData;
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const groupValuesToRemove = this.groupValuesText() === emptyGroupText ? [] : this.groupValuesText().split(',');
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

  startAddSequence = (): void => {
    const oldFilteredData = this.filteredData;
    const oldRemovedData = this.removedData;
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const groupValuesToAdd = this.groupValuesText() === emptyGroupText ? [] : this.groupValuesText().split(',');
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
      this.sequencePlaying.set(true);
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

  startRemoveSequence = (): void => {
    const oldFilteredData = this.filteredData;
    const oldRemovedData = this.removedData;
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const groupValuesToRemove = this.groupValuesText() === emptyGroupText ? [] : this.groupValuesText().split(',');
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
      this.sequencePlaying.set(true);
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

  stopSequence = (): void => {
    this.stopSequenceInternal();
    this.sequencePlaying.set(false);
  };

  private stopSequenceInternal(): void {
    if (this.sequenceId !== null) {
      clearInterval(this.sequenceId);
      this.sequenceId = null;
    }
  }

  private getSliceValueText(rows: Row[]): string {
    const slices = this.slices();
    if (slices.length === 0 || rows.length === 0) {
      return '';
    }
    const value = rows[0][slices[this.sliceIndex()].property];
    return value === undefined || value === null ? '' : String(value);
  }

  private selectSlice(nextSliceIndex: number): void {
    if (nextSliceIndex >= 0 && nextSliceIndex < this.slices().length) {
      this.sliceIndex.set(nextSliceIndex);
      this.sliceValueText.set(this.getSliceValueText(this.filteredData));
    }
  }

  prevSlice = (): void => {
    this.selectSlice(this.sliceIndex() - 1);
  };

  nextSlice = (): void => {
    this.selectSlice(this.sliceIndex() + 1);
  };

  onChartSliceClick = ({ seriesId }: { seriesId: string }): void => {
    this.selectSlice(this.slices().findIndex(slice => slice.id === seriesId));
  };

  applySliceChanges = (): void => {
    const value = parseFloat(this.sliceValueText());
    if (!isNaN(value) && isFinite(value) && this.filteredData.length > 0 && this.slices().length > 0) {
      applyPieSliceValue(this.filteredData[0], this.slices(), this.slices()[this.sliceIndex()].property, value);
      this.updateFilteredDataState({}, this.filteredData, this.removedData, false);
    }
  };

  resetSliceChanges = (): void => {
    if (this.filteredData.length > 0 && this.data.length > 0 && this.slices().length > 0) {
      const property = this.slices()[this.sliceIndex()].property;
      applyPieSliceValue(this.filteredData[0], this.slices(), property, this.data[0][property] as number);
      this.sliceValueText.set(this.getSliceValueText(this.filteredData));
      this.updateFilteredDataState({}, this.filteredData, this.removedData, false);
    }
  };

  // The pie analog of the group add/remove sequences: suppress the slices one
  // at a time (via the shared legend filter, so the remaining slices re-sweep
  // and center totals count along), then restore them.
  startSliceSequence = (): void => {
    const steps = getPieSequenceSteps(this.slices().map(slice => slice.id));
    if (steps.length > 0) {
      this.sequencePlaying.set(true);
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

  prevSeries = (): void => {
    if (this.groupIndex() !== -1 && this.seriesIndex() > 0) {
      this.seriesIndex.update(seriesIndex => seriesIndex - 1);
      this.seriesValuesText.set(this.getSeriesValuesText(this.mochartDemoConfig, this.filteredData, this.groupIndex(), this.seriesIndex()));
    }
  };

  nextSeries = (): void => {
    const { seriesCount } = this.mochartDemoConfig;
    if (this.groupIndex() !== -1 && this.seriesIndex() < seriesCount - 1) {
      this.seriesIndex.update(seriesIndex => seriesIndex + 1);
      this.seriesValuesText.set(this.getSeriesValuesText(this.mochartDemoConfig, this.filteredData, this.groupIndex(), this.seriesIndex()));
    }
  };

  private getSeriesValuesText({ mochartConfig }: MochartDemoConfig, currentFilteredData: Row[], currentGroupIndex: number, currentSeriesIndex: number): string {
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

  applySeriesChanges = (): void => {
    const filteredDataObject = this.filteredData[this.groupIndex()];
    const { mochartConfig } = this.mochartDemoConfig;
    const { seriesConfigs } = mochartConfig;
    if (seriesConfigs.length > 0) {
      try {
        const dataObject = JSON.parse(this.seriesValuesText());
        const seriesConfig = seriesConfigs[this.seriesIndex()];
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

  resetSeriesChanges = (): void => {
    const { mochartConfig } = this.mochartDemoConfig;
    const groupProperty = this.mochartDemoConfig.groupProperty ?? '';
    const { seriesConfigs } = mochartConfig;
    if (seriesConfigs.length > 0) {
      const filteredDataObject = this.filteredData[this.groupIndex()];
      const filteredGroupValue = filteredDataObject[groupProperty];
      let i, count = this.data.length, dataObject: Row | null = null;
      for (i = 0; i < count; i++) {
        if (this.data[i][groupProperty] === filteredGroupValue) {
          dataObject = this.data[i];
        }
      }
      const seriesConfig = seriesConfigs[this.seriesIndex()];
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
      this.updateFilteredDataState({ seriesValuesText: this.getSeriesValuesText(this.mochartDemoConfig, this.filteredData, this.groupIndex(), this.seriesIndex()) }, this.filteredData, this.removedData, false);
    }
  };

  ngOnDestroy(): void {
    this.stopSequenceInternal();
  }

  get chartDataError(): boolean {
    const dataProvider = this.dataProvider();
    return !!(dataProvider && dataProvider.getError && dataProvider.getError());
  }

  get configError(): boolean {
    return !this.mochartDemoConfig.valid;
  }

  get error(): boolean {
    return this.chartDataError || this.configError;
  }

  get filteredGroupValues(): any[] {
    const dataProvider = this.dataProvider();
    return this.error || !dataProvider?.getGroupValues ? [] : dataProvider.getGroupValues();
  }

  get selectedGroupValues(): string[] {
    return (this.error || this.groupValuesText() === emptyGroupText) ? [] : this.groupValuesText().split(',');
  }

  get filteredGroupMap(): Record<string, boolean> {
    return this.filteredGroupValues.reduce<Record<string, boolean>>((map, group) => { map[group] = true; return map; }, {});
  }

  get disableRemove(): boolean {
    return this.orderChanged() || !this.selectedGroupValues.some(group => this.filteredGroupMap[group]);
  }

  get disableAdd(): boolean {
    return this.orderChanged() || !this.selectedGroupValues.some(group => !this.filteredGroupMap[group]);
  }

  get seriesControlsDisabled(): boolean {
    return this.sequencePlaying() || this.groupIndex() === -1;
  }

  get groupOrderControlsDisabled(): boolean {
    return this.sequencePlaying() || this.groupIndex() === -1;
  }

  get isFirstGroup(): boolean {
    return this.groupIndex() === 0;
  }

  get isLastGroup(): boolean {
    return this.groupIndex() === this.filteredGroupValues.length - 1;
  }

  get hasPrevSeries(): boolean {
    return this.seriesIndex() > 0;
  }

  get hasNextSeries(): boolean {
    return this.seriesIndex() < this.mochartDemoConfig.seriesCount - 1;
  }

  get sliceControlsDisabled(): boolean {
    return this.error || this.sequencePlaying() || this.slices().length === 0;
  }

  get sliceLabelText(): string {
    const slices = this.slices();
    return slices.length > 0 ? this.text.slicePrefix + slices[this.sliceIndex()].title : this.text.selectASliceText;
  }
}
