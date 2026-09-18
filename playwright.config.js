import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

const e2eEnvFile = new URL(".env.e2e", import.meta.url);
if (existsSync(e2eEnvFile)) loadEnvFile(e2eEnvFile);

const e2eDatabaseHost = process.env.DB_HOST || "";
const e2eDatabaseName = process.env.DB_NAME || "";
if (
  !["localhost", "127.0.0.1", "::1"].includes(e2eDatabaseHost) ||
  !/^[a-zA-Z_][a-zA-Z0-9_]*_test$/.test(e2eDatabaseName)
) {
  throw new Error(
    "E2E hanya boleh memakai DB_HOST loopback dan DB_NAME berakhiran _test di file .env.e2e.",
  );
}

const FRONTEND_URL = process.env.E2E_BASE_URL || "http://localhost:5173";
const API_URL = process.env.E2E_API_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["list"],
  ],
  globalSetup: "./e2e/global-setup.js",
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  // Login (bcrypt + DB) bisa >5s saat banyak worker paralel; assertion
  // bawaan 5s terlalu ketat untuk suite penuh di mesin berbagi sumber daya.
  expect: { timeout: 10000 },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],
  webServer: [
    {
      command: "npm --prefix backend start",
      env: {
        NODE_ENV: "test",
        EMAIL_ENABLED: "false",
        HOST: new URL(API_URL).hostname,
        PORT: new URL(API_URL).port || "3000",
        CORS_ORIGINS: FRONTEND_URL,
        // Worker paralel berbagi satu IP (127.0.0.1): limit default 20 auth/menit
        // memicu 429 pada login fresh. Naikkan hanya di environment E2E.
        AUTH_RATE_LIMIT_MAX: "200",
        API_RATE_LIMIT_MAX: "2000",
      },
      url: `${API_URL}/api/assets`,
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: "npm --prefix frontend run dev -- --strictPort",
      env: {
        VITE_HOST: new URL(FRONTEND_URL).hostname,
        VITE_PORT: new URL(FRONTEND_URL).port || "5173",
        VITE_API_PROXY_TARGET: API_URL,
      },
      url: FRONTEND_URL,
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
