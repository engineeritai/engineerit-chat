import { expect, test, type Page } from "@playwright/test";

const CHECKOUT_ID = "11111111-1111-4111-8111-111111111111";

async function markIsLeftOfNumber(page: Page, selector: string) {
  const placed = await page.locator(selector).first().evaluate((el) => {
    const mark = el.querySelector(".riyal-mark, .riyal-char");
    if (!mark) return null;
    const markBox = mark.getBoundingClientRect();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let digitX = Number.POSITIVE_INFINITY;
    while (walker.nextNode()) {
      const value = walker.currentNode.textContent || "";
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
      svg: Boolean(el.querySelector(".riyal-mark")),
    };
  });
  expect(placed, selector).not.toBeNull();
  expect(placed!.dir).toBe("ltr");
  expect(placed!.markX).toBeLessThan(placed!.digitX);
  return placed!;
}

test("pricing cards, comparison table, and header price use the riyal mark", async ({ page }, info) => {
  test.skip(info.project.name === "tablet-768", "phone and desktop cover the mark");
  const phone = info.project.name === "phone-390";

  await page.goto("/pricing?lang=en&planPreview=engineer&namePreview=Nora%20Ahmed");
  const paidCard = ".mkt-price-main .sar-amount:has(.riyal-mark, .riyal-char)";
  const paidCell = ".plan-compare .sar-amount:has(.riyal-mark, .riyal-char)";
  await expect(page.locator(paidCard).first()).toBeVisible();
  const card = await markIsLeftOfNumber(page, paidCard);
  const table = await markIsLeftOfNumber(page, paidCell);
  expect(card.svg || card.markX >= 0).toBeTruthy();
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
  await expect(page.locator(".checkout-amount .riyal-mark, .checkout-amount .riyal-char")).toBeVisible();
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
  await expect(page.locator(".pay-success-card .riyal-mark, .pay-success-card .riyal-char")).toBeVisible();
  await markIsLeftOfNumber(page, ".pay-success-card .sar-amount");
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/riyal-success-ar-iphone.png" });
});

test("profile plan price uses the riyal mark", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "one desktop pass is enough for profile");
  await page.goto("/profile?lang=en&planPreview=professional&namePreview=Nora%20Ahmed");
  await expect(page.locator(".plan-premium .riyal-mark, .plan-premium .riyal-char").first()).toBeVisible();
  await markIsLeftOfNumber(page, ".plan-premium .sar-amount");
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/riyal-profile-en.png" });
});
