import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild, computed, inject, signal } from '@angular/core';
import type { OnDestroy } from '@angular/core';

import { buildShareUrl, demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import { Icon } from './icon';

const copiedFeedbackMs = 1500;
const menuGap = 4;

/**
 * A collapsed export/share menu placed at the end of each mode's controls row.
 * The trigger uses a share icon; the menu holds PNG / SVG downloads and (when a
 * share state is provided) a copy-share-link item. The parent supplies the
 * export actions so this component stays agnostic about single vs. tiled charts.
 *
 * The controls strips (and chart panes) use `overflow: hidden`, which would
 * clip a normal absolutely-positioned dropdown that opens upward over the
 * chart — and the chart's transparent interaction rect would steal clicks. So
 * the menu is positioned `fixed` (measured from the trigger) at a high z-index,
 * which escapes ancestor clipping and stacks above the chart.
 */
@Component({
  selector: 'app-export-share-menu',
  imports: [Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div #root class="demo-btn-group demo-menu-up mochart-export-share-menu">
      <button [id]="idPrefix + '-export-share'" type="button" #trigger
              [class]="'demo-btn demo-btn-secondary demo-menu-trigger' + (open() ? ' active' : '')"
              [disabled]="disabled" aria-haspopup="true" [attr.aria-expanded]="open()"
              [attr.title]="text.trigger.tooltip" [attr.aria-label]="text.trigger.aria"
              (click)="toggle()">
        <app-icon size="lg" [fixedWidth]="true" name="share-nodes" />
      </button>
      <div [class]="'demo-menu' + (menuOpen() ? ' open' : '')"
           [style.position]="menuOpen() ? 'fixed' : null"
           [style.bottom.px]="menuOpen() ? coords()!.bottom : null"
           [style.right.px]="menuOpen() ? coords()!.right : null"
           [style.margin]="menuOpen() ? '0' : null"
           [style.z-index]="menuOpen() ? 1080 : null">
        <button type="button" class="demo-menu-item" (click)="runAndClose(exportPng)"
                [attr.aria-label]="exportText.png.aria">
          <app-icon [fixedWidth]="true" name="file-image" /> <span class="mochart-menu-item-label">{{ exportText.png.label }}</span>
        </button>
        <button type="button" class="demo-menu-item" (click)="runAndClose(exportSvg)"
                [attr.aria-label]="exportText.svg.aria">
          <app-icon [fixedWidth]="true" name="file-code" /> <span class="mochart-menu-item-label">{{ exportText.svg.label }}</span>
        </button>
        @if (getShareState) {
          <div class="demo-menu-divider"></div>
          <button type="button" class="demo-menu-item" (click)="onShare()"
                  [attr.aria-label]="shareText.aria">
            <app-icon [fixedWidth]="true" [name]="copied() ? 'check' : 'link'" /> <span class="mochart-menu-item-label">{{ copied() ? shareText.tooltipCopied : shareText.label }}</span>
          </button>
        }
      </div>
    </div>
  `
})
export class ExportShareMenu implements OnDestroy {
  readonly text = demoText.exportShareMenu;
  readonly exportText = demoText.exportButtons;
  readonly shareText = demoText.shareButton;

  @Input({ required: true }) idPrefix!: string;
  @Input({ required: true }) exportPng!: () => void;
  @Input({ required: true }) exportSvg!: () => void;
  /** Omit to hide the Share item (e.g. a chart whose state isn't shareable). */
  @Input() getShareState?: () => ShareState;
  @Input() disabled = false;

  @ViewChild('root') rootElement?: ElementRef<HTMLDivElement>;
  @ViewChild('trigger') triggerElement?: ElementRef<HTMLButtonElement>;

  readonly open = signal(false);
  readonly copied = signal(false);
  readonly coords = signal<{ bottom: number; right: number } | null>(null);

  // Only show/position the menu once we've measured the trigger.
  readonly menuOpen = computed(() => this.open() && this.coords() !== null);

  private readonly changeDetector = inject(ChangeDetectorRef);
  private revertTimer: ReturnType<typeof setTimeout> | null = null;
  private listening = false;

  // The close listeners fire outside Angular (native document/window handlers),
  // and this is a zoneless app, so a signal write there only *schedules* change
  // detection — the DOM would still show the open menu until the next tick. Flush
  // synchronously so the menu's shown/hidden state always matches the signal the
  // instant it changes (open on click, closed on Escape/outside-click).
  private syncView(): void {
    this.changeDetector.detectChanges();
  }

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    // Anchor the fixed menu just above the trigger's top-right corner, so it
    // opens upward and right-aligned. Measured now to avoid a positioning flash.
    const rect = this.triggerElement?.nativeElement.getBoundingClientRect();
    if (rect) {
      this.coords.set({
        bottom: window.innerHeight - rect.top + menuGap,
        right: window.innerWidth - rect.right
      });
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

  runAndClose(action: () => void): void {
    action();
    this.close();
  }

  onShare(): void {
    if (!this.getShareState) {
      return;
    }
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
    this.close();
  }

  ngOnDestroy(): void {
    if (this.revertTimer !== null) {
      clearTimeout(this.revertTimer);
      this.revertTimer = null;
    }
    this.removeListeners();
  }

  // Close on an outside click, Escape, or a scroll/resize that would leave the
  // fixed menu drifting away from its trigger.
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
