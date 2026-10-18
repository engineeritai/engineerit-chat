import { expect, test, type Page } from "@playwright/test";

const FIXED = new Date("2026-10-16T13:32:00Z");

async function prepare(page: Page) {
  await page.clock.install({ time: FIXED });
  await page.addInitScript(() => {
    localStorage.setItem("engineerit_landing_seen_v1", "yes");
    localStorage.setItem("engineerit.install.dismissedAt", String(Date.now()));
  });
}

async function stable(page: Page, selector: string) {
  const target = page.locator(selector).first();
  await expect(target).toBeVisible({ timeout: 20_000 });
  let previous = "";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const html = await target.evaluate((el) => el.innerHTML).catch(() => "");
    if (html && html === previous) return target;
    previous = html;
    await page.waitForTimeout(150);
  }
  return target;
}

async function openChat(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: "nextjs-portal, [data-nextjs-toast] { display: none !important; } .msg-actions { opacity: 0 !important; }",
  });
}

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test("gantt, s-curve, diagram, and table stay in their own frames", async ({ page }, info) => {
  test.setTimeout(180_000);
  const shots: { name: string; path: string; target: string }[] = [
    { name: "gantt-en.png", path: "/chat?lang=en&fixture=gantt-en&planPreview=consultant", target: "svg[data-chart='gantt']" },
    { name: "gantt-ar.png", path: "/chat?lang=ar&fixture=gantt-ar&planPreview=consultant", target: "svg[data-chart='gantt']" },
    { name: "scurve-en.png", path: "/chat?lang=en&fixture=scurve-en&planPreview=consultant", target: "svg[data-chart='scurve']" },
    { name: "diagram-en.png", path: "/chat?lang=en&fixture=gate-en&planPreview=consultant", target: ".diagram-frame" },
    { name: "table-en.png", path: "/chat?lang=en&fixture=en&planPreview=consultant", target: ".chat-table" },
  ];
  for (const shot of shots) {
    await openChat(page, shot.path);
    const target = await stable(page, shot.target);
    await target.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
    await expect(target).toHaveScreenshot(shot.name);
  }
  if (info.project.name === "phone-390") {
    await openChat(page, "/chat?lang=en&fixture=gantt-en&planPreview=consultant");
    const scroller = page.locator(".schedule-scroll").first();
    await scroller.evaluate((el) => {
      el.scrollLeft = 160;
    });
    await expect(scroller).toHaveScreenshot("gantt-en-scrolled.png");
  }
});

test("gantt dark mode on a phone", async ({ page }, info) => {
  test.skip(info.project.name !== "phone-390", "dark mode is checked on the 390px phone");
  await page.emulateMedia({ colorScheme: "dark" });
  await openChat(page, "/chat?lang=en&fixture=gantt-en&planPreview=consultant");
  const chart = await stable(page, "svg[data-chart='gantt']");
  await expect(chart.locator("rect").first()).toHaveAttribute("fill", "#0b1220");
  await expect(chart).toHaveScreenshot("gantt-en-dark.png");
  const pageBox = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(pageBox.scroll).toBeLessThanOrEqual(pageBox.client + 2);
});

test("home, pricing, advisors, and checkout", async ({ page }) => {
  test.setTimeout(180_000);
  const pages = [
    { name: "home.png", path: "/", marker: "#hero-title" },
    { name: "pricing.png", path: "/pricing", marker: "h1" },
    { name: "advisors.png", path: "/advisors", marker: "h1" },
    { name: "checkout.png", path: "/checkout/preview?fixture=preview", marker: "h1" },
  ];
  for (const lang of ["en", "ar"] as const) {
    for (const route of pages) {
      const join = route.path.includes("?") ? "&" : "?";
      await page.goto(`${route.path}${join}lang=${lang}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(route.marker).first()).toBeVisible();
      await expect(page).toHaveScreenshot(`${lang}-${route.name}`);
    }
  }
});
