import { buildMochartDemoConfig, demoText } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import { el } from '../misc/dom';
import { backToDemosButton, modeSwitcher, siteRootButton, themeToggleButton } from '../misc/ModeSwitcher';
import { notesMenu } from '../misc/NotesMenu';
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

  function buildStateForDemo(currentDemoId: string): { mochartDemoConfig: MochartDemoConfig; randomConfig: RandomConfigWithValid; generator?: string } {
    const demo = demoData.demoObjectMap[currentDemoId];
    return {
      mochartDemoConfig: buildMochartDemoConfig(demo.config),
      randomConfig: Object.assign({}, demo.random, { valid: true }),
      generator: demo.generator
    };
  }

  let demoState = buildStateForDemo(initialDemoId);

  const content: RandomContentHandle = randomContent({
    mochartDemoConfig: demoState.mochartDemoConfig,
    initialRandomConfig: demoState.randomConfig,
    generator: demoState.generator,
    activeKey,
    eventKeys: { eventKeyChart, eventKeyConfig, eventKeyData },
    randomId,
    incrementRandomId,
    decrementRandomId
  });

  function navItem(text: string, key: number): { li: HTMLLIElement; button: HTMLButtonElement } {
    const button = el('button', {
      className: 'demo-tab' + (activeKey === key ? ' active' : ''),
      attrs: { type: 'button' },
      text
    });
    button.addEventListener('click', () => handleSelect(key));
    return { li: el('li', { className: 'demo-tab-item' }, [button]), button };
  }

  const chartNav = navItem(demoText.tabs.chart, eventKeyChart);
  const configNav = navItem(demoText.tabs.randomConfig, eventKeyConfig);
  const dataNav = navItem(demoText.tabs.data, eventKeyData);

  const notes = notesMenu(demoData.demoObjectMap[initialDemoId]);

  const container = el('div', { className: 'mochart-demo-container multi' }, [
    el('div', { className: 'mochart-demo-tabs-container' }, [
      el('div', { className: 'mochart-demo-nav-group' }, [
        siteRootButton(props.siteRootUrl),
        backToDemosButton(onBackToDemos),
        el('ul', { className: 'demo-tabs' }, [chartNav.li, configNav.li, dataNav.li]),
        notes.el
      ]),
      el('div', { className: 'mochart-demo-nav-group' }, [
        modeSwitcher({ demoMode: 'random', onModeChanged }),
        themeToggleButton()
      ])
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
        const nextDemo = demoData.demoObjectMap[nextInitialDemoId];
        notes.setDemo(nextDemo.title, nextDemo.notes);
        demoState = buildStateForDemo(nextInitialDemoId);
      }
      randomId = nextRandomId;
      content.update({
        mochartDemoConfig: demoState.mochartDemoConfig,
        initialRandomConfig: demoState.randomConfig,
        generator: demoState.generator,
        randomId
      });
      sync();
    },
    destroy() {
      notes.destroy();
      content.destroy();
    }
  };
}
