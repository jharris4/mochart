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

const modeCaptions: Record<string, string> = {
  single: 'Single: one chart with editable config, data, groups and series — pick a demo below.',
  multi: 'Multi: a grid of charts stepping through generated datasets together — pick a demo below.',
  random: 'Random: a chart fed by a seeded random data generator — pick a demo below.',
  transition: 'Transition: animates a chart between datasets — pick a demo below.',
  rotation: 'Rotation: a grid of charts showing different tick label rotations — pick a demo below.'
};

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
      title: 'Show the test demos (showcasing less used features)',
      'aria-pressed': 'false'
    }
  }, [icon('flask', { size: 'lg' }), ' Test Demos']);
  testModeButton.addEventListener('click', () => {
    isTestMode = !isTestMode;
    testModeButton.className = 'btn btn-' + (isTestMode ? 'primary' : 'secondary');
    testModeButton.setAttribute('aria-pressed', String(isTestMode));
    renderList();
  });

  const list = el('ul', { className: 'list-group' });

  function renderList(): void {
    const theDemoIds = isTestMode ? demoData.testDemoIds : demoData.demoIds;
    list.replaceChildren();
    for (const currentDemoId of theDemoIds) {
      const item = el('li', {
        className: 'list-group-item' + (currentDemoId === demoId ? ' active' : ''),
        attrs: { role: 'button', tabindex: '0' },
        text: demoData.demoObjectMap[currentDemoId].title
      });
      item.addEventListener('click', () => onDemoChange(currentDemoId));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onDemoChange(currentDemoId);
        }
      });
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
          el('span', { className: 'form-control-plaintext', text: 'Demo Mode: ' })
        ]),
        el('div', { className: 'form-group' }, [
          el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, [
            modeButton(isSingle, 'One chart with editable config, data, groups and series',
              'pen-to-square', 'Single', () => onDemoModeChanged('single', demoId)),
            modeButton(isMulti, 'A grid of charts stepping through datasets together',
              'window-restore', 'Multi', () => onDemoModeChanged('multi', demoId)),
            modeButton(isRandom, 'A chart fed by a seeded random data generator',
              'shuffle', 'Random', () => onDemoModeChanged('random', demoId)),
            modeButton(false, 'Animate a chart between two datasets',
              'right-left', 'Transition', () => onDemoModeChanged('transition', demoId)),
            modeButton(false, 'A grid of charts showing different tick label rotations',
              'repeat', 'Rotation', () => onDemoModeChanged('rotation', demoId))
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
