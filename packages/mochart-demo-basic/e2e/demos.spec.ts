import demosJson from '@mochart/demo-data/demos.json' with { type: 'json' };
import type { DemoEntry } from './helpers';
import { test, expect, openDemo } from './helpers';

const manifest = demosJson as { demos: DemoEntry[]; testDemos: DemoEntry[] };

// Test demos are ordinary valid configs (feature coverage), so they get the
// same assertions as the gallery demos.
const sections: { label: string; demos: DemoEntry[] }[] = [
  { label: 'demo', demos: manifest.demos },
  { label: 'test demo', demos: manifest.testDemos }
];

test.describe('demo gallery', () => {
  for (const { label, demos } of sections) {
    for (const demo of demos) {
      test('renders ' + label + ' "' + demo.title + '" (' + demo.id + ')', async ({ page }) => {
        await openDemo(page, demo.id);
        await expect(page.locator('#errors')).toBeHidden();
        await expect(page.locator('#chart-host .mochart-series').first()).toBeAttached();
      });
    }
  }
});
