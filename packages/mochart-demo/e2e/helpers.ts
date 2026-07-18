import type { Page } from '@playwright/test';
import { test as base, expect } from '@playwright/test';

export interface DemoEntry {
  id: string;
  title: string;
  config: string;
  data: string;
}

// Any uncaught exception in the page fails the test that triggered it.
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    await use(page);
    expect(pageErrors, 'uncaught page errors').toEqual([]);
  }
});

export { expect };

export async function openDemo(page: Page, id: string): Promise<void> {
  await page.goto('/#' + id);
  await expect(page.locator('#chart-host .mochart-chart')).toBeVisible();
}
