import { defineConfig } from '@playwright/test';

const { default: baseConfig } = await import('./playwright.live.config.js');

export default defineConfig({
  ...baseConfig,
  testMatch: '**/live-writes.spec.js',
  projects: baseConfig.projects.map((project) => ({
    ...project,
    testMatch: '**/live-writes.spec.js',
  })),
});
