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
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
    env: { MAIL_TRANSPORT: "log", VERCEL_ENV: "development" },
  },
});
