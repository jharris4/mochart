import React, { Component } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { Nav, NavItem, NavLink } from 'reactstrap';

import { NONE, isDataProviderValid, getDataErrors } from 'mochart';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';
import { generateChartDataProvider } from './RandomGenerator';

import MochartDemosTab from '../demos/DemosTab';
import RandomMochartChartTab from './RandomChartTab';
import RandomMochartConfigTab from './RandomConfigTab';
import RandomMochartDataTab from './RandomDataTab';
import ErrorTab from '../misc/ErrorTab';

const eventKeyChart = 1;
const eventKeyDemo = 2;
const eventKeyConfig = 3;
const eventKeyData = 4;


const forcedNoGroupReuse = {
  "globalPercentage": 0.0,
  "stepPercentage": 0.0
};

const forcedNoSeriesReuse = {
  "global": false,
  "step": true
};

const forcedNoGroupMissing = {
  "probability": 0.0
};

const forcedNoSeriesMissing = {
  "probability": 0.0
};

function getActiveKeyForInitialDemoId(initialDemoId) {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

function toMillis(value) {
  return new Date(value).getTime();
}

class MochartDemoRandom extends Component {
  static propTypes = {
    demoData: PropTypes.object.isRequired,
    demoMode: PropTypes.string.isRequired,
    initialDemoId: PropTypes.string.isRequired,
    onDemoModeChanged: PropTypes.func.isRequired,
    onDemoChanged: PropTypes.func.isRequired,
    randomId: PropTypes.number.isRequired,
    incrementRandomId: PropTypes.func.isRequired,
    decrementRandomId: PropTypes.func.isRequired
  };

  static defaultProps = {
    demoData: {
      demoIds: [],
      testDemoIds: [],
      demoObjectMap: {}
    },
    initialDemoId: "",
    onDemoChanged: (demoId) => {}
  };

  constructor(props) {
    super(props);

    const { demoData, initialDemoId, randomId } = props;
    let state = {
      demoId: initialDemoId,
      activeKey: getActiveKeyForInitialDemoId(initialDemoId),
      mochartDemoConfig: null,
      randomConfig: null
    };
    if (initialDemoId !== 'demos') {

      const { demoObjectMap } = demoData;
      const config = demoObjectMap[initialDemoId].config;
      const mochartDemoConfig = buildMochartDemoConfig(config);
      const randomConfig = Object.assign({}, demoData.demoObjectMap[initialDemoId].random, {valid: true});
      state = {
        ...state,
        mochartDemoConfig,
        randomConfig
      };
    }
    this.state = state;
  }

  componentWillReceiveProps(nextProps) {
    const { demoData, initialDemoId, randomId } = nextProps;
    if (initialDemoId !== 'demos' && initialDemoId !== this.props.initialDemoId) {
      const config = demoData.demoObjectMap[initialDemoId].config;
      const mochartDemoConfig = buildMochartDemoConfig(config);
      const randomConfig = Object.assign({}, demoData.demoObjectMap[initialDemoId].random, {valid: true});
      this.setState({
        demoId: initialDemoId,
        activeKey: getActiveKeyForInitialDemoId(initialDemoId),
        mochartDemoConfig,
        randomConfig
      });
    }
    else {
      this.setState({
        demoId: initialDemoId,
        activeKey: getActiveKeyForInitialDemoId(initialDemoId)
      });
    }
  }

  @autobind
  onDemoChange(demoId) {
    const { onDemoChanged } = this.props;
    this.setState({demoId});
    onDemoChanged(demoId)
  }

  @autobind
  handleSelect(activeKey) {
    this.setState({activeKey});
  }

  render() {
    const { demoData, demoMode, initialDemoId, onDemoModeChanged, randomId, incrementRandomId, decrementRandomId } = this.props;
    const { demoId, activeKey, mochartDemoConfig, randomConfig, randomGenerator } = this.state;

    let isDemos = initialDemoId === 'demos';
    let nonDemoNavItemStyle = isDemos ? { display: 'none' } : null;

    return (
      <div className="mochart-demo-container multi">
        <div className="mochart-demo-tabs-container">
          <Nav tabs>
            <NavItem >
              <NavLink active={activeKey === eventKeyDemo} onClick={() => { this.handleSelect(eventKeyDemo) }}>
                Demos
              </NavLink>
            </NavItem>
            <NavItem style={nonDemoNavItemStyle}>
              <NavLink active={activeKey === eventKeyChart} onClick={() => { this.handleSelect(eventKeyChart) }}>
                Chart
              </NavLink>
            </NavItem>
            <NavItem style={nonDemoNavItemStyle}>
              <NavLink active={activeKey === eventKeyConfig} onClick={() => { this.handleSelect(eventKeyConfig) }}>
                Random Config
              </NavLink>
            </NavItem>
            <NavItem style={nonDemoNavItemStyle}>
              <NavLink active={activeKey === eventKeyData} onClick={() => { this.handleSelect(eventKeyData) }}>
                Data
              </NavLink>
            </NavItem>
          </Nav>
        </div>
        <div className="mochart-demo-content-pane">
          <RandomMochartDemoContent demoData={demoData} mochartDemoConfig={mochartDemoConfig} initialRandomConfig={randomConfig}
                                    randomGenerator={randomGenerator} demoMode={demoMode} initialDemoId={initialDemoId} demoId={demoId}
                                    onDemoModeChanged={onDemoModeChanged} onDemoChange={this.onDemoChange} activeKey={activeKey}
                                    randomId={randomId} incrementRandomId={incrementRandomId} decrementRandomId={decrementRandomId}/>
        </div>
      </div>
    );
  }
}

class RandomMochartDemoContent extends Component {
  static propTypes = {
    demoData: PropTypes.object.isRequired,
    mochartDemoConfig: PropTypes.object,
    initialRandomConfig: PropTypes.object,
    demoMode: PropTypes.string.isRequired,
    initialDemoId: PropTypes.string.isRequired,
    demoId: PropTypes.string.isRequired,
    onDemoModeChanged: PropTypes.func.isRequired,
    onDemoChange: PropTypes.func.isRequired,
    activeKey: PropTypes.number.isRequired,
    randomId: PropTypes.number.isRequired,
    incrementRandomId: PropTypes.func.isRequired,
    decrementRandomId: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = { randomConfig: null, dataProvider: null, data: null, applyReuse: false };
  }

  componentWillMount() {
    const { initialDemoId, initialRandomConfig } = this.props;
    if (initialDemoId !== 'demos') {
      this.updateDataProvider(this.props, initialRandomConfig);
    }
  }

  componentWillReceiveProps(nextProps) {
    const { initialDemoId, initialRandomConfig, mochartDemoConfig, randomId } = nextProps;
    if (initialDemoId !== this.props.initialDemoId || initialRandomConfig !== this.props.initialRandomConfig ||
      mochartDemoConfig !== this.props.mochartDemoConfig) {
      this.updateDataProvider(nextProps, initialRandomConfig);
    }
    else if (randomId !== this.props.randomId) {
      this.updateDataProvider(nextProps);
    }
  }

  generateError(randomConfig, randomGenerator) {
    return randomGenerator() < randomConfig.error.probability;
  }

  @autobind
  toggleApplyReuse() {
    const { applyReuse } = this.state;
    this.setState({ applyReuse: !applyReuse });
  }

  getData(mochartConfig, groupValues, seriesValues) {
    const { groupAxisConfig } = mochartConfig;
    let groupProperty = groupAxisConfig.property;
    let data = groupValues.map(g => ({ [groupProperty]: g}));
    let groupCount = groupValues.length;
    if (groupAxisConfig.displayProperty !== NONE) {
      const displayProperty = groupAxisConfig.displayProperty;
      for (let i=0; i<groupCount; i++) {
        data[i][displayProperty] = groupValues[i];
      }
    }
    let seriesProperties = Object.keys(seriesValues);
    for (let seriesProperty of seriesProperties) {
      let seriesPropertyValues = seriesValues[seriesProperty];
      for (let i=0; i<groupCount; i++) {
        data[i][seriesProperty] = seriesPropertyValues[i];
      }
    }
    return data;
  }

  updateDataProvider(props, forcedRandomConfig) {
    const { mochartDemoConfig, randomGenerator, randomId } = props;
    const { randomId: oldRandomId } = this.props;
    const { mochartConfig } = mochartDemoConfig;
    const randomConfig = forcedRandomConfig !== void 0 ? forcedRandomConfig : this.state.randomConfig;
    const { dataProvider: oldDataProvider, applyReuse } = this.state;

    if (randomConfig.valid) {
      const dataProvider = generateChartDataProvider(mochartConfig, randomConfig, randomId);
      const { groupValues, seriesValues } = dataProvider;
      let data = this.getData(mochartConfig, groupValues, seriesValues);
      let dataErrors = getDataErrors(mochartConfig, dataProvider);
      if (dataErrors.length > 0) {
        console.error('data errors: ', dataErrors);
        console.warn('group values: ', groupValues);
        console.warn('series values: ', seriesValues);
        this.setState({
          dataProvider: {
            getGroupValues: () => [],
            getError: () => 'Error creating DataProvider'
          }, data: { error: 'Error creating DataProvider' }, randomConfig
        });
      }
      else {
        this.setState({ dataProvider, data, randomConfig });
      }
    }
    else {
      this.setState({
        dataProvider: {
          getGroupValues: () => [],
          getError: () => 'Invalid Random Config'
        },
        data: {
          error: 'Invalid Random Config'
        },
        randomConfig
      });
    }
  }

  @autobind
  onRandomizeBack() {
    const { decrementRandomId } = this.props;
    decrementRandomId();
  }

  @autobind
  onRandomizeNext() {
    const { incrementRandomId } = this.props;
    incrementRandomId();
  }

  onRandomizeReset() {
    //this.updateDataProvider(this.props);
  }

  @autobind
  onUpdateConfig(randomConfig) {
    let callback = randomConfig.valid ? void 0 : () => { this.onRandomizeReset(); };
    this.setState({ randomConfig }, callback);
  }

  @autobind
  onResetConfig() {
    const { initialRandomConfig } = this.props;
    this.setState({ randomConfig: initialRandomConfig });
  }

  render() {
    const { initialDemoId, demoData, mochartDemoConfig, demoMode, demoId, onDemoModeChanged, onDemoChange, activeKey } = this.props;
    const { randomConfig, dataProvider, data, applyReuse } = this.state;

    if (initialDemoId === 'demos') {
      return (
        <div className="mochart-demo-content single-tab">
          <MochartDemosTab demoData={demoData} demoMode={demoMode} demoId={demoId} onDemoModeChanged={onDemoModeChanged}
                           onDemoChange={onDemoChange} active={activeKey === eventKeyDemo}/>
        </div>
      );
    }
    else {
      const { mochartConfig } = mochartDemoConfig;
      return (
        <div className="mochart-demo-content">
          <ErrorTab active={activeKey === eventKeyDemo}>
            <MochartDemosTab demoData={demoData} demoMode={demoMode} demoId={demoId} onDemoModeChanged={onDemoModeChanged}
                             onDemoChange={onDemoChange} />
          </ErrorTab>
          <ErrorTab active={activeKey === eventKeyChart}>
            <RandomMochartChartTab mochartConfig={mochartConfig} dataProvider={dataProvider}
              onRandomizeBack={this.onRandomizeBack} onRandomizeNext={this.onRandomizeNext}
              applyReuse={applyReuse} toggleApplyReuse={this.toggleApplyReuse}/>
          </ErrorTab>
          <ErrorTab active={activeKey === eventKeyConfig}>
            <RandomMochartConfigTab randomConfig={randomConfig} onUpdate={this.onUpdateConfig} onReset={this.onResetConfig} />
          </ErrorTab>
          <ErrorTab active={activeKey === eventKeyData}>
            <RandomMochartDataTab data={data} />
          </ErrorTab>
        </div>
      );
    }
  }
}

export default MochartDemoRandom;