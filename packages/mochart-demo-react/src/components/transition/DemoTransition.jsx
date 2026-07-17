import React, { Component } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { Nav, NavItem, NavLink } from 'reactstrap';

import { ArrayOfObjectsDataProvider } from 'mochart';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

const eventKeyChart = 1;
const eventKeyConfig = 2;

import TransitionMochartChartTab from './TransitionChartTab';
import TransitionMochartConfigTab from './TransitionConfigTab';

const defaultTransitionConfig = {
  "config": {
    "version": "1.0.2",
    "animationConfig": {
      "initialDuration": 1000,
      "expansionDuration": 3000,
      "valueChangeDuration": 3000,
      "collapseDuration": 3000
    },
    "groupAxisConfig": {
      "property": "timestamp",
      "type": "string",
      "scale": "ordinal",
      "valueLabel": "Date",
      "dateUTC": false
    },
    "legendConfig": {
      "visible": true
    },
    "seriesAxisConfigs": [
      {
        "id": "SA0",
        "min": 0
      }
    ],
    "seriesStackConfigs": [{
      "id": "SS0",
      "axis": "SA0"
    }],
    "seriesConfigs": [
      {
        "axis": "SA0",
        "stack": "SS0",
        "property": "listenerCount",
        "title": "Listener Count",
        "renderer": "bar",
        "markerShape": null,
        "valueFormat": ",d"
      }
    ]
  },
  "data": [
    [
      { "timestamp": "aaa", "classicCount": 0, "listenerCount": 50 },
      { "timestamp": "bbb", "classicCount": 0, "listenerCount": 48 },
      { "timestamp": "ccc", "classicCount": 0, "listenerCount": 28 },
      { "timestamp": "ddd", "classicCount": 0, "listenerCount": 27 },
      { "timestamp": "eee", "classicCount": 1, "listenerCount": 25 },
      { "timestamp": "fff", "classicCount": 0, "listenerCount": 22 }
    ],
    [
      { "timestamp": "ccc", "classicCount": 0, "listenerCount": 45 },
      { "timestamp": "bbb", "classicCount": 0, "listenerCount": 42 },
      { "timestamp": "ddd", "classicCount": 0, "listenerCount": 27 },
      { "timestamp": "eee", "classicCount": 1, "listenerCount": 25 },
      { "timestamp": "fff", "classicCount": 0, "listenerCount": 22 },
      { "timestamp": "ggg", "classicCount": 0, "listenerCount": 20 }
    ],
    [
      { "timestamp": "bbb", "classicCount": 0, "listenerCount": 42 },
      { "timestamp": "ccc", "classicCount": 0, "listenerCount": 45 },
      { "timestamp": "ddd", "classicCount": 0, "listenerCount": 27 },
      { "timestamp": "eee", "classicCount": 1, "listenerCount": 25 },
      { "timestamp": "fff", "classicCount": 0, "listenerCount": 22 },
      { "timestamp": "ggg", "classicCount": 0, "listenerCount": 20 }
    ]
  ]
};

class MochartDemoTransition extends Component {
  constructor(props) {
    super(props);
    this.state = { activeKey: eventKeyChart };
  }

  @autobind
  handleSelect(activeKey) {
    this.setState({activeKey});
  }

  render() {
    const { activeKey } = this.state;

    return (
      <div className="mochart-demo-container multi">
        <div className="mochart-demo-tabs-container">
          <Nav tabs>
            <NavItem>
              <NavLink active={activeKey === eventKeyChart} onClick={() => { this.handleSelect(eventKeyChart) }}>
                Chart
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeKey === eventKeyConfig} onClick={() => { this.handleSelect(eventKeyConfig) }}>
                Transition Config
              </NavLink>
            </NavItem>
          </Nav>
        </div>
        <div className="mochart-demo-content-pane">
          <TransitionMochartDemoContent activeKey={activeKey}/>
        </div>
      </div>
    );
  }
}

class TransitionMochartDemoContent extends Component {
  static propTypes = {
    activeKey: PropTypes.number.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      transitionConfig: defaultTransitionConfig,
      mochartConfig: this.getMochartConfig(defaultTransitionConfig),
      dataProviders: this.getDataProviders(defaultTransitionConfig)
    };
  }

  getMochartConfig(transitionConfig) {
    return buildMochartDemoConfig(transitionConfig.config).mochartConfig;
  }

  getDataProviders(transitionConfig) {
    // TODO - this doesn't handle group display property or extra series properties...
    const groupProperty = transitionConfig.config.groupAxisConfig.property;
    const seriesProperties = transitionConfig.config.seriesConfigs.map(seriesConfig => seriesConfig.property);
    const groupIsDate = false; // TODO - implement this
    return transitionConfig.data.map(data => new ArrayOfObjectsDataProvider(data, groupProperty, seriesProperties, groupIsDate))
  }

  @autobind
  onUpdateConfig(transitionConfig) {
    this.setState({
      transitionConfig,
      mochartConfig: this.getMochartConfig(transitionConfig),
      dataProviders: this.getDataProviders(transitionConfig)
    });
  }

  @autobind
  onResetConfig() {
    this.setState({
      transitionConfig: defaultTransitionConfig,
      mochartConfig: this.getMochartConfig(defaultTransitionConfig),
      dataProviders: this.getDataProviders(defaultTransitionConfig)
    });
  }

  render() {
    const { activeKey } = this.props;
    const { transitionConfig, mochartConfig, dataProviders } = this.state;

    return (
      <div className="mochart-demo-content">
        <TransitionMochartChartTab mochartConfig={mochartConfig} dataProviders={dataProviders}
                                   active={activeKey === eventKeyChart}/>
        <TransitionMochartConfigTab transitionConfig={transitionConfig} onUpdate={this.onUpdateConfig}
                                    onReset={this.onResetConfig} active={activeKey === eventKeyConfig}/>
      </div>
    );
  }
}

export default MochartDemoTransition;