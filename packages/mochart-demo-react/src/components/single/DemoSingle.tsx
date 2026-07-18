import React, { useState, useEffect, useRef } from 'react';
import { Nav, NavItem, NavLink } from 'reactstrap';

import MochartDemosTab from '../demos/DemosTab';
import MochartChartTab from './ChartTab';
import MochartDataTab from './DataTab';
import MochartConfigTab from './ConfigTab';
import ErrorTab from '../misc/ErrorTab';

import type { DemoTabProps, DemoConfig, DataRow } from '../../types';

const eventKeyChart = 1;
const eventKeyConfig = 2;
const eventKeyData = 3;
const eventKeyDemo = 4;

type DataError = string | boolean | null;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

export default function MochartDemoSingle({ demoData, demoMode, initialDemoId, onDemoModeChanged, onDemoChanged }: DemoTabProps) {
  const [activeKey, setActiveKey] = useState(() => getActiveKeyForInitialDemoId(initialDemoId));
  // Applied config/data edits are held until the Chart tab is shown; badge the
  // Chart tab so it's visible that something is waiting there.
  const [hasPending, setHasPending] = useState(false);

  // Reset the active tab whenever the routed demo changes (matches the old
  // UNSAFE_componentWillReceiveProps behavior via the render-phase reset pattern).
  const prevInitialDemoId = useRef(initialDemoId);
  if (prevInitialDemoId.current !== initialDemoId) {
    prevInitialDemoId.current = initialDemoId;
    setActiveKey(getActiveKeyForInitialDemoId(initialDemoId));
  }

  const handleSelect = (nextActiveKey: number) => setActiveKey(nextActiveKey);

  return (
    <div className="mochart-demo-container">
      <div className="mochart-demo-tabs-container">
        <Nav tabs>
          <NavItem>
            <NavLink active={activeKey === eventKeyDemo} onClick={() => { handleSelect(eventKeyDemo); }}>
              Demos
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink active={activeKey === eventKeyChart}
              title={hasPending && activeKey !== eventKeyChart ? "Applied changes are waiting — switch here to see them" : void 0}
              onClick={() => { handleSelect(eventKeyChart); }}>
              Chart{hasPending && activeKey !== eventKeyChart ? <span className="mochart-pending-badge" aria-hidden="true" /> : null}
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink active={activeKey === eventKeyConfig} onClick={() => { handleSelect(eventKeyConfig); }}>
              Config
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink active={activeKey === eventKeyData} onClick={() => { handleSelect(eventKeyData); }}>
              Data
            </NavLink>
          </NavItem>
        </Nav>
      </div>
      <MochartDemoContent activeKey={activeKey} demoData={demoData} demoMode={demoMode} initialDemoId={initialDemoId}
        onDemoModeChanged={onDemoModeChanged} onDemoChanged={onDemoChanged} onPendingChanged={setHasPending} />
    </div>
  );
}

interface ContentProps extends DemoTabProps {
  activeKey: number;
  onPendingChanged: (hasPending: boolean) => void;
}

interface ContentState {
  demoId: string;
  pendingConfig: DemoConfig | null;
  pendingData: DataRow[] | null;
  pendingDataError: DataError;
  config: DemoConfig | null;
  data: DataRow[] | null;
  dataError: DataError;
  viewingConfig: DemoConfig | null;
  viewingData: DataRow[] | null;
  viewingDataError: DataError;
}

function MochartDemoContent(props: ContentProps) {
  const { initialDemoId, activeKey, demoData, demoMode, onDemoModeChanged, onDemoChanged, onPendingChanged } = props;

  const [state, setState] = useState<ContentState>(() => {
    let initialConfig: DemoConfig | null = null;
    let initialData: DataRow[] | null = null;
    if (initialDemoId !== 'demos') {
      initialConfig = demoData.demoObjectMap[initialDemoId].config;
      initialData = demoData.demoObjectMap[initialDemoId].data;
    }
    return {
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
  });

  // Reload the demo's config/data when the routed demo changes.
  const prevInitialDemoId = useRef(initialDemoId);
  if (prevInitialDemoId.current !== initialDemoId) {
    prevInitialDemoId.current = initialDemoId;
    if (initialDemoId === 'demos') {
      setState(prev => ({ ...prev, demoId: initialDemoId, config: null, data: null, dataError: null, viewingConfig: null, viewingData: null }));
    }
    else {
      const config = demoData.demoObjectMap[initialDemoId].config;
      const data = demoData.demoObjectMap[initialDemoId].data;
      setState(prev => ({ ...prev, demoId: initialDemoId, config, data, dataError: null, pendingConfig: config, pendingData: data }));
    }
  }

  // Promote pending config/data edits to the visible chart when the Chart tab
  // is (re)shown, so a single combined change animates.
  useEffect(() => {
    if (activeKey === eventKeyChart) {
      setState(prev => {
        const { pendingConfig, pendingData, pendingDataError } = prev;
        if (pendingConfig !== null || pendingData !== null || pendingDataError !== null) {
          const next = { ...prev };
          if (pendingConfig !== null) {
            next.viewingConfig = pendingConfig;
            next.pendingConfig = null;
          }
          if (pendingData !== null) {
            next.viewingData = pendingData;
            next.pendingData = null;
          }
          if (pendingDataError !== null) {
            next.viewingDataError = pendingDataError;
            next.pendingDataError = null;
          }
          return next;
        }
        return prev;
      });
    }
  }, [activeKey, initialDemoId]);

  // Report whether config/data edits are queued so the parent can badge the
  // Chart tab.
  const { pendingConfig: reportPendingConfig, pendingData: reportPendingData } = state;
  useEffect(() => {
    onPendingChanged(reportPendingConfig !== null || reportPendingData !== null);
  }, [onPendingChanged, reportPendingConfig, reportPendingData]);

  const onConfigChange = (pendingConfig: DemoConfig) => setState(prev => ({ ...prev, pendingConfig }));

  const onConfigReset = () => {
    const resetConfig = { ...demoData.demoObjectMap[state.demoId].config };
    setState(prev => ({ ...prev, pendingConfig: resetConfig, config: resetConfig }));
  };

  const onDataChange = (pendingData: DataRow[]) => setState(prev => ({ ...prev, pendingData, pendingDataError: false }));

  const onDataError = (errorMessage: string) => setState(prev => ({ ...prev, pendingDataError: errorMessage }));

  const onDataReset = () => {
    // give it a new array reference so children know to update
    const resetData = demoData.demoObjectMap[state.demoId].data.slice();
    setState(prev => ({ ...prev, pendingData: resetData, pendingDataError: false }));
  };

  const onDemoChange = (demoId: string) => onDemoChanged(demoId);

  const { viewingConfig, viewingData, viewingDataError, config, data, demoId } = state;

  if (initialDemoId === 'demos') {
    return (
      <div className="mochart-demo-content-pane">
        <div className="mochart-demo-content single-tab">
          <MochartDemosTab active={activeKey === eventKeyDemo} demoData={demoData} demoMode={demoMode} demoId={demoId}
            onDemoModeChanged={onDemoModeChanged} onDemoChange={onDemoChange} />
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
              onDemoModeChanged={onDemoModeChanged} onDemoChange={onDemoChange} />
          </ErrorTab>
          <ErrorTab active={activeKey === eventKeyChart}>
            <MochartChartTab config={viewingConfig} data={viewingData} dataError={viewingDataError} />
          </ErrorTab>
          <ErrorTab active={activeKey === eventKeyConfig}>
            <MochartConfigTab config={config} onConfigChange={onConfigChange} onConfigReset={onConfigReset} />
          </ErrorTab>
          <ErrorTab active={activeKey === eventKeyData}>
            <MochartDataTab config={viewingConfig} data={data} onDataChange={onDataChange}
              onDataError={onDataError} onDataReset={onDataReset} />
          </ErrorTab>
        </div>
      </div>
    );
  }
}
