import demosJson from '../demos/demos.json' with { type: 'json' };
import type { DemoEntry } from './helpers';
import { test, expect, openDemo } from './helpers';

const demos = (demosJson as { demos: DemoEntry[] }).demos;
const testDemos = (demosJson as { testDemos: DemoEntry[] }).testDemos;

test.describe('demo gallery', () => {
  for (const demo of demos) {
    test('renders "' + demo.title + '" (' + demo.id + ')', async ({ page }) => {
      await openDemo(page, demo.id);
      await expect(page.locator('#errors')).toBeHidden();
      await expect(page.locator('#chart-host .mochart-series').first()).toBeAttached();
    });
  }

  // Test demos include intentionally invalid configs, so only require that the
  // page survives the mount and reports errors through the errors pane.
  for (const demo of testDemos) {
    test('mounts test demo "' + demo.title + '" (' + demo.id + ')', async ({ page }) => {
      await openDemo(page, demo.id);
    });
  }
});
