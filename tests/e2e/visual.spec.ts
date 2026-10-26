import { expect, test, type Page } from "./fixtures";

const FIXED = new Date("2026-10-16T13:32:00Z");

const HIDE_DEV_OVERLAY = "nextjs-portal, [data-nextjs-toast] { display: none !important; }";

async function prepare(page: Page) {
  await page.clock.install({ time: FIXED });
  await page.addInitScript((css) => {
    try {
      localStorage.setItem("engineerit_landing_seen_v1", "yes");
      localStorage.setItem("engineerit.install.dismissedAt", String(Date.now()));
    } catch {
      // Third-party frames (HubSpot) do not share this origin's storage.
    }
    // devIndicators: false hides the route indicator, but Next still paints the
    // red "1 Issue" badge whenever it has counted a runtime error. That badge
    // sits on the phone tab bar and is not part of the page. Hide it before
    // first paint so a transient dev error cannot flake a full-page snapshot.
    // The same init script runs in those frames, where documentElement can be null.
    const root = document.documentElement;
    if (!root) return;
    const style = document.createElement("style");
    style.setAttribute("data-visual-test", "hide-next-dev");
    style.textContent = css;
    root.appendChild(style);
  }, HIDE_DEV_OVERLAY);
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
  // Screenshots hide the caret by writing inline style. That has to wait until
  // React has hydrated, or the style is reported as a hydration mismatch and
  // Next paints the issues badge into the picture.
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "1");
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: `${HIDE_DEV_OVERLAY} .msg-actions { opacity: 0 !important; }`,
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

test("register and checkout fit a 375px phone in English and Arabic", async ({ page }, info) => {
  test.skip(info.project.name !== "phone-390", "375px is checked once");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 812 });
  const routes = [
    { path: "/register?lang=en", dir: "ltr", text: "Create your account" },
    { path: "/register?lang=ar", dir: "rtl", text: "إنشاء الحساب" },
    { path: "/forgot-password?lang=en", dir: "ltr", text: "Send reset link" },
    { path: "/forgot-password?lang=ar", dir: "rtl", text: "إرسال رابط الاستعادة" },
    { path: "/checkout/preview?fixture=preview&lang=en", dir: "ltr", text: "saved securely by Moyasar" },
    { path: "/checkout/preview?fixture=preview&lang=ar", dir: "rtl", text: "ميسر" },
  ];
  for (const route of routes) {
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.hydrated === "1");
    await expect(page.locator("body")).toContainText(route.text);
    const fit = await page.evaluate(() => {
      const root = document.documentElement;
      const controls = [...document.querySelectorAll("button.btn, a.auth-follow, a.btn, .checkout-consent input")].map((node) => {
        const box = node.getBoundingClientRect();
        return {
          width: box.width,
          right: box.right,
          left: box.left,
          height: box.height,
          text: (node.textContent || "").trim(),
          check: node instanceof HTMLInputElement && node.type === "checkbox",
        };
      });
      return {
        client: root.clientWidth,
        scroll: root.scrollWidth,
        dir: root.dir,
        controls,
      };
    });
    expect(fit.dir).toBe(route.dir);
    expect(fit.scroll).toBeLessThanOrEqual(fit.client + 2);
    expect(fit.controls.length).toBeGreaterThan(0);
    for (const control of fit.controls) {
      expect(control.left).toBeGreaterThanOrEqual(-1);
      expect(control.right).toBeLessThanOrEqual(fit.client + 1);
      if (!control.check) expect(control.width).toBeGreaterThanOrEqual(44);
    }
  }
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
      await page.waitForFunction(() => document.documentElement.dataset.hydrated === "1");
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(route.marker).first()).toBeVisible();
      await page.addStyleTag({ content: HIDE_DEV_OVERLAY });
      await expect(page).toHaveScreenshot(`${lang}-${route.name}`);
    }
  }
});

async function assertViewerFit(page: Page) {
  const fit = await page.locator(".chart-viewer").evaluate((viewer) => {
    const stage = viewer.querySelector(".chart-viewer-stage") as HTMLElement;
    const canvas = viewer.querySelector(".chart-viewer-canvas") as HTMLElement;
    const stageBox = stage.getBoundingClientRect();
    const canvasBox = canvas.getBoundingClientRect();
    const scale = Number(/scale\(([^)]+)\)/.exec(canvas.style.transform)?.[1] || "1");
    const svg = canvas.querySelector("svg");
    const font = Number(svg?.getAttribute("data-font") || svg?.querySelector("text")?.getAttribute("font-size") || 13);
    const rtl = viewer.getAttribute("dir") === "rtl";
    const nodes = [...canvas.querySelectorAll("svg text, .gantt-name, .gantt-legend li")].filter((node) => (node.textContent || "").trim());
    const boxes = nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      const fully =
        rect.width > 0 &&
        rect.left >= stageBox.left - 2 &&
        rect.right <= stageBox.right + 2 &&
        rect.top >= stageBox.top - 2 &&
        rect.bottom <= stageBox.bottom + 2;
      const fits = rect.width > 0 && rect.width <= stageBox.width + 2 && rect.height <= stageBox.height + 2;
      return { fully, fits, width: rect.width, left: rect.left, right: rect.right, text: (node.textContent || "").trim().slice(0, 32) };
    }).filter((box) => box.width > 0);
    const visible = boxes.filter((box) => box.fully);
    const start = rtl
      ? boxes.reduce((best, box) => (box.right > best.right ? box : best), boxes[0])
      : boxes.reduce((best, box) => (box.left < best.left ? box : best), boxes[0]);
    const intersects =
      canvasBox.right > stageBox.left + 8 &&
      canvasBox.left < stageBox.right - 8 &&
      canvasBox.bottom > stageBox.top + 8 &&
      canvasBox.top < stageBox.bottom - 8;
    const contained =
      canvasBox.left >= stageBox.left - 2 &&
      canvasBox.right <= stageBox.right + 2 &&
      canvasBox.top >= stageBox.top - 2 &&
      canvasBox.bottom <= stageBox.bottom + 2;
    return {
      scale,
      textPx: scale * font,
      count: boxes.length,
      allFit: boxes.every((box) => box.fits),
      someOnScreen: visible.length > 0,
      startOnScreen: Boolean(start?.fully),
      startText: start?.text || "",
      chartOk: contained || intersects,
      widthFits: canvasBox.width <= stageBox.width + 2,
      offscreen: boxes.filter((box) => !box.fits).map((box) => box.text),
    };
  });
  expect(fit.count).toBeGreaterThan(0);
  expect(fit.scale).toBeLessThanOrEqual(2.01);
  expect(fit.textPx).toBeLessThanOrEqual(16.05);
  expect(fit.widthFits, "chart opens wider than the screen").toBe(true);
  expect(fit.allFit, `text larger than the stage: ${fit.offscreen.join(", ")}`).toBe(true);
  expect(fit.someOnScreen).toBe(true);
  expect(fit.startOnScreen, `start text off-screen: ${fit.startText}`).toBe(true);
  expect(fit.chartOk).toBe(true);
}

test("fullscreen chart viewer", async ({ page }, info) => {
  test.setTimeout(240_000);
  const shots = [
    { name: "viewer-flow-en.png", path: "/chat?lang=en&fixture=gate-en&planPreview=consultant", dark: false },
    { name: "viewer-flow-ar.png", path: "/chat?lang=ar&fixture=gate-ar&planPreview=consultant", dark: false },
    { name: "viewer-gantt-en.png", path: "/chat?lang=en&fixture=gantt-en&planPreview=consultant", dark: false },
    { name: "viewer-gantt-ar.png", path: "/chat?lang=ar&fixture=gantt-ar&planPreview=consultant", dark: false },
    { name: "viewer-scurve-en.png", path: "/chat?lang=en&fixture=scurve-en&planPreview=consultant", dark: false },
    { name: "viewer-scurve-ar.png", path: "/chat?lang=ar&fixture=scurve-ar&planPreview=consultant", dark: false },
  ];
  if (info.project.name === "phone-390") {
    shots.push({ name: "viewer-flow-en-dark.png", path: "/chat?lang=en&fixture=gate-en&planPreview=consultant", dark: true });
  }
  for (const shot of shots) {
    if (shot.dark) await page.emulateMedia({ colorScheme: "dark" });
    else await page.emulateMedia({ colorScheme: "light" });
    await openChat(page, shot.path);
    const tools = page.locator(".diagram-tools").first();
    await expect(tools).toBeVisible();
    const row = await tools.boundingBox();
    expect(row && row.height).toBeLessThan(56);
    const enlarge = tools.getByRole("button", { name: /Enlarge|تكبير/ });
    await enlarge.click();
    const viewer = page.locator(".chart-viewer");
    await expect(viewer).toBeVisible();
    const close = page.locator(".chart-viewer-close");
    const box = await close.boundingBox();
    expect(box && box.width).toBeGreaterThanOrEqual(44);
    expect(box && box.height).toBeGreaterThanOrEqual(44);
    await assertViewerFit(page);
    await expect(viewer).toHaveScreenshot(shot.name);
    await close.click();
    await expect(viewer).toBeHidden();
  }
  if (info.project.name === "phone-390") {
    await page.setViewportSize({ width: 844, height: 390 });
    await openChat(page, "/chat?lang=en&fixture=gate-en&planPreview=consultant");
    await page.locator(".diagram-tools").first().getByRole("button", { name: "Enlarge" }).click();
    const viewer = page.locator(".chart-viewer");
    await expect(viewer).toBeVisible();
    await expect(page.locator(".chart-viewer-hint")).toBeHidden();
    await assertViewerFit(page);
    await expect(viewer).toHaveScreenshot("viewer-flow-en-landscape.png");
    await page.setViewportSize({ width: 390, height: 844 });
  }
});
