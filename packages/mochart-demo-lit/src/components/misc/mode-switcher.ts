import { html, nothing } from 'lit';
import type { TemplateResult } from 'lit';

import { demoText, getAvailableDemoModes } from '@mochart/demo-common';
import type { SwitchableDemoMode } from '@mochart/demo-common';

import { icon } from './templates';

// The in-demo navigation strip pieces: a back link to the gallery and the
// Single/Multi/Random mode switcher. Transition/rotation are standalone
// gallery pages, not modes, so they don't appear here. Stateless, so they
// stay plain lit-html template functions (see templates.ts).
// Labels sit in a `.btn-label` span so demo.css can take them out of the
// layout on a narrow viewport, leaving the icons.

const modeIcons: Record<SwitchableDemoMode, string> = {
  single: 'pen-to-square',
  multi: 'window-restore',
  random: 'shuffle'
};

export interface ModeSwitcherProps {
  demoMode: SwitchableDemoMode;
  // Which modes are offered depends on the width (a phone gets no Multi), so
  // the host tracks it with a PhoneViewportController and passes it in.
  isPhone: boolean;
  onModeChanged: (nextDemoMode: SwitchableDemoMode) => void;
}

export function modeSwitcher({ demoMode, isPhone, onModeChanged }: ModeSwitcherProps): TemplateResult {
  return html`<div class="mochart-demo-mode-switcher">
    <span class="demo-label">${demoText.modeSwitcher.label}</span>
    <div class="demo-toolbar" role="toolbar">
      ${getAvailableDemoModes(isPhone).map(mode => {
        const current = mode === demoMode;
        const { label, title } = demoText.modeSwitcher.modes[mode];
        return html`<button type="button" class=${'demo-btn demo-btn-' + (current ? 'primary' : 'secondary')}
            title=${title} ?disabled=${current} @click=${() => onModeChanged(mode)}>${icon({ name: modeIcons[mode], size: 'lg' })}<span class="btn-label">${label}</span></button>`;
      })}
    </div>
  </div>`;
}

/**
 * Link back to the docs site root (a real anchor so middle-click works).
 * Renders nothing when no site root is configured (standalone dev/build).
 */
export function siteRootButton(siteRootUrl: string | undefined): unknown {
  if (siteRootUrl === undefined) {
    return nothing;
  }
  return html`<a class="demo-btn demo-btn-secondary mochart-demo-site-root-button" href=${siteRootUrl}
      title=${demoText.siteRootLink.tooltip} aria-label=${demoText.siteRootLink.aria}>${icon({ name: 'house' })}<span class="btn-label">${demoText.siteRootLink.shortLabel}</span></a>`;
}

export function backToDemosButton(onBackToDemos: () => void): TemplateResult {
  return html`<button type="button" class="demo-btn demo-btn-secondary mochart-demo-back-button"
      title=${demoText.backToDemos.tooltip} aria-label=${demoText.backToDemos.aria}
      @click=${() => onBackToDemos()}>${icon({ name: 'chevron-left' })}<span class="btn-label">${demoText.backToDemos.label}</span></button>`;
}
