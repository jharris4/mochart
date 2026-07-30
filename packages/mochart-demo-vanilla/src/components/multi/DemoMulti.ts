import { demoText } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import { el, errorTab } from '../misc/dom';
import type { ErrorTabHandle } from '../misc/dom';
import { backToDemosButton, modeSwitcher, siteRootButton, themeToggleButton } from '../misc/ModeSwitcher';
import { notesMenu } from '../misc/NotesMenu';
import { chartsTab } from './ChartsTab';
import type { ChartsTabHandle } from './ChartsTab';

import type { DemoData } from '../../types';

export interface DemoMultiProps {
  demoData: DemoData;
  initialDemoId: string;
  siteRootUrl?: string;
  onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
  onBackToDemos: () => void;
}

export interface DemoMultiHandle {
  el: HTMLElement;
  update(initialDemoId: string): void;
  destroy(): void;
}

export function demoMulti(props: DemoMultiProps): DemoMultiHandle {
  const { demoData, onModeChanged, onBackToDemos } = props;

  let initialDemoId = props.initialDemoId;

  const charts: ChartsTabHandle = chartsTab({
    active: true,
    demoObject: demoData.demoObjectMap[initialDemoId]
  });
  const chartsBoundary: ErrorTabHandle = errorTab(() => charts.el, true);

  const chartNav = el('button', {
    className: 'demo-tab active',
    attrs: { type: 'button' },
    text: demoText.tabs.chart
  });

  const notes = notesMenu(demoData.demoObjectMap[initialDemoId]);

  const container = el('div', { className: 'mochart-demo-container multi' }, [
    el('div', { className: 'mochart-demo-tabs-container' }, [
      el('div', { className: 'mochart-demo-nav-group' }, [
        siteRootButton(props.siteRootUrl),
        backToDemosButton(onBackToDemos),
        el('ul', { className: 'demo-tabs' }, [el('li', { className: 'demo-tab-item' }, [chartNav])]),
        notes.el
      ]),
      el('div', { className: 'mochart-demo-nav-group' }, [
        modeSwitcher({ demoMode: 'multi', onModeChanged }),
        themeToggleButton()
      ])
    ]),
    el('div', { className: 'mochart-demo-content-pane' }, [
      el('div', { className: 'mochart-demo-content' }, [chartsBoundary.el])
    ])
  ]);

  return {
    el: container,
    update(nextInitialDemoId: string) {
      if (nextInitialDemoId === initialDemoId) {
        return;
      }
      initialDemoId = nextInitialDemoId;
      const nextDemo = demoData.demoObjectMap[nextInitialDemoId];
      notes.setDemo(nextDemo.title, nextDemo.notes);
      chartsBoundary.guard(() => charts.setDemoObject(nextDemo));
    },
    destroy() {
      notes.destroy();
      charts.destroy();
    }
  };
}
