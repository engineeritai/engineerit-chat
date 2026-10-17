import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Resvg } from "@resvg/resvg-js";
import JSZip from "jszip";
import { buildReportDocx } from "./reportDocx";
import { buildReportPdf } from "./reportPdf";
import { buildReportPptx } from "./reportPptx";
import { buildReportXlsx } from "./reportXlsx";
import { prepareReport } from "./reportModel";

const TITLE = "تركيب مضخة التغذية";
const font = path.join(process.cwd(), "assets/fonts/NotoSansArabic-Regular.ttf");

function referencePng(): Buffer {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="90">
  <rect width="900" height="90" fill="#ffffff"/>
  <text x="880" y="64" text-anchor="end" font-family="Noto Sans Arabic" font-size="52" fill="#0f172a" direction="rtl">${TITLE}</text>
</svg>`;
  const png = new Resvg(svg, {
    font: { fontFiles: [font], loadSystemFonts: false, defaultFontFamily: "Noto Sans Arabic" },
  }).render().asPng();
  return Buffer.from(png);
}

test("the Arabic cover title matches HarfBuzz shaping", async () => {
  const report = await prepareReport({
    title: TITLE,
    markdown: "مضخة التغذية **P-101** جاهزة.\n\n| البند | القيمة |\n| --- | --- |\n| الضغط | 40 بار |",
    locale: "ar",
    now: new Date("2026-10-17T08:00:00Z"),
  });
  assert.equal(report.title, TITLE);
  const pdf = await buildReportPdf(report);
  const dir = mkdtempSync(path.join(tmpdir(), "ar-title-"));
  const pdfPath = path.join(dir, "cover.pdf");
  writeFileSync(pdfPath, pdf);
  execFileSync("pdftoppm", ["-png", "-r", "144", "-f", "1", "-l", "1", pdfPath, path.join(dir, "page")]);
  const pagePath = path.join(dir, "page-1.png");
  const refPath = path.join(dir, "ref.png");
  writeFileSync(refPath, referencePng());
  const cropPath = path.join(dir, "crop.png");
  const scores = JSON.parse(
    execFileSync("python3", ["-c", PY, pagePath, refPath, cropPath], { encoding: "utf8" })
  ) as { forward: number; flipped: number };
  assert.ok(scores.forward > 0.72, `forward ${scores.forward}`);
  assert.ok(scores.forward > scores.flipped + 0.15, `forward ${scores.forward} flipped ${scores.flipped}`);

  const outDir = "/opt/cursor/artifacts";
  mkdirSync(`${outDir}/samples`, { recursive: true });
  mkdirSync(`${outDir}/screenshots`, { recursive: true });
  writeFileSync(`${outDir}/samples/${TITLE}.pdf`, pdf);
  writeFileSync(`${outDir}/samples/${TITLE}.docx`, await buildReportDocx(report));
  writeFileSync(`${outDir}/samples/${TITLE}.pptx`, await buildReportPptx(report));
  writeFileSync(`${outDir}/screenshots/ar-cover-title.png`, readFileSync(cropPath));

  const word = await JSZip.loadAsync(await buildReportDocx(report));
  const xml = await word.file("word/document.xml")!.async("string");
  assert.match(xml, /w:cs w:val="Arial"|w:cs="Arial"/);
  assert.match(xml, /<w:rtl\/>|<w:rtl w:val="true"|<w:rtl /);
  assert.match(xml, /w:bidi="ar-SA"|w:val="ar-SA"/);

  const deck = await JSZip.loadAsync(await buildReportPptx(report));
  const slide = await deck.file("ppt/slides/slide1.xml")!.async("string");
  assert.match(slide, /<a:cs typeface="Arial"/);
  assert.match(slide, /ar-SA/);

  const book = await JSZip.loadAsync(await buildReportXlsx(report));
  const styles = await book.file("xl/styles.xml")!.async("string");
  assert.match(styles, /readingOrder="2"/);
});

const PY = String.raw`
import json, sys
from PIL import Image
page, ref, crop = sys.argv[1:]
im = Image.open(page).convert("L")
w, h = im.size
# Cover title baseline is 230pt from the top. At 144 dpi that is 460px.
band = im.crop((40, 400, w - 40, 520))
ink = band.point(lambda p: 0 if p < 180 else 255)
bbox = ink.point(lambda p: 0 if p < 128 else 255).getbbox()
# getbbox on inverted-looking image: dark pixels are 0, so invert first
inv = Image.eval(band, lambda p: 255 - p)
box = inv.point(lambda p: 255 if p > 40 else 0).getbbox()
if not box:
    raise SystemExit("no title ink")
title = band.crop(box)
title.save(crop)

def profile(image):
    gray = image.convert("L")
    gray = gray.resize((360, 64))
    px = gray.load()
    cols = []
    for x in range(360):
        ink = 0
        for y in range(64):
            if px[x, y] < 180:
                ink += 1
        cols.append(ink)
    return cols

def corr(a, b):
    mean_a = sum(a) / len(a)
    mean_b = sum(b) / len(b)
    num = sum((x - mean_a) * (y - mean_b) for x, y in zip(a, b))
    den_a = sum((x - mean_a) ** 2 for x in a) ** 0.5
    den_b = sum((y - mean_b) ** 2 for y in b) ** 0.5
    return num / (den_a * den_b or 1)

ref_im = Image.open(ref).convert("L")
ref_inv = Image.eval(ref_im, lambda p: 255 - p)
ref_box = ref_inv.point(lambda p: 255 if p > 40 else 0).getbbox()
ref_title = ref_im.crop(ref_box)
a = profile(title)
b = profile(ref_title)
print(json.dumps({"forward": corr(a, b), "flipped": corr(a, list(reversed(b)))}))
`;
