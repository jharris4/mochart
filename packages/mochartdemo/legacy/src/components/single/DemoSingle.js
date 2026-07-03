import React, { Component } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { Nav, NavItem, NavLink } from 'reactstrap';

import MochartDemosTab from '../demos/DemosTab';
import MochartChartTab from './ChartTab';
import MochartDataTab from './DataTab';
import MochartConfigTab from './ConfigTab';
import ErrorTab from '../misc/ErrorTab';

const eventKeyChart = 1;
const eventKeyConfig = 2;
const eventKeyData = 3;
const eventKeyDemo = 4;

function getActiveKeyForInitialDemoId(initialDemoId) {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

class MochartDemoSingle extends Component {
  static propTypes = {
    demoData: PropTypes.object.isRequired,
    demoMode: PropTypes.string.isRequired,
    initialDemoId: PropTypes.string.isRequired,
    onDemoModeChanged: PropTypes.func.isRequired,
    onDemoChanged: PropTypes.func.isRequired
  };

  static defaultProps = {
    demoData: {
      demoIds: [],
      demoObjectMap: {}
    },
    initialDemoId: "",
    onDemoChanged: (demoId) => {}
  };

  constructor(props) {
    super(props);
    const { initialDemoId } = props;
    this.state = { activeKey: getActiveKeyForInitialDemoId(initialDemoId) };
  }

  componentWillReceiveProps(nextProps) {
    const { initialDemoId } = nextProps;
    if (initialDemoId !== this.props.initialDemoId) {
      this.setState({ activeKey: getActiveKeyForInitialDemoId(initialDemoId) });
    }
  }

  @autobind
  handleSelect(activeKey) {
    this.setState({activeKey});
  }

  render() {
    const { demoData, demoMode, initialDemoId, onDemoModeChanged, onDemoChanged } = this.props;
    const { activeKey } = this.state;

    let nonDemoNavItemStyle = initialDemoId === 'demos' ? { display: 'none' } : null;

    return (
      <div className="mochart-demo-container">
        <div className="mochart-demo-tabs-container">
          <Nav tabs>
            <NavItem>
              <NavLink active={activeKey === eventKeyDemo} onClick={() => { this.handleSelect(eventKeyDemo) }}>
                Demos
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeKey === eventKeyChart} onClick={() => { this.handleSelect(eventKeyChart) }}>
                Chart
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeKey === eventKeyConfig} onClick={() => { this.handleSelect(eventKeyConfig) }}>
                Config
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeKey === eventKeyData} onClick={() => { this.handleSelect(eventKeyData) }}>
                Data
              </NavLink>
            </NavItem>
          </Nav>
        </div>
        <MochartDemoContent activeKey={activeKey} demoData={demoData} demoMode={demoMode} initialDemoId={initialDemoId}
                            onDemoModeChanged={onDemoModeChanged} onDemoChanged={onDemoChanged}/>
      </div>
    );
  }
}

class MochartDemoContent extends Component {
  static propTypes = {
    activeKey: PropTypes.number.isRequired,
    demoData: PropTypes.object.isRequired,
    demoMode: PropTypes.string.isRequired,
    initialDemoId: PropTypes.string.isRequired,
    onDemoModeChanged: PropTypes.func.isRequired,
    onDemoChanged: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);

    const { demoData, initialDemoId } = props;

    let initialConfig = null;
    let initialData = null;
    if (initialDemoId !== 'demos') {
      initialConfig = demoData.demoObjectMap[initialDemoId].config;
      initialData = demoData.demoObjectMap[initialDemoId].data;
    }

    this.state = {
      demoId: initialDemoId,
      pendingConfig: null,
      pendingData: null,
      pendingDataError: false,
      config: initialConfig,
      data: initialData,
      dataError: false,
      viewingConfig: initialConfig,
      viewingData: initialData,
      viewingDataError: false
    };
  }

  componentWillReceiveProps(nextProps) {
    const { demoData, initialDemoId, activeKey } = nextProps;
    if (initialDemoId !== this.props.initialDemoId) {
      const demoId = initialDemoId;
      let config = null;
      let data = null;
      if (initialDemoId === 'demos') {
        this.setState({demoId, config, data, dataError: null, viewingConfig: config, viewingData: data});
      }
      else {
        config = demoData.demoObjectMap[demoId].config;
        data = demoData.demoObjectMap[demoId].data;
        this.setState({ demoId, config, data, dataError: null, pendingConfig: config, pendingData: data});
      }
    }
    else if (activeKey !== this.props.activeKey && activeKey === eventKeyChart) {
      this.chartShown();
    }
  }

  componentDidUpdate(prevProps) {
    const { activeKey, initialDemoId } = prevProps;
    if (this.props.activeKey === eventKeyChart && (activeKey !== this.props.activeKey || initialDemoId !== this.props.initialDemoId)) {
      this.chartShown();
    }
  }

  chartShown() {
    const { pendingConfig, pendingData, pendingDataError } = this.state;
    let nextState = {};
    if (pendingConfig !== null || pendingData !== null || pendingDataError !== null) {
      if (pendingConfig !== null) {
        nextState.viewingConfig = pendingConfig;
        nextState.pendingConfig = null;
      }
      if (pendingData !== null) {
        nextState.viewingData = pendingData;
        nextState.pendingData = null;
      }
      if (pendingDataError !== null) {
        nextState.viewingDataError = pendingDataError;
        nextState.pendingDataError = null;
      }
      this.setState(nextState);
    }
  }

  @autobind
  onConfigChange(pendingConfig) {
    this.setState({pendingConfig});
  }

  @autobind
  onConfigReset() {
    const { demoData } = this.props;
    const { demoId } = this.state;
    let resetConfig = { ...demoData.demoObjectMap[demoId].config };
    this.setState({pendingConfig: resetConfig, config: resetConfig});
  }

  @autobind
  onDataChange(pendingData) {
    this.setState({pendingData, pendingDataError: false});
  }

  @autobind
  onDataError(errorMessage) {
    this.setState({pendingDataError: errorMessage});
  }

  @autobind
  onDataReset() {
    const { demoData } = this.props;
    const { demoId } = this.state;
    let resetData = demoData.demoObjectMap[demoId].data.slice(); // give it a new array reference so children know to update
    this.setState({pendingData: resetData, pendingDataError: false});
  }

  @autobind
  onDemoChange(demoId) {
    const { onDemoChanged } = this.props;
    onDemoChanged(demoId);
  }

  render() {
    const { initialDemoId, activeKey, demoData, demoMode, onDemoModeChanged } = this.props;
    const { viewingConfig, viewingData, viewingDataError, config, data, demoId } = this.state;

    if (initialDemoId === 'demos') {
      return (
        <div className="mochart-demo-content-pane">
          <div className="mochart-demo-content single-tab">
            <MochartDemosTab active={activeKey === eventKeyDemo} demoData={demoData} demoMode={demoMode} demoId={demoId}
                             onDemoModeChanged={onDemoModeChanged} onDemoChange={this.onDemoChange}/>
          </div>
        </div>
      );
    }
    else {
      return (
        <div className="mochart-demo-content-pane">
          <div className="mochart-demo-content">
            <ErrorTab active={activeKey === eventKeyDemo}>
              <MochartDemosTab demoData={demoData} demoMode={demoMode} demoId={demoId}
                               onDemoModeChanged={onDemoModeChanged} onDemoChange={this.onDemoChange} />
            </ErrorTab>
            <ErrorTab active={activeKey === eventKeyChart}>
              <MochartChartTab config={viewingConfig} data={viewingData} dataError={viewingDataError} />
            </ErrorTab>
            <ErrorTab active={activeKey === eventKeyConfig}>
              <MochartConfigTab config={config} onConfigChange={this.onConfigChange} onConfigReset={this.onConfigReset} />
            </ErrorTab>
            <ErrorTab active={activeKey === eventKeyData}>
              <MochartDataTab config={viewingConfig} data={data} onDataChange={this.onDataChange}
                              onDataError={this.onDataError} onDataReset={this.onDataReset} />
            </ErrorTab>
          </div>
        </div>
      );
    }
  }
}

export default MochartDemoSingle;