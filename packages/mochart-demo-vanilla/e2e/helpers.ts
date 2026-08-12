import { mochartCssClasses } from '@mochart/core';
import { demoTabId, demoTabPanelId, demoText, shareHashPrefix } from '@mochart/demo-common';
import type { DemoTabName } from '@mochart/demo-common';
import type { Locator, Page } from '@playwright/test';
import { test as base, expect } from '@playwright/test';

// Any uncaught exception in the page fails the test that triggered it.
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    await use(page);
    expect(pageErrors, 'uncaught page errors').toEqual([]);
  }
});

export { expect, demoText, shareHashPrefix };

/**
 * Tag for the phone-viewport subset: tagged tests run ONLY in the
 * `chromium-phone` project (see the projects in playwright.config.ts), and
 * untagged ones only at desktop width. A spec about the fold can therefore hold
 * both halves of it — what collapses on a phone, and what must not at desktop.
 */
export const phoneTag = '@phone';

/**
 * A selector for one `mochartCssClasses` entry.
 *
 * Several entries are a class plus the prefix of a generated per-item class
 * ('mochart-series mochart-series-'), so the first token is the stable one.
 */
export function chartClass(entry: string): string {
  return '.' + entry.split(' ')[0];
}

/**
 * The demo this suite drives. `stacked` is the same one demo-basic exercises:
 * a plain bar chart with several categories and series, no pie mode (which
 * swaps the whole control strip) and no generator step.
 */
export const demoId = 'stacked';

/** Element carrying an `aria-label` from demoText — the demos' control selector. */
export function byAria(scope: Page | Locator, ariaLabel: string): Locator {
  return scope.locator('[aria-label=' + JSON.stringify(ariaLabel) + ']');
}

/**
 * Element carrying a `title` from demoText.
 *
 * Used for the mode switcher's segments, which have no `aria-label` — their
 * accessible name is their visible text. A `getByRole` name match would be
 * wrong here anyway: Playwright's role engine skips elements the accessibility
 * tree hides, and a control folded into a closed (`display: none`) overflow
 * panel is exactly what these counts have to see.
 */
export function byTitle(scope: Page | Locator, title: string): Locator {
  return scope.locator('[title=' + JSON.stringify(title) + ']');
}

/** A rendered chart. */
export function charts(page: Page): Locator {
  return page.locator(chartClass(mochartCssClasses.chart));
}

/** A view's tab pane, by the id demo-common pairs with its tab button. */
export function tabPanel(page: Page, name: DemoTabName): Locator {
  return page.locator('#' + demoTabPanelId(name));
}

/**
 * Press `control` until `attribute` reads `value` — the state the press is for.
 *
 * The retry is not decoration. Under a loaded machine a press landing in the
 * first moments after a view's initial render is occasionally lost: the element
 * is where Playwright measured it and the hit test resolves to it, but no
 * `click` event arrives (the demos' bars re-home their contents by moving the
 * very nodes involved, and a target detached between mousedown and mouseup fires
 * no click). Asserting the resulting state and pressing again is what a user
 * does, and it keeps the assertion strict instead of sleeping.
 */
export async function pressUntil(control: Locator, attribute: string, value: string): Promise<void> {
  await expect(async () => {
    await control.click();
    await expect(control).toHaveAttribute(attribute, value, { timeout: 1000 });
  }).toPass();
}

export async function selectTab(page: Page, name: DemoTabName): Promise<void> {
  await pressUntil(page.locator('#' + demoTabId(name)), 'aria-selected', 'true');
}

/** Open a demo in one of the switchable modes and wait for its first chart. */
export async function openDemo(page: Page, mode: 'single' | 'multi', id = demoId): Promise<void> {
  await page.goto('/' + mode + '/' + id);
  await expect(charts(page).first()).toBeVisible();
  await expect(page.locator(chartClass(mochartCssClasses.series)).first()).toBeAttached();
}

/**
 * Follow a copied share link.
 *
 * The blank page in between is load-bearing: the copied link differs from the
 * page it was copied on only by the hash, and Playwright's `goto` treats that as
 * a same-document navigation — nothing would reload and no share state would be
 * consumed. A fresh document is also what pasting the link somewhere actually
 * does.
 */
export async function followShareLink(page: Page, link: string): Promise<void> {
  await page.goto('about:blank');
  await page.goto(link);
}

/**
 * Let the page read what it wrote to the clipboard.
 *
 * `navigator.clipboard.writeText` (what the demos' share copier calls) needs no
 * grant on a secure origin, but `readText` does — Chromium refuses it outright
 * without `clipboard-read`. Granting both keeps the copy path under test the
 * real one rather than a stub.
 */
export async function grantClipboard(page: Page): Promise<void> {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(page.url()).origin
  });
}

export function readClipboard(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

/** Open the export/share dropdown inside `scope` and wait for it to be expanded. */
export async function openExportShareMenu(scope: Page | Locator): Promise<void> {
  await pressUntil(byAria(scope, demoText.exportShareMenu.trigger.aria), 'aria-expanded', 'true');
}

/** Copy the current view's share link and hand back what landed on the clipboard. */
export async function copyShareLink(page: Page, scope: Page | Locator = page): Promise<string> {
  await grantClipboard(page);
  await openExportShareMenu(scope);
  // No assertion on the confirmation label: pressing Share closes the menu, so
  // the copied label swap happens in a hidden panel (DEMO-23).
  await byAria(scope, demoText.shareButton.aria).click();
  // The copier writes the clipboard from a promise callback, so the read polls.
  let link = '';
  await expect.poll(async () => {
    link = await readClipboard(page);
    return link;
  }).toContain(shareHashPrefix);
  return link;
}
