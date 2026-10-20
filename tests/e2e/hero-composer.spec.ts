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
    const inputStyle = getComputedStyle(field);
    // WebKit's getComputedStyle(textarea, "::placeholder") reports the input's
    // own font, so the width is measured on a span using the stylesheet size.
    const probe = document.createElement("span");
    probe.textContent = field.placeholder;
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "nowrap";
    probe.style.fontFamily = inputStyle.fontFamily;
    probe.style.fontWeight = inputStyle.fontWeight;
    probe.style.fontSize = inputStyle.fontSize;
    const visit = (rules: CSSRuleList, active: boolean) => {
      for (const rule of rules) {
        if (rule instanceof CSSMediaRule) {
          visit(rule.cssRules, active && window.matchMedia(rule.conditionText).matches);
        } else if (active && rule instanceof CSSStyleRule && rule.selectorText.includes("hero-composer-input") && rule.selectorText.includes("placeholder") && rule.style.fontSize) {
          probe.style.fontSize = rule.style.fontSize;
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        visit(sheet.cssRules, true);
      } catch {
        // Cross-origin sheets have no rules to copy.
      }
    }
    document.body.appendChild(probe);
    const text = probe.getBoundingClientRect().width;
    const placeholderSize = parseFloat(getComputedStyle(probe).fontSize);
    probe.remove();
    const pad = parseFloat(inputStyle.paddingLeft) + parseFloat(inputStyle.paddingRight);
    return {
      placeholder: field.placeholder,
      scroll: field.scrollHeight,
      client: field.clientHeight,
      text,
      width: field.clientWidth - pad,
      inputSize: inputStyle.fontSize,
      placeholderSize,
    };
  });
}

test("home composer placeholder stays on one line on a narrow iPhone", async ({ browser }) => {
  for (const width of [320, 375, 390]) {
    for (const lang of ["en", "ar"] as const) {
      const { context, page, problems } = await openHome(browser, width, lang);
      const expected = lang === "ar" ? "اسأل سؤالاً هندسياً…" : "Ask an engineering question…";
      await expect(page.locator(".hero-composer-input"), `${width} ${lang}`).toHaveAttribute("placeholder", expected);
      const fit = await placeholderFit(page);
      expect(fit.placeholder, `${width} ${lang}`).toBe(expected);
      expect(fit.inputSize, `${width} ${lang} input`).toBe("16px");
      expect(fit.placeholderSize, `${width} ${lang} placeholder`).toBeGreaterThanOrEqual(13);
      expect(fit.scroll, `${width} ${lang} scroll`).toBeLessThanOrEqual(fit.client + 1);
      expect(fit.text, `${width} ${lang} width ${fit.placeholderSize}px in ${fit.width}`).toBeLessThanOrEqual(fit.width);
      expect(problems, `${width} ${lang} errors`).toEqual([]);
      await context.close();
    }
  }
});
