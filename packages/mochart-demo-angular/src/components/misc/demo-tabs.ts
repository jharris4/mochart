import { Component, Input } from '@angular/core';

import { demoTabId, demoTabPanelId, demoTabPendingId, demoText, nextDemoTabIndex } from '@mochart/demo-common';
import type { DemoTab } from '@mochart/demo-common';

/**
 * The Chart / Config / Data strip in the top bar, as an ARIA tablist.
 *
 * One place per port builds this, because the `tab` role is a package deal: the
 * roles and `aria-selected` are only half of it, the other half is the keyboard
 * contract (Left/Right wrap, Home/End, and a roving tabindex so the strip is one
 * stop rather than three). The keys themselves come from `nextDemoTabIndex` in
 * @mochart/demo-common, shared with the other five ports.
 *
 * Selection is automatic: arrowing to a tab shows its pane, which is what a
 * click already did and costs nothing here — every pane stays mounted.
 */
@Component({
  selector: 'app-demo-tabs',
  styles: [':host { display: contents; }'],
  template: `
    <ul class="demo-tabs" role="tablist" [attr.aria-label]="text.listAria" (keydown)="onKeyDown($event)">
      <!-- \`presentation\`, not \`listitem\`: a tablist's children are its tabs, and
           the \`<li>\`s are only here because the strip is styled as a list. -->
      @for (tab of tabs; track tab.key) {
        <li class="demo-tab-item" role="presentation">
          <button type="button" role="tab" [id]="tabId(tab)"
                  [class]="'demo-tab' + (tab.key === activeKey ? ' active' : '')"
                  [attr.aria-selected]="tab.key === activeKey" [attr.aria-controls]="panelId(tab)"
                  [attr.tabindex]="tab.key === activeKey ? 0 : -1"
                  [attr.title]="isPending(tab) ? text.chartPendingTitle : null"
                  [attr.aria-describedby]="isPending(tab) ? pendingId : null"
                  (click)="onSelect(tab.key)">{{ tab.label }}@if (isPending(tab)) {<span class="mochart-pending-badge" aria-hidden="true"></span>}</button>
          <!-- The badge is a decorative dot, so the tab points \`aria-describedby\`
               here while it shows. Hidden, and read anyway: a referenced
               element's text is exposed whether or not the element itself is. -->
          @if (tab.name === 'chart') {
            <span [id]="pendingId" hidden>{{ text.chartPendingTitle }}</span>
          }
        </li>
      }
    </ul>
  `
})
export class DemoTabs {
  @Input({ required: true }) tabs!: readonly DemoTab[];
  @Input({ required: true }) activeKey!: number;
  @Input({ required: true }) onSelect!: (key: number) => void;

  readonly text = demoText.tabs;
  readonly pendingId = demoTabPendingId;

  tabId(tab: DemoTab): string {
    return demoTabId(tab.name);
  }

  panelId(tab: DemoTab): string {
    return demoTabPanelId(tab.name);
  }

  isPending(tab: DemoTab): boolean {
    return tab.pending === true && tab.key !== this.activeKey;
  }

  onKeyDown(event: KeyboardEvent): void {
    const activeIndex = this.tabs.findIndex(tab => tab.key === this.activeKey);
    const nextIndex = nextDemoTabIndex(event.key, activeIndex < 0 ? 0 : activeIndex, this.tabs.length);
    if (nextIndex === null) {
      return;
    }
    // Home/End would scroll the pane, and the arrows are ours once focus is on a
    // tab — the tabs are the only focusable things in the strip.
    event.preventDefault();
    const list = event.currentTarget as HTMLElement;
    this.onSelect(this.tabs[nextIndex].key);
    // Every tab is already rendered, so this lands before the re-render that
    // moves the roving tabindex onto it.
    list.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }
}

/**
 * The strip for a view with only one pane (Multi).
 *
 * Not a one-tab tablist: there is nothing to switch to, and a tab that cannot be
 * activated is exactly the dead button this replaces. It renders as the caption
 * it always was — same markup, same styling, no roles claiming otherwise.
 */
@Component({
  selector: 'app-static-demo-tabs',
  styles: [':host { display: contents; }'],
  template: `
    <ul class="demo-tabs">
      <li class="demo-tab-item"><span class="demo-tab active">{{ label }}</span></li>
    </ul>
  `
})
export class StaticDemoTabs {
  @Input({ required: true }) label!: string;
}
