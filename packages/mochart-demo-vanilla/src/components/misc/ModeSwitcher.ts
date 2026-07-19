// The in-demo navigation strip pieces: a back link to the gallery and the
// Single/Multi/Random mode switcher. Transition/rotation are standalone
// gallery pages, not modes, so they don't appear here.

import { demoText, switchableDemoModes } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import { el, icon } from './dom';

const modeIcons: Record<SwitchableDemoMode, string> = {
  single: 'pen-to-square',
  multi: 'window-restore',
  random: 'shuffle'
};

export interface ModeSwitcherProps {
  demoMode: SwitchableDemoMode;
  onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
}

export function modeSwitcher(props: ModeSwitcherProps): HTMLElement {
  const buttons = switchableDemoModes.map(mode => {
    const current = mode === props.demoMode;
    const { label, title } = demoText.modeSwitcher.modes[mode];
    const button = el('button', {
      className: 'btn btn-' + (current ? 'primary' : 'secondary'),
      attrs: { type: 'button', title }
    }, [icon(modeIcons[mode], { size: 'lg' }), ' ' + label]);
    button.disabled = current;
    button.addEventListener('click', () => props.onModeChanged(mode));
    return button;
  });
  return el('div', { className: 'mochart-demo-mode-switcher' }, [
    el('span', { className: 'form-control-plaintext', text: demoText.modeSwitcher.label }),
    el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, buttons)
  ]);
}

/**
 * Link back to the docs site root (a real anchor so middle-click works).
 * Returns null when no site root is configured (standalone dev/build).
 */
export function siteRootButton(siteRootUrl: string | undefined): HTMLElement | null {
  if (siteRootUrl === undefined) {
    return null;
  }
  return el('a', {
    className: 'btn btn-secondary mochart-demo-site-root-button',
    attrs: {
      href: siteRootUrl,
      title: demoText.siteRootLink.tooltip,
      'aria-label': demoText.siteRootLink.aria
    }
  }, [icon('house'), ' ' + demoText.siteRootLink.shortLabel]);
}

export function backToDemosButton(onBackToDemos: () => void): HTMLElement {
  const button = el('button', {
    className: 'btn btn-secondary mochart-demo-back-button',
    attrs: {
      type: 'button',
      title: demoText.backToDemos.tooltip,
      'aria-label': demoText.backToDemos.aria
    }
  }, [icon('chevron-left'), ' ' + demoText.backToDemos.label]);
  button.addEventListener('click', onBackToDemos);
  return button;
}
