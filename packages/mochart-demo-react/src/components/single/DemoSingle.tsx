import { useState, useEffect, useRef } from 'react';

import { consumeSingleShareState, demoText } from '@mochart/demo-common';

import MochartChartTab from './ChartTab';
import MochartDataTab from './DataTab';
import MochartConfigTab from './ConfigTab';
import ErrorTab from '../misc/ErrorTab';
import { ModeSwitcher, SiteRootButton, BackToDemosButton, ThemeToggleButton } from '../misc/ModeSwitcher';

import type { DemoTabProps, DemoConfig, DataRow } from '../../types';

const eventKeyChart = 1;
const eventKeyConfig = 2;
const eventKeyData = 3;

type DataError = string | boolean | null;

export default function MochartDemoSingle({ demoData, initialDemoId, siteRootUrl, onModeChanged, onBackToDemos }: DemoTabProps) {
  const [activeKey, setActiveKey] = useState(eventKeyChart);
  // Applied config/data edits are held until the Chart tab is shown; badge the
  // Chart tab so it's visible that something is waiting there.
  const [hasPending, setHasPending] = useState(false);

  // Reset the active tab whenever the routed demo changes (matches the old
  // UNSAFE_componentWillReceiveProps behavior via the render-phase reset pattern).
  const prevInitialDemoId = useRef(initialDemoId);
  if (prevInitialDemoId.current !== initialDemoId) {
    prevInitialDemoId.current = initialDemoId;
    setActiveKey(eventKeyChart);
  }

  const handleSelect = (nextActiveKey: number) => setActiveKey(nextActiveKey);

  return (
    <div className="mochart-demo-container">
      <div className="mochart-demo-tabs-container">
        <div className="mochart-demo-nav-group">
          <SiteRootButton siteRootUrl={siteRootUrl} />
          <BackToDemosButton onBackToDemos={onBackToDemos} />
          <ul className="demo-tabs">
            <li className="demo-tab-item">
              <button type="button" className={"demo-tab" + (activeKey === eventKeyChart ? " active" : "")}
                title={hasPending && activeKey !== eventKeyChart ? demoText.tabs.chartPendingTitle : undefined}
                onClick={() => { handleSelect(eventKeyChart); }}>
                {demoText.tabs.chart}{hasPending && activeKey !== eventKeyChart ? <span className="mochart-pending-badge" aria-hidden="true" /> : null}
              </button>
            </li>
            <li className="demo-tab-item">
              <button type="button" className={"demo-tab" + (activeKey === eventKeyConfig ? " active" : "")} onClick={() => { handleSelect(eventKeyConfig); }}>
                {demoText.tabs.config}
              </button>
            </li>
            <li className="demo-tab-item">
              <button type="button" className={"demo-tab" + (activeKey === eventKeyData ? " active" : "")} onClick={() => { handleSelect(eventKeyData); }}>
                {demoText.tabs.data}
              </button>
            </li>
          </ul>
        </div>
        <div className="mochart-demo-nav-group">
          <ModeSwitcher demoMode="single" onModeChanged={onModeChanged} />
          <ThemeToggleButton />
        </div>
      </div>
      <MochartDemoContent activeKey={activeKey} demoData={demoData} initialDemoId={initialDemoId}
        onPendingChanged={setHasPending} />
    </div>
  );
}

interface ContentProps {
  demoData: DemoTabProps['demoData'];
  initialDemoId: string;
  activeKey: number;
  onPendingChanged: (hasPending: boolean) => void;
}

interface ContentState {
  demoId: string;
  pendingConfig: DemoConfig | null;
  pendingData: DataRow[] | null;
  pendingDataError: DataError;
  config: DemoConfig;
  data: DataRow[];
  dataError: DataError;
  viewingConfig: DemoConfig;
  viewingData: DataRow[];
  viewingDataError: DataError;
}

function MochartDemoContent(props: ContentProps) {
  const { initialDemoId, activeKey, demoData, onPendingChanged } = props;

  const [state, setState] = useState<ContentState>(() => {
    // A share link carries edited config/data in the URL hash; it overrides
    // the demo's own config/data for the initial mount only.
    const shared = consumeSingleShareState();
    const initialConfig = shared?.config ?? demoData.demoObjectMap[initialDemoId].config;
    const initialData = shared?.data ?? demoData.demoObjectMap[initialDemoId].data;
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

  // Reload the demo's config/data when the routed demo changes; the pending
  // config/data are promoted straight to the chart by the effect below (the
  // parent resets the active tab back to Chart at the same time).
  const prevInitialDemoId = useRef(initialDemoId);
  if (prevInitialDemoId.current !== initialDemoId) {
    prevInitialDemoId.current = initialDemoId;
    const config = demoData.demoObjectMap[initialDemoId].config;
    const data = demoData.demoObjectMap[initialDemoId].data;
    setState(prev => ({ ...prev, demoId: initialDemoId, config, data, dataError: null, pendingConfig: config, pendingData: data }));
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

  const { viewingConfig, viewingData, viewingDataError, config, data } = state;

  return (
    <div className="mochart-demo-content-pane">
      <div className="mochart-demo-content">
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
