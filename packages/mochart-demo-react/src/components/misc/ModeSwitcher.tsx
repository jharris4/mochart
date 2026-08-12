// The in-demo navigation strip pieces: a back link to the gallery and the
// Single/Multi/Random mode switcher. Transition/rotation are standalone
// gallery pages, not modes, so they don't appear here.

import React from 'react';
import Icon from './Icon';

import { demoText, getAvailableDemoModes, initTheme } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import { usePhoneViewport } from './usePhoneViewport';

import type { OnModeChanged, OnBackToDemos } from '../../types';

// One controller for the whole app; every view's toggle button shares it.
const theme = initTheme();

const modeIcons: Record<SwitchableDemoMode, string> = {
  single: 'pen-to-square',
  multi: 'window-restore',
  random: 'shuffle'
};

interface ModeSwitcherProps {
  demoMode: SwitchableDemoMode;
  onModeChanged: OnModeChanged;
}

export function ModeSwitcher({ demoMode, onModeChanged }: ModeSwitcherProps) {
  const isPhone = usePhoneViewport();
  return (
    <div className="mochart-demo-mode-switcher">
      <span className="demo-label">{demoText.modeSwitcher.label}</span>
      {/* A named group, not a toolbar: independently tabbable buttons, no
          arrow-key handling, and the name is what makes "Single" read as a mode. */}
      <div className="demo-toolbar" role="group" aria-label={demoText.modeSwitcher.groupAria}>
        {getAvailableDemoModes(isPhone).map(mode => {
          const current = mode === demoMode;
          const { label, title } = demoText.modeSwitcher.modes[mode];
          // How the current mode is marked VISUALLY depends on the width. In the
          // strip it is a filled, disabled segment — plainly "you are here". On a
          // phone the switcher lives in the nav overflow menu, where
          // `.demo-menu-overflow .demo-btn:disabled` greys a row out and a
          // greyed row in a list of destinations reads as unavailable rather
          // than current — so there it gets the panel's `.active` tint instead,
          // and is simply inert when tapped. `aria-current="page"` is
          // unconditional: each mode is a route, at either width.
          return (
            <button key={mode} type="button"
              className={"demo-btn demo-btn-" + (current ? 'primary' : 'secondary') + (current && isPhone ? ' active' : '')}
              disabled={current && !isPhone} title={title}
              aria-current={current ? 'page' : undefined}
              onClick={() => { if (!current) { onModeChanged(mode); } }}>
              <Icon size="lg" fixedWidth={true} name={modeIcons[mode]} /><span className="btn-label">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Link back to the docs site root (a real anchor so middle-click works).
 * Renders nothing when no site root is configured (standalone dev/build).
 */
export function SiteRootButton({ siteRootUrl }: { siteRootUrl?: string }) {
  if (siteRootUrl === undefined) {
    return null;
  }
  return (
    <a className="demo-btn demo-btn-secondary mochart-demo-site-root-button" href={siteRootUrl}
      title={demoText.siteRootLink.tooltip} aria-label={demoText.siteRootLink.aria}>
      <Icon size="lg" fixedWidth={true} name="house" /><span className="btn-label">{demoText.siteRootLink.shortLabel}</span>
    </a>
  );
}

/**
 * Icon-only light/dark toggle; shares the docs site's theme choice.
 *
 * The `.btn-menu-label` span is text for the phone fold only: folded into the
 * nav overflow menu this would be the one row with nothing to read, and the
 * class is `display: none` everywhere except inside a `.demo-menu` — as a
 * hidden child it costs the bars neither a box nor one of the button's gaps.
 */
export function ThemeToggleButton() {
  const [dark, setDark] = React.useState(theme.isDark());
  React.useEffect(() => theme.onChange(setDark), []);
  return (
    <button type="button" className="demo-btn demo-btn-secondary mochart-demo-theme-toggle"
      title={dark ? demoText.themeToggle.tooltipToLight : demoText.themeToggle.tooltipToDark}
      aria-label={demoText.themeToggle.aria} onClick={() => { theme.toggle(); }}>
      <Icon size="lg" name={dark ? 'sun' : 'moon'} fixedWidth />
      <span className="btn-menu-label">{dark ? demoText.themeToggle.menuLabelToLight : demoText.themeToggle.menuLabelToDark}</span>
    </button>
  );
}

export function BackToDemosButton({ onBackToDemos }: { onBackToDemos: OnBackToDemos }) {
  return (
    <button type="button" className="demo-btn demo-btn-secondary mochart-demo-back-button" title={demoText.backToDemos.tooltip}
      aria-label={demoText.backToDemos.aria} onClick={() => { onBackToDemos(); }}>
      <Icon size="lg" fixedWidth={true} name="chevron-left" /><span className="btn-label">{demoText.backToDemos.label}</span>
    </button>
  );
}
