import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env.e2e")) {
  process.loadEnvFile(".env.e2e");
}

const { default: baseConfig } = await import("./playwright.config.js");

export default defineConfig({
  ...baseConfig,
  testMatch: "**/live-backend.spec.js",
  // A test that signs in may sit in throttleLogin waiting out the backend's
  // 10-per-minute login budget, so it needs more room than the default 30s.
  timeout: 120_000,
  projects: [
    {
      name: "live-chromium",
      testMatch: "**/live-backend.spec.js",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
