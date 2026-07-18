import { Component, Input, OnDestroy, signal } from '@angular/core';

import { buildShareUrl, demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import { ButtonWithTooltip } from './button-with-tooltip';
import { Icon } from './icon';

const copiedFeedbackMs = 1500;

/**
 * Copies a share link for the current chart: the single-demo URL plus the
 * current config and data encoded in the hash (see demo-common shareState).
 */
@Component({
  selector: 'app-share-button',
  imports: [ButtonWithTooltip, Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div class="btn-group">
      <app-button-with-tooltip [id]="idPrefix + '-share'" [disabled]="disabled" [label]="text.label"
                               [tooltipText]="copied() ? text.tooltipCopied : text.tooltip" tooltipPlacement="top-start"
                               [onClick]="onClick" [aria-label]="text.aria">
        <app-icon size="lg" [fixedWidth]="true" [name]="copied() ? 'check' : 'link'" />
      </app-button-with-tooltip>
    </div>
  `
})
export class ShareButton implements OnDestroy {
  readonly text = demoText.shareButton;

  @Input({ required: true }) idPrefix!: string;
  @Input({ required: true }) getShareState!: () => ShareState;
  @Input() disabled = false;

  readonly copied = signal(false);
  private revertTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    if (this.revertTimer !== null) {
      clearTimeout(this.revertTimer);
      this.revertTimer = null;
    }
  }

  onClick = (): void => {
    const url = buildShareUrl(this.getShareState());
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      if (this.revertTimer !== null) {
        clearTimeout(this.revertTimer);
      }
      this.revertTimer = setTimeout(() => {
        this.copied.set(false);
        this.revertTimer = null;
      }, copiedFeedbackMs);
    }, () => {
      // Clipboard access can be unavailable (e.g. insecure context); let the
      // user copy the link manually instead of failing silently.
      window.prompt(demoText.shareButton.tooltip, url);
    });
  };
}
