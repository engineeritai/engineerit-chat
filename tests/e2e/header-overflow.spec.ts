import { expect, test, type Page } from "@playwright/test";
import { HEADER_PLAN_ABBREV, type PlanId } from "../../lib/plans";

const PLANS: PlanId[] = ["assistant", "engineer", "professional", "consultant", "team", "enterprise"];

const LONG_NAME: Record<"en" | "ar", Record<PlanId, string>> = {
  en: {
    assistant: "Assistant Engineer",
    engineer: "Engineer",
    professional: "Professional Engineer",
    consultant: "Consultant Engineer",
    team: "Team",
    enterprise: "Enterprise",
  },
  ar: {
    assistant: "المهندس المساعد",
    engineer: "المهندس",
    professional: "المهندس المحترف",
    consultant: "المهندس الاستشاري",
    team: "الفريق",
    enterprise: "المؤسسات",
  },
};

async function headerReport(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector(".mkt-header");
    if (!header) return { missing: true, offenders: [] as string[], pillWidth: 0, headerOverflow: false };
    const hr = header.getBoundingClientRect();
    const offenders: string[] = [];
    header.querySelectorAll("*").forEach((node) => {
      const el = node as HTMLElement;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 && r.height < 1) return;
      const pad = 1;
      if (r.left < hr.left - pad || r.right > hr.right + pad || r.bottom > hr.bottom + pad || r.top < hr.top - pad) {
        offenders.push(`${el.tagName}.${String(el.className).slice(0, 80)}`);
      }
    });
    const inner = header.querySelector(".mkt-header-inner") as HTMLElement | null;
    return {
      missing: false,
      offenders,
      pillWidth: (header.querySelector(".acct-pill") as HTMLElement | null)?.getBoundingClientRect().width ?? 0,
      headerOverflow: header.scrollWidth > header.clientWidth + 1 || (inner ? inner.scrollWidth > inner.clientWidth + 1 : false),
      text: (header as HTMLElement).innerText,
    };
  });
}

test.describe("header plan abbreviations stay inside the phone header", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "phone-390", "measured once");
  });

  for (const width of [320, 375]) {
    test(`no overflow at ${width}px for every plan in EN and AR`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 800 });
      const pillWidths: number[] = [];

      for (const lang of ["en", "ar"] as const) {
        for (const plan of PLANS) {
          const full = LONG_NAME[lang][plan];
          const abbrev = HEADER_PLAN_ABBREV[plan];
          await page.goto(
            `/profile?lang=${lang}&planPreview=${plan}&namePreview=${encodeURIComponent(full)}`,
            { waitUntil: "domcontentloaded" }
          );
          const pill = page.locator(".mkt-header .acct-pill");
          await expect(pill, `${width} ${lang} ${plan}`).toHaveText(abbrev);
          await expect(page.locator(".mkt-menu-btn")).toBeVisible();
          await expect(page.locator(".eit-chat")).toBeHidden();
          await expect(page.locator(".mkt-header .acct-name")).toBeHidden();

          const report = await headerReport(page);
          expect(report.missing, `${width} ${lang} ${plan}`).toBe(false);
          expect(report.headerOverflow, `${width} ${lang} ${plan}`).toBe(false);
          expect(report.offenders, `${width} ${lang} ${plan}`).toEqual([]);
          if (full !== abbrev) {
            expect(report.text, `${width} ${lang} ${plan}`).not.toContain(full);
          }
          expect(Math.abs(report.pillWidth - 52), `${width} ${lang} ${plan} pill`).toBeLessThan(1);
          pillWidths.push(report.pillWidth);
        }
      }

      const first = pillWidths[0] ?? 0;
      for (const pillWidth of pillWidths) {
        expect(Math.abs(pillWidth - first)).toBeLessThan(0.6);
      }
    });
  }

  test("signed-out header fits and the drawer lists pages", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/profile?lang=en", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".mkt-header .mkt-header-link.is-accent")).toBeVisible();
    const signedOut = await headerReport(page);
    expect(signedOut.headerOverflow).toBe(false);
    expect(signedOut.offenders).toEqual([]);

    await page.goto("/profile?lang=en&planPreview=engineer&namePreview=Engineer", { waitUntil: "domcontentloaded" });
    await page.locator(".mkt-menu-btn").click();
    const drawer = page.locator(".app-side.is-open");
    await expect(drawer).toBeVisible();
    for (const href of [
      "/",
      "/chat",
      "/advisors",
      "/how-it-works",
      "/guide",
      "/#tools",
      "/pricing",
      "/profile",
      "/feedback",
      "/legal/terms",
      "/legal/privacy",
      "/legal/refund",
    ]) {
      await expect(drawer.locator(`a[href='${href}']`).first()).toBeVisible();
    }
    await expect(drawer.locator("[data-testid='plan-card']")).toBeVisible();
    await expect(drawer.locator("[data-testid='plan-card']")).toContainText(/day/);
    await page.screenshot({ path: "/opt/cursor/artifacts/header-iphone-en-drawer.png" });

    await page.goto("/profile?lang=ar&planPreview=professional&namePreview=" + encodeURIComponent("المهندس المحترف"), {
      waitUntil: "domcontentloaded",
    });
    await page.locator(".mkt-menu-btn").click();
    await expect(page.locator(".app-side.is-open")).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/header-iphone-ar-drawer.png" });
    await page.keyboard.press("Escape");
    await page.screenshot({ path: "/opt/cursor/artifacts/header-iphone-ar.png" });
  });
});

test("desktop chat mark is the eit bubble and is hidden on /chat", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1440", "desktop only");
  await page.goto("/?lang=en", { waitUntil: "domcontentloaded" });
  const mark = page.locator(".eit-chat");
  await expect(mark).toBeVisible();
  await expect(mark).toHaveAttribute("aria-label", "Chat");
  await expect(mark.locator("svg title")).toHaveText("eit");
  await page.goto("/chat?lang=en", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".eit-chat")).toHaveCount(0);
});
