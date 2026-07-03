import React, { Component } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { Form, FormGroup, Input, ButtonToolbar, ButtonGroup } from 'reactstrap';
import FontAwesome from 'react-fontawesome';
import sizer from 'react-sizer';

import { AnimatedChart, ArrayOfObjectsDataProvider } from 'mochart';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import ButtonWithTooltip from '../misc/ButtonWithTooltip';

const scrollWidthOffset = 20;

const defaultChartRows = 2;
const defaultChartCols = 2;

const defaultRate = 2000;

function getChartDataCount(data, currentDataCount, i) {
  let dataCount = data.length;
  let chartDataCount = (dataCount + currentDataCount - i) % dataCount;
  if (chartDataCount === 0) {
    chartDataCount = dataCount;
  }
  return chartDataCount;
}

function getDataProvidersForDataCount(mochartConfig, data, chartCount, currentDataCount) {
  let dataProviders = [];
  let i, chartDataCount;
  const groupProperty = mochartConfig.groupAxisConfig.property;
  for (i=0; i<chartCount; i++) {
    chartDataCount = getChartDataCount(data, currentDataCount, i);
    dataProviders.push(new ArrayOfObjectsDataProvider(data.slice(0, chartDataCount), groupProperty));
  }
  return dataProviders;
}

export default class MultiMochartChartsTab extends Component {
  static propTypes = {
    demoObject: PropTypes.object.isRequired,
    active: PropTypes.bool
  };

  constructor(props) {
    super(props);
    this.intervalId = null;
    this.initFocusAndFiltered();
    let playing = false;
    let mochartDemoConfig = null;
    let dataProviders = null;
    let data = null;
    let currentDataCount = null;
    let chartRows = defaultChartRows;
    let chartCols = defaultChartCols;
    let rate = defaultRate;
    this.state = {
      focusedGroupIndex: this.focusedGroupIndex,
      focusedSeriesAxisId: this.focusedSeriesAxisId,
      focusedSeriesId: this.focusedSeriesId,
      filteredSeriesIds: this.filteredSeriesIds,
      playing,
      mochartDemoConfig,
      dataProviders,
      data,
      currentDataCount,
      chartRows,
      chartCols,
      rate,
    };
  }

  initFocusAndFiltered() {
    this.focusedGroupIndex = -1;
    this.focusedSeriesAxisId = null;
    this.focusedSeriesId = null;
    this.filteredSeriesIds = {};
  }

  componentWillMount() {
    const { demoObject } = this.props;
    const { chartRows, chartCols } = this.state;
    const mochartDemoConfig = buildMochartDemoConfig(demoObject.config);
    const { mochartConfig } = mochartDemoConfig;
    let data = demoObject.data;
    let dataCount = data.length;
    let currentDataCount = dataCount;
    let dataProviders = getDataProvidersForDataCount(mochartConfig, data, chartRows * chartCols, currentDataCount);
    let focusedGroupIndices = dataProviders.map(dataProvider => -1);
    this.setState({mochartDemoConfig, mochartConfig, data, dataCount, dataProviders, focusedGroupIndices, currentDataCount});
  }

  componentWillReceiveProps(nextProps) {
    const { active, demoObject } = nextProps;
    const { active: oldActive, demoObject: oldDemoObject } = this.props;
    const { chartRows, chartCols } = this.state;
    let { mochartDemoConfig, playing } = this.state;

    if (demoObject !== oldDemoObject) {
      mochartDemoConfig = buildMochartDemoConfig(demoObject.config);
      this.initFocusAndFiltered();
      playing = false;
      const { mochartConfig } = mochartDemoConfig;
      let data = demoObject.data;
      let dataCount = data.length;
      let currentDataCount = dataCount;
      let dataProviders = getDataProvidersForDataCount(mochartConfig, data, chartRows * chartCols, currentDataCount);
      let focusedGroupIndices = dataProviders.map(dataProvider => -1);
      this.setState({
        playing, mochartDemoConfig, data, dataCount, dataProviders, focusedGroupIndices, currentDataCount,
        focusedGroupIndex: this.focusedGroupIndex, focusedSeriesAxisId: this.focusedSeriesAxisId, focusedSeriesId: this.focusedSeriesId, filteredSeriesIds: this.filteredSeriesIds
      });
    }
    if (active !== oldActive) {
      this.onStopClick();
    }
  }

  @autobind
  onRateChange(rate) {
    this.setState({rate});
  }

  @autobind
  onRowsChange(chartRows) {
    const { mochartDemoConfig, data, dataCount, chartCols } = this.state;
    const { mochartConfig } = mochartDemoConfig;
    let currentDataCount = dataCount;
    let dataProviders = getDataProvidersForDataCount(mochartConfig, data, chartRows * chartCols, currentDataCount);
    let focusedGroupIndices = this.getFocusedGroupIndices(dataProviders);
    this.setState({chartRows, currentDataCount, dataProviders, focusedGroupIndices});
  }

  @autobind
  onColsChange(chartCols) {
    const { mochartDemoConfig, data, dataCount, chartRows } = this.state;
    const { mochartConfig } = mochartDemoConfig;
    let currentDataCount = dataCount;
    let dataProviders = getDataProvidersForDataCount(mochartConfig, data, chartRows * chartCols, currentDataCount);
    let focusedGroupIndices = this.getFocusedGroupIndices(dataProviders);
    this.setState({chartCols, currentDataCount, dataProviders, focusedGroupIndices});
  }

  @autobind
  onStepBackwardClick() {
    let { mochartDemoConfig, data, currentDataCount, dataCount, chartRows, chartCols } = this.state;
    const { mochartConfig } = mochartDemoConfig;
    currentDataCount = dataCount + (currentDataCount - 1) % dataCount;
    let dataProviders = getDataProvidersForDataCount(mochartConfig, data, chartRows * chartCols, currentDataCount);
    let focusedGroupIndices = this.getFocusedGroupIndices(dataProviders);
    this.setState({currentDataCount, dataProviders, focusedGroupIndices});
  }

  @autobind
  onStepForwardClick() {
    let { mochartDemoConfig, data, currentDataCount, dataCount, chartRows, chartCols } = this.state;
    const { mochartConfig } = mochartDemoConfig;
    currentDataCount = (currentDataCount + 1) % dataCount;
    let dataProviders = getDataProvidersForDataCount(mochartConfig, data, chartRows * chartCols, currentDataCount);
    let focusedGroupIndices = this.getFocusedGroupIndices(dataProviders);
    this.setState({currentDataCount, dataProviders, focusedGroupIndices});
  }

  getFocusedGroupIndices(dataProviders) {
    let { mochartDemoConfig, data, focusedGroupIndex } = this.state;
    const { mochartConfig } = mochartDemoConfig;
    if (focusedGroupIndex >= 0) {
      let groupValue = data[focusedGroupIndex][mochartConfig.groupAxisConfig.property];
      return this.getFocusedGroupIndicesForValue(dataProviders, groupValue);
    }
    else {
      return dataProviders.map(dataProvider => -1);
    }
  }

  getFocusedGroupIndicesForValue(dataProviders, groupValue) {
    let count, i;
    return dataProviders.map(dataProvider => {
      let chartGroupIndex = -1;
      let groupValues = dataProvider.getGroupValues();
      count = groupValues.length;
      for (i = 0; i < count; i++) {
        if (groupValues[i] === groupValue) {
          chartGroupIndex = i;
          break;
        }
      }
      return chartGroupIndex;
    });
  }

  @autobind
  onPlayBackwardClick() {
    const { rate } = this.state;
    this.setState({playing: true}, () => {
      this.intervalId = setInterval(this.onStepBackwardClick, rate);
    });
  }

  @autobind
  onPlayForwardClick() {
    const { rate } = this.state;
    this.setState({playing: true}, () => {
      this.intervalId = setInterval(this.onStepForwardClick, rate);
    });
  }

  @autobind
  onStopClick() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.setState({playing: false});
  }

  componentWillUnmount() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  @autobind
  onChartFocus(chartIndex, focusData) {
    const { seriesAxisId, seriesId } = focusData;
    let { groupIndex } = focusData;
    const { mochartDemoConfig, data, dataProviders } = this.state;
    const { mochartConfig } = mochartDemoConfig;
    let { focusedGroupIndices } = this.state;
    if (groupIndex >= 0) {
      let groupValue = dataProviders[chartIndex].getGroupValues()[groupIndex];
      let i, count = data.length;
      for (i = 0; i < count; i++) {
        if (data[i][mochartConfig.groupAxisConfig.property] === groupValue) {
          groupIndex = i;
          break;
        }
      }
      if (groupIndex !== this.focusedGroupIndex) {
        focusedGroupIndices = this.getFocusedGroupIndicesForValue(dataProviders, groupValue);
      }
    }
    else if (this.focusedGroupIndex >= 0) {
      focusedGroupIndices = dataProviders.map(dataProvider => -1);
    }
    if (groupIndex !== void 0) {
      this.focusedGroupIndex = groupIndex;
    }
    if (seriesAxisId !== void 0) {
      this.focusedSeriesAxisId = seriesAxisId;
    }
    if (seriesId !== void 0) {
      this.focusedSeriesId = seriesId;
    }
    this.setState({ focusedGroupIndices, focusedGroupIndex: this.focusedGroupIndex,
      focusedSeriesAxisId: this.focusedSeriesAxisId, focusedSeriesId: this.focusedSeriesId });
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

  render() {
    const { active } = this.props;
    const { filteredSeriesIds, focusedGroupIndices, focusedSeriesAxisId, focusedSeriesId, playing, mochartDemoConfig, dataProviders, chartRows, chartCols } = this.state;
    const { mochartConfig } = mochartDemoConfig;

    return (
      <div className={"mochart-demo-tab-container col chart" + (active ? " active": "")}>
        <div className="multi-charts-sizer">
          <SizerMultiMochartCharts mochartConfig={mochartConfig} dataProviders={dataProviders}
                                   chartRows={chartRows} chartCols={chartCols} filteredSeriesIds={filteredSeriesIds}
                                   focusedGroupIndices={focusedGroupIndices} focusedSeriesAxisId={focusedSeriesAxisId} focusedSeriesId={focusedSeriesId}
                                   onSeriesFilter={this.onSeriesFilter} onChartFocus={this.onChartFocus}/>
        </div>
        <MultiMochartControls playing={playing} onRowsChange={this.onRowsChange} onColsChange={this.onColsChange}
                              onStepBackwardClick={this.onStepBackwardClick} onStepForwardClick={this.onStepForwardClick}
                              onPlayBackwardClick={this.onPlayBackwardClick} onPlayForwardClick={this.onPlayForwardClick}
                              onStopClick={this.onStopClick} onRateChange={this.onRateChange}/>
      </div>
    );
  }
}

class MultiMochartCharts extends Component {
  static propTypes = {
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    mochartConfig: PropTypes.object.isRequired,
    dataProviders: PropTypes.array.isRequired,
    chartRows: PropTypes.number.isRequired,
    chartCols: PropTypes.number.isRequired,
    filteredSeriesIds: PropTypes.object.isRequired,
    focusedGroupIndices: PropTypes.array.isRequired,
    focusedSeriesAxisId: PropTypes.string, // TODO add isDefined
    focusedSeriesId: PropTypes.string, // TODO add isDefined
    onSeriesFilter: PropTypes.func.isRequired,
    onChartFocus: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
  }

  render() {
    const {
      width, height, filteredSeriesIds, focusedGroupIndices, focusedSeriesAxisId, focusedSeriesId, mochartConfig, dataProviders,
      chartRows, chartCols, onSeriesFilter, onChartFocus
    } = this.props;

    let chartWidth = Math.floor((width - scrollWidthOffset) / chartCols);
    let chartHeight = Math.floor(height / chartRows);

    let charts = [];
    let i, chartCount = chartRows * chartCols;
    for (i=0; i<chartCount; i++) {
      let chartIndex = i;
      charts.push(
        <div key={'chart-' + i} className="multi-mochart-chart">
          <AnimatedChart mochartConfig={mochartConfig} dataProvider={dataProviders[i]} width={chartWidth} height={chartHeight}
                         focusedGroupIndex={focusedGroupIndices[i]} focusedSeriesAxisId={focusedSeriesAxisId} focusedSeriesId={focusedSeriesId}
                         filteredSeriesIds={filteredSeriesIds} onSeriesFilter={onSeriesFilter} onFocus={(fd) => onChartFocus(chartIndex,fd)}/>
        </div>
      );
    }

    return (
      <div className="multi-charts">
        {charts}
      </div>
    );
  }
}

class MultiMochartControls extends Component {
  static propTypes = {
    playing: PropTypes.bool.isRequired,
    onRowsChange: PropTypes.func.isRequired,
    onColsChange: PropTypes.func.isRequired,
    onStepBackwardClick: PropTypes.func.isRequired,
    onStepForwardClick: PropTypes.func.isRequired,
    onPlayBackwardClick: PropTypes.func.isRequired,
    onPlayForwardClick: PropTypes.func.isRequired,
    onStopClick: PropTypes.func.isRequired,
    onRateChange: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = { rateText: defaultRate, rowsText: defaultChartRows, colsText: defaultChartCols };
  }

  @autobind
  rowsChanged(event) {
    const { onRowsChange } = this.props;
    let rows = event.target.value;
    if (!isNaN(parseFloat(rows)) && isFinite(rows)) {
      rows = +rows;
      if (rows >= 1 && rows <= 4) {
        onRowsChange(rows);
      }
    }
    this.setState({rowsText: rows});
  }

  @autobind
  colsChanged(event) {
    const { onColsChange } = this.props;
    let cols = event.target.value;
    if (!isNaN(parseFloat(cols)) && isFinite(cols)) {
      cols = +cols;
      if (cols >= 1 && cols <= 4) {
        onColsChange(cols);
      }
    }
    this.setState({colsText: cols});
  }

  @autobind
  rateChanged(event) {
    const { onRateChange } = this.props;
    let rate = event.target.value;
    if (!isNaN(parseFloat(rate)) && isFinite(rate)) {
      rate = +rate;
      if (rate >= 5 && rate <= 60000) {
        onRateChange(rate);
      }
    }
    this.setState({rateText: rate});
  }

  render() {
    const { playing, onStepBackwardClick, onStepForwardClick, onPlayBackwardClick, onPlayForwardClick, onStopClick } = this.props;
    const { rowsText, colsText, rateText } = this.state;

    return (
      <div className="multi-controls">
        <Form inline>
          <FormGroup>
            <Input disabled={playing} type="text" value={rowsText} maxLength="3" size="3" onChange={this.rowsChanged}/>
            <Input plaintext>x</Input>
            <Input disabled={playing} type="text" value={colsText} maxLength="3" size="3" onChange={this.colsChanged}/>
          </FormGroup>
          <FormGroup>
            <ButtonToolbar>
              <ButtonGroup>
                <ButtonWithTooltip id="step-back" disabled={playing} tooltipText="Step Backward" tooltipPlacement="top-start"
                                   onClick={onStepBackwardClick} aria-label="Step Backward">
                  <FontAwesome size="lg" fixedWidth={true} name="step-backward"/>
                </ButtonWithTooltip>
                <ButtonWithTooltip id="step-forward" disabled={playing} tooltipText="Step Forward" tooltipPlacement="top-start"
                                   onClick={onStepForwardClick} aria-label="Step Forward">
                  <FontAwesome size="lg" fixedWidth={true} name="step-forward"/>
                </ButtonWithTooltip>
                <ButtonWithTooltip id="play-backward" disabled={playing} tooltipText="Play Backward" tooltipPlacement="top-start"
                                   onClick={onPlayBackwardClick} aria-label="Play Backward">
                  <FontAwesome size="lg" fixedWidth={true} name="play" flip="horizontal"/>
                </ButtonWithTooltip>
                <ButtonWithTooltip id="play-forward" disabled={playing} tooltipText="Play Forward" tooltipPlacement="top-start"
                                   onClick={onPlayForwardClick} aria-label="Play Forward">
                  <FontAwesome size="lg" fixedWidth={true} name="play"/>
                </ButtonWithTooltip>
                <ButtonWithTooltip id="stop" disabled={!playing} tooltipText="Stop" tooltipPlacement="top-start"
                                   onClick={onStopClick} aria-label="Stop">
                  <FontAwesome size="lg" fixedWidth={true} name="stop"/>
                </ButtonWithTooltip>
              </ButtonGroup>
            </ButtonToolbar>
          </FormGroup>
          <FormGroup>
            <Input disabled={playing} type="text" value={rateText} maxLength="4" size="4" onChange={this.rateChanged}/>
          </FormGroup>
        </Form>
      </div>
    );
  }
}

const SizerMultiMochartCharts = sizer()(MultiMochartCharts);


