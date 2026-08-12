// The Chart / Config / Data strip every demo view puts in its top bar, as ARIA
// tabs. The six ports each build the strip in their own idiom, so what has to
// agree between them lives here: the id pairing that ties a tab to the pane it
// controls, and the arrow-key contract the `tab` role implies.
//
// The strip is a horizontal tablist with automatic activation — moving between
// tabs selects them, which is what the mouse behaviour already was (one click,
// one pane) and what makes sense when there is no cost to showing a pane.

/** A pane a demo view can show. One view mounts at a time, so the ids below stay unique. */
export type DemoTabName = 'chart' | 'config' | 'data';

/** One entry of a view's tab strip. `key` is the view's own event key for the pane. */
export interface DemoTab {
  name: DemoTabName;
  key: number;
  label: string;
  /** Chart tab only: applied config/data edits are waiting on that pane. */
  pending?: boolean;
}

/** Id of a tab button — the pane's `aria-labelledby` target. */
export function demoTabId(name: DemoTabName): string {
  return 'demo-tab-' + name;
}

/** Id of a pane — the tab button's `aria-controls` target. */
export function demoTabPanelId(name: DemoTabName): string {
  return 'demo-tabpanel-' + name;
}

/**
 * Id of the description of the pending-changes badge.
 *
 * The badge itself is a decorative dot (`aria-hidden`), and its explanation used
 * to live only in the button's `title`, which no screen reader reads. The strip
 * renders this text once in a `hidden` span and the Chart tab points
 * `aria-describedby` at it while the badge shows — referenced text is exposed
 * even when the element carrying it is hidden, which is the whole point of
 * putting it somewhere `hidden` rather than in the accessible name.
 */
export const demoTabPendingId = 'demo-tab-pending-note';

export interface DemoTabPanelAttrs {
  id: string;
  role: 'tabpanel';
  'aria-labelledby': string;
}

/**
 * The attributes tying a pane to the tab that selects it. Spread onto the pane's
 * root element — the names are spelled the same in every port's templates.
 *
 * Deliberately no `tabindex="0"`: that is only wanted for a panel with nothing
 * focusable inside it, and all three panes have controls of their own (the chart
 * controls strip, the editors' textareas and buttons).
 */
export function getDemoTabPanelAttrs(name: DemoTabName): DemoTabPanelAttrs {
  return { id: demoTabPanelId(name), role: 'tabpanel', 'aria-labelledby': demoTabId(name) };
}

/**
 * The tab a keypress in the strip moves to, or null for a key the strip does not
 * own (which the caller must leave to the browser).
 *
 * Left/Right wrap, Home/End jump to the ends: the horizontal tablist keys, and
 * only those. Up/Down are deliberately not handled — they belong to a vertical
 * tablist, and swallowing them here would break scrolling from a focused tab.
 */
export function nextDemoTabIndex(key: string, activeIndex: number, tabCount: number): number | null {
  if (tabCount < 1) {
    return null;
  }
  if (key === 'ArrowRight') {
    return (activeIndex + 1) % tabCount;
  }
  if (key === 'ArrowLeft') {
    return (activeIndex - 1 + tabCount) % tabCount;
  }
  if (key === 'Home') {
    return 0;
  }
  if (key === 'End') {
    return tabCount - 1;
  }
  return null;
}
