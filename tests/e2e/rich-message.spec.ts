import { expect, test, type Page } from "./fixtures";
import { sampleAr, sampleEn } from "../../lib/richSamples";

async function openFixture(page: Page, locale: "en" | "ar") {
  await page.addInitScript(() => {
    localStorage.setItem("engineerit_landing_seen_v1", "yes");
  });
  await page.goto(`/chat?lang=${locale}&fixture=${locale}&planPreview=consultant`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".chat-table").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".schedule-figure svg").first()).toBeVisible();
  await expect(page.locator(".message-assistant").last()).toBeInViewport();
}

test("english tables stay inside the chat and keep vertical scrolling", async ({ page }, info) => {
  test.skip(info.project.name === "tablet-768", "covered on phone and desktop");
  await openFixture(page, "en");
  const conversation = page.locator(".conversation");
  const table = page.locator(".chat-table").first();
  await table.scrollIntoViewIfNeeded();
  const widths = await conversation.evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 2);

  const scroller = table.locator(".chat-table-scroll");
  await expect(scroller).toHaveAttribute("dir", "ltr");
  const overflow = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth + 2);
  expect(overflow).toBe(true);
  await expect(table.locator(".chat-table-fade.is-on").first()).toBeVisible();
  const chart = page.locator(".schedule-figure").first();
  await chart.scrollIntoViewIfNeeded();
  await chart.screenshot({ path: `/opt/cursor/artifacts/screenshots/gantt-en-${info.project.name}.png` });
  await table.scrollIntoViewIfNeeded();

  const before = await conversation.evaluate((el) => el.scrollTop);
  await scroller.hover();
  await page.mouse.wheel(0, 280);
  await page.waitForTimeout(200);
  const after = await conversation.evaluate((el) => el.scrollTop);
  expect(after).toBeGreaterThan(before);

  await scroller.evaluate((el) => {
    el.scrollLeft = 80;
  });
  const stuck = await scroller.evaluate((el) => {
    const cell = el.querySelector("tbody td");
    if (!cell) return false;
    const port = el.getBoundingClientRect();
    const box = cell.getBoundingClientRect();
    return Math.abs(box.left - port.left) < 4;
  });
  expect(stuck).toBe(true);

  const pinTop = await table.evaluate((frame) => {
    const root = frame.closest(".conversation");
    const pin = frame.querySelector(".chat-table-pin");
    if (!root || !pin) return 99;
    const rootTop = root.getBoundingClientRect().top;
    const frameTop = frame.getBoundingClientRect().top;
    root.scrollTop += frameTop - rootTop + 140;
    return Math.abs(pin.getBoundingClientRect().top - root.getBoundingClientRect().top);
  });
  expect(pinTop).toBeLessThan(24);

  await page.screenshot({
    path: `/opt/cursor/artifacts/screenshots/chat-en-${info.project.name}.png`,
  });
  if (info.project.name === "phone-390") {
    await page.evaluate(() => {
      for (const node of document.querySelectorAll<HTMLElement>(".conversation, .main, .message-bubble")) {
        node.style.overflow = "visible";
        node.style.maxHeight = "none";
        node.style.height = "auto";
      }
    });
    await page.screenshot({
      path: "/opt/cursor/artifacts/screenshots/chat_en_390_diagram_gantt_table.png",
      fullPage: true,
    });
  }
});

test("arabic tables start on the right and charts use rtl", async ({ page }, info) => {
  test.skip(info.project.name === "tablet-768", "covered on phone and desktop");
  await openFixture(page, "ar");
  const conversation = page.locator(".conversation");
  const scroller = page.locator(".chat-table-scroll").first();
  await scroller.scrollIntoViewIfNeeded();
  await expect(scroller).toHaveAttribute("dir", "rtl");
  const aligned = await scroller.evaluate((el) => {
    const cell = el.querySelector("tbody td");
    if (!cell) return false;
    const port = el.getBoundingClientRect();
    const box = cell.getBoundingClientRect();
    return Math.abs(box.right - port.right) < 4;
  });
  expect(aligned).toBe(true);
  const widths = await conversation.evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 2);
  await expect(page.locator(".schedule-figure").first()).toHaveAttribute("dir", "rtl");
  await page.locator(".schedule-figure").first().scrollIntoViewIfNeeded();
  await page.locator(".schedule-figure").first().screenshot({
    path: `/opt/cursor/artifacts/screenshots/gantt-ar-${info.project.name}.png`,
  });
  await page.screenshot({
    path: `/opt/cursor/artifacts/screenshots/chat-ar-${info.project.name}.png`,
  });
  if (info.project.name === "phone-390") {
    await page.evaluate(() => {
      for (const node of document.querySelectorAll<HTMLElement>(".conversation, .main, .message-bubble")) {
        node.style.overflow = "visible";
        node.style.maxHeight = "none";
        node.style.height = "auto";
      }
    });
    await page.screenshot({
      path: "/opt/cursor/artifacts/screenshots/chat_ar_390_diagram_gantt_table.png",
      fullPage: true,
    });
  }
});

test("copy keeps a table and a chart image on the clipboard", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop-1440", "clipboard checked once");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openFixture(page, "en");
  await page.getByRole("button", { name: "Copy table" }).first().click();
  const readClip = () =>
    page.evaluate(async () => {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (!item.types.includes("text/html")) continue;
          const blob = await item.getType("text/html");
          return blob.text();
        }
        return "";
      } catch {
        return "";
      }
    });
  let tableHtml = "";
  await expect.poll(async () => {
    tableHtml = await readClip();
    return tableHtml;
  }).toContain("<th>");
  expect(tableHtml).toContain("<table");
  expect(tableHtml).toContain('dir="ltr"');

  await page.locator(".msg-actions").getByRole("button", { name: "Share" }).click();
  await page.getByRole("menuitem", { name: "Copy" }).click();
  const readHtml = readClip;
  let rich = "";
  await expect.poll(async () => {
    rich = await readHtml();
    return rich;
  }).toContain("<img");
  expect(rich).toContain("<table");
  expect(rich).toContain('dir="ltr"');

  await page.evaluate(async () => {
    try {
      await navigator.clipboard.writeText("");
    } catch {
      /* the next poll waits for the Arabic payload */
    }
  });
  await openFixture(page, "ar");
  await page.locator(".msg-actions").getByRole("button", { name: "مشاركة" }).click();
  await page.getByRole("menuitem", { name: "نسخ" }).click();
  const readArabic = readClip;
  let arabic = "";
  await expect.poll(async () => {
    const next = await readArabic();
    if (!next.includes("<img") || !next.includes('dir="rtl"')) return "";
    arabic = next;
    return arabic;
  }).not.toBe("");
  expect(arabic).toContain('dir="rtl"');
  expect(arabic).toContain("<table");
});

test("share page renders the topic, table, and chart", async ({ page, request }, info) => {
  test.skip(info.project.name === "tablet-768", "covered on phone and desktop");
  const locale = info.project.name === "phone-390" ? "ar" : "en";
  const created = await request.post("/api/share", {
    data: {
      title: locale === "ar" ? "تركيب مضخة التغذية" : "Feed pump installation",
      locale,
      markdown: locale === "ar" ? sampleAr : sampleEn,
    },
  });
  expect(created.ok()).toBeTruthy();
  const body = (await created.json()) as { url: string };
  expect(body.url).toContain("/share/");
  const html = await (await request.get(body.url)).text();
  expect(html).toContain('property="og:title"');
  expect(html).toContain("summary_large_image");
  await page.goto(body.url, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".share-header h1")).toContainText(locale === "ar" ? "مضخة" : "Feed pump");
  await expect(page.locator(".chat-table").first()).toBeVisible();
  await expect(page.locator(".schedule-figure svg").first()).toBeVisible();
  await expect(page.locator(".share-footer")).toContainText("engineerit.ai");
  await page.screenshot({
    path: `/opt/cursor/artifacts/screenshots/share-${locale}-${info.project.name}.png`,
    fullPage: true,
  });
  if (info.project.name === "desktop-1440") {
    const missing = await request.get("/share/expiredlink");
    expect(missing.status()).toBe(200);
    const missingHtml = await missing.text();
    expect(missingHtml).toContain("This share link has expired");
    expect(missingHtml).toContain("https://engineerit.ai");
    const legacy = await request.get("/s/expiredlink");
    expect(legacy.status()).toBe(200);
    expect(await legacy.text()).toContain("This share link has expired");
  }
});
