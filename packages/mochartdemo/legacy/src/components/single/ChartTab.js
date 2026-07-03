import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import sizer from 'react-sizer';

import { hasConfigStructureChange } from 'mochart';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import EditableChart from './EditableChart';

const minChartWidthForSecondChart = 480;

const scrollWidthOffset = 20;

const defaultChartCount = 1;

class MochartChartTab extends PureComponent {
  static propTypes = {
    width: PropTypes.number.isRequired,
    config: PropTypes.object, // TODO isDefined
    data: PropTypes.array, // TODO isDefined
    dataError: PropTypes.any,
    active: PropTypes.bool
  };

  constructor(props) {
    super(props);
    this.initFocusAndFiltered();
    this.state = {
      chartCount: defaultChartCount, focusedSeriesAxisId: this.focusedSeriesAxisId, focusedSeriesId: this.focusedSeriesId,
      focusedGroupIndex: this.focusedGroupIndex, filteredSeriesIds: this.filteredSeriesIds, mochartDemoConfig: null
    };
  }

  initFocusAndFiltered() {
    this.focusedSeriesAxisId = null;
    this.focusedSeriesId = null;
    this.focusedGroupIndex = -1;
    this.filteredSeriesIds = {};
  }

  componentWillMount() {
    const { config } = this.props;
    if (config) {
      this.setState({ mochartDemoConfig: buildMochartDemoConfig(config) });
    }
  }

  componentWillReceiveProps(nextProps) {
    const { config, data, dataError } = nextProps;
    const { config: oldConfig, data: oldData, dataError: oldDataError } = this.props;
    const { focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex, filteredSeriesIds } = this;
    let { mochartDemoConfig } = this.state;
    if (dataError || config !== oldConfig) {
      let configChanged = false;
      if (config !== oldConfig) {
        mochartDemoConfig = buildMochartDemoConfig(config);
        configChanged = hasConfigStructureChange(this.state.mochartDemoConfig.mochartConfig, mochartDemoConfig.mochartConfig);
      }
      if (dataError || configChanged) {
        this.initFocusAndFiltered();
      }
    }
    else if (data !== oldData) {
      const { configValidation, mochartConfig } = mochartDemoConfig;
      const { valid } = configValidation;
      if (!oldDataError && oldData && data && valid) {
        if (this.focusedGroupIndex >= 0) {
          const { groupAxisConfig } = mochartConfig;
          const { property } = groupAxisConfig;
          let groupValue = oldData[this.focusedGroupIndex][property];
          let newFocusedGroupIndex = -1;
          let i, count = data.length;
          for (i = 0; i < count; i++) {
            if (data[i][property] === groupValue) {
              newFocusedGroupIndex = i;
              break;
            }
          }
          this.focusedGroupIndex = newFocusedGroupIndex;
        }
      }
      else {
        this.initFocusAndFiltered();
      }
    }
    if (this.focusedSeriesAxisId !== focusedSeriesAxisId || this.focusedSeriesId !== focusedSeriesId || this.focusedGroupIndex !== focusedGroupIndex ||
        this.filteredSeriesIds !== filteredSeriesIds || config !== oldConfig) {
      this.setState({
        focusedSeriesAxisId: this.focusedSeriesAxisId, focusedSeriesId: this.focusedSeriesId,
        focusedGroupIndex: this.focusedGroupIndex, filteredSeriesIds: this.filteredSeriesIds, mochartDemoConfig
      });
    }
  }

  @autobind
  onFocus(focusData = {}) {
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
  }

  @autobind
  onSeriesFilter(seriesId) {
    if (this.filteredSeriesIds[seriesId] === true) {
      delete this.filteredSeriesIds[seriesId];
    }
    else {
      this.filteredSeriesIds[seriesId] = true;
    }
    this.setState({ filteredSeriesIds: { ...this.filteredSeriesIds } });
  }

  @autobind
  onChartCountToggle() {
    let { chartCount } = this.state;
    if (chartCount === 1) {
      chartCount = 2;
    }
    else {
      chartCount = 1;
    }
    this.setState({chartCount});
  }

  render() {
    const { width, data, dataError, active } = this.props;
    const { chartCount, filteredSeriesIds, focusedGroupIndex, focusedSeriesAxisId, focusedSeriesId, mochartDemoConfig } = this.state;

    let charts = [];
    if (mochartDemoConfig) {
      const allowedChartCount = Math.floor(width / 2) > minChartWidthForSecondChart ? 2 : 1;
      let adjustedChartCount = Math.min(chartCount, allowedChartCount);
      let chartWidth = Math.floor((width - scrollWidthOffset) / adjustedChartCount);

      for (let i = 0; i < adjustedChartCount; i++) {
        charts.push(
          <EditableChart key={'chart-' + i} chartCount={chartCount} showChartCountControls={(allowedChartCount > 1 && i == 0)}
            width={chartWidth} mochartDemoConfig={mochartDemoConfig} data={data} dataError={dataError}
            isActive={active} filteredSeriesIds={filteredSeriesIds} focusedGroupIndex={focusedGroupIndex}
            focusedSeriesAxisId={focusedSeriesAxisId} focusedSeriesId={focusedSeriesId} onChartCountToggle={this.onChartCountToggle}
            onFocus={this.onFocus} onSeriesFilter={this.onSeriesFilter} />
        );
      }
    }

    return (
      <div className={"mochart-demo-tab-container row chart" + (active ? " active" : "")}>
        <div className="editable-charts-sizer">
          <div className="editable-charts">
            {charts}
          </div>
        </div>
      </div>
    );
  }
}

const SizerMochartChartTab = sizer()(MochartChartTab);

export default SizerMochartChartTab;
