import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild, inject, signal } from '@angular/core';
import type { OnChanges, OnDestroy, OnInit } from '@angular/core';

import { buildShareUrl, createMenuController, demoText } from '@mochart/demo-common';
import type { MenuController, ShareState } from '@mochart/demo-common';

import { Icon } from './icon';

const copiedFeedbackMs = 1500;

/**
 * A collapsed export/share menu placed at the end of each mode's controls row.
 * The trigger uses a share icon; the menu holds PNG / SVG downloads and (when a
 * share state is provided) a copy-share-link item. The parent supplies the
 * export actions so this component stays agnostic about single vs. tiled charts.
 *
 * Open/close, positioning, dismissal, focus return and the disclosure ARIA all
 * come from demo-common's `createMenuController` — including the reason any of
 * it is hand-rolled (the controls strips clip an absolutely-positioned dropdown,
 * and the chart's interaction rect eats clicks through anything stacked below
 * it). What stays here is what the controller does not know about: the items,
 * the copied-link feedback, and `disabled`.
 *
 * The trigger and panel carry STATIC classes and no `aria-expanded`, because
 * the controller writes those itself; a binding on the same element would be
 * re-applied by change detection and wipe them. `copied()` is still a signal,
 * so that one *does* need the zoneless `detectChanges()` flush — see `onShare`.
 */
@Component({
  selector: 'app-export-share-menu',
  imports: [Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div class="demo-btn-group demo-menu-up mochart-export-share-menu">
      <button [id]="idPrefix + '-export-share'" type="button" #trigger
              class="demo-btn demo-btn-secondary demo-menu-trigger"
              [disabled]="disabled"
              [attr.title]="text.trigger.tooltip" [attr.aria-label]="text.trigger.aria"
              (click)="controller?.toggle()">
        <app-icon size="lg" [fixedWidth]="true" name="share-nodes" />
      </button>
      <div #panel class="demo-menu">
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
export class ExportShareMenu implements OnInit, OnChanges, OnDestroy {
  readonly text = demoText.exportShareMenu;
  readonly exportText = demoText.exportButtons;
  readonly shareText = demoText.shareButton;

  @Input({ required: true }) idPrefix!: string;
  @Input({ required: true }) exportPng!: () => void;
  @Input({ required: true }) exportSvg!: () => void;
  /** Omit to hide the Share item (e.g. a chart whose state isn't shareable). */
  @Input() getShareState?: () => ShareState;
  @Input() disabled = false;
  /**
   * The hosting pane's active state. A deactivated pane is only marked inert,
   * and an open panel is `position: fixed` — it would keep painting over the
   * pane that replaced this one. False closes the menu.
   */
  @Input() active = true;

  @ViewChild('trigger', { static: true }) triggerElement!: ElementRef<HTMLButtonElement>;
  @ViewChild('panel', { static: true }) panelElement!: ElementRef<HTMLDivElement>;

  readonly copied = signal(false);

  controller?: MenuController;

  private readonly changeDetector = inject(ChangeDetectorRef);
  private revertTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // Opens upward (the controls row sits at the bottom of the pane) and
    // right-aligned (the trigger is the last control in the row).
    this.controller = createMenuController({
      trigger: this.triggerElement.nativeElement,
      panel: this.panelElement.nativeElement,
      placement: { side: 'top', align: 'end', gap: 4 },
      bindTrigger: false
    });
  }

  // A disabled trigger fires no click, so the menu cannot be opened — but one
  // already open when its trigger is disabled would be stranded.
  ngOnChanges(): void {
    if (this.disabled || !this.active) {
      this.controller?.close();
    }
  }

  ngOnDestroy(): void {
    if (this.revertTimer !== null) {
      clearTimeout(this.revertTimer);
      this.revertTimer = null;
    }
    this.controller?.destroy();
  }

  runAndClose(action: () => void): void {
    action();
    this.controller?.close();
  }

  onShare(): void {
    if (!this.getShareState) {
      return;
    }
    const url = buildShareUrl(this.getShareState());
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      // The clipboard promise resolves outside Angular, and this is a zoneless
      // app, so the signal write there only *schedules* change detection —
      // flush it so the "Link copied" label appears on the spot.
      this.changeDetector.detectChanges();
      if (this.revertTimer !== null) {
        clearTimeout(this.revertTimer);
      }
      this.revertTimer = setTimeout(() => {
        this.copied.set(false);
        this.revertTimer = null;
        this.changeDetector.detectChanges();
      }, copiedFeedbackMs);
    }, () => {
      // Clipboard access can be unavailable (e.g. insecure context); let the
      // user copy the link manually instead of failing silently.
      window.prompt(this.shareText.tooltip, url);
    });
    this.controller?.close();
  }
}
