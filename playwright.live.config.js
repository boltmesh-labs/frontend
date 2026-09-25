import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

if (existsSync('.env.e2e')) {
  process.loadEnvFile('.env.e2e');
}

const { default: baseConfig } = await import('./playwright.config.js');

export default defineConfig({
  ...baseConfig,
  testMatch: '**/live-backend.spec.js',
  projects: [
    {
      name: 'live-chromium',
      testMatch: '**/live-backend.spec.js',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
