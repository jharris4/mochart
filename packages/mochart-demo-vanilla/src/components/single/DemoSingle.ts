import { demoText } from '@mochart/demo-common';

import { el, errorTab, setActiveClass } from '../misc/dom';
import type { ErrorTabHandle } from '../misc/dom';
import { demosTab } from '../demos/DemosTab';
import type { DemosTabHandle } from '../demos/DemosTab';
import { chartTab } from './ChartTab';
import type { ChartTabHandle } from './ChartTab';
import { configTab } from './ConfigTab';
import type { ConfigTabHandle } from './ConfigTab';
import { dataTab } from './DataTab';
import type { DataTabHandle } from './DataTab';

import type { DemoData, DemoMode, DemoConfig, DataRow, OnDemoModeChanged, OnDemoChanged } from '../../types';

export interface DemoSingleProps {
  demoData: DemoData;
  demoMode: DemoMode;
  initialDemoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChanged: OnDemoChanged;
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
const eventKeyDemo = 4;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

export function demoSingle(props: DemoSingleProps): DemoSingleHandle {
  const { demoData, demoMode, onDemoModeChanged, onDemoChanged } = props;

  let initialDemoId = props.initialDemoId;
  let activeKey = getActiveKeyForInitialDemoId(initialDemoId);

  // Config/data edits made on the Config/Data tabs stay "pending" until the
  // Chart tab is shown again (so the chart animates one combined change).
  let demoId = initialDemoId;
  let pendingConfig: DemoConfig | null = null;
  let pendingData: DataRow[] | null = null;
  let pendingDataError: DataError = false;
  let config: DemoConfig | null = initialDemoId !== 'demos' ? demoData.demoObjectMap[initialDemoId].config : null;
  let data: DataRow[] | null = initialDemoId !== 'demos' ? demoData.demoObjectMap[initialDemoId].data : null;
  let dataError: DataError = false;
  let viewingConfig: DemoConfig | null = config;
  let viewingData: DataRow[] | null = data;
  let viewingDataError: DataError = false;

  // ---------------------------------------------------------------------
  // children (chart/config/data are created lazily on the first real demo)
  // ---------------------------------------------------------------------

  const demos: DemosTabHandle = demosTab({
    active: activeKey === eventKeyDemo,
    demoData,
    demoMode,
    demoId,
    onDemoModeChanged,
    onDemoChange: (nextDemoId: string) => onDemoChanged(nextDemoId)
  });

  let chart: ChartTabHandle | null = null;
  let configEditor: ConfigTabHandle | null = null;
  let dataEditor: DataTabHandle | null = null;
  let demosBoundary: ErrorTabHandle | null = null;
  let chartBoundary: ErrorTabHandle | null = null;
  let configBoundary: ErrorTabHandle | null = null;
  let dataBoundary: ErrorTabHandle | null = null;

  function ensureEditors(): void {
    if (chart !== null) {
      return;
    }
    chart = chartTab({
      active: activeKey === eventKeyChart,
      config: viewingConfig,
      data: viewingData,
      dataError: viewingDataError
    });
    configEditor = configTab({
      active: activeKey === eventKeyConfig,
      config: config!,
      onConfigChange(nextPendingConfig: DemoConfig) {
        pendingConfig = nextPendingConfig;
        sync();
      },
      onConfigReset() {
        const resetConfig = { ...demoData.demoObjectMap[demoId].config };
        pendingConfig = resetConfig;
        config = resetConfig;
        configBoundary?.guard(() => configEditor!.setConfig(resetConfig));
        sync();
      }
    });
    dataEditor = dataTab({
      active: activeKey === eventKeyData,
      config: viewingConfig!,
      data: data!,
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
    demosBoundary = errorTab(() => demos.el, activeKey === eventKeyDemo);
    chartBoundary = errorTab(() => chart!.el, activeKey === eventKeyChart);
    configBoundary = errorTab(() => configEditor!.el, activeKey === eventKeyConfig);
    dataBoundary = errorTab(() => dataEditor!.el, activeKey === eventKeyData);
  }

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

  const demoNav = navItem(demoText.tabs.demos, eventKeyDemo);
  const chartNav = navItem(demoText.tabs.chart, eventKeyChart);
  const configNav = navItem(demoText.tabs.config, eventKeyConfig);
  const dataNav = navItem(demoText.tabs.data, eventKeyData);

  const contentPane = el('div', { className: 'mochart-demo-content-pane' });
  const container = el('div', { className: 'mochart-demo-container' }, [
    el('div', { className: 'mochart-demo-tabs-container' }, [
      el('ul', { className: 'nav nav-tabs' }, [demoNav.li, chartNav.li, configNav.li, dataNav.li])
    ]),
    contentPane
  ]);

  let layoutIsDemos: boolean | null = null;

  function buildLayout(): void {
    const isDemos = initialDemoId === 'demos';
    if (layoutIsDemos === isDemos) {
      return;
    }
    layoutIsDemos = isDemos;
    if (isDemos) {
      contentPane.replaceChildren(
        el('div', { className: 'mochart-demo-content single-tab' }, [demos.el])
      );
    }
    else {
      ensureEditors();
      contentPane.replaceChildren(
        el('div', { className: 'mochart-demo-content' }, [
          demosBoundary!.el, chartBoundary!.el, configBoundary!.el, dataBoundary!.el
        ])
      );
    }
  }

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
      chartBoundary?.guard(() => chart?.update({ config: viewingConfig, data: viewingData, dataError: viewingDataError }));
      if (viewingConfig !== null) {
        dataBoundary?.guard(() => dataEditor?.setConfig(viewingConfig!));
      }
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
    demoNav.button.classList.toggle('active', activeKey === eventKeyDemo);
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

    demos.setActive(activeKey === eventKeyDemo);
    demosBoundary?.setActive(activeKey === eventKeyDemo);
    chartBoundary?.setActive(activeKey === eventKeyChart);
    configBoundary?.setActive(activeKey === eventKeyConfig);
    dataBoundary?.setActive(activeKey === eventKeyData);
    chartBoundary?.guard(() => chart?.setActive(activeKey === eventKeyChart));
    configBoundary?.guard(() => configEditor?.setActive(activeKey === eventKeyConfig));
    dataBoundary?.guard(() => dataEditor?.setActive(activeKey === eventKeyData));
  }

  buildLayout();
  sync();

  return {
    el: container,
    // When the routed demo changes, reload its config/data (and promote them
    // straight to the visible chart, matching the framework lifecycle).
    update(nextInitialDemoId: string) {
      if (nextInitialDemoId === initialDemoId) {
        return;
      }
      initialDemoId = nextInitialDemoId;
      activeKey = getActiveKeyForInitialDemoId(nextInitialDemoId);
      demoId = nextInitialDemoId;
      demos.setDemoId(demoId);
      if (nextInitialDemoId === 'demos') {
        config = null;
        data = null;
        dataError = null;
        viewingConfig = null;
        viewingData = null;
      }
      else {
        config = demoData.demoObjectMap[nextInitialDemoId].config;
        data = demoData.demoObjectMap[nextInitialDemoId].data;
        dataError = null;
        pendingConfig = config;
        pendingData = data;
        buildLayout();
        chartShown();
        configBoundary?.guard(() => configEditor?.setConfig(config!));
        dataBoundary?.guard(() => dataEditor?.setData(data!));
      }
      void dataError;
      buildLayout();
      sync();
    },
    destroy() {
      chart?.destroy();
    }
  };
}
