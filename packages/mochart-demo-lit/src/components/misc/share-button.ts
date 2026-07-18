import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { buildShareUrl, demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import { LightElement } from './LightElement';
import { buttonWithTooltip, icon } from './templates';

const copiedFeedbackMs = 1500;

/**
 * Copies a share link for the current chart: the single-demo URL plus the
 * current config and data encoded in the hash (see demo-common shareState).
 * An element (not a template helper) so the copied feedback can re-render.
 */
@customElement('share-button')
export class ShareButton extends LightElement {
  @property({ attribute: false }) idPrefix = 'edit';
  @property({ attribute: false }) getShareState: () => ShareState = () => ({ config: {}, data: [] });
  @property({ attribute: false }) disabled = false;

  @state() private copied = false;
  private revertTimer: ReturnType<typeof setTimeout> | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.revertTimer !== null) {
      clearTimeout(this.revertTimer);
      this.revertTimer = null;
    }
  }

  private onClick = (): void => {
    const url = buildShareUrl(this.getShareState());
    navigator.clipboard.writeText(url).then(() => {
      this.copied = true;
      if (this.revertTimer !== null) {
        clearTimeout(this.revertTimer);
      }
      this.revertTimer = setTimeout(() => {
        this.copied = false;
        this.revertTimer = null;
      }, copiedFeedbackMs);
    }, () => {
      // Clipboard access can be unavailable (e.g. insecure context); let the
      // user copy the link manually instead of failing silently.
      window.prompt(demoText.shareButton.tooltip, url);
    });
  };

  override render(): unknown {
    return html`<div class="btn-group">
      ${buttonWithTooltip(
        { id: this.idPrefix + '-share', disabled: this.disabled, label: demoText.shareButton.label, tooltipText: this.copied ? demoText.shareButton.tooltipCopied : demoText.shareButton.tooltip, tooltipPlacement: 'top-start', onClick: this.onClick, ariaLabel: demoText.shareButton.aria },
        icon({ size: 'lg', fixedWidth: true, name: this.copied ? 'check' : 'link' })
      )}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'share-button': ShareButton;
  }
}
