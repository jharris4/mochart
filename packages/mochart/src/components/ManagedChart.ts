import { Renderer, Slot } from '../render';

import { hasConfigStructureChange } from '../config/core/mochartConfig';
import StaticChart from './StaticChart';
import AnimatedChart from './AnimatedChart';
import type { ChartEventPayload, ChartFocus, ChartSeriesFilter, ManagedChartProps } from '../types/chart';
import type { Bounds } from '../types/geometry';

interface ManagedChartState {
  focusedGroupIndex: number;
  focusedSeriesAxisId: string | null;
  focusedSeriesId: string | null;
  filteredSeriesIds: Record<string, boolean>;
}

interface InternalFocus {
  seriesAxisId?: string | null;
  seriesId?: string | null;
  groupIndex?: number | null;
}

export default class ManagedChart extends Renderer<ManagedChartProps, ManagedChartState> {
  static defaultProps = {
    onChartClick: (_eventPayload: ChartEventPayload) => {},
    onChartMouseEnter: (_eventPayload: ChartEventPayload) => {},
    onChartMouseMove: (_eventPayload: ChartEventPayload) => {},
    onChartMouseLeave: (_eventPayload: ChartEventPayload) => {},
    onFocus: (_focusData: ChartFocus) => {},
    onSeriesFilter: (_filterData: ChartSeriesFilter) => {},
    onSeriesLayoutInfoChange: (_bounds: Bounds) => {}
  };

  chart: Slot | null = null;
  focusedGroupIndex: number;
  focusedSeriesAxisId: string | null;
  focusedSeriesId: string | null;
  filteredSeriesIds: Record<string, boolean>;

  constructor() {
    super();
    this.focusedGroupIndex = -1;
    this.focusedSeriesAxisId = null;
    this.focusedSeriesId = null;
    this.filteredSeriesIds = {};
    this.state = { focusedGroupIndex: this.focusedGroupIndex, focusedSeriesAxisId: this.focusedSeriesAxisId,
      focusedSeriesId: this.focusedSeriesId, filteredSeriesIds: this.filteredSeriesIds };
  }

  willReceiveProps(nextProps: ManagedChartProps): void {
    const { mochartConfig, dataProvider } = nextProps;
    const { mochartConfig: oldMochartConfig, dataProvider: oldDataProvider } = this.props;
    const { focusedSeriesAxisId: oldFocusedSeriesAxisId, focusedSeriesId: oldFocusedSeriesId,
      focusedGroupIndex: oldFocusedGroupIndex, filteredSeriesIds: oldFilteredSeriesIds } = this;

    if (mochartConfig !== oldMochartConfig && hasConfigStructureChange(oldMochartConfig, mochartConfig)) {
      this.focusedGroupIndex = -1;
      this.focusedSeriesAxisId = null;
      this.focusedSeriesId = null;
      this.filteredSeriesIds = {};
    }
    else if (dataProvider !== this.props.dataProvider) {
      if (oldDataProvider && dataProvider) {
        if (this.focusedGroupIndex >= 0) {
          let oldGroupValues = oldDataProvider.getGroupValues();
          let newGroupValues = dataProvider.getGroupValues();
          if (oldGroupValues && newGroupValues) {
            let groupValue = oldGroupValues[this.focusedGroupIndex];
            this.focusedGroupIndex = newGroupValues.indexOf(groupValue);
          }
          else {
            this.focusedGroupIndex = -1;
          }
        }
      }
      else {
        this.focusedGroupIndex = -1;
        this.focusedSeriesAxisId = null;
        this.focusedSeriesId = null;
        this.filteredSeriesIds = {};
      }
    }
    const { focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex, filteredSeriesIds } = this;
    const focusChanged = focusedSeriesAxisId !== oldFocusedSeriesAxisId || focusedSeriesId !== oldFocusedSeriesId || focusedGroupIndex !== oldFocusedGroupIndex;
    const seriesFilterChanged = filteredSeriesIds !== oldFilteredSeriesIds;
    if (focusChanged || seriesFilterChanged) {
      this.setState({ focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex, filteredSeriesIds });
      if (focusChanged) {
        const { onFocus } = this.props;
        onFocus?.({ focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex });
      }
      if (seriesFilterChanged) {
        const { onSeriesFilter } = this.props;
        onSeriesFilter?.({ filteredSeriesIds });
      }
    }
  }

  onFocus = (focusData: InternalFocus = {}): void => {
    const { seriesAxisId, seriesId, groupIndex } = focusData;

    if (seriesAxisId !== void 0) {
      this.focusedSeriesAxisId = seriesAxisId;
    }
    if (seriesId !== void 0) {
      this.focusedSeriesId = seriesId;
    }
    if (groupIndex !== void 0) {
      this.focusedGroupIndex = groupIndex ?? -1;
    }

    const { focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex } = this;
    this.setState({ focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex });
    const { onFocus } = this.props;
    onFocus?.({ focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex });
  }

  onSeriesFilter = (seriesId: string): void => {
    if (this.filteredSeriesIds[seriesId] === true) {
      delete this.filteredSeriesIds[seriesId];
    }
    else {
      this.filteredSeriesIds[seriesId] = true;
    }
    const filteredSeriesIds = { ...this.filteredSeriesIds };
    this.setState({ filteredSeriesIds });
    const { onSeriesFilter } = this.props;
    onSeriesFilter?.({ filteredSeriesIds });
  }

  create() {
    this.chart = this.slot();
    return null;
  }

  sync() {
    const {
      mochartConfig, dataProvider, loading, error, width, height, onChartClick, onChartMouseEnter, onChartMouseMove, onChartMouseLeave, onTitleClick,
      onSeriesLayoutInfoChange, getLoadingComponent, getErrorComponent, getNoDataComponent, getNoSizeComponent, getNoSeriesComponent
    } = this.props;
    const { filteredSeriesIds, focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex } = this.state;
    if (mochartConfig && mochartConfig.animationConfig.animate) {
      this.chart!.set(AnimatedChart, { mochartConfig, dataProvider, loading, error, width, height,
        focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex,
        filteredSeriesIds, onSeriesLayoutInfoChange,
        onFocus: this.onFocus, onSeriesFilter: this.onSeriesFilter,
        onChartClick, onChartMouseEnter,
        onChartMouseMove, onChartMouseLeave, onTitleClick,
        getLoadingComponent, getErrorComponent,
        getNoDataComponent, getNoSizeComponent,
        getNoSeriesComponent });
    }
    else {
      this.chart!.set(StaticChart, { mochartConfig, dataProvider, loading, error, width, height,
        focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex,
        filteredSeriesIds, onSeriesLayoutInfoChange,
        onFocus: this.onFocus, onSeriesFilter: this.onSeriesFilter,
        onChartClick, onChartMouseEnter,
        onChartMouseMove, onChartMouseLeave, onTitleClick,
        getLoadingComponent, getErrorComponent,
        getNoDataComponent, getNoSizeComponent,
        getNoSeriesComponent });
    }
  }
}
