import { expect, test, type Browser, type Page } from "./fixtures";
import { isScriptConsoleError } from "./fixtures";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

async function openHome(browser: Browser, width: number, lang: "en" | "ar") {
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
  await page.goto(`/?lang=${lang}`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  return { context, page, problems };
}

async function placeholderFit(page: Page) {
  const input = page.locator(".hero-composer-input");
  await expect(input).toBeVisible();
  return input.evaluate((el) => {
    const field = el as HTMLTextAreaElement;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.font = getComputedStyle(field).font;
    return {
      placeholder: field.placeholder,
      scroll: field.scrollHeight,
      client: field.clientHeight,
      text: ctx ? ctx.measureText(field.placeholder).width : 0,
      width: field.clientWidth,
    };
  });
}

test("home composer placeholder stays on one line on a narrow iPhone", async ({ browser }) => {
  for (const width of [320, 375]) {
    for (const lang of ["en", "ar"] as const) {
      const { context, page, problems } = await openHome(browser, width, lang);
      const expected = lang === "ar" ? "اسأل سؤالاً" : "Ask a question";
      await expect(page.locator(".hero-composer-input"), `${width} ${lang}`).toHaveAttribute("placeholder", expected);
      const fit = await placeholderFit(page);
      expect(fit.placeholder, `${width} ${lang}`).toBe(expected);
      expect(fit.scroll, `${width} ${lang} scroll`).toBeLessThanOrEqual(fit.client + 1);
      expect(fit.text, `${width} ${lang} width`).toBeLessThanOrEqual(fit.width + 1);
      expect(problems, `${width} ${lang} errors`).toEqual([]);
      await context.close();
    }
  }
});
