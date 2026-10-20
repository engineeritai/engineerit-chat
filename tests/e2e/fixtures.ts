import { test as base, expect, type ConsoleMessage } from "@playwright/test";

const LIVE_AUTH_EMAIL = /\/auth\/v1\/(signup|recover|resend|magiclink)/;

/** Chromium logs failed network loads as console errors. Those are not console.error(). */
export function isScriptConsoleError(message: ConsoleMessage) {
  if (message.type() !== "error") return false;
  const text = message.text();
  if (text.startsWith("Failed to load resource")) return false;
  if (text.includes("net::ERR_")) return false;
  // WebKit does not implement interactive-widget and reports the viewport key.
  if (text.includes('Viewport argument key "interactive-widget" not recognized')) return false;
  return true;
}

/** Playwright never signs up. Auth screenshots use the app API, which sinks mail outside production. */
export const test = base.extend({
  page: async ({ page }, use) => {
    const leaked: string[] = [];
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("request", (request) => {
      if (LIVE_AUTH_EMAIL.test(request.url()) && request.method() !== "GET") leaked.push(request.url());
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.stack || error.message);
    });
    page.on("console", (message) => {
      if (isScriptConsoleError(message)) consoleErrors.push(message.text());
    });
    await page.route(LIVE_AUTH_EMAIL, (route) => {
      if (route.request().method() === "GET") return route.continue();
      return route.fulfill({
        status: 599,
        contentType: "application/json",
        body: JSON.stringify({ error: "blocked test auth email" }),
      });
    });
    await use(page);
    const problems = [
      ...leaked.map((url) => `Live auth email was requested: ${url}`),
      ...pageErrors.map((error) => `pageerror: ${error}`),
      ...consoleErrors.map((error) => `console.error: ${error}`),
    ];
    if (problems.length) throw new Error(problems.join("\n"));
  },
});

export { expect };
export type { Browser, Page } from "@playwright/test";
