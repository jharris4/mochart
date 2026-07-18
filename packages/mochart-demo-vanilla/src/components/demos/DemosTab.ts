import { demoText } from '@mochart/demo-common';

import { el, icon, setActiveClass } from '../misc/dom';

import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '../../types';

export interface DemosTabProps {
  active?: boolean;
  demoData: DemoData;
  demoMode: DemoMode;
  demoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChange: OnDemoChanged;
}

export interface DemosTabHandle {
  el: HTMLElement;
  setActive(active: boolean): void;
  setDemoId(demoId: string): void;
}

const modeCaptions: Record<string, string> = demoText.demosTab.modeCaptions;

export function demosTab(props: DemosTabProps): DemosTabHandle {
  const { demoData, demoMode, onDemoModeChanged, onDemoChange } = props;
  let demoId = props.demoId;
  let isTestMode = false;

  const isSingle = demoMode === 'single';
  const isMulti = demoMode === 'multi';
  const isRandom = demoMode === 'random';

  function modeButton(
    current: boolean,
    title: string,
    iconName: string,
    text: string,
    onClick: () => void
  ): HTMLButtonElement {
    const button = el('button', {
      className: 'btn btn-' + (current ? 'primary' : 'secondary'),
      attrs: { type: 'button', title }
    }, [icon(iconName, { size: 'lg' }), ' ' + text]);
    button.disabled = current;
    button.addEventListener('click', onClick);
    return button;
  }

  const testModeButton = el('button', {
    className: 'btn btn-secondary',
    attrs: {
      type: 'button',
      title: demoText.demosTab.testDemos.title,
      'aria-pressed': 'false'
    }
  }, [icon('flask', { size: 'lg' }), ' ' + demoText.demosTab.testDemos.label]);
  testModeButton.addEventListener('click', () => {
    isTestMode = !isTestMode;
    testModeButton.className = 'btn btn-' + (isTestMode ? 'primary' : 'secondary');
    testModeButton.setAttribute('aria-pressed', String(isTestMode));
    renderList();
  });

  const list = el('div', { className: 'list-group' });

  function renderList(): void {
    const theDemoIds = isTestMode ? demoData.testDemoIds : demoData.demoIds;
    list.replaceChildren();
    for (const currentDemoId of theDemoIds) {
      const demo = demoData.demoObjectMap[currentDemoId];
      const item = el('button', {
        className: 'list-group-item list-group-item-action' + (currentDemoId === demoId ? ' active' : ''),
        attrs: { type: 'button' }
      }, [
        el('span', { className: 'mochart-demo-item-title', text: demo.title }),
        demo.description !== undefined
          ? el('span', { className: 'mochart-demo-item-description', text: demo.description })
          : null
      ]);
      item.addEventListener('click', () => onDemoChange(currentDemoId));
      list.append(item);
    }
  }
  renderList();

  const modeCaption = modeCaptions[demoMode] ?? '';

  const container = el('div', {
    className: 'mochart-demo-tab-container col demos' + (props.active ? ' active' : '')
  }, [
    el('div', { className: 'mochart-demo-modes-container' }, [
      el('form', { className: 'form-inline' }, [
        el('div', { className: 'form-group' }, [
          el('span', { className: 'form-control-plaintext', text: demoText.demosTab.demoModeLabel + '\u00A0' })
        ]),
        el('div', { className: 'form-group' }, [
          el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, [
            modeButton(isSingle, demoText.demosTab.modes.single.title,
              'pen-to-square', demoText.demosTab.modes.single.label, () => onDemoModeChanged('single', demoId)),
            modeButton(isMulti, demoText.demosTab.modes.multi.title,
              'window-restore', demoText.demosTab.modes.multi.label, () => onDemoModeChanged('multi', demoId)),
            modeButton(isRandom, demoText.demosTab.modes.random.title,
              'shuffle', demoText.demosTab.modes.random.label, () => onDemoModeChanged('random', demoId)),
            modeButton(false, demoText.demosTab.modes.transition.title,
              'right-left', demoText.demosTab.modes.transition.label, () => onDemoModeChanged('transition', demoId)),
            modeButton(false, demoText.demosTab.modes.rotation.title,
              'repeat', demoText.demosTab.modes.rotation.label, () => onDemoModeChanged('rotation', demoId))
          ])
        ]),
        el('div', { className: 'form-group', style: 'margin-left: 10px;' }, [
          el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, [testModeButton])
        ])
      ]),
      modeCaption ? el('div', { className: 'mochart-demo-caption', text: modeCaption }) : null
    ]),
    el('div', { className: 'mochart-demo-list-container' }, [
      el('div', { className: 'mochart-demo-list' }, [list])
    ])
  ]);

  return {
    el: container,
    setActive(active: boolean) {
      setActiveClass(container, active);
    },
    setDemoId(nextDemoId: string) {
      if (nextDemoId !== demoId) {
        demoId = nextDemoId;
        renderList();
      }
    }
  };
}
