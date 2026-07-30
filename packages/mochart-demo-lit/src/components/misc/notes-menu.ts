import { html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

import { demoText, getNotesPanelPosition } from '@mochart/demo-common';
import type { NotesPanelPosition } from '@mochart/demo-common';

import { LightElement } from './LightElement';
import { icon } from './templates';

/**
 * The "about this demo" button in each mode's navigation row: an info icon that
 * opens the demo's `notes` (the detail kept out of its one-sentence gallery
 * description) in a popover panel.
 *
 * Positioning follows ExportShareMenu: the surrounding panes use
 * `overflow: hidden`, which would clip a normally-positioned dropdown, so the
 * panel is `fixed` at coordinates measured from the trigger. This one opens
 * downward from the navigation row (the export menu opens upward from the
 * controls row) and is closed on scroll/resize rather than repositioned.
 */
@customElement('notes-menu')
export class NotesMenu extends LightElement {
  /** Demo title, shown as the panel heading (not `title`, which is native). */
  @property({ attribute: false }) demoTitle = '';
  /** The demo's notes; nothing renders when there are none. */
  @property({ attribute: false }) notes: string | undefined = undefined;

  @state() private open = false;
  @state() private coords: NotesPanelPosition | null = null;

  @query('.mochart-demo-notes-trigger') private trigger?: HTMLButtonElement;

  private listening = false;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeCloseListeners();
  }

  // Close whenever the demo changes under us (history navigation between demos).
  override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('demoTitle') || changed.has('notes')) {
      this.close();
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

  // A fixed panel would drift on scroll/resize; just close it instead.
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

  // Measured synchronously off the trigger the click landed on, so the panel is
  // positioned before it's shown.
  private onToggle = (): void => {
    if (this.open) {
      this.close();
      return;
    }
    const rect = this.trigger?.getBoundingClientRect();
    if (rect) {
      this.coords = getNotesPanelPosition(rect, window.innerWidth);
    }
    this.open = true;
    this.addCloseListeners();
  };

  override render(): unknown {
    if (this.notes === undefined) {
      return nothing;
    }
    const menuOpen = this.open && this.coords !== null;
    return html`<div class="demo-btn-group mochart-demo-notes-menu">
      <button type="button"
              class=${'demo-btn demo-btn-secondary mochart-demo-notes-trigger' + (this.open ? ' active' : '')}
              aria-haspopup="true" aria-expanded=${this.open}
              title=${demoText.demoNotes.trigger.tooltip} aria-label=${demoText.demoNotes.trigger.aria}
              @click=${this.onToggle}>
        ${icon({ size: 'lg', fixedWidth: true, name: 'circle-info' })}
      </button>
      <div class=${'demo-menu demo-menu-notes' + (menuOpen ? ' open' : '')}
           style=${menuOpen ? `position: fixed; top: ${this.coords!.top}px; left: ${this.coords!.left}px; margin: 0; z-index: 1080;` : nothing}>
        <span class="demo-menu-notes-title">${this.demoTitle}</span>
        <span class="demo-menu-notes-body">${this.notes}</span>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'notes-menu': NotesMenu;
  }
}
