import { html, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

import { buildShareUrl, demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import { LightElement } from './LightElement';
import { icon } from './templates';

const copiedFeedbackMs = 1500;
const menuGap = 4;

/**
 * A collapsed export/share menu placed at the end of each mode's controls row.
 * The trigger uses a share icon; the menu holds PNG / SVG downloads and (when a
 * share state is provided) a copy-share-link item. The parent supplies the
 * export actions so this element stays agnostic about single vs. tiled charts.
 *
 * The controls strips (and chart panes) use `overflow: hidden`, which would
 * clip a normal absolutely-positioned dropdown that opens upward over the
 * chart — and the chart's transparent interaction rect would steal clicks. So
 * the menu is positioned `fixed` (measured from the trigger) at a high z-index,
 * which escapes ancestor clipping and stacks above the chart.
 */
@customElement('export-share-menu')
export class ExportShareMenu extends LightElement {
  @property({ attribute: false }) idPrefix = 'edit';
  @property({ attribute: false }) exportPng: () => void = () => { /* no-op */ };
  @property({ attribute: false }) exportSvg: () => void = () => { /* no-op */ };
  /** Omit to hide the Share item (e.g. a chart whose state isn't shareable). */
  @property({ attribute: false }) getShareState?: () => ShareState;
  @property({ attribute: false }) disabled = false;

  @state() private open = false;
  @state() private copied = false;
  @state() private coords: { bottom: number; right: number } | null = null;

  @query('.dropdown-toggle') private trigger?: HTMLButtonElement;

  private revertTimer: ReturnType<typeof setTimeout> | null = null;
  private listening = false;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeCloseListeners();
    if (this.revertTimer !== null) {
      clearTimeout(this.revertTimer);
      this.revertTimer = null;
    }
  }

  private onDocMouseDown = (event: MouseEvent): void => {
    if (!this.contains(event.target as Node)) {
      this.close();
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.close();
    }
  };

  // A fixed menu would drift on scroll/resize; just close it instead.
  private onReflow = (): void => {
    this.close();
  };

  private addCloseListeners(): void {
    if (this.listening) {
      return;
    }
    this.listening = true;
    document.addEventListener('mousedown', this.onDocMouseDown);
    document.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('scroll', this.onReflow, true);
    window.addEventListener('resize', this.onReflow);
  }

  private removeCloseListeners(): void {
    if (!this.listening) {
      return;
    }
    this.listening = false;
    document.removeEventListener('mousedown', this.onDocMouseDown);
    document.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('scroll', this.onReflow, true);
    window.removeEventListener('resize', this.onReflow);
  }

  private close(): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.coords = null;
    this.removeCloseListeners();
  }

  // Anchor the fixed menu just above the trigger's top-right corner, so it
  // opens upward and right-aligned. Measured synchronously off the trigger the
  // click landed on, so the menu is positioned before it's shown.
  private onToggle = (): void => {
    if (this.open) {
      this.close();
      return;
    }
    const rect = this.trigger?.getBoundingClientRect();
    if (rect) {
      this.coords = {
        bottom: window.innerHeight - rect.top + menuGap,
        right: window.innerWidth - rect.right
      };
    }
    this.open = true;
    this.addCloseListeners();
  };

  private runAndClose(action: () => void): void {
    action();
    this.close();
  }

  private onShare = (): void => {
    if (!this.getShareState) {
      return;
    }
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
    this.close();
  };

  override render(): unknown {
    const menuOpen = this.open && this.coords !== null;
    return html`<div class="btn-group dropup mochart-export-share-menu">
      <button id=${this.idPrefix + '-export-share'} type="button"
              class=${'btn btn-secondary dropdown-toggle' + (this.open ? ' active' : '')}
              ?disabled=${this.disabled} aria-haspopup="true" aria-expanded=${this.open}
              title=${demoText.exportShareMenu.trigger.tooltip} aria-label=${demoText.exportShareMenu.trigger.aria}
              @click=${this.onToggle}>
        ${icon({ size: 'lg', fixedWidth: true, name: 'share-nodes' })}
      </button>
      <div class=${'dropdown-menu' + (menuOpen ? ' show' : '')}
           style=${menuOpen ? `position: fixed; bottom: ${this.coords!.bottom}px; right: ${this.coords!.right}px; margin: 0; z-index: 1080;` : nothing}>
        <button type="button" class="dropdown-item" @click=${() => this.runAndClose(this.exportPng)}
                aria-label=${demoText.exportButtons.png.aria}>
          ${icon({ fixedWidth: true, name: 'file-image' })} <span class="mochart-menu-item-label">${demoText.exportButtons.png.label}</span>
        </button>
        <button type="button" class="dropdown-item" @click=${() => this.runAndClose(this.exportSvg)}
                aria-label=${demoText.exportButtons.svg.aria}>
          ${icon({ fixedWidth: true, name: 'file-code' })} <span class="mochart-menu-item-label">${demoText.exportButtons.svg.label}</span>
        </button>
        ${this.getShareState ? html`
          <div class="dropdown-divider"></div>
          <button type="button" class="dropdown-item" @click=${this.onShare}
                  aria-label=${demoText.shareButton.aria}>
            ${icon({ fixedWidth: true, name: this.copied ? 'check' : 'link' })} <span class="mochart-menu-item-label">${this.copied ? demoText.shareButton.tooltipCopied : demoText.shareButton.label}</span>
          </button>` : nothing}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'export-share-menu': ExportShareMenu;
  }
}
