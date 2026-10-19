import { expect, test } from "./fixtures";

test("s-curve, lists, and action tables render in english and arabic", async ({ page }, info) => {
  test.skip(info.project.name === "tablet-768", "covered on phone and desktop");
  test.setTimeout(120_000);
  for (const lang of ["en", "ar"] as const) {
    await page.addInitScript(() => localStorage.setItem("engineerit_landing_seen_v1", "yes"));
    await page.goto(`/chat?lang=${lang}&fixture=charts-${lang}`, { waitUntil: "domcontentloaded" });
    const message = page.locator(".message-assistant").last();
    await expect(message).toBeVisible();
    await expect(message.locator("svg[data-chart='scurve']")).toBeVisible();
    await expect(message.locator("svg[data-chart='line']")).toBeVisible();
    await expect(message.locator("svg[data-chart='bar']")).toBeVisible();
    await expect(message.locator("svg[data-chart='area']")).toBeVisible();
    await expect(message.locator("svg[data-chart='pie']")).toBeVisible();
    await expect(message.locator("pre")).toHaveCount(0);

    await expect(message.locator("ol")).toHaveCount(1);
    const numbers = await message.locator("ol > li").evaluateAll((items) => items.map((item) => (item as HTMLLIElement).value));
    expect(numbers).toEqual([1, 2, 3]);

    const table = message.locator(".chat-table");
    await table.scrollIntoViewIfNeeded();
    const row = table.locator("tbody tr").first();
    const cells = await row.locator("td").evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          fits: node.scrollWidth <= node.clientWidth + 2,
          text: node.textContent || "",
        };
      })
    );
    expect(cells).toHaveLength(4);
    expect(cells.every((cell) => cell.fits)).toBe(true);
    const ordered = [...cells].sort((a, b) => a.left - b.left);
    for (let index = 1; index < ordered.length; index += 1) {
      expect(ordered[index].left).toBeGreaterThanOrEqual(ordered[index - 1].right - 1);
    }
    await expect(row).toContainText(lang === "ar" ? "مفتوح" : "Open");

    await message.locator("svg[data-chart='scurve']").scrollIntoViewIfNeeded();
    await message.locator("svg[data-chart='scurve']").screenshot({
      path: `/opt/cursor/artifacts/chat-render/after-${lang}-scurve-${info.project.name}.png`,
    });
    await message.locator("ol").first().screenshot({
      path: `/opt/cursor/artifacts/chat-render/after-${lang}-list-${info.project.name}.png`,
    });
    await table.screenshot({
      path: `/opt/cursor/artifacts/chat-render/after-${lang}-table-${info.project.name}.png`,
    });
  }
});
