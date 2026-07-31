
import { defaultTransitionConfig, demoText, getTransitionDataProviders, getTransitionMochartConfig } from '@mochart/demo-common';

import { el } from '../misc/dom';
import { topBar } from '../misc/TopBar';
import { transitionChartTab } from './TransitionChartTab';
import { transitionConfigTab } from './TransitionConfigTab';

import type { TransitionConfig } from '../../types';

export interface DemoTransitionProps {
  siteRootUrl?: string;
  onBackToDemos: () => void;
}

export interface DemoTransitionHandle {
  el: HTMLElement;
  destroy(): void;
}

const eventKeyChart = 1;
const eventKeyConfig = 2;

export function demoTransition(props: DemoTransitionProps): DemoTransitionHandle {
  let activeKey = eventKeyChart;

  let transitionConfig = defaultTransitionConfig;
  let mochartConfig = getTransitionMochartConfig(defaultTransitionConfig);
  let dataProviders = getTransitionDataProviders(defaultTransitionConfig);

  const chart = transitionChartTab({
    active: activeKey === eventKeyChart,
    mochartConfig,
    dataProviders
  });
  const config = transitionConfigTab({
    active: activeKey === eventKeyConfig,
    transitionConfig,
    onUpdate(nextTransitionConfig: TransitionConfig) {
      transitionConfig = nextTransitionConfig;
      mochartConfig = getTransitionMochartConfig(nextTransitionConfig);
      dataProviders = getTransitionDataProviders(nextTransitionConfig);
      chart.update({ mochartConfig, dataProviders });
      config.setTransitionConfig(nextTransitionConfig);
    },
    onReset() {
      transitionConfig = defaultTransitionConfig;
      mochartConfig = getTransitionMochartConfig(defaultTransitionConfig);
      dataProviders = getTransitionDataProviders(defaultTransitionConfig);
      chart.update({ mochartConfig, dataProviders });
      config.setTransitionConfig(defaultTransitionConfig);
    }
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
  const configNav = navItem(demoText.tabs.transitionConfig, eventKeyConfig);

  const bar = topBar({
    siteRootUrl: props.siteRootUrl,
    onBackToDemos: props.onBackToDemos,
    tabs: [chartNav.li, configNav.li]
  });

  const container = el('div', { className: 'mochart-demo-container multi' }, [
    bar.el,
    el('div', { className: 'mochart-demo-content-pane' }, [
      el('div', { className: 'mochart-demo-content' }, [chart.el, config.el])
    ])
  ]);

  function handleSelect(nextActiveKey: number): void {
    activeKey = nextActiveKey;
    chartNav.button.classList.toggle('active', activeKey === eventKeyChart);
    configNav.button.classList.toggle('active', activeKey === eventKeyConfig);
    chart.setActive(activeKey === eventKeyChart);
    config.setActive(activeKey === eventKeyConfig);
  }

  return {
    el: container,
    destroy() {
      bar.destroy();
      chart.destroy();
    }
  };
}
