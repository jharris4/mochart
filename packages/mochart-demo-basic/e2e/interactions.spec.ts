import type { Page } from '@playwright/test';
import { test, expect, openDemo } from './helpers';
import { mochartCssClasses } from '@mochart/core';

const crosshairLineSelector = `.${mochartCssClasses['crosshair']} .${mochartCssClasses['crosshairLine']}`;
const categoryTickLabels = '.mochart-category-axis .mochart-axis-tick-label';

function barGeometry(page: Page): Promise<string> {
  return page.evaluate(() => Array.from(document.querySelectorAll('.mochart-series-bar'))
    .map((bar) => bar.getAttribute('d'))
    .join('|'));
}

async function hoverPlotCenter(page: Page): Promise<void> {
  const box = await page.locator('.mochart-plot-background').boundingBox();
  if (!box) {
    throw new Error('plot background has no bounding box');
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
}

test.beforeEach(async ({ page }) => {
  await openDemo(page, 'stacked');
  await expect(page.locator('.mochart-series-bar').first()).toBeAttached();
});

test('clicking the plot opens a tooltip and crosshair with one line per series', async ({ page }) => {
  const crosshairLines = page.locator(crosshairLineSelector);
  await expect(crosshairLines).toHaveCount(0);

  await hoverPlotCenter(page);
  const box = await page.locator('.mochart-plot-background').boundingBox();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

  const tooltip = page.locator('.mochart-tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('Category');
  const seriesCount = await page.locator('.mochart-series').count();
  await expect(page.locator('.mochart-tooltip [class*="mochart-tooltip-series-line"]'))
    .toHaveCount(seriesCount);
  await expect(crosshairLines.first()).toBeAttached();
});

test('clicking a legend item filters the series out and back in', async ({ page }) => {
  const series = page.locator('.mochart-series');
  const initialCount = await series.count();
  expect(initialCount).toBeGreaterThan(1);

  const firstLegendItem = page.locator('.mochart-legend-item').first();
  await firstLegendItem.click();
  await expect(series).toHaveCount(initialCount - 1);

  await firstLegendItem.click();
  await expect(series).toHaveCount(initialCount);
});

test('legend filtering is keyboard accessible', async ({ page }) => {
  const series = page.locator('.mochart-series');
  const initialCount = await series.count();

  const firstLegendItem = page.locator('[data-series-id]').first();
  await firstLegendItem.focus();
  await expect(firstLegendItem).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Enter');
  await expect(series).toHaveCount(initialCount - 1);
  await expect(firstLegendItem).toHaveAttribute('aria-pressed', 'false');

  await page.keyboard.press('Space');
  await expect(series).toHaveCount(initialCount);
  await expect(firstLegendItem).toHaveAttribute('aria-pressed', 'true');

  // arrows move focus and the roving tab stop to the next item
  await page.keyboard.press('ArrowRight');
  const secondLegendItem = page.locator('[data-series-id]').nth(1);
  await expect(secondLegendItem).toBeFocused();
  await expect(secondLegendItem).toHaveAttribute('tabindex', '0');
  await expect(firstLegendItem).toHaveAttribute('tabindex', '-1');
});

test('the tooltip and crosshair are keyboard accessible from the plot area', async ({ page }) => {
  const plotRect = page.locator('.mochart-series-background rect');
  await expect(plotRect).toHaveAttribute('role', 'button');
  await expect(plotRect).toHaveAttribute('aria-expanded', 'false');
  await plotRect.focus();

  await page.keyboard.press('Enter');
  const tooltip = page.locator('.mochart-tooltip');
  await expect(tooltip).toBeVisible();
  await expect(plotRect).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(crosshairLineSelector).first()).toBeAttached();

  // compare category labels only: series values animate, and the demo's
  // category values are not consecutive
  const categoryLabel = async () => (await tooltip.textContent())?.match(/Category: [\d.]+/)?.[0];
  const firstLabel = await categoryLabel();
  expect(firstLabel).toBeTruthy();

  // arrows step the shown category
  await page.keyboard.press('ArrowRight');
  await expect.poll(categoryLabel).not.toBe(firstLabel);

  await page.keyboard.press('ArrowLeft');
  await expect.poll(categoryLabel).toBe(firstLabel);

  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
  await expect(plotRect).toHaveAttribute('aria-expanded', 'false');
});

test('pie slices are keyboard accessible', async ({ page }) => {
  // a hash-only goto would not remount the app, so switch demos via the sidebar
  await page.locator('#demo-list button[data-id="pie"]').click();
  const slices = page.locator('.mochart-series-container g[data-series-id]');
  await expect(slices.first()).toBeAttached();

  // a pie has one category, so arrows on the plot stop have nothing to step
  const plotRect = page.locator('.mochart-series-background rect');
  await plotRect.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.mochart-tooltip')).toBeHidden();

  const firstSlice = slices.first();
  await expect(firstSlice).toHaveAttribute('role', 'button');
  await expect(firstSlice).toHaveAttribute('tabindex', '0');
  await firstSlice.focus();

  // Enter is click-equivalent: the app's slice handler fires AND the bubbled
  // chart click opens the tooltip, exactly like a mouse click on the slice
  await page.keyboard.press('Enter');
  await expect(page.locator('#chart-host')).toHaveAttribute('data-last-slice-click', 'slice0');
  const tooltip = page.locator('.mochart-tooltip');
  await expect(tooltip).toBeVisible();

  // arrows rove between slices in config order
  await page.keyboard.press('ArrowRight');
  const secondSlice = page.locator('.mochart-series-container g[data-series-id="slice1"]');
  await expect(secondSlice).toBeFocused();
  await expect(secondSlice).toHaveAttribute('tabindex', '0');
  await expect(firstSlice).toHaveAttribute('tabindex', '-1');

  // a second activation toggles the tooltip closed, like a second click would
  await page.keyboard.press(' ');
  await expect(page.locator('#chart-host')).toHaveAttribute('data-last-slice-click', 'slice1');
  await expect(tooltip).toBeHidden();
});

test('keyboard focus shows a ring, mouse focus does not', async ({ page }) => {
  // a keystroke first, so the scripted focus below counts as keyboard-driven
  await page.keyboard.press('Tab');
  const plotRect = page.locator('.mochart-series-background rect');
  await plotRect.focus();
  await expect(plotRect).toBeFocused();
  const keyboardOutline = await plotRect.evaluate((el) => {
    const style = getComputedStyle(el);
    return style.outlineStyle + ' ' + style.outlineWidth;
  });
  expect(keyboardOutline).toBe('solid 2px');

  const firstLegendItem = page.locator('.mochart-legend-item').first();
  await firstLegendItem.click();
  await expect(firstLegendItem).toBeFocused();
  const mouseOutline = await firstLegendItem.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(mouseOutline).toBe('none');
});

test('toolbar add/remove category updates the category axis', async ({ page }) => {
  const ticks = page.locator(categoryTickLabels);
  const initialCount = await ticks.count();

  await page.click('#add-category');
  await expect(ticks).toHaveCount(initialCount + 1);

  await page.click('#remove-category');
  await expect(ticks).toHaveCount(initialCount);
});

// Waits until two bar-geometry samples taken 250ms apart match, i.e. the
// update animation has settled. The gap between samples matters: back-to-back
// samples can match before the animation's first frame.
async function waitForSettledBars(page: Page): Promise<void> {
  await expect.poll(async () => {
    const before = await barGeometry(page);
    await page.waitForTimeout(250);
    return before === await barGeometry(page);
  }).toBe(true);
}

function barOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const plot = document.querySelector('.mochart-plot-background')!.getBoundingClientRect();
    let overflow = 0;
    for (const bar of document.querySelectorAll('.mochart-series-bar')) {
      const box = bar.getBoundingClientRect();
      overflow = Math.max(overflow, plot.top - box.top, box.bottom - plot.bottom);
    }
    return overflow;
  });
}

test('randomized values stay within a fixed value axis range', async ({ page }) => {
  // the christmas demo pins the value axis at min 0 with all-positive data,
  // so any randomized value below 0 renders outside the plot; navigate via
  // the sidebar because the app only reads the location hash at startup
  await page.locator('#demo-list button', { hasText: 'Christmas Tree Bars' }).click();
  await expect(page.locator('#demo-title')).toHaveText('Christmas Tree Bars');
  await expect(page.locator('.mochart-series-bar').first()).toBeAttached();

  for (let i = 0; i < 8; i++) {
    await page.click('#randomize');
    await waitForSettledBars(page);
    expect(await barOverflow(page)).toBeLessThanOrEqual(1);
  }
});

test('randomize changes bar geometry and reset restores category count', async ({ page }) => {
  const ticks = page.locator(categoryTickLabels);
  const initialTicks = await ticks.count();
  const initialGeometry = await barGeometry(page);

  await page.click('#randomize');
  await expect.poll(() => barGeometry(page)).not.toBe(initialGeometry);

  await page.click('#add-category');
  await expect(ticks).toHaveCount(initialTicks + 1);
  await page.click('#reset');
  await expect(ticks).toHaveCount(initialTicks);
});
