import { test as base, expect } from "@playwright/test";

const LIVE_AUTH_EMAIL = /\/auth\/v1\/(signup|recover|resend|magiclink)/;

/** Playwright never signs up. Auth screenshots use the app API, which sinks mail outside production. */
export const test = base.extend({
  page: async ({ page }, use) => {
    const leaked: string[] = [];
    page.on("request", (request) => {
      if (LIVE_AUTH_EMAIL.test(request.url()) && request.method() !== "GET") leaked.push(request.url());
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
    if (leaked.length) throw new Error(`Live auth email was requested: ${leaked.join(", ")}`);
  },
});

export { expect };
export type { Browser, Page } from "@playwright/test";
