// The in-demo navigation strip pieces: a back link to the gallery and the
// Single/Multi/Random mode switcher. Transition/rotation are standalone
// gallery pages, not modes, so they don't appear here.

import React from 'react';
import { ButtonToolbar, Button } from 'reactstrap';
import Icon from './Icon';

import { demoText, switchableDemoModes } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import type { OnModeChanged, OnBackToDemos } from '../../types';

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
      <span className="form-control-plaintext">{demoText.modeSwitcher.label}</span>
      <ButtonToolbar>
        {switchableDemoModes.map(mode => {
          const current = mode === demoMode;
          const { label, title } = demoText.modeSwitcher.modes[mode];
          return (
            <Button key={mode} disabled={current} title={title} color={current ? 'primary' : void 0}
              onClick={() => { onModeChanged(mode); }}>
              <Icon size="lg" name={modeIcons[mode]} /> {label}
            </Button>
          );
        })}
      </ButtonToolbar>
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
    <a className="btn btn-secondary mochart-demo-site-root-button" href={siteRootUrl}
      title={demoText.siteRootLink.tooltip} aria-label={demoText.siteRootLink.aria}>
      <Icon name="house" /> {demoText.siteRootLink.shortLabel}
    </a>
  );
}

export function BackToDemosButton({ onBackToDemos }: { onBackToDemos: OnBackToDemos }) {
  return (
    <Button className="mochart-demo-back-button" title={demoText.backToDemos.tooltip}
      aria-label={demoText.backToDemos.aria} onClick={() => { onBackToDemos(); }}>
      <Icon name="chevron-left" /> {demoText.backToDemos.label}
    </Button>
  );
}
