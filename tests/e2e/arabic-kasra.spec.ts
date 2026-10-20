import { expect, test, type Browser, type Page } from "./fixtures";
import { isScriptConsoleError } from "./fixtures";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

const TASHKEEL = /[\u064B-\u0652]/;

const REGISTER = {
  ar: "أنشئ حسابك، وابدأ بباقة المهندس المساعد المجانية، ثم اشترك في إحدى الباقات المدفوعة لتحصل على محادثات لا محدودة وتصدير للمحادثات حسب مزايا الباقات المتوفرة (الباقات).",
  en: "Create your account and start with the free Assistant Engineer plan, then subscribe to one of the paid plans for unlimited chats and chat export, according to each plan's features (plans).",
} as const;

async function openPhone(browser: Browser, width: number, path: string, lang: "en" | "ar") {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
    viewport: { width, height: 844 },
    userAgent: IPHONE,
    isMobile: true,
    hasTouch: true,
    locale: lang === "ar" ? "ar-SA" : "en-US",
    extraHTTPHeaders: { "x-engineerit-test": "1" },
  });
  const page = await context.newPage();
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (isScriptConsoleError(message)) problems.push(`console.error: ${message.text()}`);
  });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  return { context, page, problems };
}

async function renderedUiText(page: Page) {
  return page.evaluate(() => {
    const parts = [document.body.innerText];
    for (const el of document.querySelectorAll<HTMLElement>("*")) {
      for (const attr of ["placeholder", "aria-label", "title", "alt"]) {
        const value = el.getAttribute(attr);
        if (value) parts.push(value);
      }
    }
    return parts.join("\n");
  });
}

async function lineBands(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()]
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({ top: rect.top, bottom: rect.bottom }))
      .sort((a, b) => a.top - b.top);
    const bands: { top: number; bottom: number }[] = [];
    for (const rect of rects) {
      const last = bands[bands.length - 1];
      if (last && rect.top < last.bottom - 1) {
        last.top = Math.min(last.top, rect.top);
        last.bottom = Math.max(last.bottom, rect.bottom);
      } else {
        bands.push({ top: rect.top, bottom: rect.bottom });
      }
    }
    return bands;
  });
}

test("Arabic pages render no tashkeel marks", async ({ browser }) => {
  const paths = ["/?lang=ar", "/pricing?lang=ar", "/chat?lang=ar", "/register?lang=ar"];
  for (const path of paths) {
    const { context, page, problems } = await openPhone(browser, 375, path, "ar");
    const text = await renderedUiText(page);
    expect(text, path).not.toMatch(TASHKEEL);
    expect(problems, path).toEqual([]);
    await context.close();
  }
});

test("Arabic hero title clears the first subtitle line", async ({ browser }) => {
  const arabic = await openPhone(browser, 375, "/?lang=ar", "ar");
  const gap = await arabic.page.evaluate(() => {
    const headline = document.querySelector("h1.brand-headline");
    const lead = document.querySelector(".mkt-hero .mkt-lead");
    if (!headline || !lead) return null;
    const headlineBox = headline.getBoundingClientRect();
    const leadBox = lead.getBoundingClientRect();
    const style = getComputedStyle(headline);
    return {
      gap: leadBox.top - headlineBox.bottom,
      lineHeight: parseFloat(style.lineHeight),
      fontSize: parseFloat(style.fontSize),
    };
  });
  expect(gap, "arabic hero metrics").not.toBeNull();
  expect(gap!.gap, "arabic title overlaps the lead").toBeGreaterThanOrEqual(6);
  expect(gap!.lineHeight, "arabic line height").toBeGreaterThanOrEqual(gap!.fontSize * 1.3);
  expect(arabic.problems).toEqual([]);
  await arabic.context.close();

  const english = await openPhone(browser, 375, "/?lang=en", "en");
  const englishMetrics = await english.page.evaluate(() => {
    const headline = document.querySelector("h1.brand-headline");
    const wordmark = document.querySelector("img.headline-wordmark") as HTMLImageElement | null;
    if (!headline || !wordmark) return null;
    const style = getComputedStyle(headline);
    const box = wordmark.getBoundingClientRect();
    return {
      lineHeight: parseFloat(style.lineHeight),
      fontSize: parseFloat(style.fontSize),
      ratio: box.width / box.height,
    };
  });
  expect(englishMetrics, "english hero metrics").not.toBeNull();
  expect(englishMetrics!.lineHeight).toBeLessThan(englishMetrics!.fontSize * 1.2);
  expect(englishMetrics!.ratio).toBeGreaterThan(4);
  expect(english.problems).toEqual([]);
  await english.context.close();
});

test("register subtitle wraps cleanly and the plans link is tappable", async ({ browser }) => {
  for (const width of [320, 375, 390]) {
    for (const lang of ["en", "ar"] as const) {
      const { context, page, problems } = await openPhone(browser, width, `/register?lang=${lang}`, lang);
      const subtitle = page.locator(".page-subtitle");
      await expect(subtitle).toBeVisible();
      const text = ((await subtitle.textContent()) || "").replace(/\s+/g, " ").trim();
      expect(text, `${width} ${lang} copy`).toBe(REGISTER[lang]);
      expect(text, `${width} ${lang} marks`).not.toMatch(TASHKEEL);
      const link = subtitle.locator("a.page-subtitle-link");
      await expect(link).toHaveText(lang === "ar" ? "الباقات" : "plans");
      const href = await link.getAttribute("href");
      expect(href, `${width} ${lang} href`).toContain("/pricing");
      expect(href, `${width} ${lang} locale`).toContain(`lang=${lang}`);
      expect(await link.getAttribute("target"), `${width} ${lang} target`).toBeNull();
      const box = await link.boundingBox();
      expect(box, `${width} ${lang} box`).not.toBeNull();
      expect(box!.height, `${width} ${lang} tap target`).toBeGreaterThanOrEqual(24);
      const lines = await lineBands(page, ".page-subtitle");
      expect(lines.length, `${width} ${lang} lines`).toBeGreaterThan(1);
      for (let i = 0; i < lines.length - 1; i += 1) {
        expect(lines[i].bottom, `${width} ${lang} line ${i} overlaps the next`).toBeLessThanOrEqual(lines[i + 1].top + 1);
      }
      await link.click();
      await page.waitForURL(/\/pricing/);
      expect(page.url(), `${width} ${lang} stayed on this tab`).toContain(`/pricing?lang=${lang}`);
      expect(problems, `${width} ${lang} errors`).toEqual([]);
      await context.close();
    }
  }
});
