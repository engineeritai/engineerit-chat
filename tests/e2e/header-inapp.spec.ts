import { expect, test, type Browser, type Page } from "./fixtures";

const WIDTHS = [320, 360, 375, 390, 414];

const AGENTS = [
  {
    name: "twitter",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone/10.50",
  },
  {
    name: "linkedin",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.29",
  },
];

/** X's WKWebView reports a real safe-area inset. Headless browsers report 0, so the test sets the same variable the header uses. */
const SAFE_AREA = ":root{--safe-top:59px !important;--safe-bottom:34px !important;}";

async function openRegister(browser: Browser, ua: string, width: number, lang: "en" | "ar") {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
    viewport: { width, height: 844 },
    userAgent: ua,
    isMobile: true,
    hasTouch: true,
    locale: lang === "ar" ? "ar-SA" : "en-US",
    extraHTTPHeaders: { "x-engineerit-test": "1" },
  });
  const page = await context.newPage();
  await page.addInitScript((css) => {
    const style = document.createElement("style");
    style.textContent = css;
    document.documentElement.appendChild(style);
  }, SAFE_AREA);
  await page.goto(`/register?lang=${lang}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.installReady === "1");
  await expect(page.locator(".mkt-header .mkt-header-link").first()).toBeVisible();
  return { context, page };
}

async function headerLayout(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector(".mkt-header");
    const banner = document.querySelector("[data-testid=install-banner]");
    if (!header) return { missing: true, problems: ["no header"], banner: "" };
    const hr = header.getBoundingClientRect();
    const controls = [
      ...header.querySelectorAll(".mkt-menu-btn, .wordmark, .lang-toggle button, .mkt-header-link"),
    ].filter((node) => {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const box = node.getBoundingClientRect();
      return box.width > 1 && box.height > 1;
    });
    const boxes = controls.map((node) => {
      const box = node.getBoundingClientRect();
      return {
        name: node.className.toString().slice(0, 40) || node.tagName,
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    });
    const problems: string[] = [];
    for (const box of boxes) {
      if (box.left < hr.left - 1 || box.right > hr.right + 1 || box.top < hr.top - 1 || box.bottom > hr.bottom + 1) {
        problems.push(`outside header: ${box.name}`);
      }
    }
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapX > 1 && overlapY > 1) problems.push(`overlap ${a.name} x ${b.name}`);
      }
    }
    const centers = boxes.map((box) => (box.top + box.bottom) / 2);
    if (Math.max(...centers) - Math.min(...centers) > 12) problems.push("header controls are not on one row");
    const word = boxes.find((box) => box.name.includes("wordmark"));
    if (!word) problems.push("missing wordmark");
    else if (word.width / word.height < 4.4 || word.height < 21 || word.width < 96) problems.push(`wordmark squashed ${Math.round(word.width)}x${Math.round(word.height)}`);
    const br = banner?.getBoundingClientRect();
    if (br) {
      for (const box of boxes) {
        const overlapX = Math.min(box.right, br.right) - Math.max(box.left, br.left);
        const overlapY = Math.min(box.bottom, br.bottom) - Math.max(box.top, br.top);
        if (overlapX > 1 && overlapY > 1) problems.push(`banner overlaps ${box.name}`);
      }
    }
    return { missing: false, problems, banner: banner?.textContent?.replace(/\s+/g, " ").trim() || "" };
  });
}

test("in-app header does not overlap the install banner", async ({ browser }, info) => {
  test.setTimeout(180_000);
  for (const agent of AGENTS) {
    for (const lang of ["en", "ar"] as const) {
      for (const width of WIDTHS) {
        const { context, page } = await openRegister(browser, agent.ua, width, lang);
        const layout = await headerLayout(page);
        const label = `${agent.name} ${lang} ${width}`;
        expect(layout.missing, label).toBe(false);
        expect(layout.problems, label).toEqual([]);
        expect(layout.banner, label).toContain("Safari");
        expect(layout.banner, label).not.toContain(lang === "ar" ? "اضغط مشاركة، ثم" : "Tap Share, then Add to Home Screen");
        await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
        if (info.project.name === "layout-phone" && (width === 320 || width === 390)) {
          await page.screenshot({
            path: `/opt/cursor/artifacts/after/header-${agent.name}-${lang}-${width}.png`,
          });
        }
        await context.close();
      }
    }
  }
});
