import {defineConfig, devices} from '@playwright/test';

const PORT = 4310;

// Runs against the static export under its real prefix: `npm run build`
// first, then `npm run test:e2e`.
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  // axe over the whole report takes seconds per state, and several states
  // share a test.
  timeout: 90_000,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/lunon-living-report/`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-export.ts',
    url: `http://localhost:${PORT}/lunon-living-report/`,
    env: {PORT: String(PORT)},
    reuseExistingServer: !process.env.CI,
  },
  // Frame timing means nothing with other tests competing for the CPU, so
  // @perf tests run on their own: `npm run test:perf`.
  projects: [
    // Installed Chrome rather than Playwright's Chromium build.
    {
      name: 'chrome',
      grepInvert: /@perf/,
      use: {...devices['Desktop Chrome'], channel: 'chrome'},
    },
    {name: 'webkit', grepInvert: /@perf/, use: devices['Desktop Safari']},
    {name: 'firefox', grepInvert: /@perf/, use: devices['Desktop Firefox']},
    {
      name: 'perf',
      grep: /@perf/,
      use: {...devices['Desktop Chrome'], channel: 'chrome'},
    },
  ],
});
