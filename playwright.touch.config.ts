import { defineConfig, devices } from "@playwright/test";

const xiaomi =
  "Mozilla/5.0 (Linux; Android 14; 23090RA98G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.8.0";
const samsung =
  "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 SamsungBrowser/26.0";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "touch.spec.ts",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    locale: "en-US",
    timezoneId: "Asia/Riyadh",
    extraHTTPHeaders: { "x-engineerit-test": "1" },
  },
  projects: [
    {
      name: "android-393",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 393, height: 873 },
        deviceScaleFactor: 2.75,
        hasTouch: true,
        isMobile: true,
        userAgent: xiaomi,
        channel: "chrome",
      },
    },
    {
      name: "android-360",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
        userAgent: samsung,
        channel: "chrome",
      },
    },
    {
      name: "webkit-390",
      use: {
        ...devices["iPhone 13"],
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
