import React, { useState } from 'react';
import { Nav, NavItem, NavLink } from 'reactstrap';

import type { MochartConfig } from '@mochart/core';

import { buildMochartDemoConfig, defaultTransitionConfig, getTransitionDataProviders, getTransitionMochartConfig } from '@mochart/demo-common';

import TransitionMochartChartTab from './TransitionChartTab';
import TransitionMochartConfigTab from './TransitionConfigTab';

import type { TransitionConfig, ChartDataProviderLike } from '../../types';

const eventKeyChart = 1;
const eventKeyConfig = 2;

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
    mochartConfig: getTransitionMochartConfig(defaultTransitionConfig),
    dataProviders: getTransitionDataProviders(defaultTransitionConfig)
  }));

  const onUpdateConfig = (transitionConfig: TransitionConfig) => {
    setState({
      transitionConfig,
      mochartConfig: getTransitionMochartConfig(transitionConfig),
      dataProviders: getTransitionDataProviders(transitionConfig)
    });
  };

  const onResetConfig = () => {
    setState({
      transitionConfig: defaultTransitionConfig,
      mochartConfig: getTransitionMochartConfig(defaultTransitionConfig),
      dataProviders: getTransitionDataProviders(defaultTransitionConfig)
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
