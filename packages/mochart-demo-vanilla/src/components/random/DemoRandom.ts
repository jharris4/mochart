import { buildMochartDemoConfig } from '@mochart/demo-common';

import { el } from '../misc/dom';
import { demosTab } from '../demos/DemosTab';
import type { DemosTabHandle } from '../demos/DemosTab';
import { randomContent } from './RandomContent';
import type { RandomContentHandle } from './RandomContent';

import type { DemoData, DemoMode, MochartDemoConfig, RandomConfigWithValid, OnDemoModeChanged, OnDemoChanged } from '../../types';

export interface DemoRandomProps {
  demoData: DemoData;
  demoMode: DemoMode;
  initialDemoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChanged: OnDemoChanged;
  randomId: number;
  incrementRandomId: () => void;
  decrementRandomId: () => void;
}

export interface DemoRandomHandle {
  el: HTMLElement;
  update(initialDemoId: string, randomId: number): void;
  destroy(): void;
}

const eventKeyChart = 1;
const eventKeyDemo = 2;
const eventKeyConfig = 3;
const eventKeyData = 4;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

export function demoRandom(props: DemoRandomProps): DemoRandomHandle {
  const { demoData, demoMode, onDemoModeChanged, onDemoChanged, incrementRandomId, decrementRandomId } = props;

  let initialDemoId = props.initialDemoId;
  let randomId = props.randomId;
  let demoId = initialDemoId;
  let activeKey = getActiveKeyForInitialDemoId(initialDemoId);

  function buildStateForDemo(currentDemoId: string): { mochartDemoConfig: MochartDemoConfig; randomConfig: RandomConfigWithValid } {
    const config = demoData.demoObjectMap[currentDemoId].config;
    return {
      mochartDemoConfig: buildMochartDemoConfig(config),
      randomConfig: Object.assign({}, demoData.demoObjectMap[currentDemoId].random, { valid: true })
    };
  }

  let demoState = initialDemoId !== 'demos' ? buildStateForDemo(initialDemoId) : null;

  function onDemoChange(nextDemoId: string): void {
    demoId = nextDemoId;
    onDemoChanged(nextDemoId);
  }

  // Demos-only view used until a real demo is routed (content is created
  // lazily because it needs a demo's config).
  const demosOnly: DemosTabHandle = demosTab({
    active: activeKey === eventKeyDemo,
    demoData,
    demoMode,
    demoId,
    onDemoModeChanged,
    onDemoChange
  });

  let content: RandomContentHandle | null = null;

  function ensureContent(): void {
    if (content !== null || demoState === null) {
      return;
    }
    content = randomContent({
      demoData,
      mochartDemoConfig: demoState.mochartDemoConfig,
      initialRandomConfig: demoState.randomConfig,
      demoMode,
      initialDemoId,
      demoId,
      onDemoModeChanged,
      onDemoChange,
      activeKey,
      eventKeys: { eventKeyChart, eventKeyDemo, eventKeyConfig, eventKeyData },
      randomId,
      incrementRandomId,
      decrementRandomId
    });
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
  const configNav = navItem('Random Config', eventKeyConfig);
  const dataNav = navItem('Data', eventKeyData);

  const contentPane = el('div', { className: 'mochart-demo-content-pane' });
  const container = el('div', { className: 'mochart-demo-container multi' }, [
    el('div', { className: 'mochart-demo-tabs-container' }, [
      el('ul', { className: 'nav nav-tabs' }, [demoNav.li, chartNav.li, configNav.li, dataNav.li])
    ]),
    contentPane
  ]);

  let layoutIsDemos: boolean | null = null;

  function buildLayout(): void {
    const isDemos = initialDemoId === 'demos';
    chartNav.li.style.display = isDemos ? 'none' : '';
    configNav.li.style.display = isDemos ? 'none' : '';
    dataNav.li.style.display = isDemos ? 'none' : '';
    if (layoutIsDemos === isDemos) {
      return;
    }
    layoutIsDemos = isDemos;
    if (isDemos) {
      contentPane.replaceChildren(
        el('div', { className: 'mochart-demo-content single-tab' }, [demosOnly.el])
      );
    }
    else {
      ensureContent();
      contentPane.replaceChildren(content!.el);
    }
  }

  function handleSelect(nextActiveKey: number): void {
    activeKey = nextActiveKey;
    sync();
  }

  function sync(): void {
    demoNav.button.classList.toggle('active', activeKey === eventKeyDemo);
    chartNav.button.classList.toggle('active', activeKey === eventKeyChart);
    configNav.button.classList.toggle('active', activeKey === eventKeyConfig);
    dataNav.button.classList.toggle('active', activeKey === eventKeyData);
    demosOnly.setActive(activeKey === eventKeyDemo);
    content?.setActiveKey(activeKey);
  }

  buildLayout();
  sync();

  return {
    el: container,
    update(nextInitialDemoId: string, nextRandomId: number) {
      const demoIdChanged = nextInitialDemoId !== initialDemoId;
      const randomIdChanged = nextRandomId !== randomId;
      if (!demoIdChanged && !randomIdChanged) {
        return;
      }
      if (demoIdChanged) {
        initialDemoId = nextInitialDemoId;
        demoId = nextInitialDemoId;
        activeKey = getActiveKeyForInitialDemoId(nextInitialDemoId);
        demosOnly.setDemoId(demoId);
        if (nextInitialDemoId !== 'demos') {
          demoState = buildStateForDemo(nextInitialDemoId);
        }
      }
      randomId = nextRandomId;
      buildLayout();
      if (initialDemoId !== 'demos' && demoState !== null) {
        content?.update({
          mochartDemoConfig: demoState.mochartDemoConfig,
          initialRandomConfig: demoState.randomConfig,
          initialDemoId,
          demoId,
          randomId
        });
      }
      sync();
    },
    destroy() {
      content?.destroy();
    }
  };
}
