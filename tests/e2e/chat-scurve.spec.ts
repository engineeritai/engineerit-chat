import { expect, test } from "@playwright/test";

const prompt = "Wk1 10%, Wk2 25%, Wk3 67%, Wk4 89%, Wk5 100%. Make now the chart of S-Curve";
const longText = Array.from({ length: 12 }, (_, index) => `Line ${index + 1}: cumulative progress stays readable on a phone.`).join("\n");

test("owner s-curve reply draws with the eit mark", async ({ page }, info) => {
  test.skip(info.project.name === "tablet-768", "covered on phone and desktop");
  test.setTimeout(120_000);
  for (const lang of ["en", "ar"] as const) {
    await page.addInitScript(() => {
      localStorage.setItem("engineerit_landing_seen_v1", "yes");
      localStorage.setItem("engineerit.install.dismissedAt", String(Date.now()));
    });
    await page.goto(`/chat?lang=${lang}&fixture=scurve-${lang}`, { waitUntil: "domcontentloaded" });
    const assistant = page.locator(".message-assistant").last();
    await expect(assistant).toBeVisible();
    await expect(page.locator(".message-user").first()).toContainText(prompt);
    await expect(page.locator(".message-user .message-avatar").first()).toHaveText(lang === "ar" ? "أنت" : "You");
    const mark = assistant.locator(".message-avatar-mark .eit-mark");
    await expect(mark).toBeVisible();
    await expect(mark).toHaveAttribute("fill", "#0d60e4");
    await expect(assistant.locator(".message-avatar")).not.toContainText(lang === "ar" ? "الذكاء" : "AI");
    const chart = assistant.locator("svg[data-chart='scurve']");
    await expect(chart).toBeVisible();
    let box: { width: number } | null = null;
    await expect(async () => {
      await chart.scrollIntoViewIfNeeded();
      box = await chart.boundingBox();
      expect(box && box.width > 200).toBeTruthy();
    }).toPass();
    if (info.project.name === "phone-390") expect(box!.width).toBeLessThanOrEqual(390);
    const labels = await chart.locator("text").allTextContents();
    expect(labels.some((label) => label.includes(lang === "ar" ? "البداية" : "Start"))).toBe(true);
    expect(labels.some((label) => label.includes("100"))).toBe(true);
    expect(labels.some((label) => label.includes("67"))).toBe(true);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    await assistant.screenshot({
      path: `/opt/cursor/artifacts/chat-scurve/${lang}-reply-${info.project.name}.png`,
    });
    await page.screenshot({
      path: `/opt/cursor/artifacts/chat-scurve/${lang}-${info.project.name}.png`,
      fullPage: false,
    });
    if (lang === "en" && info.project.name === "phone-390") {
      await page.emulateMedia({ colorScheme: "dark" });
      await expect(chart).toHaveAttribute("data-chart", "scurve");
      await expect.poll(async () => chart.locator("path[data-kind='planned']").getAttribute("stroke")).toBe("#93c5fd");
      await assistant.screenshot({ path: "/opt/cursor/artifacts/chat-scurve/en-dark-phone-390.png" });
      await page.emulateMedia({ colorScheme: "light" });
    }
  }
});

test("composer grows only to the cap and returns to one line", async ({ page }, info) => {
  test.skip(info.project.name === "tablet-768", "covered on phone and desktop");
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    localStorage.setItem("engineerit_landing_seen_v1", "yes");
    localStorage.setItem("engineerit.install.dismissedAt", String(Date.now()));
  });
  await page.goto("/chat?lang=en&fixture=scurve-en", { waitUntil: "domcontentloaded" });
  const field = page.locator("textarea.textarea");
  await expect(field).toBeVisible();
  const before = await field.evaluate((el) => (el as HTMLTextAreaElement).getBoundingClientRect().height);
  expect(before).toBeLessThanOrEqual(48);
  await field.fill(longText);
  const grown = await field.evaluate((el) => {
    const node = el as HTMLTextAreaElement;
    const box = node.getBoundingClientRect();
    return { height: box.height, scroll: node.scrollHeight > node.clientHeight + 1, overflow: getComputedStyle(node).overflowY };
  });
  const cap = 154;
  expect(grown.height).toBeGreaterThan(48);
  expect(grown.height).toBeLessThanOrEqual(cap + 2);
  expect(grown.scroll || grown.overflow === "auto").toBe(true);
  await page.screenshot({ path: `/opt/cursor/artifacts/chat-scurve/composer-long-${info.project.name}.png` });
  await field.fill("");
  const cleared = await field.evaluate((el) => (el as HTMLTextAreaElement).getBoundingClientRect().height);
  expect(cleared).toBeLessThanOrEqual(48);
  await page.screenshot({ path: `/opt/cursor/artifacts/chat-scurve/composer-reset-${info.project.name}.png` });
});
