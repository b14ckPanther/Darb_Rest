import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/setup-content.ts",
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore:
        /(content|ordering|payments|tables|kitchen|operations|templates|polish|excellence|analytics).spec.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "content",
      testMatch:
        /(content|ordering|payments|tables|kitchen|operations|templates|polish|excellence|analytics).spec.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3101" },
    },
  ],
  webServer: [
    {
      command: "node scripts/order-e2e-server.mjs",
      port: 3100,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "node scripts/content-e2e-server.mjs",
      port: 3101,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "pnpm --filter @darb-rest/web dev",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: "pnpm --filter @darb-rest/admin dev",
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
