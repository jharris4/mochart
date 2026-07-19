// The in-demo navigation strip pieces: a back link to the gallery and the
// Single/Multi/Random mode switcher. Transition/rotation are standalone
// gallery pages, not modes, so they don't appear here.
import { Component, Input } from '@angular/core';

import { demoText, switchableDemoModes } from '@mochart/demo-common';

import { Icon } from './icon';

import type { SwitchableDemoMode } from '../../types';

const modeIcons: Record<SwitchableDemoMode, string> = {
  single: 'pen-to-square',
  multi: 'window-restore',
  random: 'shuffle'
};

@Component({
  selector: 'app-mode-switcher',
  imports: [Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div class="mochart-demo-mode-switcher">
      <span class="form-control-plaintext">{{ text.label }}</span>
      <div class="btn-toolbar" role="toolbar">
        @for (mode of modes; track mode) {
          <button type="button" [class]="'btn btn-' + (mode === demoMode ? 'primary' : 'secondary')"
                  [disabled]="mode === demoMode" [title]="text.modes[mode].title"
                  (click)="onModeChanged(mode)">
            <app-icon size="lg" [name]="modeIcons[mode]" /> {{ text.modes[mode].label }}
          </button>
        }
      </div>
    </div>
  `
})
export class ModeSwitcher {
  @Input({ required: true }) demoMode!: SwitchableDemoMode;
  @Input({ required: true }) onModeChanged!: (nextDemoMode: SwitchableDemoMode) => void;

  readonly text = demoText.modeSwitcher;
  readonly modes = switchableDemoModes;
  readonly modeIcons = modeIcons;
}

/**
 * Link back to the docs site root (a real anchor so middle-click works).
 * Attribute selector so the anchor itself is the nav-group child; the caller
 * binds [href] and only renders it when a site root is configured.
 */
@Component({
  selector: 'a[appSiteRootButton]',
  imports: [Icon],
  host: {
    class: 'btn btn-secondary mochart-demo-site-root-button',
    '[title]': 'text.tooltip',
    '[attr.aria-label]': 'text.aria'
  },
  template: '<app-icon name="house" /> {{ text.shortLabel }}'
})
export class SiteRootButton {
  readonly text = demoText.siteRootLink;
}

/** Back link to the demo gallery; the caller binds (click). */
@Component({
  selector: 'button[appBackToDemosButton]',
  imports: [Icon],
  host: {
    class: 'btn btn-secondary mochart-demo-back-button',
    type: 'button',
    '[title]': 'text.tooltip',
    '[attr.aria-label]': 'text.aria'
  },
  template: '<app-icon name="chevron-left" /> {{ text.label }}'
})
export class BackToDemosButton {
  readonly text = demoText.backToDemos;
}
