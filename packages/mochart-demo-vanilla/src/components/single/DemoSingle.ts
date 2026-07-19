import { consumeShareState, demoText } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import { el, errorTab } from '../misc/dom';
import type { ErrorTabHandle } from '../misc/dom';
import { backToDemosButton, modeSwitcher, siteRootButton } from '../misc/ModeSwitcher';
import { chartTab } from './ChartTab';
import type { ChartTabHandle } from './ChartTab';
import { configTab } from './ConfigTab';
import type { ConfigTabHandle } from './ConfigTab';
import { dataTab } from './DataTab';
import type { DataTabHandle } from './DataTab';

import type { DemoData, DemoConfig, DataRow } from '../../types';

export interface DemoSingleProps {
  demoData: DemoData;
  initialDemoId: string;
  siteRootUrl?: string;
  onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
  onBackToDemos: () => void;
}

export interface DemoSingleHandle {
  el: HTMLElement;
  update(initialDemoId: string): void;
  destroy(): void;
}

type DataError = string | boolean | null;

const eventKeyChart = 1;
const eventKeyConfig = 2;
const eventKeyData = 3;

export function demoSingle(props: DemoSingleProps): DemoSingleHandle {
  const { demoData, onModeChanged, onBackToDemos } = props;

  let initialDemoId = props.initialDemoId;
  let activeKey = eventKeyChart;

  // A share link carries edited config/data in the URL hash; it overrides
  // the demo's own config/data for the initial mount only.
  const sharedState = consumeShareState();

  // Config/data edits made on the Config/Data tabs stay "pending" until the
  // Chart tab is shown again (so the chart animates one combined change).
  let demoId = initialDemoId;
  let pendingConfig: DemoConfig | null = null;
  let pendingData: DataRow[] | null = null;
  let pendingDataError: DataError = false;
  let config: DemoConfig = sharedState?.config ?? demoData.demoObjectMap[initialDemoId].config;
  let data: DataRow[] = sharedState?.data ?? demoData.demoObjectMap[initialDemoId].data;
  let viewingConfig: DemoConfig = config;
  let viewingData: DataRow[] = data;
  let viewingDataError: DataError = false;

  // ---------------------------------------------------------------------
  // children
  // ---------------------------------------------------------------------

  const chart: ChartTabHandle = chartTab({
    active: activeKey === eventKeyChart,
    config: viewingConfig,
    data: viewingData,
    dataError: viewingDataError
  });
  const configEditor: ConfigTabHandle = configTab({
    active: activeKey === eventKeyConfig,
    config,
    onConfigChange(nextPendingConfig: DemoConfig) {
      pendingConfig = nextPendingConfig;
      sync();
    },
    onConfigReset() {
      const resetConfig = { ...demoData.demoObjectMap[demoId].config };
      pendingConfig = resetConfig;
      config = resetConfig;
      configBoundary.guard(() => configEditor.setConfig(resetConfig));
      sync();
    }
  });
  const dataEditor: DataTabHandle = dataTab({
    active: activeKey === eventKeyData,
    config: viewingConfig,
    data,
    onDataChange(nextPendingData: DataRow[]) {
      pendingData = nextPendingData;
      pendingDataError = false;
      sync();
    },
    onDataError(errorMessage: string) {
      pendingDataError = errorMessage;
      sync();
    },
    onDataReset() {
      // give it a new array reference so children know to update
      pendingData = demoData.demoObjectMap[demoId].data.slice();
      pendingDataError = false;
      sync();
    }
  });
  const chartBoundary: ErrorTabHandle = errorTab(() => chart.el, activeKey === eventKeyChart);
  const configBoundary: ErrorTabHandle = errorTab(() => configEditor.el, activeKey === eventKeyConfig);
  const dataBoundary: ErrorTabHandle = errorTab(() => dataEditor.el, activeKey === eventKeyData);

  // ---------------------------------------------------------------------
  // tabs header
  // ---------------------------------------------------------------------

  const pendingBadge = el('span', { className: 'mochart-pending-badge', attrs: { 'aria-hidden': 'true' } });

  function navItem(text: string, key: number): { li: HTMLLIElement; button: HTMLButtonElement } {
    const button = el('button', {
      className: 'nav-link' + (activeKey === key ? ' active' : ''),
      attrs: { type: 'button' },
      text
    });
    button.addEventListener('click', () => handleSelect(key));
    return { li: el('li', { className: 'nav-item' }, [button]), button };
  }

  const chartNav = navItem(demoText.tabs.chart, eventKeyChart);
  const configNav = navItem(demoText.tabs.config, eventKeyConfig);
  const dataNav = navItem(demoText.tabs.data, eventKeyData);

  const contentPane = el('div', { className: 'mochart-demo-content-pane' }, [
    el('div', { className: 'mochart-demo-content' }, [
      chartBoundary.el, configBoundary.el, dataBoundary.el
    ])
  ]);
  const container = el('div', { className: 'mochart-demo-container' }, [
    el('div', { className: 'mochart-demo-tabs-container' }, [
      el('div', { className: 'mochart-demo-nav-group' }, [
        siteRootButton(props.siteRootUrl),
        backToDemosButton(onBackToDemos),
        el('ul', { className: 'nav nav-tabs' }, [chartNav.li, configNav.li, dataNav.li])
      ]),
      modeSwitcher({ demoMode: 'single', onModeChanged })
    ]),
    contentPane
  ]);

  function chartShown(): void {
    if (pendingConfig !== null || pendingData !== null || pendingDataError !== null) {
      if (pendingConfig !== null) {
        viewingConfig = pendingConfig;
        pendingConfig = null;
      }
      if (pendingData !== null) {
        viewingData = pendingData;
        pendingData = null;
      }
      if (pendingDataError !== null) {
        viewingDataError = pendingDataError;
        pendingDataError = null;
      }
      chartBoundary.guard(() => chart.update({ config: viewingConfig, data: viewingData, dataError: viewingDataError }));
      dataBoundary.guard(() => dataEditor.setConfig(viewingConfig));
    }
  }

  function handleSelect(nextActiveKey: number): void {
    const previousActiveKey = activeKey;
    activeKey = nextActiveKey;
    if (nextActiveKey === eventKeyChart && previousActiveKey !== eventKeyChart) {
      chartShown();
    }
    sync();
  }

  // Applied config/data edits are held until the Chart tab is shown; badge the
  // Chart tab so it's visible that something is waiting there.
  function sync(): void {
    const hasPendingChanges = activeKey !== eventKeyChart && (pendingConfig !== null || pendingData !== null);
    chartNav.button.classList.toggle('active', activeKey === eventKeyChart);
    configNav.button.classList.toggle('active', activeKey === eventKeyConfig);
    dataNav.button.classList.toggle('active', activeKey === eventKeyData);
    chartNav.button.title = hasPendingChanges ? demoText.tabs.chartPendingTitle : '';
    if (hasPendingChanges) {
      if (pendingBadge.parentElement === null) {
        chartNav.button.append(pendingBadge);
      }
    }
    else {
      pendingBadge.remove();
    }

    chartBoundary.setActive(activeKey === eventKeyChart);
    configBoundary.setActive(activeKey === eventKeyConfig);
    dataBoundary.setActive(activeKey === eventKeyData);
    chartBoundary.guard(() => chart.setActive(activeKey === eventKeyChart));
    configBoundary.guard(() => configEditor.setActive(activeKey === eventKeyConfig));
    dataBoundary.guard(() => dataEditor.setActive(activeKey === eventKeyData));
  }

  sync();

  return {
    el: container,
    // When the routed demo changes (history navigation between two demos),
    // reload its config/data and promote them straight to the visible chart.
    update(nextInitialDemoId: string) {
      if (nextInitialDemoId === initialDemoId) {
        return;
      }
      initialDemoId = nextInitialDemoId;
      activeKey = eventKeyChart;
      demoId = nextInitialDemoId;
      config = demoData.demoObjectMap[nextInitialDemoId].config;
      data = demoData.demoObjectMap[nextInitialDemoId].data;
      pendingConfig = config;
      pendingData = data;
      chartShown();
      configBoundary.guard(() => configEditor.setConfig(config));
      dataBoundary.guard(() => dataEditor.setData(data));
      sync();
    },
    destroy() {
      chart.destroy();
    }
  };
}
