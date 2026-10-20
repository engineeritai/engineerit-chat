import { PNG } from "pngjs";
import { expect, test } from "./fixtures";

/**
 * Ink that sits in a gap under واشترِ, away from the letter bodies.
 * WebKit does this when Inter shapes the kasra (U+0650).
 */
function separatedKasraInk(png: Buffer, box: { x: number; y: number; w: number; h: number }) {
  const img = PNG.sync.read(png);
  const x0 = Math.max(0, Math.floor(box.x));
  const x1 = Math.min(img.width, Math.ceil(box.x + box.w));
  const y0 = Math.max(0, Math.floor(box.y));
  const y1 = Math.min(img.height, Math.ceil(box.y + box.h + 28));
  const rows: number[] = [];
  for (let y = y0; y < y1; y++) {
    let ink = 0;
    for (let x = x0; x < x1; x++) {
      const i = (y * img.width + x) * 4;
      const lum = img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11;
      if (lum < 150) ink += 1;
    }
    rows.push(ink);
  }
  let gap = 0;
  let seen = false;
  let split = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] > 0) {
      if (seen && gap >= 4) {
        split = i;
        break;
      }
      seen = true;
      gap = 0;
    } else if (seen) gap += 1;
  }
  if (split < 0) return 0;
  let ink = 0;
  let endGap = 0;
  for (let i = split; i < rows.length; i++) {
    if (rows[i] === 0) {
      endGap += 1;
      if (endGap >= 4) break;
    } else {
      endGap = 0;
      ink += rows[i];
    }
  }
  return ink;
}

test("Arabic kasra stays on its line in WebKit", async ({ page }) => {
  await page.goto("/register?lang=ar", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await document.fonts.load('32px "IBM Plex Sans Arabic"');
  });
  const subtitle = page.locator(".page-subtitle");
  await expect(subtitle).toContainText("واشترِ");
  const font = await subtitle.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font.startsWith('"IBM Plex Sans Arabic"')).toBe(true);

  const box = await page.evaluate(() => {
    const probe = document.createElement("p");
    probe.id = "kasra-probe";
    probe.textContent = "أنشئ حسابك، وابدأ بباقة المهندس المساعد المجانية، واشترِ المهندس أو المهندس";
    const family = getComputedStyle(document.body).fontFamily;
    probe.style.cssText = [
      "position:fixed",
      "top:8px",
      "left:8px",
      "width:280px",
      "margin:0",
      "padding:0",
      "background:#fff",
      "color:#111",
      "font-size:32px",
      "line-height:1.4",
      "z-index:5",
      `font-family:${family}`,
    ].join(";");
    document.body.appendChild(probe);
    const word = "واشترِ";
    const idx = probe.textContent.indexOf(word);
    const range = document.createRange();
    range.setStart(probe.firstChild, idx);
    range.setEnd(probe.firstChild, idx + word.length);
    const rect = range.getBoundingClientRect();
    const host = probe.getBoundingClientRect();
    return { x: rect.x - host.x, y: rect.y - host.y, w: rect.width, h: rect.height };
  });
  const shot = await page.locator("#kasra-probe").screenshot({ animations: "disabled" });
  expect(separatedKasraInk(shot, box)).toBeLessThan(40);
});
