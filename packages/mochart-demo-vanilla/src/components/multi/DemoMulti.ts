import { el, errorTab } from '../misc/dom';
import type { ErrorTabHandle } from '../misc/dom';
import { demosTab } from '../demos/DemosTab';
import type { DemosTabHandle } from '../demos/DemosTab';
import { chartsTab } from './ChartsTab';
import type { ChartsTabHandle } from './ChartsTab';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

export interface DemoMultiProps {
  demoData: DemoData;
  demoMode: DemoMode;
  initialDemoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChanged: OnDemoChanged;
}

export interface DemoMultiHandle {
  el: HTMLElement;
  update(initialDemoId: string): void;
  destroy(): void;
}

const eventKeyChart = 1;
const eventKeyDemo = 2;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

export function demoMulti(props: DemoMultiProps): DemoMultiHandle {
  const { demoData, demoMode, onDemoModeChanged, onDemoChanged } = props;

  let initialDemoId = props.initialDemoId;
  let demoId = initialDemoId;
  let activeKey = getActiveKeyForInitialDemoId(initialDemoId);

  const demos: DemosTabHandle = demosTab({
    active: activeKey === eventKeyDemo,
    demoData,
    demoMode,
    demoId,
    onDemoModeChanged,
    onDemoChange(nextDemoId: string) {
      demoId = nextDemoId;
      onDemoChanged(nextDemoId);
    }
  });

  let charts: ChartsTabHandle | null = null;
  let demosBoundary: ErrorTabHandle | null = null;
  let chartsBoundary: ErrorTabHandle | null = null;

  function ensureCharts(): void {
    if (charts !== null) {
      return;
    }
    charts = chartsTab({
      active: activeKey === eventKeyChart,
      demoObject: demoData.demoObjectMap[demoId]
    });
    demosBoundary = errorTab(() => demos.el, activeKey === eventKeyDemo);
    chartsBoundary = errorTab(() => charts!.el, activeKey === eventKeyChart);
  }

  function navItem(text: string, key: number): { li: HTMLLIElement; button: HTMLButtonElement } {
    const button = el('button', {
      className: 'nav-link' + (activeKey === key ? ' active' : ''),
      attrs: { type: 'button' },
      text
    });
    button.addEventListener('click', () => handleSelect(key));
    return { li: el('li', { className: 'nav-item' }, [button]), button };
  }

  const demoNav = navItem('Demos', eventKeyDemo);
  const chartNav = navItem('Chart', eventKeyChart);

  const contentPane = el('div', { className: 'mochart-demo-content-pane' });
  const container = el('div', { className: 'mochart-demo-container multi' }, [
    el('div', { className: 'mochart-demo-tabs-container' }, [
      el('ul', { className: 'nav nav-tabs' }, [demoNav.li, chartNav.li])
    ]),
    contentPane
  ]);

  let layoutIsDemos: boolean | null = null;

  function buildLayout(): void {
    const isDemos = initialDemoId === 'demos';
    chartNav.li.style.display = isDemos ? 'none' : '';
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
      ensureCharts();
      contentPane.replaceChildren(
        el('div', { className: 'mochart-demo-content' }, [demosBoundary!.el, chartsBoundary!.el])
      );
    }
  }

  function handleSelect(nextActiveKey: number): void {
    activeKey = nextActiveKey;
    sync();
  }

  function sync(): void {
    demoNav.button.classList.toggle('active', activeKey === eventKeyDemo);
    chartNav.button.classList.toggle('active', activeKey === eventKeyChart);
    demos.setActive(activeKey === eventKeyDemo);
    demosBoundary?.setActive(activeKey === eventKeyDemo);
    chartsBoundary?.setActive(activeKey === eventKeyChart);
    chartsBoundary?.guard(() => charts?.setActive(activeKey === eventKeyChart));
  }

  buildLayout();
  sync();

  return {
    el: container,
    update(nextInitialDemoId: string) {
      if (nextInitialDemoId === initialDemoId) {
        return;
      }
      initialDemoId = nextInitialDemoId;
      activeKey = getActiveKeyForInitialDemoId(nextInitialDemoId);
      demoId = nextInitialDemoId;
      demos.setDemoId(demoId);
      buildLayout();
      if (nextInitialDemoId !== 'demos') {
        chartsBoundary?.guard(() => charts?.setDemoObject(demoData.demoObjectMap[demoId]));
      }
      sync();
    },
    destroy() {
      charts?.destroy();
    }
  };
}
