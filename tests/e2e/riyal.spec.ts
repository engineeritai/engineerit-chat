import { expect, test, type Page } from "@playwright/test";

const CHECKOUT_ID = "11111111-1111-4111-8111-111111111111";

async function useWindowsFont(page: Page) {
  await page.addInitScript(() => {
    const apply = () => {
      if (document.querySelector("style[data-win-font]")) return;
      const style = document.createElement("style");
      style.setAttribute("data-win-font", "1");
      style.textContent =
        'html, body, body * { font-family: "Segoe UI", "Segoe UI Historic", Arial, "Liberation Sans", sans-serif !important; }';
      (document.head || document.documentElement).appendChild(style);
    };
    apply();
    document.addEventListener("DOMContentLoaded", apply);
  });
}

async function markIsLeftOfNumber(page: Page, selector: string) {
  const placed = await page.locator(selector).first().evaluate((el) => {
    const mark = el.querySelector(".riyal-mark");
    if (!mark) return null;
    const markBox = mark.getBoundingClientRect();
    const style = getComputedStyle(mark);
    const fontSize = parseFloat(getComputedStyle(el).fontSize);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let digitX = Number.POSITIVE_INFINITY;
    let glyph = false;
    while (walker.nextNode()) {
      const value = walker.currentNode.textContent || "";
      if (value.includes("\u20C1")) glyph = true;
      const index = value.search(/\d/);
      if (index < 0) continue;
      const range = document.createRange();
      range.setStart(walker.currentNode, index);
      range.setEnd(walker.currentNode, index + 1);
      digitX = range.getBoundingClientRect().x;
      break;
    }
    return {
      markX: markBox.x,
      digitX,
      dir: getComputedStyle(el).direction,
      svg: mark.tagName === "svg",
      label: mark.getAttribute("aria-label"),
      fill: style.fill,
      height: markBox.height,
      fontSize,
      baseline: style.verticalAlign,
      glyph,
    };
  });
  expect(placed, selector).not.toBeNull();
  expect(placed!.dir).toBe("ltr");
  expect(placed!.svg).toBe(true);
  expect(placed!.label).toBe("SAR");
  expect(placed!.glyph).toBe(false);
  expect(placed!.baseline).toBe("baseline");
  expect(placed!.height).toBeGreaterThan(placed!.fontSize * 0.75);
  expect(placed!.height).toBeLessThan(placed!.fontSize * 1.05);
  expect(placed!.markX).toBeLessThan(placed!.digitX);
  return placed!;
}

test("pricing cards, comparison table, and header price use the riyal mark", async ({ page }, info) => {
  test.skip(info.project.name === "tablet-768", "phone and desktop cover the mark");
  const phone = info.project.name === "phone-390";

  await useWindowsFont(page);
  await page.goto("/pricing?lang=en&planPreview=engineer&namePreview=Nora%20Ahmed");
  const paidCard = ".mkt-price-main .sar-amount:has(.riyal-mark)";
  const paidCell = ".plan-compare .sar-amount:has(.riyal-mark)";
  await expect(page.locator(paidCard).first()).toBeVisible();
  const card = await markIsLeftOfNumber(page, paidCard);
  const table = await markIsLeftOfNumber(page, paidCell);
  expect(table.digitX).toBeGreaterThan(table.markX);

  if (!phone) await markIsLeftOfNumber(page, ".app-side .acct-plan-price .sar-amount");
  await page.locator(".mkt-header .acct-chip").click();
  await expect(page.locator(".acct-sheet .acct-plan-price")).toBeVisible();
  await markIsLeftOfNumber(page, ".acct-sheet .acct-plan-price .sar-amount");
  await page.screenshot({
    path: `/opt/cursor/artifacts/screenshots/riyal-pricing-en-${phone ? "iphone" : "desktop"}.png`,
    fullPage: false,
  });

  await page.goto("/pricing?lang=ar");
  await expect(page.locator(paidCard).first()).toBeVisible();
  await markIsLeftOfNumber(page, paidCard);
  await markIsLeftOfNumber(page, paidCell);
  await page.screenshot({
    path: `/opt/cursor/artifacts/screenshots/riyal-pricing-ar-${phone ? "iphone" : "desktop"}.png`,
    fullPage: false,
  });
});

test("checkout and success amounts use the riyal mark", async ({ page }, info) => {
  test.skip(info.project.name !== "phone-390", "one phone pass is enough for the amount");
  await useWindowsFont(page);
  const checkout = {
    id: CHECKOUT_ID,
    plan: "engineer",
    billing_interval: "month",
    amount_sar: 19,
    amount_halalas: 1900,
    seat_limit: 1,
    status: "pending",
  };
  await page.route("**/api/checkout/moyasar**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("watch") === "1") {
      await route.fulfill({ json: { status: "pending" } });
      return;
    }
    await route.fulfill({
      json: {
        checkout,
        publishableKey: "pk_test_demo",
        callbackUrl: "http://127.0.0.1:3000/payment/success",
        phonePayUrl: "",
      },
    });
  });
  await page.goto(`/checkout/${CHECKOUT_ID}?pay=demo&lang=en`);
  await expect(page.locator(".checkout-amount .riyal-mark")).toBeVisible();
  await markIsLeftOfNumber(page, ".checkout-amount .sar-amount");
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/riyal-checkout-iphone.png" });

  await page.unroute("**/api/checkout/moyasar**");
  await page.route(`**/api/invoices/${CHECKOUT_ID}**`, async (route) => {
    await route.fulfill({
      json: {
        invoice: {
          id: CHECKOUT_ID,
          plan: "engineer",
          billing_interval: "month",
          amount_sar: 19,
          seat_limit: 1,
          paid_at: "2026-10-16T00:00:00.000Z",
          period_end: "2026-11-16T00:00:00.000Z",
        },
      },
    });
  });
  await page.goto(`/payment/success?checkout=${CHECKOUT_ID}&pay=demo&lang=ar`);
  await expect(page.locator(".pay-success-card .riyal-mark")).toBeVisible();
  await markIsLeftOfNumber(page, ".pay-success-card .sar-amount");
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/riyal-success-ar-iphone.png" });
});

test("profile plan price uses the riyal mark", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "one desktop pass is enough for profile");
  await useWindowsFont(page);
  await page.goto("/profile?lang=en&planPreview=professional&namePreview=Nora%20Ahmed");
  await expect(page.locator(".plan-premium .riyal-mark").first()).toBeVisible();
  await markIsLeftOfNumber(page, ".plan-premium .sar-amount");
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/riyal-profile-en.png" });
});
