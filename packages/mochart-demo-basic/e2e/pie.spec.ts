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

test.describe('gauge demo', () => {
  test('renders a half-donut with title labels and a suppression-aware center total', async ({ page }) => {
    await openDemo(page, 'gauge');
    await expect(page.locator('.mochart-series-slice')).toHaveCount(3);
    await expect(page.locator('.mochart-pie-center-label')).toHaveText('responses');
    await expect(page.locator('.mochart-pie-center-total')).toHaveText('1,000');

    // suppressing the first segment (Promoters, 540) counts the total down
    await page.locator('.mochart-legend-item').first().click();
    await expect(page.locator('.mochart-pie-center-total')).toHaveText('460');
    await page.locator('.mochart-legend-item').first().click();
    await expect(page.locator('.mochart-pie-center-total')).toHaveText('1,000');
  });
});

test.describe('donut demo', () => {
  test('hovering a legend entry explodes the slice (focusOffsetFraction)', async ({ page }) => {
    await openDemo(page, 'donut');
    const slice = page.locator('[class*="mochart-series-slice0"]');
    await expect(slice).toBeAttached();
    const before = await slice.getAttribute('transform');

    await page.locator('.mochart-legend-item').first().hover();
    await expect.poll(() => slice.getAttribute('transform')).not.toBe(before);

    await page.mouse.move(0, 0);
    await expect.poll(() => slice.getAttribute('transform')).toBe(before);
  });

  // The donut's labels and tooltip both show shares (labelType 'percent',
  // tooltipValues 'percent'), so suppressing a slice has to move both.
  test('renormalizes the tooltip shares with the labels when a slice is suppressed', async ({ page }) => {
    await openDemo(page, 'donut');
    await expect(page.locator('.mochart-series-slice').first()).toBeAttached();

    const openTooltip = async () => {
      const box = await page.locator('.mochart-plot-background').boundingBox();
      if (!box) {
        throw new Error('plot background has no bounding box');
      }
      // click near the top edge of the ring, away from the tooltip's own box
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.1, { steps: 5 });
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.1);
      await expect(page.locator('.mochart-tooltip')).toBeVisible();
    };
    const safariRow = page.locator('.mochart-tooltip [class*="mochart-tooltip-series-line-slice1"]');

    await openTooltip();
    await expect(safariRow).toContainText('20.0%'); // Safari's share of all six slices
    await page.keyboard.press('Escape');

    // suppress Chrome (62), the largest slice — Safari's share must grow
    await page.locator('.mochart-legend-item').first().click();
    await openTooltip();
    await expect(safariRow).toContainText('52.6%');
    // the same share in the label, rounded by its own auto format (.0% for the
    // cramped centroid labels, .1% for the tooltip)
    await expect(page.locator('.mochart-series-slice-label').first()).toContainText('53%');
  });

  test('renders donut slices with percent labels on the wide slices', async ({ page }) => {
    await openDemo(page, 'donut');
    await expect(page.locator('.mochart-series-slice').first()).toBeAttached();
    const labels = page.locator('.mochart-series-slice-label');
    const sliceCount = await page.locator('.mochart-series-slice').count();
    // labels stay hidden during the initial sweep-in; once settled they show
    // on every slice except those under labelMinFraction
    await expect.poll(async () => {
      const count = await labels.count();
      return count > 0 && count < sliceCount;
    }).toBe(true);
    await expect(labels.first()).toContainText('%');
  });
});
