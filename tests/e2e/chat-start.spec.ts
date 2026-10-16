import { expect, test } from "@playwright/test";

const drawerOrder = ["Home", "New chat", "AI Advisors", "Pricing", "How it works", "User guide", "Tools", "Feedback", "History"];

test("chat start screen is centered and the drawer lists site nav", async ({ page }, info) => {
  test.skip(info.project.name === "tablet-768", "covered on phone and desktop");
  await page.goto("/chat?lang=en", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".chat-start h1")).toHaveText("How can I help with your engineering today?");
  await expect(page.locator(".chat-suggestion")).toHaveCount(4);
  await expect(page.locator(".chat-mobile-bar")).toHaveCount(0);
  await expect(page.locator(".app-side")).toHaveCount(0);
  await expect(page.locator(".main")).toHaveClass(/is-start/);
  await expect(page.locator("textarea")).toBeVisible();
  const plus = page.getByRole("button", { name: "Add attachments" });
  await plus.click();
  await expect(page.locator(".plus-menu select")).toBeVisible();
  await plus.click();
  await expect(page.locator(".plus-menu")).toBeHidden();

  if (info.project.name === "phone-390") {
    await page.locator(".mkt-menu-btn").click();
    const panel = page.locator(".sidebar-mobile-panel");
    await expect(panel).toBeVisible();
    const text = await panel.innerText();
    let at = 0;
    for (const label of drawerOrder) {
      const next = text.indexOf(label, at);
      expect(next, label).toBeGreaterThan(at - 1);
      at = next + label.length;
    }
    await expect(panel.locator("[data-testid='plan-card'], .acct-guest")).toBeVisible();
    await page.locator(".sidebar-mobile-overlay").click({ position: { x: 360, y: 120 } });
    await expect(panel).toBeHidden();
  } else {
    const side = page.locator(".sidebar.desktop-only");
    await expect(side).toBeVisible();
    await expect(side.locator("a[href='/pricing']")).toBeVisible();
    await expect(side.locator("[data-testid='plan-card'], .acct-guest")).toBeVisible();
  }

  await page.locator("textarea").fill("Check this beam span");
  await page.locator(".chat-input-send-btn").click();
  await expect(page.locator(".main")).not.toHaveClass(/is-start/);
  await expect(page.locator(".chat-suggestion")).toHaveCount(0);
  await expect(page.locator(".message-user")).toContainText("Check this beam span");
});

test("arabic chat start uses the arabic greeting", async ({ page }, info) => {
  test.skip(info.project.name !== "phone-390", "checked once");
  await page.goto("/chat?lang=ar", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".chat-start h1")).toHaveText("كيف أساعدك في هندستك اليوم؟");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".chat-suggestion")).toHaveCount(4);
  await page.locator(".mkt-menu-btn").click();
  await expect(page.locator(".sidebar-mobile-panel")).toContainText("الرئيسية");
  await expect(page.locator(".sidebar-mobile-panel")).toContainText("محادثة جديدة");
  await expect(page.locator(".sidebar-mobile-panel")).toContainText("الأسعار");
});

test("home plan cards replace the price bullet list", async ({ page }, info) => {
  test.skip(info.project.name === "tablet-768", "covered on phone and desktop");
  await page.goto("/?lang=en", { waitUntil: "domcontentloaded" });
  const cards = page.locator(".home-plan-card");
  await expect(cards).toHaveCount(6);
  await expect(page.locator("#faq .mkt-bullets")).toHaveCount(0);
  await expect(page.locator(".home-rate-note")).toContainText("1 USD = 3.75 SAR");
  await expect(page.locator(".home-rate-note")).toContainText("VAT as applicable.");
  await expect(page.locator(".home-plan-card").nth(2).locator(".home-plan-price")).toContainText("/month");
  await page.locator(".home-plans").getByRole("button", { name: /Annual/ }).click();
  await expect(page.locator(".home-plan-card").nth(1).locator(".home-plan-price")).toContainText("190");
  await expect(page.locator(".home-plan-card").nth(1).locator(".home-plan-price")).toContainText("/year");
  const cardText = await page.locator(".home-plan-card").allInnerTexts();
  for (const text of cardText) expect(text).not.toContain("USD");
  if (info.project.name === "phone-390") {
    const display = await page.locator(".home-plan-row").evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe("flex");
  }
  const footer = page.locator(".mkt-footer-line");
  await expect(footer).toBeVisible();
  await expect(footer).not.toContainText("19");
  await expect(page.locator(".mkt-closing")).toContainText("Open the chat, or buy a Team plan.");
});
