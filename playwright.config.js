import { defineConfig, devices } from '@playwright/test';

const e2eApiUrl = process.env.E2E_API_URL || process.env.VITE_API_URL || 'http://127.0.0.1:8000/v1';
const configuredWorkers = Number.parseInt(process.env.PLAYWRIGHT_WORKERS || '', 10);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: Number.isInteger(configuredWorkers) ? configuredWorkers : process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  use: {
    baseURL: 'http://127.0.0.1:5173',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/mobile.spec.js', '**/live-backend.spec.js', '**/production-smoke.spec.js'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      testMatch: '**/mobile.spec.js',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'firefox',
      testIgnore: ['**/mobile.spec.js', '**/live-backend.spec.js', '**/production-smoke.spec.js'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: ['**/mobile.spec.js', '**/live-backend.spec.js', '**/production-smoke.spec.js'],
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'live-chromium',
      testMatch: '**/live-backend.spec.js',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      E2E_API_URL: e2eApiUrl,
      VITE_API_URL: e2eApiUrl,
    },
  },
});
