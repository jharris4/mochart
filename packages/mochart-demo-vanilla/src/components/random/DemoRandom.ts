import { buildMochartDemoConfig, demoText } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import { el } from '../misc/dom';
import { backToDemosButton, modeSwitcher, siteRootButton } from '../misc/ModeSwitcher';
import { randomContent } from './RandomContent';
import type { RandomContentHandle } from './RandomContent';

import type { DemoData, MochartDemoConfig, RandomConfigWithValid } from '../../types';

export interface DemoRandomProps {
  demoData: DemoData;
  initialDemoId: string;
  siteRootUrl?: string;
  onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
  onBackToDemos: () => void;
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
const eventKeyConfig = 2;
const eventKeyData = 3;

export function demoRandom(props: DemoRandomProps): DemoRandomHandle {
  const { demoData, onModeChanged, onBackToDemos, incrementRandomId, decrementRandomId } = props;

  let initialDemoId = props.initialDemoId;
  let randomId = props.randomId;
  let activeKey = eventKeyChart;

  function buildStateForDemo(currentDemoId: string): { mochartDemoConfig: MochartDemoConfig; randomConfig: RandomConfigWithValid } {
    const config = demoData.demoObjectMap[currentDemoId].config;
    return {
      mochartDemoConfig: buildMochartDemoConfig(config),
      randomConfig: Object.assign({}, demoData.demoObjectMap[currentDemoId].random, { valid: true })
    };
  }

  let demoState = buildStateForDemo(initialDemoId);

  const content: RandomContentHandle = randomContent({
    mochartDemoConfig: demoState.mochartDemoConfig,
    initialRandomConfig: demoState.randomConfig,
    activeKey,
    eventKeys: { eventKeyChart, eventKeyConfig, eventKeyData },
    randomId,
    incrementRandomId,
    decrementRandomId
  });

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
  const configNav = navItem(demoText.tabs.randomConfig, eventKeyConfig);
  const dataNav = navItem(demoText.tabs.data, eventKeyData);

  const container = el('div', { className: 'mochart-demo-container multi' }, [
    el('div', { className: 'mochart-demo-tabs-container' }, [
      el('div', { className: 'mochart-demo-nav-group' }, [
        siteRootButton(props.siteRootUrl),
        backToDemosButton(onBackToDemos),
        el('ul', { className: 'nav nav-tabs' }, [chartNav.li, configNav.li, dataNav.li])
      ]),
      modeSwitcher({ demoMode: 'random', onModeChanged })
    ]),
    el('div', { className: 'mochart-demo-content-pane' }, [content.el])
  ]);

  function handleSelect(nextActiveKey: number): void {
    activeKey = nextActiveKey;
    sync();
  }

  function sync(): void {
    chartNav.button.classList.toggle('active', activeKey === eventKeyChart);
    configNav.button.classList.toggle('active', activeKey === eventKeyConfig);
    dataNav.button.classList.toggle('active', activeKey === eventKeyData);
    content.setActiveKey(activeKey);
  }

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
        activeKey = eventKeyChart;
        demoState = buildStateForDemo(nextInitialDemoId);
      }
      randomId = nextRandomId;
      content.update({
        mochartDemoConfig: demoState.mochartDemoConfig,
        initialRandomConfig: demoState.randomConfig,
        randomId
      });
      sync();
    },
    destroy() {
      content.destroy();
    }
  };
}
