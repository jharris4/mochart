import { defineConfig, devices } from '@playwright/test';

// The gallery's own Playwright project, separate from mochart-demo-basic's.
//
// Separate because the two suites are rooted in different packages: these specs
// import @mochart/demo-common and @mochart/demo-data (this package's own
// dependencies) for the copy and class constants they build selectors from, and
// demo-basic declares neither — folding them into its config would give it
// phantom dependencies on packages it does not depend on. The dev server
// differs too (this package pins 5179, demo-basic 5173), so the configs would
// have to carry a webServer array and per-project baseURLs regardless.
//
// Chromium only, deliberately. TEST-15 covers the three engines the core README
// claims support for, and what it runs there is library rendering — SVG text
// measurement, focus, export serialization — which is where engines diverge.
// What this suite covers is demo-app plumbing (clipboard, the compressed share
// payload, a lazy chunk, DOM reparenting), and one of those cannot run
// elsewhere at all: Playwright's clipboard-read permission grant is
// Chromium-only. A second copy of the engine matrix would triple the gate for
// coverage TEST-15 already has.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5179',
    trace: 'on-first-retry'
  },
  // The phone tier is a project rather than a per-test `setViewportSize` so the
  // page is BUILT at that width: the fold reads the viewport while mounting, and
  // a resize after mount exercises the watcher path instead of the initial one.
  // Tag a test with `phoneTag` from e2e/helpers to move it to the phone project.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, grepInvert: /@phone/ },
    {
      name: 'chromium-phone',
      // Not `devices['iPhone 13']`: a device descriptor sets a WebKit user agent,
      // which under Chromium is a lie and under WebKit would pin this suite's
      // only mobile coverage to the one engine that cannot read the clipboard.
      // 390x844 is the same viewport that descriptor carries, which is all the
      // width-driven fold actually reads.
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
      grep: /@phone/
    }
  ],
  webServer: {
    // Dev server on vite.config's pinned 5179; --strictPort so a clash fails loudly.
    command: 'npm run dev -- --strictPort',
    url: 'http://localhost:5179',
    reuseExistingServer: !process.env.CI
  }
});
