import type {
  PlaywrightTestConfig,
  PlaywrightWorkerOptions,
} from '@playwright/test';

/**
 * Local override: host :8080 is occupied; run against AFFINE_DEV_PORT=18080.
 * Uses system Google Chrome (Playwright bundled chromium unsupported on this host OS).
 */
const config: PlaywrightTestConfig = {
  testDir: './e2e',
  testMatch: '**/illustration-mode.spec.ts',
  fullyParallel: false,
  timeout: 60_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:18080/',
    browserName:
      (process.env.BROWSER as PlaywrightWorkerOptions['browserName']) ??
      'chromium',
    channel: 'chrome',
    permissions: ['clipboard-read', 'clipboard-write'],
    viewport: { width: 1440, height: 800 },
    actionTimeout: 10_000,
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
};

export default config;
