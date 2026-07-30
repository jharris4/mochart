import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild, computed, inject, signal } from '@angular/core';
import type { OnChanges, OnDestroy } from '@angular/core';

import { demoText, getNotesPanelPosition } from '@mochart/demo-common';
import type { NotesPanelPosition } from '@mochart/demo-common';

import { Icon } from './icon';

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
@Component({
  selector: 'app-notes-menu',
  imports: [Icon],
  styles: [':host { display: contents; }'],
  template: `
    @if (notes !== undefined) {
      <div #root class="demo-btn-group mochart-demo-notes-menu">
        <button type="button" #trigger
                [class]="'demo-btn demo-btn-secondary mochart-demo-notes-trigger' + (open() ? ' active' : '')"
                aria-haspopup="true" [attr.aria-expanded]="open()"
                [attr.title]="text.trigger.tooltip" [attr.aria-label]="text.trigger.aria"
                (click)="toggle()">
          <app-icon size="lg" [fixedWidth]="true" name="circle-info" />
        </button>
        <div [class]="'demo-menu demo-menu-notes' + (menuOpen() ? ' open' : '')"
             [style.position]="menuOpen() ? 'fixed' : null"
             [style.top.px]="menuOpen() ? coords()!.top : null"
             [style.left.px]="menuOpen() ? coords()!.left : null"
             [style.margin]="menuOpen() ? '0' : null"
             [style.z-index]="menuOpen() ? 1080 : null">
          <span class="demo-menu-notes-title">{{ demoTitle }}</span>
          <span class="demo-menu-notes-body">{{ notes }}</span>
        </div>
      </div>
    }
  `
})
export class NotesMenu implements OnChanges, OnDestroy {
  readonly text = demoText.demoNotes;

  /** Demo title, shown as the panel heading (not `title`, which is native). */
  @Input({ required: true }) demoTitle!: string;
  /** The demo's notes; nothing renders when there are none. */
  @Input() notes?: string;

  @ViewChild('root') rootElement?: ElementRef<HTMLDivElement>;
  @ViewChild('trigger') triggerElement?: ElementRef<HTMLButtonElement>;

  readonly open = signal(false);
  readonly coords = signal<NotesPanelPosition | null>(null);

  // Only show/position the panel once we've measured the trigger.
  readonly menuOpen = computed(() => this.open() && this.coords() !== null);

  private readonly changeDetector = inject(ChangeDetectorRef);
  private listening = false;

  // The close listeners fire outside Angular (native document/window handlers),
  // and this is a zoneless app, so a signal write there only *schedules* change
  // detection — the DOM would still show the open panel until the next tick.
  // Flush synchronously so the panel's shown/hidden state always matches the
  // signal the instant it changes.
  private syncView(): void {
    this.changeDetector.detectChanges();
  }

  // Close whenever the demo changes under us (history navigation between demos).
  ngOnChanges(): void {
    this.close();
  }

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    // Measured now to avoid a positioning flash.
    const rect = this.triggerElement?.nativeElement.getBoundingClientRect();
    if (rect) {
      this.coords.set(getNotesPanelPosition(rect, window.innerWidth));
    }
    this.open.set(true);
    this.addListeners();
    this.syncView();
  }

  close(): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.coords.set(null);
    this.removeListeners();
    this.syncView();
  }

  ngOnDestroy(): void {
    this.removeListeners();
  }

  // Close on an outside click, Escape, or a scroll/resize that would leave the
  // fixed panel drifting away from its trigger.
  private onDocMouseDown = (event: MouseEvent): void => {
    const root = this.rootElement?.nativeElement;
    if (root && !root.contains(event.target as Node)) {
      this.close();
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.close();
    }
  };

  private onReflow = (): void => {
    this.close();
  };

  private addListeners(): void {
    if (this.listening) {
      return;
    }
    this.listening = true;
    document.addEventListener('mousedown', this.onDocMouseDown);
    document.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('scroll', this.onReflow, true);
    window.addEventListener('resize', this.onReflow);
  }

  private removeListeners(): void {
    if (!this.listening) {
      return;
    }
    this.listening = false;
    document.removeEventListener('mousedown', this.onDocMouseDown);
    document.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('scroll', this.onReflow, true);
    window.removeEventListener('resize', this.onReflow);
  }
}
