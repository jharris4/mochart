import { hasConfigStructureChange } from '../config/core/mochartConfig';
import { isDataProviderValid, getChartData } from '../data/ChartData';
import { getFocusData, getFocusDataWithDomainPercentages, getFocusDataWithMutations, getFocusDataWithCategoryChanges } from '../data/FocusData';
import { getChartAnimationData } from '../animation/ChartAnimationData';
import {
  mergedIndexForNewIndex, oldIndexForNewIndex, newIndexForMergedIndex, newIndexForOldIndex,
  hasCategoryAdditions, hasCategoryRemovals, hasCategoryReorder } from '../animation/CategoryAnimationData';
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
  /** The running data tween's destination data (chartData lags it by a frame). */
  private targetChartData: ChartData | null = null;
  private chartAnimationData: ChartAnimationData | null = null;
  private hasCategoryAdditions = false;
  private hasCategoryRemovals = false;
  private hasCategoryReorder = false;
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
    const { mochartConfig, dataProvider, filteredSeriesIds, focusedCategoryIndex, focusedValueAxisId, focusedSeriesId } = input;
    this.chartAnimationData = null;
    this.hasCategoryAdditions = false;
    this.hasCategoryRemovals = false;
    this.hasCategoryReorder = false;
    this.dataTweening = false;
    this.valuesTweening = false;
    this.valuesTweened = false;
    this.focusTweening = false;
    this.initialAnimationPercentage = null;
    this.tweenManager.cancelTweens();
    if (mochartConfig && mochartConfig.validation.valid && isDataProviderValid(dataProvider)) {
      const newChartData = getChartData(mochartConfig, dataProvider, filteredSeriesIds);
      this.targetChartData = newChartData;
      this.chartAnimationData = getChartAnimationData(mochartConfig, null, newChartData);

      this.startDataTween(input, this.chartAnimationData);

      // keep the chart data null until the animation starts...
      this.chartData = null;
      // don't bother animating focus when initializing the data...
      this.focusData = getFocusData(mochartConfig, newChartData, focusedCategoryIndex, focusedValueAxisId, focusedSeriesId);
    }
    else {
      this.chartData = null;
      this.focusData = null;
      this.targetChartData = null;
    }
  }

  dispose(): void {
    this.tweenManager.cancelTweens();
  }

  update(prevInput: ChartDataSourceInput, input: ChartDataSourceInput): void {
    this.input = input;
    const { mochartConfig, dataProvider, filteredSeriesIds, focusedCategoryIndex, focusedValueAxisId, focusedSeriesId } = input;

    const configChanged = mochartConfig !== prevInput.mochartConfig;
    const dataProviderChanged = dataProvider !== prevInput.dataProvider;
    const dataProviderValid = isDataProviderValid(dataProvider);
    const dataProviderValidityChanged = dataProviderChanged && dataProviderValid !== isDataProviderValid(prevInput.dataProvider);
    const filteredSeriesChanged = filteredSeriesIds !== prevInput.filteredSeriesIds;
    const dataChanged = dataProviderChanged || filteredSeriesChanged;
    const focusCategoryChanged = focusedCategoryIndex !== prevInput.focusedCategoryIndex;
    const focusValueAxisChanged = focusedValueAxisId !== prevInput.focusedValueAxisId;
    const focusSeriesChanged = focusedSeriesId !== prevInput.focusedSeriesId;
    const focusChanged = focusCategoryChanged || focusValueAxisChanged || focusSeriesChanged;
    const configValid = mochartConfig && mochartConfig.validation.valid;
    const mochartConfigStructureChanged = configChanged && hasConfigStructureChange(prevInput.mochartConfig, mochartConfig);
    if (dataProviderValidityChanged || mochartConfigStructureChanged) {
      this.start(input);
    }
    else if (dataProviderValid && configValid && (configChanged || dataChanged || focusChanged)) {
      let categoriesChanged = false;
      if (configChanged || dataChanged) {
        const chartData = getChartData(mochartConfig, dataProvider, filteredSeriesIds);
        this.targetChartData = chartData;
        const chartAnimationData = this.chartAnimationData = getChartAnimationData(mochartConfig, this.chartData, chartData);

        this.startDataTween(input, chartAnimationData);
        categoriesChanged = this.hasCategoryAdditions || this.hasCategoryRemovals || this.hasCategoryReorder;
      }

      if (this.chartData === null) {
        if (focusChanged) {
          // no frame has landed yet, so there is nothing to animate from: snap
          // focus against the tween's target data, exactly like start() does
          this.focusData = getFocusData(mochartConfig, this.targetChartData!, focusedCategoryIndex, focusedValueAxisId, focusedSeriesId);
        }
      }
      else if (focusChanged || categoriesChanged) {
        // The category target always derives from the input, mapped into the
        // tween's index space while a data tween is in flight. Series/axis-only
        // changes must not read it from this.focusData: a focus tween starts
        // after a small cancel-window delay, so focusData can still hold the
        // category from BEFORE a just-created (and now canceled) tween — e.g.
        // a tooltip row hover landing right after the click that pinned the
        // category — and the stale index would drop the pin from the target.
        if (focusedCategoryIndex >= 0 && this.dataTweening && !this.valuesTweened) {
          if (this.valuesTweening) {
            this.startFocusTween(input, mergedIndexForNewIndex(this.chartAnimationData!.categoryDeltaData, focusedCategoryIndex));
          }
          else {
            this.startFocusTween(input, oldIndexForNewIndex(this.chartAnimationData!.categoryDeltaData, focusedCategoryIndex));
          }
        }
        else {
          this.startFocusTween(input);
        }
      }
    }
  }

  private startDataTween(input: ChartDataSourceInput, chartAnimationData: ChartAnimationData): void {
    const { mochartConfig } = input;

    this.hasCategoryAdditions = hasCategoryAdditions(chartAnimationData.categoryDeltaData);
    this.hasCategoryRemovals = hasCategoryRemovals(chartAnimationData.categoryDeltaData);
    this.hasCategoryReorder = hasCategoryReorder(chartAnimationData.categoryDeltaData);

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

  private startFocusTween(input: ChartDataSourceInput, overrideFocusedCategoryIndex?: number): void {
    const { mochartConfig, focusedCategoryIndex, focusedValueAxisId, focusedSeriesId } = input;
    const newFocusedCategoryIndex = overrideFocusedCategoryIndex !== undefined ? overrideFocusedCategoryIndex : focusedCategoryIndex;
    const focusData = getFocusDataWithMutations(this.focusData!, getFocusData(mochartConfig, this.chartData!, newFocusedCategoryIndex, focusedValueAxisId, focusedSeriesId));
    const focusAnimationData = getFocusAnimationData(mochartConfig, this.focusData!, focusData);
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
    const { mochartConfig, focusedCategoryIndex } = this.input;
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
    if ((this.hasCategoryAdditions || this.hasCategoryReorder) && updateType === dataTweenValueStart) {
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithCategoryChanges(
        this.focusData!, mochartConfig, chartData, this.chartAnimationData!.categoryDeltaData, true, this.focusTweening));
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithDomainPercentages(this.focusData!, mochartConfig, chartData));
      if (this.focusTweening || focusedCategoryIndex >= 0) {
        const newFocusedCategoryIndex = focusedCategoryIndex >= 0 ? mergedIndexForNewIndex(this.chartAnimationData!.categoryDeltaData, focusedCategoryIndex) : -1;
        this.startFocusTween(this.input, newFocusedCategoryIndex);
      }
    }
    else if (this.hasCategoryRemovals && updateType === dataTweenValueComplete) {
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithCategoryChanges(
        this.focusData!, mochartConfig, chartData, this.chartAnimationData!.categoryDeltaData, false, this.focusTweening));
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithDomainPercentages(this.focusData!, mochartConfig, chartData));
      if (this.focusTweening || focusedCategoryIndex >= 0 && this.focusData!.focusedCategoryIndex !== focusedCategoryIndex) {
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

  remapFocus({ valueAxisId, seriesId, categoryIndex }: InternalFocus): InternalFocus {
    if (categoryIndex !== undefined) {
      categoryIndex = categoryIndex ?? -1;
      if (categoryIndex !== -1 && this.dataTweening && !this.valuesTweened) {
        if (this.valuesTweening) {
          categoryIndex = newIndexForMergedIndex(this.chartAnimationData!.categoryDeltaData, categoryIndex);
        }
        else {
          categoryIndex = newIndexForOldIndex(this.chartAnimationData!.categoryDeltaData, categoryIndex);
        }
      }
    }
    return { valueAxisId, seriesId, categoryIndex };
  }
}
