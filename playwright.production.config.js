import { defineConfig, devices } from '@playwright/test';

import baseConfig from './playwright.config.js';

const e2eApiUrl =
  process.env.E2E_API_URL || process.env.VITE_API_URL || 'https://api.e2e.invalid/v1';

export default defineConfig({
  ...baseConfig,
  testMatch: '**/production-smoke.spec.js',
  projects: [
    {
      name: 'production-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  use: {
    ...baseConfig.use,
    baseURL: 'http://127.0.0.1:4173',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      E2E_API_URL: e2eApiUrl,
      VITE_API_URL: e2eApiUrl,
    },
  },
});
