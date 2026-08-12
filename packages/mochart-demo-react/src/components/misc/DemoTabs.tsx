import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

import { demoTabId, demoTabPanelId, demoTabPendingId, demoText, nextDemoTabIndex } from '@mochart/demo-common';
import type { DemoTab } from '@mochart/demo-common';

// The Chart / Config / Data strip in the top bar, as an ARIA tablist.
//
// One place per port builds this, because the `tab` role is a package deal: the
// roles and `aria-selected` are only half of it, the other half is the keyboard
// contract (Left/Right wrap, Home/End, and a roving tabindex so the strip is one
// stop rather than three). The keys themselves come from `nextDemoTabIndex` in
// @mochart/demo-common, shared with the other five ports.
//
// Selection is automatic: arrowing to a tab shows its pane, which is what a
// click already did and costs nothing here — every pane stays mounted.

interface DemoTabsProps {
  tabs: readonly DemoTab[];
  activeKey: number;
  onSelect: (key: number) => void;
}

export default function DemoTabs({ tabs, activeKey, onSelect }: DemoTabsProps) {
  const listRef = useRef<HTMLUListElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const activeIndex = tabs.findIndex(tab => tab.key === activeKey);
    const nextIndex = nextDemoTabIndex(event.key, activeIndex < 0 ? 0 : activeIndex, tabs.length);
    if (nextIndex === null) {
      return;
    }
    // Home/End would scroll the pane, and the arrows are ours once focus is on a
    // tab — the tabs are the only focusable things in the strip.
    event.preventDefault();
    onSelect(tabs[nextIndex].key);
    // Every tab is already rendered, so this lands before the re-render that
    // moves the roving tabindex onto it.
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };

  return (
    <ul ref={listRef} className="demo-tabs" role="tablist" aria-label={demoText.tabs.listAria}
      onKeyDown={onKeyDown}>
      {tabs.map(tab => {
        const selected = tab.key === activeKey;
        const pending = tab.pending === true && !selected;
        return (
          // `presentation`, not `listitem`: a tablist's children are its tabs,
          // and the `<li>`s are only here because the strip is styled as a list.
          <li key={tab.key} className="demo-tab-item" role="presentation">
            <button type="button" id={demoTabId(tab.name)} role="tab"
              className={"demo-tab" + (selected ? " active" : "")}
              aria-selected={selected} aria-controls={demoTabPanelId(tab.name)}
              // Roving tabindex: Tab reaches the strip once, the arrows move inside it.
              tabIndex={selected ? 0 : -1}
              title={pending ? demoText.tabs.chartPendingTitle : undefined}
              aria-describedby={pending ? demoTabPendingId : undefined}
              onClick={() => { onSelect(tab.key); }}>
              {tab.label}
              {pending ? <span className="mochart-pending-badge" aria-hidden="true" /> : null}
            </button>
            {/* The badge is a decorative dot, so the tab points
                `aria-describedby` here while it shows. Hidden, and read anyway:
                a referenced element's text is exposed whether or not the element
                itself is. */}
            {tab.name === 'chart'
              ? <span id={demoTabPendingId} hidden>{demoText.tabs.chartPendingTitle}</span>
              : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The strip for a view with only one pane (Multi).
 *
 * Not a one-tab tablist: there is nothing to switch to, and a tab that cannot be
 * activated is exactly the dead button this replaces. It renders as the caption
 * it always was — same markup, same styling, no roles claiming otherwise.
 */
export function StaticDemoTabs({ label }: { label: string }) {
  return (
    <ul className="demo-tabs">
      <li className="demo-tab-item"><span className="demo-tab active">{label}</span></li>
    </ul>
  );
}
