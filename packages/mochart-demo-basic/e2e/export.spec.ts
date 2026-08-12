import { test, expect, openDemo, smokeTag } from './helpers';

test.beforeEach(async ({ page }) => {
  await openDemo(page, 'stacked');
  await expect(page.locator('#chart-host .mochart-series').first()).toBeAttached();
});

test('the SVG button downloads the chart as an svg file', { tag: smokeTag }, async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export-svg').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.svg$/);
});

test('the PNG button downloads the chart as a png file', { tag: smokeTag }, async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export-png').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
});
