import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "visual.spec.ts",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  snapshotPathTemplate: "tests/e2e/visual-baselines/{platform}/{projectName}/{arg}{ext}",
  expect: {
    timeout: 20_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    extraHTTPHeaders: { "x-engineerit-test": "1" },
    locale: "en-US",
    timezoneId: "Asia/Riyadh",
  },
  projects: [
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 900 } } },
    { name: "phone-390", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      MAIL_TRANSPORT: "log",
      VERCEL_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "dummy-key",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      ZSMTP_HOST: "",
      ZSMTP_USER: "",
      ZSMTP_PASS: "",
    },
  },
});
