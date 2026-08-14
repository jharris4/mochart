import { defineConfig, devices } from '@playwright/test';

// Dev server on vite.config's pinned 5173; --strictPort so a clash fails loudly.
// Resolves the development export condition, so tests run against src.
const devServer = {
  command: 'npm run dev -- --strictPort',
  url: 'http://localhost:5173',
  reuseExistingServer: !process.env.CI
};

// CI-only second server: builds the demo against the library dist bundles and
// serves it on vite preview's pinned 4173, so the published build is executed,
// not just bundled. The timeout covers the build step.
// Reproduce locally with: CI=1 npx playwright test --project=chromium-dist
const previewServer = {
  command: 'npm run build && npm run preview -- --strictPort',
  url: 'http://localhost:4173',
  reuseExistingServer: false,
  timeout: 180_000
};

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
  // In CI, chromium-dist runs the @smoke subset once more against the preview
  // server's dist-based build.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grep: /@smoke/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grep: /@smoke/ },
    ...(process.env.CI
      ? [{
          name: 'chromium-dist',
          use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4173' },
          grep: /@smoke/
        }]
      : [])
  ],
  webServer: process.env.CI ? [devServer, previewServer] : [devServer]
});
