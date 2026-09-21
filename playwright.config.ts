import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Retained operational suites require pre-v1 grants; they are not commercial v1 tests.
  testIgnore: /\/(ordering|payments|tables|kitchen|operations|analytics)\.spec\.ts$/,
  globalSetup: "./e2e/setup-content.ts",
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  workers: 1, // Shared local restaurant fixtures are mutated and restored by commercial QA.
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
        /(content|ordering|payments|tables|kitchen|operations|templates|polish|excellence|analytics|launch|platform|activation).spec.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "content",
      testIgnore: /(ordering|payments|tables|kitchen|operations|analytics).spec.ts/,
      testMatch:
        /(content|ordering|payments|tables|kitchen|operations|templates|polish|excellence|analytics|launch|platform|activation).spec.ts/,
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
      command: "node scripts/local-e2e-server.mjs web 3000",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: "node scripts/local-e2e-server.mjs admin 3001",
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
