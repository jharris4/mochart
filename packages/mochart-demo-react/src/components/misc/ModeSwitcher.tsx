// The in-demo navigation strip pieces: a back link to the gallery and the
// Single/Multi/Random mode switcher. Transition/rotation are standalone
// gallery pages, not modes, so they don't appear here.

import React from 'react';
import Icon from './Icon';

import { demoText, initTheme, switchableDemoModes } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

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
  return (
    <div className="mochart-demo-mode-switcher">
      <span className="demo-label">{demoText.modeSwitcher.label}</span>
      <div className="demo-toolbar" role="toolbar">
        {switchableDemoModes.map(mode => {
          const current = mode === demoMode;
          const { label, title } = demoText.modeSwitcher.modes[mode];
          return (
            <button key={mode} type="button" className={"demo-btn demo-btn-" + (current ? 'primary' : 'secondary')}
              disabled={current} title={title}
              onClick={() => { onModeChanged(mode); }}>
              <Icon size="lg" name={modeIcons[mode]} /> {label}
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
  if (siteRootUrl === void 0) {
    return null;
  }
  return (
    <a className="demo-btn demo-btn-secondary mochart-demo-site-root-button" href={siteRootUrl}
      title={demoText.siteRootLink.tooltip} aria-label={demoText.siteRootLink.aria}>
      <Icon name="house" /> {demoText.siteRootLink.shortLabel}
    </a>
  );
}

/** Icon-only light/dark toggle; shares the docs site's theme choice. */
export function ThemeToggleButton() {
  const [dark, setDark] = React.useState(theme.isDark());
  React.useEffect(() => theme.onChange(setDark), []);
  return (
    <button type="button" className="demo-btn demo-btn-secondary mochart-demo-theme-toggle"
      title={dark ? demoText.themeToggle.tooltipToLight : demoText.themeToggle.tooltipToDark}
      aria-label={demoText.themeToggle.aria} onClick={() => { theme.toggle(); }}>
      <Icon size="lg" name={dark ? 'sun' : 'moon'} fixedWidth />
    </button>
  );
}

export function BackToDemosButton({ onBackToDemos }: { onBackToDemos: OnBackToDemos }) {
  return (
    <button type="button" className="demo-btn demo-btn-secondary mochart-demo-back-button" title={demoText.backToDemos.tooltip}
      aria-label={demoText.backToDemos.aria} onClick={() => { onBackToDemos(); }}>
      <Icon name="chevron-left" /> {demoText.backToDemos.label}
    </button>
  );
}
