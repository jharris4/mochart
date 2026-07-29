import { test, expect, openDemo } from './helpers';

// Pie-specific interactions: the pie/donut demos render RadialPlot (slices,
// no axes or crosshair), so the x/y interactions.spec.ts selectors don't
// apply. Slices are series-keyed, so the legend and tooltip behave exactly
// like the x/y charts.

test.describe('pie demo', () => {
  test.beforeEach(async ({ page }) => {
    await openDemo(page, 'pie');
    await expect(page.locator('.mochart-series-slice').first()).toBeAttached();
  });

  test('renders one slice per series and no axes or crosshair', async ({ page }) => {
    const seriesCount = await page.locator('.mochart-series').count();
    await expect(page.locator('.mochart-series-slice')).toHaveCount(seriesCount);
    await expect(page.locator('.mochart-radial-plot')).toBeAttached();
    await expect(page.locator('.mochart-crosshair')).toHaveCount(0);
    await expect(page.locator('.mochart-axis-tick-label')).toHaveCount(0);
  });

  test('clicking the chart opens a tooltip with one row per slice', async ({ page }) => {
    const box = await page.locator('.mochart-plot-background').boundingBox();
    if (!box) {
      throw new Error('plot background has no bounding box');
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    const tooltip = page.locator('.mochart-tooltip');
    await expect(tooltip).toBeVisible();
    const seriesCount = await page.locator('.mochart-series').count();
    await expect(page.locator('.mochart-tooltip [class*="mochart-tooltip-series-line"]'))
      .toHaveCount(seriesCount);

    // the pie tooltip anchors at the click point (snapToGroup is off), so
    // close it with a click away from the tooltip box
    await page.mouse.click(box.x + box.width * 0.1, box.y + box.height * 0.1);
    await expect(tooltip).toHaveCount(0);
  });

  test('clicking a legend item removes the slice and the rest refill the circle', async ({ page }) => {
    const slices = page.locator('.mochart-series-slice');
    const initialCount = await slices.count();
    expect(initialCount).toBeGreaterThan(1);
    const remainingSliceD = () => slices.last().getAttribute('d');
    const before = await remainingSliceD();

    const firstLegendItem = page.locator('.mochart-legend-item').first();
    await firstLegendItem.click();
    await expect(slices).toHaveCount(initialCount - 1);
    // the survivors grew to fill the removed slice's share
    await expect.poll(remainingSliceD).not.toBe(before);

    await firstLegendItem.click();
    await expect(slices).toHaveCount(initialCount);
  });
});

test.describe('donut demo', () => {
  test('renders donut slices with percent labels on the wide slices', async ({ page }) => {
    await openDemo(page, 'donut');
    await expect(page.locator('.mochart-series-slice').first()).toBeAttached();
    const labels = page.locator('.mochart-series-slice-label');
    const sliceCount = await page.locator('.mochart-series-slice').count();
    // during the initial grow-in the slices are near-equal so every label
    // shows; once settled the slices under labelMinAnglePercent hide theirs
    await expect.poll(() => labels.count()).toBeLessThan(sliceCount);
    expect(await labels.count()).toBeGreaterThan(0);
    await expect(labels.first()).toContainText('%');
  });
});
