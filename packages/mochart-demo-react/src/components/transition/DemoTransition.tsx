import React, { useState } from 'react';
import { Nav, NavItem, NavLink } from 'reactstrap';

import { ArrayOfObjectsDataProvider } from 'mochart';
import type { MochartConfig } from 'mochart';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import TransitionMochartChartTab from './TransitionChartTab';
import TransitionMochartConfigTab from './TransitionConfigTab';

import type { TransitionConfig, ChartDataProviderLike } from '../../types';

const eventKeyChart = 1;
const eventKeyConfig = 2;

const defaultTransitionConfig: TransitionConfig = {
  "config": {
    "version": "1.0.0",
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

function getMochartConfig(transitionConfig: TransitionConfig): MochartConfig {
  return buildMochartDemoConfig(transitionConfig.config).mochartConfig;
}

function getDataProviders(transitionConfig: TransitionConfig): ChartDataProviderLike[] {
  // TODO - this doesn't handle group display property or extra series properties...
  const groupProperty = transitionConfig.config.groupAxisConfig.property;
  return transitionConfig.data.map(data => new ArrayOfObjectsDataProvider(data, groupProperty));
}

export default function MochartDemoTransition() {
  const [activeKey, setActiveKey] = useState(eventKeyChart);

  const handleSelect = (nextActiveKey: number) => setActiveKey(nextActiveKey);

  return (
    <div className="mochart-demo-container multi">
      <div className="mochart-demo-tabs-container">
        <Nav tabs>
          <NavItem>
            <NavLink active={activeKey === eventKeyChart} onClick={() => { handleSelect(eventKeyChart); }}>
              Chart
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink active={activeKey === eventKeyConfig} onClick={() => { handleSelect(eventKeyConfig); }}>
              Transition Config
            </NavLink>
          </NavItem>
        </Nav>
      </div>
      <div className="mochart-demo-content-pane">
        <TransitionMochartDemoContent activeKey={activeKey} />
      </div>
    </div>
  );
}

interface ContentState {
  transitionConfig: TransitionConfig;
  mochartConfig: MochartConfig;
  dataProviders: ChartDataProviderLike[];
}

function TransitionMochartDemoContent({ activeKey }: { activeKey: number }) {
  const [state, setState] = useState<ContentState>(() => ({
    transitionConfig: defaultTransitionConfig,
    mochartConfig: getMochartConfig(defaultTransitionConfig),
    dataProviders: getDataProviders(defaultTransitionConfig)
  }));

  const onUpdateConfig = (transitionConfig: TransitionConfig) => {
    setState({
      transitionConfig,
      mochartConfig: getMochartConfig(transitionConfig),
      dataProviders: getDataProviders(transitionConfig)
    });
  };

  const onResetConfig = () => {
    setState({
      transitionConfig: defaultTransitionConfig,
      mochartConfig: getMochartConfig(defaultTransitionConfig),
      dataProviders: getDataProviders(defaultTransitionConfig)
    });
  };

  const { transitionConfig, mochartConfig, dataProviders } = state;

  return (
    <div className="mochart-demo-content">
      <TransitionMochartChartTab mochartConfig={mochartConfig} dataProviders={dataProviders}
        active={activeKey === eventKeyChart} />
      <TransitionMochartConfigTab transitionConfig={transitionConfig} onUpdate={onUpdateConfig}
        onReset={onResetConfig} active={activeKey === eventKeyConfig} />
    </div>
  );
}
