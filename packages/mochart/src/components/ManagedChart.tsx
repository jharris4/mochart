// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { hasConfigStructureChange } from '../config/core/mochartConfig';
import StaticChart from './StaticChart';
import AnimatedChart from './AnimatedChart';

export default class ManagedChart extends PureComponent {
  static defaultProps = {
    onChartClick: (eventPayload) => {},
    onChartMouseEnter: (eventPayload) => {},
    onChartMouseMove: (eventPayload) => {},
    onChartMouseLeave: (eventPayload) => {},
    onFocus: (focusData) => {},
    onSeriesFilter: (filterData) => {},
    onSeriesLayoutInfoChange: (bounds) => {}
  };

  constructor(props) {
    super(props);
    this.focusedGroupIndex = -1;
    this.focusedSeriesAxisId = null;
    this.focusedSeriesId = null;
    this.filteredSeriesIds = {};
    this.state = { focusedGroupIndex: this.focusedGroupIndex, focusedSeriesAxisId: this.focusedSeriesAxisId,
      focusedSeriesId: this.focusedSeriesId, filteredSeriesIds: this.filteredSeriesIds };
  }

  componentWillReceiveProps(nextProps) {
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
        onFocus({ focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex });
      }
      if (seriesFilterChanged) {
        const { onSeriesFilter } = this.props;
        onSeriesFilter({ filteredSeriesIds });
      }
    }
  }

  onFocus = (focusData = {}) => {
    const { seriesAxisId, seriesId, groupIndex } = focusData;

    if (seriesAxisId !== void 0) {
      this.focusedSeriesAxisId = seriesAxisId;
    }
    if (seriesId !== void 0) {
      this.focusedSeriesId = seriesId;
    }
    if (groupIndex !== void 0) {
      this.focusedGroupIndex = groupIndex;
    }

    const { focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex } = this;
    this.setState({ focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex });
    const { onFocus } = this.props;
    onFocus({ focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex });
  }

  onSeriesFilter = (seriesId) => {
    if (this.filteredSeriesIds[seriesId] === true) {
      delete this.filteredSeriesIds[seriesId];
    }
    else {
      this.filteredSeriesIds[seriesId] = true;
    }
    const filteredSeriesIds = { ...this.filteredSeriesIds };
    this.setState({ filteredSeriesIds });
    const { onSeriesFilter } = this.props;
    onSeriesFilter({ filteredSeriesIds });
  }

  render() {
    const {
      mochartConfig, dataProvider, loading, error, width, height, onChartClick, onChartMouseEnter, onChartMouseMove, onChartMouseLeave, onTitleClick,
      onSeriesLayoutInfoChange, getLoadingComponent, getErrorComponent, getNoDataComponent, getNoSizeComponent, getNoSeriesComponent
    } = this.props;
    const { filteredSeriesIds, focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex }  = this.state;
    if (mochartConfig && mochartConfig.animationConfig.animate) {
      return (
        <AnimatedChart mochartConfig={mochartConfig} dataProvider={dataProvider} loading={loading} error={error} width={width} height={height}
                       focusedSeriesAxisId={focusedSeriesAxisId} focusedSeriesId={focusedSeriesId} focusedGroupIndex={focusedGroupIndex}
                       filteredSeriesIds={filteredSeriesIds} onSeriesLayoutInfoChange={onSeriesLayoutInfoChange}
                       onFocus={this.onFocus} onSeriesFilter={this.onSeriesFilter}
                       onChartClick={onChartClick} onChartMouseEnter={onChartMouseEnter}
                       onChartMouseMove={onChartMouseMove} onChartMouseLeave={onChartMouseLeave} onTitleClick={onTitleClick}
                       getLoadingComponent={getLoadingComponent} getErrorComponent={getErrorComponent}
                       getNoDataComponent={getNoDataComponent} getNoSizeComponent={getNoSizeComponent}
                       getNoSeriesComponent={getNoSeriesComponent}/>
      );
    }
    else {
      return (
        <StaticChart mochartConfig={mochartConfig} dataProvider={dataProvider} loading={loading} error={error} width={width} height={height}
                     focusedSeriesAxisId={focusedSeriesAxisId} focusedSeriesId={focusedSeriesId} focusedGroupIndex={focusedGroupIndex}
                     filteredSeriesIds={filteredSeriesIds} onSeriesLayoutInfoChange={onSeriesLayoutInfoChange}
                     onFocus={this.onFocus} onSeriesFilter={this.onSeriesFilter}
                     onChartClick={onChartClick} onChartMouseEnter={onChartMouseEnter}
                     onChartMouseMove={onChartMouseMove} onChartMouseLeave={onChartMouseLeave} onTitleClick={onTitleClick}
                     getLoadingComponent={getLoadingComponent} getErrorComponent={getErrorComponent}
                     getNoDataComponent={getNoDataComponent} getNoSizeComponent={getNoSizeComponent}
                     getNoSeriesComponent={getNoSeriesComponent}/>
      );
    }
  }
}