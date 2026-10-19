import { expect, test, type Browser, type Page } from "./fixtures";

const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1";

async function openSized(
  browser: Browser,
  opts: { ua: string; width: number; height: number; lang: "en" | "ar"; path?: string }
) {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
    viewport: { width: opts.width, height: opts.height },
    userAgent: opts.ua,
    locale: opts.lang === "ar" ? "ar-SA" : "en-US",
  });
  const page = await context.newPage();
  await page.goto(`${opts.path || "/"}?lang=${opts.lang}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.installReady === "1");
  return { context, page };
}

async function firePrompt(page: Page) {
  await page.evaluate(() => {
    class InstallPrompt extends Event {
      prompt() {
        (window as unknown as { __prompted?: boolean }).__prompted = true;
        return Promise.resolve();
      }
      userChoice = Promise.resolve({ outcome: "accepted" as const });
    }
    window.dispatchEvent(new InstallPrompt("beforeinstallprompt"));
  });
}

test("desktop menu opens the install instructions", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "checked once");
  await page.goto("/?lang=en", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("install-banner")).toHaveCount(0);
  await page.getByTestId("install-menu").click();
  await expect(page.getByTestId("install-sheet")).toContainText("Open the browser menu");
  await page.goto("/pricing?lang=ar");
  await expect(page.getByTestId("install-pricing")).toHaveText("ثبّت التطبيق");
  await page.getByTestId("install-pricing").click();
  await expect(page.getByTestId("install-sheet")).toContainText("قائمة المتصفح");
});

test("android and iphone install banners stay clear of the composer and pricing buttons", async ({ browser }, info) => {
  test.skip(info.project.name !== "phone-390", "mobile layouts");

  const androidEn = await openSized(browser, { ua: ANDROID, width: 412, height: 915, lang: "en" });
  await firePrompt(androidEn.page);
  const banner = androidEn.page.getByTestId("install-banner");
  await expect(banner).toContainText("Install the app");
  await expect(banner.getByTestId("install-go")).toHaveText("Install");
  await androidEn.page.screenshot({ path: "/opt/cursor/artifacts/pwa-android-en-banner.png" });
  await androidEn.page.locator(".mkt-menu-btn").click();
  await expect(androidEn.page.locator(".app-side.is-open").getByTestId("install-menu")).toHaveText("Install app");
  await androidEn.page.screenshot({ path: "/opt/cursor/artifacts/pwa-android-en-menu.png" });
  await androidEn.page.keyboard.press("Escape");
  await androidEn.page.getByTestId("install-go").click();
  await expect.poll(() => androidEn.page.evaluate(() => (window as unknown as { __prompted?: boolean }).__prompted)).toBe(true);
  await androidEn.context.close();

  const androidAr = await openSized(browser, { ua: ANDROID, width: 412, height: 915, lang: "ar" });
  await firePrompt(androidAr.page);
  await expect(androidAr.page.getByTestId("install-banner")).toContainText("ثبّت التطبيق");
  await androidAr.page.screenshot({ path: "/opt/cursor/artifacts/pwa-android-ar-banner.png" });
  await androidAr.page.locator(".mkt-menu-btn").click();
  await expect(androidAr.page.locator(".app-side.is-open").getByTestId("install-menu")).toHaveText("تثبيت التطبيق");
  await androidAr.page.screenshot({ path: "/opt/cursor/artifacts/pwa-android-ar-menu.png" });
  await androidAr.context.close();

  const iphoneEn = await openSized(browser, { ua: IPHONE, width: 390, height: 844, lang: "en" });
  const iosBanner = iphoneEn.page.getByTestId("install-banner");
  await expect(iosBanner).toContainText("Add to Home Screen");
  await expect(iosBanner.locator(".install-share-icon")).toBeVisible();
  await expect(iosBanner.getByTestId("install-go")).toHaveCount(0);
  await iphoneEn.page.screenshot({ path: "/opt/cursor/artifacts/pwa-iphone-en-banner.png" });
  await iphoneEn.page.locator(".mkt-menu-btn").click();
  await expect(iphoneEn.page.locator(".app-side.is-open").getByTestId("install-menu")).toHaveText("Install app");
  await iphoneEn.page.screenshot({ path: "/opt/cursor/artifacts/pwa-iphone-en-menu.png" });
  await iphoneEn.page.locator(".app-side.is-open").getByTestId("install-menu").click();
  await expect(iphoneEn.page.getByTestId("install-sheet")).toContainText("Add to Home Screen");
  await iphoneEn.context.close();

  const iphoneAr = await openSized(browser, { ua: IPHONE, width: 390, height: 844, lang: "ar" });
  await expect(iphoneAr.page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(iphoneAr.page.getByTestId("install-banner")).toContainText("الشاشة الرئيسية");
  await iphoneAr.page.screenshot({ path: "/opt/cursor/artifacts/pwa-iphone-ar-banner.png" });
  await iphoneAr.page.locator(".mkt-menu-btn").click();
  await expect(iphoneAr.page.locator(".app-side.is-open").getByTestId("install-menu")).toHaveText("تثبيت التطبيق");
  await iphoneAr.page.screenshot({ path: "/opt/cursor/artifacts/pwa-iphone-ar-menu.png" });
  await iphoneAr.page.goto("/chat?lang=ar", { waitUntil: "domcontentloaded" });
  const chatBanner = iphoneAr.page.getByTestId("install-banner");
  await expect(chatBanner).toBeVisible();
  const bannerBox = await chatBanner.boundingBox();
  const composerBox = await iphoneAr.page.locator("textarea").boundingBox();
  expect(bannerBox && composerBox && bannerBox.y + bannerBox.height < composerBox.y).toBeTruthy();
  await iphoneAr.page.goto("/pricing?lang=ar", { waitUntil: "domcontentloaded" });
  const priceBanner = await iphoneAr.page.getByTestId("install-banner").boundingBox();
  const cta = await iphoneAr.page.locator(".mkt-btn-primary").first().boundingBox();
  expect(priceBanner && cta && priceBanner.y + priceBanner.height < cta.y).toBeTruthy();
  await iphoneAr.context.close();

  const other = await openSized(browser, { ua: IPHONE_CHROME, width: 390, height: 844, lang: "en" });
  await expect(other.page.getByTestId("install-banner")).toContainText("Open this page in Safari");
  await other.page.getByRole("button", { name: "Not now" }).click();
  await other.page.reload({ waitUntil: "domcontentloaded" });
  await expect(other.page.getByTestId("install-banner")).toHaveCount(0);
  await other.page.evaluate((age) => {
    localStorage.setItem("engineerit.install.dismissedAt", String(Date.now() - age));
  }, 15 * 24 * 60 * 60 * 1000);
  await other.page.reload({ waitUntil: "domcontentloaded" });
  await expect(other.page.getByTestId("install-banner")).toContainText("Safari");
  await other.context.close();
});
