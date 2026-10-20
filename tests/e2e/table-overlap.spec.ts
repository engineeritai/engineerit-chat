import { expect, test, type Page } from "./fixtures";

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

async function cellProblems(page: Page) {
  return page.locator(".chat-table").last().evaluate((root) => {
    const problems: string[] = [];
    const rows = [...root.querySelectorAll(".chat-table-scroll tbody tr")];
    rows.forEach((row, rowIndex) => {
      const cells = [...row.querySelectorAll("td")].map((td, cellIndex) => {
        const box = td.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(td);
        const rects = [...range.getClientRects()].filter((rect) => rect.width > 0.5 && rect.height > 0.5);
        const spill = rects.some(
          (rect) => rect.left < box.left - 1.5 || rect.right > box.right + 1.5 || rect.top < box.top - 1.5 || rect.bottom > box.bottom + 1.5
        );
        const clipped = td.scrollWidth > td.clientWidth + 2 || td.scrollHeight > td.clientHeight + 2;
        return {
          cellIndex,
          text: (td.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48),
          left: box.left,
          right: box.right,
          spill,
          clipped,
          rects: rects.map((rect) => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })),
        };
      });
      cells.forEach((cell) => {
        if (cell.spill) problems.push(`row ${rowIndex} cell ${cell.cellIndex} text leaves its box (${cell.text})`);
        if (cell.clipped) problems.push(`row ${rowIndex} cell ${cell.cellIndex} clips text (${cell.text})`);
      });
      const ordered = [...cells].sort((a, b) => a.left - b.left);
      for (let index = 1; index < ordered.length; index += 1) {
        const previous = ordered[index - 1];
        const current = ordered[index];
        if (current.left < previous.right - 1) {
          problems.push(`row ${rowIndex} cells ${previous.cellIndex} and ${current.cellIndex} overlap`);
        }
        for (const a of previous.rects) {
          for (const b of current.rects) {
            const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (overlapX > 1 && overlapY > 1) {
              problems.push(`row ${rowIndex} text overlaps (${previous.text} | ${current.text})`);
            }
          }
        }
      }
    });
    return problems;
  });
}

test("long table cells stay inside their own boxes", async ({ page, context }, info) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => localStorage.setItem("engineerit_landing_seen_v1", "yes"));

  for (const lang of ["en", "ar"] as const) {
    for (const viewport of WIDTHS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`/chat?lang=${lang}&fixture=actions-${lang}`, { waitUntil: "domcontentloaded" });
      const table = page.locator(".chat-table").last();
      await expect(table).toBeVisible();
      await table.scrollIntoViewIfNeeded();
      const label = `${lang} ${viewport.name}`;
      expect(await cellProblems(page), label).toEqual([]);
      await expect(table).toContainText(lang === "ar" ? "مثبتات الواجهة" : "façade anchors");
      await expect(table.getByRole("button", { name: lang === "ar" ? "نسخ الجدول" : "Copy table" })).toBeVisible();
      await expect(table.getByRole("button", { name: lang === "ar" ? "تصدير إلى إكسل" : "Export to Excel" })).toBeVisible();

      if (viewport.name === "phone") {
        const scroller = table.locator(".chat-table-scroll");
        const pinned = await scroller.evaluate((el) => {
          el.scrollLeft = 70;
          const cell = el.querySelector("tbody td");
          if (!cell) return false;
          const port = el.getBoundingClientRect();
          const box = cell.getBoundingClientRect();
          const rtl = getComputedStyle(el).direction === "rtl";
          return rtl ? Math.abs(box.right - port.right) < 4 : Math.abs(box.left - port.left) < 4;
        });
        expect(pinned, `${label} first column stays pinned`).toBe(true);
        const scrolled = await scroller.evaluate((el) => {
          const problems: string[] = [];
          el.querySelectorAll("tbody td").forEach((node, index) => {
            const td = node as HTMLElement;
            const box = td.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(td);
            for (const rect of range.getClientRects()) {
              if (rect.width < 0.5) continue;
              if (rect.left < box.left - 1.5 || rect.right > box.right + 1.5) problems.push(String(index));
            }
          });
          return problems;
        });
        expect(scrolled, `${label} scrolled text stays in its cell`).toEqual([]);
      }

      if (info.project.name === "layout-phone") {
        await table.screenshot({
          path: `/opt/cursor/artifacts/after/table-${lang}-${viewport.name}.png`,
        });
      }
    }
  }

  if (info.project.name === "layout-phone") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/chat?lang=en&fixture=actions-en", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Copy table" }).click();
    await expect
      .poll(() =>
        page.evaluate(async () => {
          try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
              if (!item.types.includes("text/html")) continue;
              return (await item.getType("text/html")).text();
            }
          } catch {
            return "";
          }
          return "";
        })
      )
      .toContain("façade");

    const exported = page.waitForResponse((response) => response.url().includes("/api/export/xlsx") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Export to Excel" }).click();
    expect((await exported).ok()).toBeTruthy();
  }
});
