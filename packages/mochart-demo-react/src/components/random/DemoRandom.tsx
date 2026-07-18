import React, { useState, useRef } from 'react';
import { Nav, NavItem, NavLink } from 'reactstrap';

import { NONE, getDataErrors } from '@mochart/core';
import type { MochartConfig, DataProvider } from '@mochart/core';

import { buildMochartDemoConfig } from '@mochart/demo-common';
import { generateChartDataProvider } from './RandomGenerator';

import MochartDemosTab from '../demos/DemosTab';
import RandomMochartChartTab from './RandomChartTab';
import RandomMochartConfigTab from './RandomConfigTab';
import RandomMochartDataTab from './RandomDataTab';
import ErrorTab from '../misc/ErrorTab';

import type {
  DemoData, DemoMode, MochartDemoConfig, RandomConfigWithValid, DemoDataProvider,
  GroupValue, OnDemoModeChanged, OnDemoChanged
} from '../../types';

const eventKeyChart = 1;
const eventKeyDemo = 2;
const eventKeyConfig = 3;
const eventKeyData = 4;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

interface RandomDemoProps {
  demoData: DemoData;
  demoMode: DemoMode;
  initialDemoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChanged: OnDemoChanged;
  randomId: number;
  incrementRandomId: () => void;
  decrementRandomId: () => void;
}

interface RandomState {
  demoId: string;
  activeKey: number;
  mochartDemoConfig: MochartDemoConfig | null;
  randomConfig: RandomConfigWithValid | null;
}

function buildState(demoData: DemoData, initialDemoId: string): RandomState {
  const base: RandomState = {
    demoId: initialDemoId,
    activeKey: getActiveKeyForInitialDemoId(initialDemoId),
    mochartDemoConfig: null,
    randomConfig: null
  };
  if (initialDemoId !== 'demos') {
    const config = demoData.demoObjectMap[initialDemoId].config;
    const mochartDemoConfig = buildMochartDemoConfig(config);
    const randomConfig = Object.assign({}, demoData.demoObjectMap[initialDemoId].random, { valid: true });
    return { ...base, mochartDemoConfig, randomConfig };
  }
  return base;
}

export default function MochartDemoRandom(props: RandomDemoProps) {
  const { demoData, demoMode, initialDemoId, onDemoModeChanged, onDemoChanged, randomId, incrementRandomId, decrementRandomId } = props;

  const [state, setState] = useState<RandomState>(() => buildState(demoData, initialDemoId));

  const prevInitialDemoId = useRef(initialDemoId);
  if (prevInitialDemoId.current !== initialDemoId) {
    prevInitialDemoId.current = initialDemoId;
    if (initialDemoId !== 'demos') {
      const config = demoData.demoObjectMap[initialDemoId].config;
      const mochartDemoConfig = buildMochartDemoConfig(config);
      const randomConfig = Object.assign({}, demoData.demoObjectMap[initialDemoId].random, { valid: true });
      setState(prev => ({ ...prev, demoId: initialDemoId, activeKey: getActiveKeyForInitialDemoId(initialDemoId), mochartDemoConfig, randomConfig }));
    }
    else {
      setState(prev => ({ ...prev, demoId: initialDemoId, activeKey: getActiveKeyForInitialDemoId(initialDemoId) }));
    }
  }

  const onDemoChange = (demoId: string) => {
    setState(prev => ({ ...prev, demoId }));
    onDemoChanged(demoId);
  };

  const handleSelect = (activeKey: number) => setState(prev => ({ ...prev, activeKey }));

  const { demoId, activeKey, mochartDemoConfig, randomConfig } = state;

  const isDemos = initialDemoId === 'demos';
  const nonDemoNavItemStyle: React.CSSProperties | undefined = isDemos ? { display: 'none' } : undefined;

  return (
    <div className="mochart-demo-container multi">
      <div className="mochart-demo-tabs-container">
        <Nav tabs>
          <NavItem>
            <NavLink active={activeKey === eventKeyDemo} onClick={() => { handleSelect(eventKeyDemo); }}>
              Demos
            </NavLink>
          </NavItem>
          <NavItem style={nonDemoNavItemStyle}>
            <NavLink active={activeKey === eventKeyChart} onClick={() => { handleSelect(eventKeyChart); }}>
              Chart
            </NavLink>
          </NavItem>
          <NavItem style={nonDemoNavItemStyle}>
            <NavLink active={activeKey === eventKeyConfig} onClick={() => { handleSelect(eventKeyConfig); }}>
              Random Config
            </NavLink>
          </NavItem>
          <NavItem style={nonDemoNavItemStyle}>
            <NavLink active={activeKey === eventKeyData} onClick={() => { handleSelect(eventKeyData); }}>
              Data
            </NavLink>
          </NavItem>
        </Nav>
      </div>
      <div className="mochart-demo-content-pane">
        <RandomMochartDemoContent demoData={demoData} mochartDemoConfig={mochartDemoConfig} initialRandomConfig={randomConfig}
          demoMode={demoMode} initialDemoId={initialDemoId} demoId={demoId}
          onDemoModeChanged={onDemoModeChanged} onDemoChange={onDemoChange} activeKey={activeKey}
          randomId={randomId} incrementRandomId={incrementRandomId} decrementRandomId={decrementRandomId} />
      </div>
    </div>
  );
}

interface ContentProps {
  demoData: DemoData;
  mochartDemoConfig: MochartDemoConfig | null;
  initialRandomConfig: RandomConfigWithValid | null;
  demoMode: DemoMode;
  initialDemoId: string;
  demoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChange: OnDemoChanged;
  activeKey: number;
  randomId: number;
  incrementRandomId: () => void;
  decrementRandomId: () => void;
}

interface ContentState {
  randomConfig: RandomConfigWithValid | null;
  dataProvider: DemoDataProvider | null;
  data: unknown;
  applyReuse: boolean;
}

function getData(mochartConfig: MochartConfig, groupValues: GroupValue[], seriesValues: Record<string, (number | undefined)[]>): Record<string, any>[] {
  const { groupAxisConfig } = mochartConfig;
  const groupProperty = groupAxisConfig.property ?? '';
  const data: Record<string, any>[] = groupValues.map(g => ({ [groupProperty]: g }));
  const groupCount = groupValues.length;
  if (groupAxisConfig.displayProperty !== NONE) {
    const displayProperty = groupAxisConfig.displayProperty;
    for (let i = 0; i < groupCount; i++) {
      data[i][displayProperty] = groupValues[i];
    }
  }
  const seriesProperties = Object.keys(seriesValues);
  for (const seriesProperty of seriesProperties) {
    const seriesPropertyValues = seriesValues[seriesProperty];
    for (let i = 0; i < groupCount; i++) {
      data[i][seriesProperty] = seriesPropertyValues[i];
    }
  }
  return data;
}

// With reuse off, the generator gets a config whose reuse settings are
// neutralized, so every dataset is generated independently.
function withReuseNeutralized(config: RandomConfigWithValid): RandomConfigWithValid {
  return {
    ...config,
    group: { ...config.group, reuse: { globalPercentage: 0, stepPercentage: 0 } },
    series: { ...config.series, reuse: { global: false, step: false } }
  };
}

function computeProviderState(mochartDemoConfig: MochartDemoConfig, randomId: number, randomConfig: RandomConfigWithValid | null, applyReuse: boolean): Pick<ContentState, 'dataProvider' | 'data' | 'randomConfig'> {
  const { mochartConfig } = mochartDemoConfig;
  if (randomConfig && randomConfig.valid) {
    const generatorConfig = applyReuse ? randomConfig : withReuseNeutralized(randomConfig);
    const dataProvider = generateChartDataProvider(mochartConfig, generatorConfig, randomId);
    const { groupValues = [], seriesValues = {} } = dataProvider;
    const data = getData(mochartConfig, groupValues, seriesValues);
    const dataErrors = getDataErrors(mochartConfig, dataProvider as unknown as DataProvider);
    if (dataErrors.length > 0) {
      console.error('data errors: ', dataErrors);
      console.warn('group values: ', groupValues);
      console.warn('series values: ', seriesValues);
      return {
        dataProvider: { getGroupValues: () => [], getError: () => 'Error creating DataProvider' },
        data: { error: 'Error creating DataProvider' },
        randomConfig
      };
    }
    else {
      return { dataProvider, data, randomConfig };
    }
  }
  else {
    return {
      dataProvider: { getGroupValues: () => [], getError: () => 'Invalid Random Config' },
      data: { error: 'Invalid Random Config' },
      randomConfig
    };
  }
}

function RandomMochartDemoContent(props: ContentProps) {
  const { initialDemoId, demoData, mochartDemoConfig, initialRandomConfig, demoMode, demoId, onDemoModeChanged, onDemoChange, activeKey, randomId, incrementRandomId, decrementRandomId } = props;

  const [state, setState] = useState<ContentState>(() => {
    // Reuse defaults on to match the generator's historical behavior.
    const base: ContentState = { randomConfig: null, dataProvider: null, data: null, applyReuse: true };
    if (initialDemoId !== 'demos' && mochartDemoConfig) {
      return { ...base, ...computeProviderState(mochartDemoConfig, randomId, initialRandomConfig, base.applyReuse) };
    }
    return base;
  });

  // Regenerate the data provider when the demo/config/randomId changes.
  const prev = useRef({ initialDemoId, initialRandomConfig, mochartDemoConfig, randomId });
  {
    const p = prev.current;
    if (p.initialDemoId !== initialDemoId || p.initialRandomConfig !== initialRandomConfig || p.mochartDemoConfig !== mochartDemoConfig || p.randomId !== randomId) {
      prev.current = { initialDemoId, initialRandomConfig, mochartDemoConfig, randomId };
      if (initialDemoId !== p.initialDemoId || initialRandomConfig !== p.initialRandomConfig || mochartDemoConfig !== p.mochartDemoConfig) {
        if (mochartDemoConfig) {
          setState(s => ({ ...s, ...computeProviderState(mochartDemoConfig, randomId, initialRandomConfig, s.applyReuse) }));
        }
      }
      else if (randomId !== p.randomId) {
        if (mochartDemoConfig) {
          setState(s => ({ ...s, ...computeProviderState(mochartDemoConfig, randomId, s.randomConfig, s.applyReuse) }));
        }
      }
    }
  }

  // Toggling reuse regenerates immediately so the effect is visible.
  const toggleApplyReuse = () => setState(prevState => {
    const applyReuse = !prevState.applyReuse;
    if (mochartDemoConfig) {
      return { ...prevState, applyReuse, ...computeProviderState(mochartDemoConfig, randomId, prevState.randomConfig, applyReuse) };
    }
    return { ...prevState, applyReuse };
  });

  const onRandomizeBack = () => decrementRandomId();
  const onRandomizeNext = () => incrementRandomId();

  // Regenerate immediately so Apply/Reset on the Random Config tab visibly
  // take effect instead of waiting for the next randomize.
  const onUpdateConfig = (randomConfig: RandomConfigWithValid) => setState(prevState =>
    mochartDemoConfig
      ? { ...prevState, ...computeProviderState(mochartDemoConfig, randomId, randomConfig, prevState.applyReuse) }
      : { ...prevState, randomConfig });

  const onResetConfig = () => setState(prevState =>
    mochartDemoConfig
      ? { ...prevState, ...computeProviderState(mochartDemoConfig, randomId, initialRandomConfig, prevState.applyReuse) }
      : { ...prevState, randomConfig: initialRandomConfig });

  const { randomConfig, dataProvider, data, applyReuse } = state;

  if (initialDemoId === 'demos') {
    return (
      <div className="mochart-demo-content single-tab">
        <MochartDemosTab demoData={demoData} demoMode={demoMode} demoId={demoId} onDemoModeChanged={onDemoModeChanged}
          onDemoChange={onDemoChange} active={activeKey === eventKeyDemo} />
      </div>
    );
  }
  else {
    if (!mochartDemoConfig) {
      return null;
    }
    const { mochartConfig } = mochartDemoConfig;
    return (
      <div className="mochart-demo-content">
        <ErrorTab active={activeKey === eventKeyDemo}>
          <MochartDemosTab demoData={demoData} demoMode={demoMode} demoId={demoId} onDemoModeChanged={onDemoModeChanged}
            onDemoChange={onDemoChange} />
        </ErrorTab>
        <ErrorTab active={activeKey === eventKeyChart}>
          <RandomMochartChartTab mochartConfig={mochartConfig} dataProvider={dataProvider}
            onRandomizeBack={onRandomizeBack} onRandomizeNext={onRandomizeNext}
            applyReuse={applyReuse} toggleApplyReuse={toggleApplyReuse} />
        </ErrorTab>
        <ErrorTab active={activeKey === eventKeyConfig}>
          <RandomMochartConfigTab randomConfig={randomConfig!} onUpdate={onUpdateConfig} onReset={onResetConfig} />
        </ErrorTab>
        <ErrorTab active={activeKey === eventKeyData}>
          <RandomMochartDataTab data={data} />
        </ErrorTab>
      </div>
    );
  }
}
