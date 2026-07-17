import { Renderer, Slot } from '../render';

import { hasConfigStructureChange } from '../config/core/mochartConfig';
import { isDataProviderValid, getChartData } from '../data/ChartData';
import { getFocusData, getFocusDataWithDomainPercentages, getFocusDataWithMutations, getFocusDataWithGroupChanges } from '../data/FocusData';
import { getChartAnimationData } from '../animation/ChartAnimationData';
import {
  mergedIndexForNewIndex, oldIndexForNewIndex, newIndexForMergedIndex, newIndexForOldIndex,
  hasGroupAdditions, hasGroupRemovals, hasGroupReorder } from '../animation/GroupAnimationData';
import { getFocusAnimationData } from '../animation/FocusAnimationData';
import { getChartTweenManager, dataTweenValueStart, dataTweenValueComplete } from '../animation/ChartTweens';
import type { ChartTweenManager, DataTweenEvent } from '../animation/ChartTweens';
import type { BaseChartProps, ChartEventPayload } from '../types/chart';
import type { MochartConfig } from '../types/config';
import type { ChartData, DataProvider } from '../types/data';
import type { ChartAnimationData, FocusData } from '../types/animation';
import type { Bounds } from '../types/geometry';

import Chart from './Chart';

export interface InternalFocus {
  seriesAxisId?: string | null;
  seriesId?: string | null;
  groupIndex?: number | null;
}

export interface AnimatedChartProps extends Omit<BaseChartProps, 'onFocus' | 'onSeriesFilter'> {
  mochartConfig: MochartConfig;
  dataProvider: DataProvider;
  filteredSeriesIds: Record<string, boolean>;
  focusedGroupIndex: number;
  focusedSeriesAxisId: string | null;
  focusedSeriesId: string | null;
  standalone?: boolean;
  onFocus: (focus: InternalFocus) => void;
  onSeriesFilter: (seriesId: string) => void;
}

interface AnimatedChartState {
  chartData: ChartData | null;
  focusData: FocusData | null;
}

export default class AnimatedChart extends Renderer<AnimatedChartProps, AnimatedChartState> {
  static defaultProps = {
    standalone: true,
    onSeriesLayoutInfoChange: (_bounds: Bounds) => {},
    onFocus: (_focus: InternalFocus) => {},
    onSeriesFilter: (_seriesId: string) => {},
    onChartClick: (_point: ChartEventPayload) => {},
    onChartMouseEnter: (_point: ChartEventPayload) => {},
    onChartMouseMove: (_point: ChartEventPayload) => {},
    onChartMouseLeave: (_point: ChartEventPayload) => {}
  };

  chart: Slot | null = null;
  targetChartData: ChartData | null = null;
  chartAnimationData: ChartAnimationData | null = null;
  chartData: ChartData | null = null;
  focusData: FocusData | null = null;
  hasGroupAdditions = false;
  hasGroupRemovals = false;
  hasGroupReorder = false;
  dataTweening = false;
  valuesTweening = false;
  valuesTweened = false;
  focusTweening = false;
  tweenManager: ChartTweenManager;

  constructor() {
    super();
    this.tweenManager = getChartTweenManager();
    this.state = { chartData: null, focusData: null };
  }

  willMount() {
    this.init(this.props);
  }

  init(props: AnimatedChartProps): void {
    const { mochartConfig, dataProvider, filteredSeriesIds, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId } = props;
    this.targetChartData = null;
    this.chartAnimationData = null;
    this.chartData = null;
    this.focusData = null;
    this.hasGroupAdditions = false;
    this.hasGroupRemovals = false;
    this.hasGroupReorder = false;
    this.dataTweening = false;
    this.valuesTweening = false;
    this.valuesTweened = false;
    this.focusTweening = false;
    this.tweenManager.cancelTweens();
    let { chartData, focusData } = this.state;
    if (mochartConfig && mochartConfig.validation.valid && isDataProviderValid(dataProvider)) {
      let newChartData = getChartData(mochartConfig, dataProvider, filteredSeriesIds);
      this.targetChartData = newChartData;
      this.chartAnimationData = getChartAnimationData(mochartConfig, null, newChartData);

      this.startDataTween(props, this.chartAnimationData);

      // set the chart data to null until the animation starts...
      chartData = null;
      // don't bother animating focus when initializing the data...
      focusData = this.focusData = getFocusData(mochartConfig, newChartData, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId);
      this.setState({ chartData, focusData });
    }
    else if (chartData !== null || focusData !== null) {
      this.setState({ chartData: null, focusData: null });
    }
  }

  willUnmount() {
    this.tweenManager.cancelTweens();
  }

  willReceiveProps(nextProps: AnimatedChartProps): void {
    const { mochartConfig, dataProvider, filteredSeriesIds, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId } = nextProps;

    const configChanged = mochartConfig !== this.props.mochartConfig;
    const dataProviderChanged = dataProvider !== this.props.dataProvider;
    const dataProviderValid = isDataProviderValid(dataProvider);
    const dataProviderValidityChanged = dataProviderChanged && dataProviderValid !== isDataProviderValid(this.props.dataProvider);
    const filteredSeriesChanged = filteredSeriesIds !== this.props.filteredSeriesIds;
    const dataChanged = dataProviderChanged || filteredSeriesChanged;
    const focusGroupChanged = focusedGroupIndex !== this.props.focusedGroupIndex;
    const focusSeriesAxisChanged = focusedSeriesAxisId !== this.props.focusedSeriesAxisId;
    const focusSeriesChanged = focusedSeriesId !== this.props.focusedSeriesId;
    const focusChanged = focusGroupChanged || focusSeriesAxisChanged || focusSeriesChanged;
    const configValid = mochartConfig && mochartConfig.validation.valid;
    const mochartConfigStructureChanged = configChanged && hasConfigStructureChange(this.props.mochartConfig, mochartConfig);
    if (dataProviderValidityChanged || mochartConfigStructureChanged) {
      this.init(nextProps);
    }
    else if (dataProviderValid && configValid && (configChanged || dataChanged || focusChanged)) {
      let groupsChanged = false;
      if (configChanged || dataChanged) {
        let chartData = this.targetChartData = getChartData(mochartConfig, dataProvider, filteredSeriesIds);
        let chartAnimationData = this.chartAnimationData = getChartAnimationData(mochartConfig, this.chartData, chartData);

        this.startDataTween(nextProps, chartAnimationData);
        groupsChanged = this.hasGroupAdditions || this.hasGroupRemovals || this.hasGroupReorder;
      }

      if (this.chartData !== null && (focusChanged || groupsChanged)) {
        if (focusGroupChanged || groupsChanged) {
          if (focusedGroupIndex >= 0 && this.dataTweening && !this.valuesTweened) {
            if (this.valuesTweening) {
              this.startFocusTween(nextProps, mergedIndexForNewIndex(this.chartAnimationData!.groupDeltaData, focusedGroupIndex));
            }
            else {
              this.startFocusTween(nextProps, oldIndexForNewIndex(this.chartAnimationData!.groupDeltaData, focusedGroupIndex));
            }
          }
          else {
            this.startFocusTween(nextProps);
          }
        }
        else {
          this.startFocusTween(nextProps, this.focusData!.focusedGroupIndex);
        }
      }
    }
  }

  startDataTween(props: AnimatedChartProps, chartAnimationData: ChartAnimationData): void {
    const { mochartConfig } = props;

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

  startFocusTween(props: AnimatedChartProps, overrideFocusedGroupIndex?: number): void {
    const { mochartConfig, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId } = props;
    let newFocusedGroupIndex = overrideFocusedGroupIndex !== void 0 ? overrideFocusedGroupIndex : focusedGroupIndex;
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

  updateChartData = (chartData: ChartData, updateType: DataTweenEvent): void => {
    const { mochartConfig, focusedGroupIndex } = this.props;
    this.chartData = chartData;
    if ((this.hasGroupAdditions || this.hasGroupReorder) && updateType === dataTweenValueStart) {
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithGroupChanges(
        this.focusData!, mochartConfig, chartData, this.chartAnimationData!.groupDeltaData, true, this.focusTweening));
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithDomainPercentages(this.focusData!, mochartConfig, chartData));
      if (this.focusTweening || focusedGroupIndex >= 0) {
        let newFocusedGroupIndex = focusedGroupIndex >= 0 ? mergedIndexForNewIndex(this.chartAnimationData!.groupDeltaData, focusedGroupIndex) : -1;
        this.startFocusTween(this.props, newFocusedGroupIndex);
      }
    }
    else if (this.hasGroupRemovals && updateType === dataTweenValueComplete) {
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithGroupChanges(
        this.focusData!, mochartConfig, chartData, this.chartAnimationData!.groupDeltaData, false, this.focusTweening));
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithDomainPercentages(this.focusData!, mochartConfig, chartData));
      if (this.focusTweening || focusedGroupIndex >= 0 && this.focusData!.focusedGroupIndex !== focusedGroupIndex) {
        this.startFocusTween(this.props);
      }
    }
    else {
      this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithDomainPercentages(this.focusData!, mochartConfig, chartData));
    }
    this.setState({ chartData: this.chartData, focusData: this.focusData });
  }

  updateFocusData = (focusData: FocusData): void => {
    const { mochartConfig } = this.props;
    this.focusData = getFocusDataWithMutations(this.focusData!, getFocusDataWithDomainPercentages(focusData, mochartConfig, this.chartData!));
    this.setState({ focusData: this.focusData });
  }

  onFocus = ({ seriesAxisId, seriesId, groupIndex }: InternalFocus): void => {
    const { onFocus } = this.props;
    if (groupIndex !== void 0) {
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
    onFocus({ seriesAxisId, seriesId, groupIndex });
  }

  create() {
    this.chart = this.slot();
    return null;
  }

  sync() {
    const {
      mochartConfig, dataProvider, loading, error, width, height, style, standalone, onSeriesLayoutInfoChange, onSeriesFilter,
      onChartClick, onChartMouseEnter, onChartMouseMove, onChartMouseLeave, onTitleClick,
      getLoadingComponent, getErrorComponent, getNoDataComponent, getNoSizeComponent, getNoSeriesComponent
    } = this.props;
    const { chartData, focusData } = this.state;
    this.chart!.set(Chart, { mochartConfig, dataProvider, loading, error, chartData, standalone,
      style, width, height, focusData, onFocus: this.onFocus, onSeriesFilter,
      onChartClick, onChartMouseEnter, onChartMouseMove,
      onChartMouseLeave, onTitleClick, onSeriesLayoutInfoChange,
      getLoadingComponent, getErrorComponent,
      getNoDataComponent, getNoSizeComponent, getNoSeriesComponent });
  }
}
