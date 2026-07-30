// The in-demo navigation strip pieces: a back link to the gallery and the
// Single/Multi/Random mode switcher. Transition/rotation are standalone
// gallery pages, not modes, so they don't appear here.

import { demoText, getAvailableDemoModes, initTheme, isPhoneViewport, watchPhoneViewport } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import { el, icon } from './dom';

// One controller for the whole app; every view's toggle button shares it.
const theme = initTheme();

const modeIcons: Record<SwitchableDemoMode, string> = {
  single: 'pen-to-square',
  multi: 'window-restore',
  random: 'shuffle'
};

export interface ModeSwitcherProps {
  demoMode: SwitchableDemoMode;
  onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
}

export interface ModeSwitcherHandle {
  el: HTMLElement;
  destroy(): void;
}

export function modeSwitcher(props: ModeSwitcherProps): ModeSwitcherHandle {
  const toolbar = el('div', { className: 'demo-toolbar', attrs: { role: 'toolbar' } });

  // Which modes exist depends on the width (Multi is out on a phone), so the
  // row is rebuilt when the viewport crosses the breakpoint rather than built
  // once at mount.
  function render(isPhone: boolean): void {
    toolbar.replaceChildren(...getAvailableDemoModes(isPhone).map(mode => {
      const current = mode === props.demoMode;
      const { label, title } = demoText.modeSwitcher.modes[mode];
      const button = el('button', {
        className: 'demo-btn demo-btn-' + (current ? 'primary' : 'secondary'),
        attrs: { type: 'button', title }
      }, [
        icon(modeIcons[mode], { size: 'lg', fixedWidth: true }),
        el('span', { className: 'btn-label', text: label })
      ]);
      button.disabled = current;
      button.addEventListener('click', () => props.onModeChanged(mode));
      return button;
    }));
  }

  render(isPhoneViewport());
  const unwatchViewport = watchPhoneViewport(render);

  return {
    el: el('div', { className: 'mochart-demo-mode-switcher' }, [
      el('span', { className: 'demo-label', text: demoText.modeSwitcher.label }),
      toolbar
    ]),
    destroy() {
      unwatchViewport();
    }
  };
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
    className: 'demo-btn demo-btn-secondary mochart-demo-site-root-button',
    attrs: {
      href: siteRootUrl,
      title: demoText.siteRootLink.tooltip,
      'aria-label': demoText.siteRootLink.aria
    }
  }, [
    icon('house', { size: 'lg', fixedWidth: true }),
    el('span', { className: 'btn-label', text: demoText.siteRootLink.shortLabel })
  ]);
}

/** Icon-only light/dark toggle; shares the docs site's theme choice. */
export function themeToggleButton(): HTMLElement {
  const button = el('button', {
    className: 'demo-btn demo-btn-secondary mochart-demo-theme-toggle',
    attrs: { type: 'button', 'aria-label': demoText.themeToggle.aria }
  });
  let iconEl: HTMLElement | null = null;
  function render(dark: boolean): void {
    const nextIcon = icon(dark ? 'sun' : 'moon', { size: 'lg', fixedWidth: true });
    if (iconEl === null) {
      button.append(nextIcon);
    }
    else {
      button.replaceChild(nextIcon, iconEl);
    }
    iconEl = nextIcon;
    button.title = dark ? demoText.themeToggle.tooltipToLight : demoText.themeToggle.tooltipToDark;
  }
  render(theme.isDark());
  button.addEventListener('click', () => theme.toggle());
  theme.onChange(render);
  return button;
}

export function backToDemosButton(onBackToDemos: () => void): HTMLElement {
  const button = el('button', {
    className: 'demo-btn demo-btn-secondary mochart-demo-back-button',
    attrs: {
      type: 'button',
      title: demoText.backToDemos.tooltip,
      'aria-label': demoText.backToDemos.aria
    }
  }, [
    icon('chevron-left', { size: 'lg', fixedWidth: true }),
    el('span', { className: 'btn-label', text: demoText.backToDemos.label })
  ]);
  button.addEventListener('click', onBackToDemos);
  return button;
}
