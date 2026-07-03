// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { isDataProviderValid, getChartData } from '../data/ChartData';
import { getFocusData, getFocusDataWithMutations } from '../data/FocusData';
import Chart from './Chart';

export default class StaticChart extends PureComponent {
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

  constructor(props) {
    super(props);
    this.focusData = null;
    this.state = { chartData: null, focusData: null };
  }

  componentWillMount() {
    const { mochartConfig, dataProvider, filteredSeriesIds, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId } = this.props;
    let error = (mochartConfig && !mochartConfig.validation.valid) || !isDataProviderValid(dataProvider);
    let chartData = (!mochartConfig || error) ? null : getChartData(mochartConfig, dataProvider, filteredSeriesIds);
    let focusData = this.focusData = (chartData ? getFocusData(mochartConfig, chartData, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId) : null);
    this.setState({ chartData, focusData });
  }

  componentWillReceiveProps(nextProps) {
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

  render() {
    const {
      mochartConfig, dataProvider, loading, error, width, height, style, standalone, onSeriesLayoutInfoChange, onFocus, onSeriesFilter,
      onChartClick, onChartMouseEnter, onChartMouseMove, onChartMouseLeave, onTitleClick,
      getLoadingComponent, getErrorComponent, getNoDataComponent, getNoSizeComponent, getNoSeriesComponent
    } = this.props;
    const { chartData, focusData } = this.state;
    return (
      <Chart mochartConfig={mochartConfig} dataProvider={dataProvider} loading={loading} error={error} chartData={chartData} standalone={standalone}
             style={style} width={width} height={height} focusData={focusData} onFocus={onFocus} onSeriesFilter={onSeriesFilter}
             onChartClick={onChartClick} onChartMouseEnter={onChartMouseEnter} onChartMouseMove={onChartMouseMove}
             onChartMouseLeave={onChartMouseLeave} onTitleClick={onTitleClick} onSeriesLayoutInfoChange={onSeriesLayoutInfoChange}
             getLoadingComponent={getLoadingComponent} getErrorComponent={getErrorComponent}
             getNoDataComponent={getNoDataComponent} getNoSizeComponent={getNoSizeComponent} getNoSeriesComponent={getNoSeriesComponent}/>
    );
  }
}