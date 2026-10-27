import { expect, test, type Page } from "./fixtures";

const FIXED = new Date("2026-10-16T13:32:00Z");

async function prepare(page: Page) {
  await page.clock.install({ time: FIXED });
  await page.addInitScript(() => {
    localStorage.setItem("engineerit_landing_seen_v1", "yes");
    localStorage.setItem("engineerit.install.dismissedAt", String(Date.now()));
  });
}

async function boxAtLeast(page: Page, selector: string, min = 44) {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, selector).toBeTruthy();
  expect(box!.width, selector).toBeGreaterThanOrEqual(min);
  expect(box!.height, selector).toBeGreaterThanOrEqual(min);
}

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test("android touch targets, drawers, composer, and chart scroll", async ({ page }, info) => {
  test.setTimeout(180_000);
  await page.goto("/chat?lang=en&fixture=gantt-en&planPreview=consultant", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".gantt-scroll svg").first()).toBeVisible({ timeout: 20_000 });

  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).toContain("width=device-width");
  expect(viewport).toContain("initial-scale=1");
  expect(viewport).not.toContain("maximum-scale");
  expect(viewport).toContain("interactive-widget=resizes-content");

  const font = await page.locator(".composer .textarea").first().evaluate((el) => getComputedStyle(el).fontSize);
  expect(font).toBe("16px");
  await page.locator(".composer .textarea").first().focus();
  const focused = await page.locator(".composer .textarea").first().evaluate((el) => ({
    font: getComputedStyle(el).fontSize,
    bottom: el.getBoundingClientRect().bottom,
    view: window.innerHeight,
  }));
  expect(focused.font).toBe("16px");
  expect(focused.bottom).toBeLessThanOrEqual(focused.view + 1);

  const scroll = await page.locator(".conversation").first().evaluate((el) => getComputedStyle(el).overscrollBehaviorY);
  expect(scroll).toBe("contain");
  const chartTouch = await page.locator(".gantt-scroll").first().evaluate((el) => getComputedStyle(el).touchAction);
  expect(chartTouch).toContain("pan-x");
  expect(chartTouch).not.toContain("pan-y");

  for (const selector of [".mkt-menu-btn", ".chat-input-icon-btn.is-plus", ".acct-chip", ".lang-toggle button", ".chart-action"]) {
    await boxAtLeast(page, selector);
    const action = await page.locator(selector).first().evaluate((el) => getComputedStyle(el).touchAction);
    expect(action, selector).toContain("manipulation");
  }
  const mic = page.locator(".mic-btn");
  if (await mic.count()) await boxAtLeast(page, ".mic-btn");
  const voice = page.locator(".chat-voice-btn");
  if (await voice.count()) await boxAtLeast(page, ".chat-voice-btn");
  await page.locator(".composer .textarea").first().fill("Tap");
  await boxAtLeast(page, ".chat-input-send-btn");
  const pageBox = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(pageBox.scroll).toBeLessThanOrEqual(pageBox.client + 2);

  const tools = await page.locator(".diagram-tools").first().boundingBox();
  expect(tools && tools.height).toBeLessThan(56);

  await page.locator(".mkt-menu-btn").click();
  const drawer = page.locator(".sidebar-mobile-overlay");
  await expect(drawer).toBeVisible();
  await page.evaluate(() => history.back());
  if (await drawer.isVisible()) await page.evaluate(() => history.back());
  await expect(drawer).toBeHidden({ timeout: 5_000 });

  await page.locator(".acct-chip").evaluate((el) => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await expect(page.locator(".acct-sheet")).toBeVisible();
  await page.evaluate(() => history.back());
  await expect(page.locator(".acct-sheet")).toBeHidden();

  await page.locator(".conversation").first().evaluate((el) => {
    el.scrollTop = 0;
  });
  const before = await page.locator(".conversation").first().evaluate((el) => el.scrollTop);
  await page.locator(".gantt-scroll").first().evaluate((el) => {
    el.dispatchEvent(new WheelEvent("wheel", { deltaY: 180, deltaX: 0, bubbles: true, cancelable: true }));
  });
  const after = await page.locator(".conversation").first().evaluate((el) => ({
    top: el.scrollTop,
    overflow: el.scrollHeight - el.clientHeight,
  }));
  if (after.overflow > 8) expect(after.top).toBeGreaterThan(before);

  const horizontal = await page.locator(".gantt-scroll").first().evaluate((el) => {
    const start = el.scrollLeft;
    el.scrollLeft = start + 80;
    return el.scrollLeft - start;
  });
  expect(Math.abs(horizontal)).toBeGreaterThan(10);

  const enlarge = page.locator(".diagram-tools").first().getByRole("button", { name: "Enlarge" });
  await enlarge.click();
  const viewer = page.locator(".chart-viewer");
  await expect(viewer).toBeVisible();
  await boxAtLeast(page, ".chart-viewer-close");
  const readable = await page.locator(".chart-viewer-canvas").evaluate((canvas) => {
    const svg = canvas.querySelector("svg");
    const scale = Number(/scale\(([^)]+)\)/.exec((canvas as HTMLElement).style.transform)?.[1] || "1");
    const fontSize = Number(svg?.getAttribute("data-font") || svg?.querySelector("text")?.getAttribute("font-size") || 12);
    return { scale, text: scale * fontSize };
  });
  expect(readable.scale).toBeLessThanOrEqual(2.01);
  expect(readable.text).toBeLessThanOrEqual(16.05);
  const fitted = await page.locator(".chart-viewer-stage").evaluate((stage) => {
    const canvas = stage.querySelector(".chart-viewer-canvas");
    if (!canvas) return false;
    const stageBox = stage.getBoundingClientRect();
    const canvasBox = canvas.getBoundingClientRect();
    return canvasBox.width <= stageBox.width + 2;
  });
  expect(fitted).toBe(true);
  await page.locator(".chart-viewer-backdrop").click({ position: { x: 12, y: 12 } });
  await expect(viewer).toBeHidden();

  await enlarge.click();
  await expect(viewer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();

  await page.waitForTimeout(400);
  await enlarge.click();
  await expect(viewer).toBeVisible();
  const scrollBefore = await page.locator(".conversation").first().evaluate((el) => el.scrollTop);
  await page.evaluate(() => history.back());
  await expect(viewer).toBeHidden();
  const scrollAfter = await page.locator(".conversation").first().evaluate((el) => el.scrollTop);
  expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(4);

  await page.waitForTimeout(400);
  await page.locator(".diagram-tools").first().getByRole("button", { name: "Download PNG" }).click();
  const toast = page.locator(".eit-toast").last();
  await expect(toast).toBeVisible();
  await page.screenshot({ path: `/opt/cursor/artifacts/android-touch/${info.project.name}-toast.png` });

  await page.goto("/pricing?lang=en", { waitUntil: "domcontentloaded" });
  await boxAtLeast(page, ".mkt-menu-btn");
  const plan = page.locator("a.mkt-btn, a.btn, button.mkt-btn, button.btn").first();
  await expect(plan).toBeVisible();
  const planBox = await plan.boundingBox();
  expect(planBox && planBox.height).toBeGreaterThanOrEqual(44);

  await page.locator(".mkt-menu-btn").click();
  const side = page.locator(".app-side.is-open");
  await expect(side).toBeVisible();
  const edge = await page.locator(".app-side-backdrop").boundingBox();
  if (edge) await page.mouse.click(edge.x + edge.width - 6, edge.y + 48);
  if (await side.isVisible()) await page.evaluate(() => history.back());
  await expect(side).toBeHidden();

  await page.goto("/checkout/preview?fixture=preview&lang=en", { waitUntil: "domcontentloaded" });
  const consent = page.locator(".checkout-consent");
  await expect(consent).toBeVisible();
  const consentBox = await consent.boundingBox();
  expect(consentBox && consentBox.height).toBeGreaterThanOrEqual(44);
  await consent.locator("input").check();
  await expect(consent.locator("input")).toBeChecked();
  await expect(page.locator(".checkout-preview")).toBeVisible();
  const moyasar = await page.locator(".mysr-form, iframe[src*='moyasar']").count();
  expect(moyasar).toBe(0);

  await page.goto("/login?lang=en", { waitUntil: "domcontentloaded" });
  const fields = await page.locator("input").evaluateAll((nodes) =>
    nodes.map((node) => ({ type: (node as HTMLInputElement).type, font: getComputedStyle(node).fontSize }))
  );
  for (const field of fields) {
    if (field.type === "hidden" || field.type === "checkbox") continue;
    expect(field.font, field.type).toBe("16px");
  }
  await boxAtLeast(page, "button[type='submit'], .mkt-btn, .btn");

  await page.screenshot({ path: `/opt/cursor/artifacts/android-touch/${info.project.name}-login.png`, fullPage: false });
});
