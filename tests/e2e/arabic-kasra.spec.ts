import { expect, test, type Browser } from "./fixtures";
import { isScriptConsoleError } from "./fixtures";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

async function openRegister(browser: Browser, width: number) {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
    viewport: { width, height: 844 },
    userAgent: IPHONE,
    isMobile: true,
    hasTouch: true,
    locale: "ar-SA",
    extraHTTPHeaders: { "x-engineerit-test": "1" },
  });
  const page = await context.newPage();
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (isScriptConsoleError(message)) problems.push(`console.error: ${message.text()}`);
  });
  await page.goto("/register?lang=ar", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  return { context, page, problems };
}

test("Arabic register subtitle lines do not overlap in WebKit", async ({ browser }) => {
  for (const width of [320, 375]) {
    const { context, page, problems } = await openRegister(browser, width);
    const subtitle = page.locator(".page-subtitle");
    await expect(subtitle).toBeVisible();
    const text = (await subtitle.innerText()).replace(/\s+/g, " ").trim();
    expect(text, `${width} copy`).toContain("ثم اشترك في");
    expect(text, `${width} kasra`).not.toMatch(/[\u064D\u0650]/);
    const lines = await subtitle.evaluate((el) => {
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
    expect(lines.length, `${width} lines`).toBeGreaterThan(1);
    for (let i = 0; i < lines.length - 1; i += 1) {
      expect(lines[i].bottom, `${width} line ${i} overlaps the next`).toBeLessThanOrEqual(lines[i + 1].top + 1);
    }
    expect(problems, `${width} errors`).toEqual([]);
    await context.close();
  }
});
