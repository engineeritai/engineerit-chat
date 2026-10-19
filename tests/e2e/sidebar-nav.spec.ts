import { expect, test, type Locator, type Page } from "./fixtures";

const homeLinks = [
  "/chat",
  "/advisors",
  "/how-it-works",
  "/guide",
  "/tools",
  "/pricing",
  "/faq",
  "/profile",
  "/feedback",
  "/legal/terms",
  "/legal/privacy",
  "/legal/refund",
  "/login",
  "/register",
];

const chatLinks = ["/", "/advisors", "/pricing", "/how-it-works", "/guide", "/tools", "/feedback", "/login", "/register"];

function pathOf(href: string) {
  return href.split(/[?#]/)[0] || "/";
}

async function activate(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  if (test.info().project.use.hasTouch) await locator.tap();
  else await locator.click();
}

async function openMenu(page: Page, drawer: string) {
  const menu = page.locator(".mkt-menu-btn");
  if (!(await menu.isVisible())) return;
  await page.waitForFunction((selector) => {
    const button = document.querySelector(selector);
    return Boolean(button && Object.getOwnPropertyNames(button).some((key) => key.startsWith("__reactProps")));
  }, ".mkt-menu-btn");
  await menu.click({ noWaitAfter: true });
  await expect(page.locator(drawer)).toBeVisible();
}

async function respond(page: Page, path: string) {
  if (path === "/pricing") {
    const annual = page.locator(".mkt-pricing .mkt-toggle button").nth(1);
    await expect(annual).toBeVisible();
    await activate(annual);
    await expect(annual).toHaveAttribute("aria-pressed", "true");
  }
  if (path === "/faq") {
    const details = page.locator(".mkt-faq details").first();
    await activate(details.locator("summary"));
    await expect(details).toHaveAttribute("open", "");
  }
  if (path === "/feedback") {
    const box = page.locator("form textarea").first();
    await box.fill("drawer check");
    await expect(box).toHaveValue("drawer check");
  }
  if (path === "/chat") {
    const field = page.locator("textarea").first();
    await field.fill("Still here");
    await expect(field).toHaveValue("Still here");
  }
}

for (const lang of ["en", "ar"] as const) {
  test(`home drawer links navigate (${lang})`, async ({ page }, info) => {
    test.skip(info.project.name === "tablet-768", "covered on phone and desktop");
    test.setTimeout(240_000);
    await page.goto(`/?lang=${lang}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");

    const pricing = page.locator(".mkt-hero a.mkt-btn[href='/pricing']").first();
    await activate(pricing);
    await page.waitForURL((url) => url.pathname === "/pricing");
    await respond(page, "/pricing");

    if (await page.locator(".mkt-tabbar").isVisible()) {
      await page.goto(`/?lang=${lang}`, { waitUntil: "domcontentloaded" });
      await activate(page.locator(".mkt-tabbar a[href='/chat']"));
      await page.waitForURL((url) => url.pathname === "/chat");
    }

    for (const href of homeLinks) {
      await page.goto(`/?lang=${lang}`, { waitUntil: "domcontentloaded" });
      await openMenu(page, ".app-side.is-open");
      const link = page.locator(`.app-side a[href='${href}']`).last();
      await activate(link);
      const path = pathOf(href);
      await page.waitForURL((url) => url.pathname === path, { timeout: 20_000 });
      expect(new URL(page.url()).pathname).toBe(path);
      await respond(page, path);
      if (await page.locator(".mkt-menu-btn").isVisible()) {
        await expect(page.locator(".app-side.is-open")).toBeHidden();
      }
    }

    await page.goto(`/?lang=${lang}`, { waitUntil: "domcontentloaded" });
    await openMenu(page, ".app-side.is-open");
    await activate(page.locator(".app-side a[href='/#disciplines']"));
    await expect(page.locator("#disciplines")).toBeInViewport();
    expect(new URL(page.url()).pathname).toBe("/");
    expect(new URL(page.url()).hash).toBe("#disciplines");
  });

  test(`chat sidebar links navigate (${lang})`, async ({ page }, info) => {
    test.skip(info.project.name === "tablet-768", "covered on phone and desktop");
    test.setTimeout(240_000);
    await page.goto(`/chat?lang=${lang}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("textarea").first()).toBeVisible();

    const mobile = await page.locator(".mkt-menu-btn").isVisible();
    const scope = () => (mobile ? page.locator(".sidebar-mobile-panel") : page.locator(".sidebar.desktop-only"));

    if (mobile) {
      await openMenu(page, ".sidebar-mobile-overlay");
      await activate(scope().locator("button.chat-side-row").first());
      await expect(page.locator(".sidebar-mobile-overlay")).toBeHidden();
      expect(new URL(page.url()).pathname).toBe("/chat");
    }

    for (const href of chatLinks) {
      await page.goto(`/chat?lang=${lang}`, { waitUntil: "domcontentloaded" });
      if (mobile) await openMenu(page, ".sidebar-mobile-overlay");
      const matches = scope().locator(`a[href='${href}']`);
      const link = href === "/" ? matches.nth(1) : matches.first();
      await activate(link);
      const path = pathOf(href);
      await page.waitForURL((url) => url.pathname === path, { timeout: 20_000 });
      expect(new URL(page.url()).pathname).toBe(path);
      await respond(page, path);
    }
  });
}
