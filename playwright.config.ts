import { defineConfig } from "@playwright/test";
if (!process.env.E2E_DATABASE_URL)
  throw new Error(
    "Set E2E_DATABASE_URL to a migrated, isolated test database.",
  );
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    viewport: { width: 1366, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- --port 3100 --hostname localhost",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL,
      SESSION_SECRET: "e2e-only-session-secret-not-for-production-123456789",
    },
  },
});
