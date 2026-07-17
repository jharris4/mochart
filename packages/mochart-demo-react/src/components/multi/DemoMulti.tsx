import React, { useState, useRef } from 'react';
import { Nav, NavItem, NavLink } from 'reactstrap';

import MochartDemosTab from '../demos/DemosTab';
import MultiMochartChartsTab from './ChartsTab';
import ErrorTab from '../misc/ErrorTab';

import type { DemoData, DemoMode, DemoTabProps, OnDemoModeChanged, OnDemoChanged } from '../../types';

const eventKeyChart = 1;
const eventKeyDemo = 2;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

export default function MochartDemoMulti({ demoData, demoMode, initialDemoId, onDemoModeChanged, onDemoChanged }: DemoTabProps) {
  const [demoId, setDemoId] = useState(initialDemoId);
  const [activeKey, setActiveKey] = useState(() => getActiveKeyForInitialDemoId(initialDemoId));

  const prevInitialDemoId = useRef(initialDemoId);
  if (prevInitialDemoId.current !== initialDemoId) {
    prevInitialDemoId.current = initialDemoId;
    setActiveKey(getActiveKeyForInitialDemoId(initialDemoId));
    setDemoId(initialDemoId);
  }

  const onDemoChange = (nextDemoId: string) => {
    setDemoId(nextDemoId);
    onDemoChanged(nextDemoId);
  };

  const handleSelect = (nextActiveKey: number) => setActiveKey(nextActiveKey);

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
        </Nav>
      </div>
      <div className="mochart-demo-content-pane">
        <MultiMochartDemoContent demoData={demoData} demoMode={demoMode} initialDemoId={initialDemoId} demoId={demoId}
          onDemoModeChanged={onDemoModeChanged} onDemoChange={onDemoChange} activeKey={activeKey} />
      </div>
    </div>
  );
}

interface ContentProps {
  demoData: DemoData;
  demoMode: DemoMode;
  initialDemoId: string;
  demoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChange: OnDemoChanged;
  activeKey: number;
}

function MultiMochartDemoContent({ initialDemoId, demoData, demoMode, demoId, onDemoModeChanged, onDemoChange, activeKey }: ContentProps) {
  if (initialDemoId === 'demos') {
    return (
      <div className="mochart-demo-content single-tab">
        <MochartDemosTab demoData={demoData} demoMode={demoMode} demoId={demoId} onDemoModeChanged={onDemoModeChanged}
          onDemoChange={onDemoChange} active={activeKey === eventKeyDemo} />
      </div>
    );
  }
  else {
    return (
      <div className="mochart-demo-content">
        <ErrorTab active={activeKey === eventKeyDemo}>
          <MochartDemosTab demoData={demoData} demoMode={demoMode} demoId={demoId} onDemoModeChanged={onDemoModeChanged}
            onDemoChange={onDemoChange} />
        </ErrorTab>
        <ErrorTab active={activeKey === eventKeyChart}>
          <MultiMochartChartsTab demoObject={demoData.demoObjectMap[demoId]} />
        </ErrorTab>
      </div>
    );
  }
}
