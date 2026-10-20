import { defineConfig, devices } from "@playwright/test";

/** Local app only. Mail is logged and Supabase is the placeholder project. */
const baseURL = "http://127.0.0.1:3000";

const serverEnv = {
  MAIL_TRANSPORT: "log",
  VERCEL_ENV: "development",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "dummy-key",
  NEXT_PUBLIC_APP_URL: baseURL,
  ZSMTP_HOST: "",
  ZSMTP_USER: "",
  ZSMTP_PASS: "",
};

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/sidebar-nav.spec.ts",
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL,
    locale: "en-US",
    timezoneId: "Asia/Riyadh",
    extraHTTPHeaders: { "x-engineerit-test": "1" },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-1440",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        hasTouch: false,
        isMobile: false,
      },
    },
    {
      name: "phone-390",
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "webkit-390",
      use: {
        ...devices["iPhone 13"],
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: serverEnv,
  },
});
