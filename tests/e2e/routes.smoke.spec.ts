import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SHOTS = "/opt/cursor/artifacts/regression";

const pages: { path: string; marker: string; note?: string }[] = [
  { path: "/", marker: "#tools" },
  { path: "/chat", marker: "textarea" },
  { path: "/advisors", marker: "h1" },
  { path: "/advisors/pmo", marker: "h1, .page-title, .advisor-chat, textarea" },
  { path: "/pricing", marker: "h1" },
  { path: "/register", marker: "form" },
  { path: "/login", marker: "input[type='password']" },
  { path: "/profile", marker: "h1, .page-title" },
  { path: "/faq", marker: ".mkt-faq, details" },
  { path: "/how-it-works", marker: "h1" },
  { path: "/guide", marker: "#step-1" },
  { path: "/feedback", marker: "form, textarea" },
  { path: "/legal/terms", marker: "h1" },
  { path: "/legal/privacy", marker: "h1" },
  { path: "/legal/refund", marker: "h1" },
  { path: "/payment/success", marker: "h1" },
  { path: "/reset-password", marker: "body" },
  { path: "/auth/confirmed", marker: "h1" },
  { path: "/account/billing", marker: "body" },
  { path: "/account/billing/card", marker: "body" },
  { path: "/account/team", marker: "body" },
  { path: "/admin/subscriptions", marker: "body" },
  { path: "/admin/stats", marker: "h1" },
  { path: "/enterprise/paid", marker: "body" },
  { path: "/team/join", marker: "body" },
  { path: "/offline", marker: "h1" },
  { path: "/checkout/return", marker: "body" },
  { path: "/checkout/continue", marker: "body" },
];

function slug(urlPath: string) {
  return urlPath === "/" ? "home" : urlPath.replace(/^\//, "").replace(/\//g, "-");
}

for (const lang of ["en", "ar"] as const) {
  test(`routes ${lang}`, async ({ page }, info) => {
    test.setTimeout(600_000);
    fs.mkdirSync(SHOTS, { recursive: true });
    for (const route of pages) {
      const response = await page.goto(`${route.path}?lang=${lang}`, { waitUntil: "domcontentloaded" });
      const status = response?.status() ?? 0;
      expect.soft(status, `${route.path} ${lang}`).toBe(200);
      const marker = page.locator(route.marker).first();
      await expect.soft(marker, `${route.path} ${lang} marker`).toBeVisible();
      const file = path.join(SHOTS, `${info.project.name}-${lang}-${slug(route.path)}.png`);
      await page.screenshot({ path: file, fullPage: false });
      if (route.path === "/") {
        const mark = page.locator(".chat-tile-rose .riyal-mark");
        await expect(mark, `${lang} value engineering riyal`).toBeVisible();
        const color = await mark.evaluate((el) => getComputedStyle(el).color);
        expect(color, `${lang} rose tint`).toBe("rgb(190, 18, 60)");
        const markBox = await mark.boundingBox();
        const otherBox = await page.locator(".chat-tile-blue .tool-glyph").boundingBox();
        expect(markBox && otherBox).toBeTruthy();
        expect(Math.abs((markBox?.width ?? 0) - (otherBox?.width ?? 0))).toBeLessThan(1);
        expect(Math.abs((markBox?.height ?? 0) - (otherBox?.height ?? 0))).toBeLessThan(1);
        const pathD = (await mark.locator("path").first().getAttribute("d")) || "";
        expect(pathD.startsWith("M699.62")).toBe(true);
      }
    }
    if (info.project.name === "phone-390") {
      await page.goto(`/tools?lang=${lang}`, { waitUntil: "domcontentloaded" });
      const toolMark = page.locator(".advisor-card .riyal-mark");
      await expect(toolMark, `${lang} tools tab riyal`).toBeVisible();
      const toolColor = await toolMark.evaluate((el) => getComputedStyle(el).color);
      const siblingColor = await page
        .locator(".advisor-card .tool-glyph:not(.riyal-mark)")
        .first()
        .evaluate((el) => getComputedStyle(el).color);
      expect(toolColor).toBe(siblingColor);

      await page.goto(`/chat?lang=${lang}`, { waitUntil: "domcontentloaded" });
      await page.locator(".chat-input-icon-btn.is-plus").click();
      await expect(page.locator(".plus-menu .riyal-mark"), `${lang} plus menu riyal`).toBeVisible();
    }

    if (info.project.name === "desktop-1440") {
      await page.goto(`/?lang=${lang}`);
      await expect(page.locator("#disciplines")).toBeAttached();
      await expect(page.locator("#tools")).toBeAttached();
      await expect(page.locator("#how-it-works")).toBeAttached();
      await expect(page.locator("#teams")).toBeAttached();
      await expect(page.locator("a[href='/#disciplines']").first()).toBeVisible();
      await expect(page.locator("a[href='/tools']").first()).toBeVisible();
      await expect(page.locator("a[href='/how-it-works']").first()).toBeVisible();
      await expect(page.locator("a[href='/guide']").first()).toBeVisible();
      await expect(page.locator(".app-side a[href='/how-it-works']")).toBeVisible();
      await expect(page.locator("#teams h2").first()).toBeAttached();
      await expect(page.locator("a[href='/faq']").first()).toBeVisible();
      await expect(page.locator(".app-side-brand")).toBeVisible();
      const dir = await page.locator("html").getAttribute("dir");
      expect(dir).toBe(lang === "ar" ? "rtl" : "ltr");
      const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
      expect(font.toLowerCase()).not.toContain("times");
    }
  });
}

test("redirects, sitemap, apple pay file, invoice route", async ({ request }, info) => {
  test.skip(info.project.name !== "desktop-1440", "checked once");
  const redirects: [string, string][] = [
    ["/auth/login", "/login"],
    ["/registration", "/register"],
    ["/subscription", "/pricing"],
    ["/enterprise", "/pricing"],
  ];
  for (const [from, to] of redirects) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect.soft([301, 302, 307, 308], from).toContain(res.status());
    expect.soft(res.headers().location || "", from).toContain(to);
  }

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const path of ["/", "/pricing", "/advisors", "/faq", "/how-it-works", "/guide", "/register", "/login", "/legal/terms", "/legal/privacy", "/legal/refund"]) {
    expect.soft(xml, path).toContain(path === "/" ? "engineerit.ai" : path);
  }

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("sitemap");

  const apple = await request.get("/.well-known/apple-developer-merchantid-domain-association");
  expect(apple.status()).toBe(200);
  expect(apple.headers()["content-type"] || "").toContain("text/plain");
  expect((await apple.text()).length).toBeGreaterThan(20);

  const invoices = await request.get("/api/invoices");
  expect(invoices.status()).toBe(401);

  const pdf = await request.get("/api/invoices/00000000-0000-0000-0000-000000000000/pdf");
  expect(pdf.status()).not.toBe(404);

  const checkout = fs.readFileSync("app/checkout/[id]/page.tsx", "utf8");
  expect(checkout).toContain("PhonePayQr");
  expect(checkout).toContain("wallets");
  expect(checkout).not.toContain("MarketingShell");
  const methods = fs.readFileSync("lib/moyasarEnv.ts", "utf8");
  expect(methods).toContain('"applepay"');
  expect(methods).toContain('"stcpay"');

  const glyph = fs.readFileSync("app/components/ToolGlyph.tsx", "utf8");
  expect(glyph).toContain("RiyalMark");
  expect(glyph).not.toContain("M8 7h6.5");
  const showcase = fs.readFileSync("app/components/marketing/ChatShowcase.tsx", "utf8");
  expect(showcase).toContain("<ToolGlyph");
  expect(showcase).not.toContain("M8 7h6.5");

  const home = fs.readFileSync("app/page.tsx", "utf8");
  expect(home).not.toContain("LoggedInChatRedirect");
  expect(home).not.toContain('"/chat"');
});

test("marketing pages stay put for 5s", async ({ page }, info) => {
  test.skip(info.project.name === "tablet-768", "checked on phone and desktop");
  test.setTimeout(360_000);
  const paths = ["/", "/how-it-works", "/guide", "/pricing", "/faq", "/advisors", "/tools", "/register", "/feedback"];
  for (const lang of ["en", "ar"] as const) {
    for (const route of paths) {
      await page.goto(`${route}?lang=${lang}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(5000);
      expect(new URL(page.url()).pathname, `${route} ${lang} signed out`).toBe(route);
    }
    for (const route of paths) {
      await page.goto(`${route}?lang=${lang}&planPreview=engineer`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(5000);
      expect(new URL(page.url()).pathname, `${route} ${lang} signed in`).toBe(route);
    }
    await page.goto(`/?lang=${lang}`);
    await page.locator("#how-it-works a[href='/how-it-works']").click();
    await page.waitForURL(/\/how-it-works/);
    await page.waitForTimeout(3000);
    expect(new URL(page.url()).pathname).toBe("/how-it-works");
    await expect(page.locator(".guide-svg")).toBeVisible();
    await page.locator(".guide-more a[href='/guide']").click();
    await page.waitForURL(/\/guide/);
    await page.waitForTimeout(3000);
    expect(new URL(page.url()).pathname).toBe("/guide");
    await expect(page.locator("#step-1")).toBeVisible();
    await expect(page.locator("#step-7")).toBeVisible();
  }
});
