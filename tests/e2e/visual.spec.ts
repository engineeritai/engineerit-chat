import { expect, test, type Page } from "@playwright/test";

const FIXED = new Date("2026-10-16T13:32:00Z");

async function prepare(page: Page) {
  await page.clock.install({ time: FIXED });
  await page.addInitScript(() => {
    localStorage.setItem("engineerit_landing_seen_v1", "yes");
    localStorage.setItem("engineerit.install.dismissedAt", String(Date.now()));
  });
}

async function stable(page: Page, selector: string, which: "first" | "last" = "first") {
  const target = which === "last" ? page.locator(selector).last() : page.locator(selector).first();
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
    { name: "gantt-en.png", path: "/chat?lang=en&fixture=gantt-en&planPreview=consultant", target: ".message-assistant .message-bubble" },
    { name: "gantt-ar.png", path: "/chat?lang=ar&fixture=gantt-ar&planPreview=consultant", target: ".message-assistant .message-bubble" },
    { name: "scurve-en.png", path: "/chat?lang=en&fixture=scurve-en&planPreview=consultant", target: "svg[data-chart='scurve']" },
    { name: "diagram-en.png", path: "/chat?lang=en&fixture=gate-en&planPreview=consultant", target: ".diagram-frame" },
    { name: "table-en.png", path: "/chat?lang=en&fixture=en&planPreview=consultant", target: ".chat-table" },
  ];
  for (const shot of shots) {
    await openChat(page, shot.path);
    const target = await stable(page, shot.target, shot.name.startsWith("gantt") ? "last" : "first");
    if (shot.name.startsWith("gantt")) {
      const natural = await page.locator(".gantt-scroll svg").first().evaluate((el) => {
        const name = el.closest(".gantt-board")?.querySelector(".gantt-name");
        const port = el.closest(".gantt-scroll");
        const bar = port?.querySelector("[data-kind='bar']");
        const portBox = port?.getBoundingClientRect();
        const barBox = bar?.getBoundingClientRect();
        return {
          attr: Number(el.getAttribute("width")),
          box: el.getBoundingClientRect().width,
          font: name ? getComputedStyle(name).fontSize : "",
          barVisible: Boolean(portBox && barBox && barBox.right > portBox.left + 8 && barBox.left < portBox.right - 8),
        };
      });
      expect(natural.font).toBe("12px");
      expect(Math.abs(natural.box - natural.attr)).toBeLessThan(2);
      expect(natural.barVisible).toBe(true);
    }
    if (shot.name.startsWith("diagram")) {
      const drawn = await page.locator(".diagram-frame svg").first().evaluate((el) => ({
        attr: Number(el.getAttribute("width")),
        box: el.getBoundingClientRect().width,
        nodes: Number(el.getAttribute("data-nodes") || "0"),
      }));
      if (drawn.nodes > 3) expect(Math.abs(drawn.box - drawn.attr)).toBeLessThan(2);
    }
    const pageBox = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(pageBox.scroll).toBeLessThanOrEqual(pageBox.client + 2);
    await target.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
    await expect(target).toHaveScreenshot(shot.name);
  }
  if (info.project.name === "phone-390") {
    await openChat(page, "/chat?lang=en&fixture=gantt-en&planPreview=consultant");
    const bubble = await stable(page, ".message-assistant .message-bubble", "last");
    await page.locator(".gantt-scroll").first().evaluate((el) => {
      el.scrollLeft += 140;
    });
    await expect(bubble).toHaveScreenshot("gantt-en-scrolled.png");
  }
});

test("gantt dark mode on a phone", async ({ page }, info) => {
  test.skip(info.project.name !== "phone-390", "dark mode is checked on the 390px phone");
  await page.emulateMedia({ colorScheme: "dark" });
  await openChat(page, "/chat?lang=en&fixture=gantt-en&planPreview=consultant");
  const chart = await stable(page, "svg[data-chart='gantt']");
  await expect(chart.locator("rect").first()).toHaveAttribute("fill", "#0b1220");
  await expect(page.locator(".gantt-swatch.is-task").first()).toBeVisible();
  const bubble = await stable(page, ".message-assistant .message-bubble", "last");
  await expect(bubble).toHaveScreenshot("gantt-en-dark.png");
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
