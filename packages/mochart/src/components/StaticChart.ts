// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer } from '../render';

import { isDataProviderValid, getChartData } from '../data/ChartData';
import { getFocusData, getFocusDataWithMutations } from '../data/FocusData';
import Chart from './Chart';

export default class StaticChart extends Renderer {
  static defaultProps = {
    standalone: true,
    onSeriesLayoutInfoChange: (bounds) => {},
    onFocus: (seriesId, groupIndex) => {},
    onSeriesFilter: (seriesId) => {},
    onChartClick: (point) => {},
    onChartMouseEnter: (point) => {},
    onChartMouseMove: (point) => {},
    onChartMouseLeave: (point) => {}
  };

  chart = null;

  constructor() {
    super();
    this.focusData = null;
    this.state = { chartData: null, focusData: null };
  }

  willMount() {
    const { mochartConfig, dataProvider, filteredSeriesIds, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId } = this.props;
    let error = (mochartConfig && !mochartConfig.validation.valid) || !isDataProviderValid(dataProvider);
    let chartData = (!mochartConfig || error) ? null : getChartData(mochartConfig, dataProvider, filteredSeriesIds);
    let focusData = this.focusData = (chartData ? getFocusData(mochartConfig, chartData, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId) : null);
    this.setState({ chartData, focusData });
  }

  willReceiveProps(nextProps) {
    const { mochartConfig, dataProvider, filteredSeriesIds, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId } = nextProps;
    let configChanged = mochartConfig !== this.props.mochartConfig;
    let dataChanged = dataProvider !== this.props.dataProvider || filteredSeriesIds !== this.props.filteredSeriesIds;
    let focusChanged = focusedGroupIndex !== this.props.focusedGroupIndex || focusedSeriesAxisId !== this.props.focusedSeriesAxisId
      || focusedSeriesId !== this.props.focusedSeriesId;
    if (configChanged || dataChanged || focusChanged) {
      let error = (mochartConfig && !mochartConfig.validation.valid) || !isDataProviderValid(dataProvider);
      let chartData = (!mochartConfig || error) ? null : (configChanged || dataChanged) ? getChartData(mochartConfig, dataProvider, filteredSeriesIds) : this.state.chartData;
      let focusData = this.focusData = (chartData ? getFocusDataWithMutations(this.focusData, getFocusData(mochartConfig, chartData, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId)) : null);
      this.setState({ chartData, focusData });
    }
  }

  create() {
    this.chart = this.slot();
    return null;
  }

  sync() {
    const {
      mochartConfig, dataProvider, loading, error, width, height, style, standalone, onSeriesLayoutInfoChange, onFocus, onSeriesFilter,
      onChartClick, onChartMouseEnter, onChartMouseMove, onChartMouseLeave, onTitleClick,
      getLoadingComponent, getErrorComponent, getNoDataComponent, getNoSizeComponent, getNoSeriesComponent
    } = this.props;
    const { chartData, focusData } = this.state;
    this.chart.set(Chart, { mochartConfig, dataProvider, loading, error, chartData, standalone,
      style, width, height, focusData, onFocus, onSeriesFilter,
      onChartClick, onChartMouseEnter, onChartMouseMove,
      onChartMouseLeave, onTitleClick, onSeriesLayoutInfoChange,
      getLoadingComponent, getErrorComponent,
      getNoDataComponent, getNoSizeComponent, getNoSeriesComponent });
  }
}
