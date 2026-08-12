import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },
  // Chromium runs everything; Gecko and WebKit run the @smoke subset, so the
  // three engines the core README claims support for are all exercised without
  // tripling the gate. Tag a test with `smokeTag` from e2e/helpers to add it.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grep: /@smoke/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grep: /@smoke/ }
  ],
  webServer: {
    // Dev server on vite.config's pinned 5173; --strictPort so a clash fails loudly.
    command: 'npm run dev -- --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
});
