import { hasConfigStructureChange } from '../config/core/mochartConfig';
import { isDataProviderValid, getChartData } from '../data/ChartData';
import { getFocusData, getFocusDataWithDomainPercentages, getFocusDataWithMutations, getFocusDataWithGroupChanges } from '../data/FocusData';
import { getChartAnimationData } from '../animation/ChartAnimationData';
import {
  mergedIndexForNewIndex, oldIndexForNewIndex, newIndexForMergedIndex, newIndexForOldIndex,
  hasGroupAdditions, hasGroupRemovals, hasGroupReorder } from '../animation/GroupAnimationData';
import { getFocusAnimationData } from '../animation/FocusAnimationData';
import { getChartTweenManager, dataTweenValueStart, dataTweenValueUpdate, dataTweenValueComplete } from '../animation/ChartTweens';
import type { ChartTweenManager, DataTweenEvent } from '../animation/ChartTweens';
import type { ChartData } from '../types/data';
import type { ChartAnimationData, FocusData } from '../types/animation';
import type { ChartDataSource, ChartDataSourceInput, InternalFocus } from './ChartDataSource';

/**
 * The animation pipeline (was AnimatedChart): owns the tween manager, drives
 * chartData/focusData through data and focus tweens, and calls `emit` on
 * every tween frame so the owner can push the new output into the Chart
 * renderer.
 */
export class AnimatedDataSource implements ChartDataSource {
  readonly animated = true;
  /** Rendered output — null until the data tween's first frame. */
  chartData: ChartData | null = null;
  focusData: FocusData | null = null;
  /** 0..1 while the initial animation's value tween runs, else null. */
  initialAnimationPercentage: number | null = null;

  private input!: ChartDataSourceInput;
  private chartAnimationData: ChartAnimationData | null = null;
  private hasGroupAdditions = false;
  private hasGroupRemovals = false;
  private hasGroupReorder = false;
  private dataTweening = false;
  private valuesTweening = false;
  private valuesTweened = false;
  private focusTweening = false;
  private tweenManager: ChartTweenManager;
  private emit: () => void;

  constructor(emit: () => void) {
    this.tweenManager = getChartTweenManager();
    this.emit = emit;
  }

  start(input: ChartDataSourceInput): void {
    this.input = input;
    const { mochartConfig, dataProvider, filteredSeriesIds, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId } = input;
    this.chartAnimationData = null;
    this.hasGroupAdditions = false;
    this.hasGroupRemovals = false;
    this.hasGroupReorder = false;
    this.dataTweening = false;
    this.valuesTweening = false;
    this.valuesTweened = false;
    this.focusTweening = false;
    this.initialAnimationPercentage = null;
    this.tweenManager.cancelTweens();
    if (mochartConfig && mochartConfig.validation.valid && isDataProviderValid(dataProvider)) {
      let newChartData = getChartData(mochartConfig, dataProvider, filteredSeriesIds);
      this.chartAnimationData = getChartAnimationData(mochartConfig, null, newChartData);

      this.startDataTween(input, this.chartAnimationData);

      // keep the chart data null until the animation starts...
      this.chartData = null;
      // don't bother animating focus when initializing the data...
      this.focusData = getFocusData(mochartConfig, newChartData, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId);
    }
    else {
      this.chartData = null;
      this.focusData = null;
    }
  }

  dispose(): void {
    this.tweenManager.cancelTweens();
  }

  update(prevInput: ChartDataSourceInput, input: ChartDataSourceInput): void {
    this.input = input;
    const { mochartConfig, dataProvider, filteredSeriesIds, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId } = input;

    const configChanged = mochartConfig !== prevInput.mochartConfig;
    const dataProviderChanged = dataProvider !== prevInput.dataProvider;
    const dataProviderValid = isDataProviderValid(dataProvider);
    const dataProviderValidityChanged = dataProviderChanged && dataProviderValid !== isDataProviderValid(prevInput.dataProvider);
    const filteredSeriesChanged = filteredSeriesIds !== prevInput.filteredSeriesIds;
    const dataChanged = dataProviderChanged || filteredSeriesChanged;
    const focusGroupChanged = focusedGroupIndex !== prevInput.focusedGroupIndex;
    const focusSeriesAxisChanged = focusedSeriesAxisId !== prevInput.focusedSeriesAxisId;
    const focusSeriesChanged = focusedSeriesId !== prevInput.focusedSeriesId;
    const focusChanged = focusGroupChanged || focusSeriesAxisChanged || focusSeriesChanged;
    const configValid = mochartConfig && mochartConfig.validation.valid;
    const mochartConfigStructureChanged = configChanged && hasConfigStructureChange(prevInput.mochartConfig, mochartConfig);
    if (dataProviderValidityChanged || mochartConfigStructureChanged) {
      this.start(input);
    }
    else if (dataProviderValid && configValid && (configChanged || dataChanged || focusChanged)) {
      let groupsChanged = false;
      if (configChanged || dataChanged) {
        let chartData = getChartData(mochartConfig, dataProvider, filteredSeriesIds);
        let chartAnimationData = this.chartAnimationData = getChartAnimationData(mochartConfig, this.chartData, chartData);

        this.startDataTween(input, chartAnimationData);
        groupsChanged = this.hasGroupAdditions || this.hasGroupRemovals || this.hasGroupReorder;
      }

      if (this.chartData !== null && (focusChanged || groupsChanged)) {
        if (focusGroupChanged || groupsChanged) {
          if (focusedGroupIndex >= 0 && this.dataTweening && !this.valuesTweened) {
            if (this.valuesTweening) {
              this.startFocusTween(input, mergedIndexForNewIndex(this.chartAnimationData!.groupDeltaData, focusedGroupIndex));
            }
            else {
              this.startFocusTween(input, oldIndexForNewIndex(this.chartAnimationData!.groupDeltaData, focusedGroupIndex));
            }
          }
          else {
            this.startFocusTween(input);
          }
        }
        else {
          this.startFocusTween(input, this.focusData!.focusedGroupIndex);
        }
      }
    }
  }

  private startDataTween(input: ChartDataSourceInput, chartAnimationData: ChartAnimationData): void {
    const { mochartConfig } = input;

    this.hasGroupAdditions = hasGroupAdditions(chartAnimationData.groupDeltaData);
    this.hasGroupRemovals = hasGroupRemovals(chartAnimationData.groupDeltaData);
    this.hasGroupReorder = hasGroupReorder(chartAnimationData.groupDeltaData);

    this.dataTweening = true;
    this.valuesTweening = false;
    this.valuesTweened = false;
    this.tweenManager.tweenData(mochartConfig, chartAnimationData, this.updateChartData, {
      startCallback: () => {
        this.dataTweening = true;
      },
      startValueChangeCallback: () => {
        this.valuesTweening = true;

      },
      completeValueChangeCallback: () => {
        this.valuesTweening = false;
        this.valuesTweened = true;
      },
      completeCallback: () => {
        this.dataTweening = false;
        this.valuesTweening = false;
        this.valuesTweened = false;
      }
    });
  }

  private startFocusTween(input: ChartDataSourceInput, overrideFocusedGroupIndex?: number): void {
    const { mochartConfig, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId } = input;
    let newFocusedGroupIndex = overrideFocusedGroupIndex !== undefined ? overrideFocusedGroupIndex : focusedGroupIndex;
    let focusData = getFocusDataWithMutations(this.focusData!, getFocusData(mochartConfig, this.chartData!, newFocusedGroupIndex, focusedSeriesAxisId, focusedSeriesId));
    let focusAnimationData = getFocusAnimationData(mochartConfig, this.focusData!, focusData);
    this.focusTweening = true;
    this.tweenManager.tweenFocus(mochartConfig, focusAnimationData, this.updateFocusData, {
      startCallback: () => {
        this.focusTweening = true;
      },
      completeCallback: () => {
        this.focusTweening = false;
      }
    });
  }

  private updateChartData = (chartData: ChartData, updateType: DataTweenEvent, percentage?: number): void => {
    const { mochartConfig, focusedGroupIndex } = this.input;
    this.chartData = chartData;
    // Expose the initial value tween's progress (chart types with entrance
    // effects — the pie sweep-in — consume it); cleared once values settle.
    if (this.chartAnimationData !== null && this.chartAnimationData.initialAnimation) {
      if (updateType === dataTweenValueStart) {
        this.initialAnimationPercentage = 0;
      }
      else if (updateType === dataTweenValueUpdate && percentage !== undefined) {
        this.initialAnimationPercentage = percentage;
      }
      else if (updateType === dataTweenValueComplete) {
        this.initialAnimationPercentage = null;
      }
    }
    else {
      this.initialAnimationPercentage = null;
    }
    if ((this.hasGroupAdditions || this.hasGroupReorder) && updateType === dataTweenValueStart) {
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithGroupChanges(
        this.focusData!, mochartConfig, chartData, this.chartAnimationData!.groupDeltaData, true, this.focusTweening));
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithDomainPercentages(this.focusData!, mochartConfig, chartData));
      if (this.focusTweening || focusedGroupIndex >= 0) {
        let newFocusedGroupIndex = focusedGroupIndex >= 0 ? mergedIndexForNewIndex(this.chartAnimationData!.groupDeltaData, focusedGroupIndex) : -1;
        this.startFocusTween(this.input, newFocusedGroupIndex);
      }
    }
    else if (this.hasGroupRemovals && updateType === dataTweenValueComplete) {
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithGroupChanges(
        this.focusData!, mochartConfig, chartData, this.chartAnimationData!.groupDeltaData, false, this.focusTweening));
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithDomainPercentages(this.focusData!, mochartConfig, chartData));
      if (this.focusTweening || focusedGroupIndex >= 0 && this.focusData!.focusedGroupIndex !== focusedGroupIndex) {
        this.startFocusTween(this.input);
      }
    }
    else {
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithDomainPercentages(this.focusData!, mochartConfig, chartData));
    }
    this.emit();
  }

  private updateFocusData = (focusData: FocusData): void => {
    const { mochartConfig } = this.input;
    this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithDomainPercentages(focusData, mochartConfig, this.chartData!));
    this.emit();
  }

  remapFocus({ seriesAxisId, seriesId, groupIndex }: InternalFocus): InternalFocus {
    if (groupIndex !== undefined) {
      groupIndex = groupIndex ?? -1;
      if (groupIndex !== -1 && this.dataTweening && !this.valuesTweened) {
        if (this.valuesTweening) {
          groupIndex = newIndexForMergedIndex(this.chartAnimationData!.groupDeltaData, groupIndex);
        }
        else {
          groupIndex = newIndexForOldIndex(this.chartAnimationData!.groupDeltaData, groupIndex);
        }
      }
    }
    return { seriesAxisId, seriesId, groupIndex };
  }
}
