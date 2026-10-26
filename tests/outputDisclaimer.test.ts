import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { POST as diagramPdf } from "../app/api/export/diagram/pdf/route";
import { POST as diagramSvg } from "../app/api/export/diagram/svg/route";
import { buildChatDocx, buildChatPdf } from "../lib/chatExport";
import type { StoredMessage } from "../lib/historyDb";
import { isQuantityTable, outputDisclaimer, outputDisclaimerBody, OUTPUT_DISCLAIMER_GRAY, OUTPUT_POLICY_URL } from "../lib/outputDisclaimer";
import { buildReportDocx } from "../lib/reportDocx";
import { prepareReport } from "../lib/reportModel";
import { buildReportPdf } from "../lib/reportPdf";
import { buildReportPptx } from "../lib/reportPptx";
import { buildReportXlsx, buildTableXlsx } from "../lib/reportXlsx";
import { buildShareHtml } from "../lib/shareDocument";
import { parseDrawingText } from "../lib/takeoff/parseText";
import { calculateTakeoff } from "../lib/takeoff/calculate";
import { renderTakeoff } from "../lib/takeoff/render";
import { clipSharedText, toWhatsApp } from "../lib/whatsappText";

const MARKDOWN = "# Note\n\n| Item | Qty |\n| --- | --- |\n| Slab | 10 |\n";

const messages: StoredMessage[] = [
  {
    id: "1",
    role: "user",
    content: "Take off the slab.",
    attachments: [],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "2",
    role: "assistant",
    content: MARKDOWN,
    attachments: [],
    createdAt: "2026-01-01T00:01:00.000Z",
  },
];

function pdfText(bytes: Uint8Array, page?: number): string {
  const file = path.join(tmpdir(), `disclaimer-${process.pid}-${page ?? "all"}-${bytes.byteLength}.pdf`);
  writeFileSync(file, bytes);
  const args = ["-layout"];
  if (page) args.push("-f", String(page), "-l", String(page));
  args.push(file, "-");
  return execFileSync("pdftotext", args, { encoding: "utf8" });
}

async function zipText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const parts: string[] = [];
  for (const name of Object.keys(zip.files)) {
    if (!name.endsWith(".xml")) continue;
    parts.push(await zip.file(name)!.async("string"));
  }
  return parts.join("\n");
}

test("the disclaimer is one line pointing at the terms page", () => {
  assert.equal(
    outputDisclaimer("en"),
    "AI-generated, may contain errors. Please verify before use. See https://engineerit.ai/legal/terms"
  );
  assert.equal(
    outputDisclaimer("ar"),
    "مولد بالذكاء الاصطناعي وقد يحتوي على أخطاء. يرجى التحقق قبل الاستخدام. راجع https://engineerit.ai/legal/terms?lang=ar"
  );
  assert.equal(outputDisclaimer("en").split("\n").length, 1);
  assert.equal(/[\u064B-\u0652]/.test(outputDisclaimer("ar")), false);
  assert.equal(outputDisclaimerBody("en").includes("http"), false);
  assert.equal(OUTPUT_POLICY_URL.en, "https://engineerit.ai/legal/terms");
  assert.equal(OUTPUT_DISCLAIMER_GRAY, "#9CA3AF");
});

test("pdf, word, powerpoint, excel, html, and chat export carry the disclaimer on every page", async () => {
  for (const locale of ["en", "ar"] as const) {
    const phrase = locale === "ar" ? "قد يحتوي على أخطاء" : "may contain errors";
    const report = await prepareReport({ title: "Slab note", markdown: MARKDOWN, locale });
    const pdf = await buildReportPdf(report);
    const doc = await PDFDocument.load(pdf);
    for (let page = 1; page <= doc.getPageCount(); page += 1) {
      const text = pdfText(pdf, page);
      assert.match(text, /engineerit\.ai\/legal\/terms/, `${locale} pdf page ${page}`);
      if (locale === "en") assert.match(text, /may contain errors/, `${locale} pdf page ${page}`);
    }
    const word = await zipText(await buildReportDocx(report));
    const footers = word.split("word/footer").length;
    assert.ok(footers > 1);
    assert.match(word, new RegExp(phrase));
    assert.match(word, /legal\/terms/);
    assert.match(word, /9CA3AF/);
    assert.match(word, /64748B/);
    assert.match(word, /hyperlink/);
    const deck = await zipText(await buildReportPptx(report));
    const slides = deck.match(/ppt\/slides\/slide\d+\.xml/g) ?? [];
    assert.ok(slides.length >= 2);
    const slideFiles = [...deck.matchAll(/<a:t[^>]*>([^<]*may contain errors[^<]*|[^<]*قد يحتوي على أخطاء[^<]*)<\/a:t>/g)];
    assert.ok(slideFiles.length >= slides.length || deck.split(phrase).length - 1 >= slides.length, `${locale} slides`);
    assert.match(deck, new RegExp(phrase));
    assert.match(deck, /9CA3AF/);
    assert.match(deck, /hlinkClick|hyperlink/);
    const book = await zipText(await buildReportXlsx(report));
    assert.match(book, new RegExp(phrase));
    assert.match(book, /oddFooter/);
    assert.match(book, /9CA3AF/);
    const table = await zipText(
      await buildTableXlsx({ title: "BOQ", stamp: "2026", locale, headers: ["Item", "Qty"], rows: [["Slab", "10"]] })
    );
    assert.match(table, new RegExp(phrase));
    assert.match(table, /legal\/terms/);
    const html = buildShareHtml({ title: "Slab note", markdown: MARKDOWN, locale });
    assert.match(html, new RegExp(phrase));
    assert.match(html, /<footer>/);
    assert.match(html, new RegExp(`href="${OUTPUT_POLICY_URL[locale].replace(/[?]/g, "\\?")}"`));
    const article = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
    assert.equal(article.includes("output-disclaimer"), false);
    assert.match(html.slice(html.indexOf("<footer>")), /class="output-disclaimer"/);
    assert.match(html, /color: #9CA3AF/);
    const chatPdf = await buildChatPdf({ title: "Chat", messages, locale });
    assert.match(pdfText(chatPdf), /engineerit\.ai\/legal\/terms/);
    const chatWord = await zipText(await buildChatDocx({ title: "Chat", messages, locale }));
    assert.match(chatWord, new RegExp(phrase));
  }
});

test("take-off tables, whatsapp shares, and diagram downloads include the same line", async () => {
  const parsed = parseDrawingText("SLAB S1\n200 mm THK RC SLAB (C30)\nBOTTOM: T12 @ 150 B.W.\nTOP: NIL\nNOTES\nAll dimensions in mm. Slab 8000 x 6000.\n");
  for (const locale of ["en", "ar"] as const) {
    const reply = renderTakeoff(locale, parsed.reading, calculateTakeoff(parsed.reading), "pdf-text");
    const tableAt = reply.indexOf("| --- |");
    const noteAt = reply.indexOf(outputDisclaimer(locale));
    const assumptions = reply.indexOf(locale === "ar" ? "## الافتراضات" : "## Assumptions");
    assert.ok(tableAt > 0 && noteAt > tableAt && noteAt < assumptions);
    const shared = toWhatsApp("Hello\n\n| Item | Qty |\n| --- | --- |\n| Slab | 1 |", "https://engineerit.ai/share/x", locale);
    assert.match(shared, new RegExp(locale === "ar" ? "قد يحتوي على أخطاء" : "may contain errors"));
    const svgRes = await diagramSvg(
      new Request("http://local/svg", {
        method: "POST",
        body: JSON.stringify({ title: "Gate", content: "A -> B", locale }),
      })
    );
    const svg = await svgRes.text();
    assert.equal(svgRes.status, 200);
    assert.match(svg, /class="disclaimer"/);
    assert.match(svg, /legal\/terms/);
    assert.match(svg, /#9CA3AF/);
    assert.match(svg, /<a href="https:\/\/engineerit\.ai\/legal\/terms/);
    const pdfRes = await diagramPdf(
      new Request("http://local/pdf", {
        method: "POST",
        body: JSON.stringify({ title: "Gate", content: "A -> B\n".repeat(40), locale }),
      })
    );
    assert.equal(pdfRes.status, 200);
    const bytes = new Uint8Array(await pdfRes.arrayBuffer());
    const doc = await PDFDocument.load(bytes);
    assert.ok(doc.getPageCount() >= 1);
    for (let page = 1; page <= doc.getPageCount(); page += 1) {
      assert.match(pdfText(bytes, page), /legal\/terms/);
    }
  }
  const long = `${"word ".repeat(2000)}\n\n${outputDisclaimer("en")}`;
  const clipped = clipSharedText(long, 500);
  assert.ok(clipped.length <= 500);
  assert.match(clipped, /legal\/terms/);
  const chat = readFileSync("app/components/MessageMarkdown.tsx", "utf8");
  assert.match(chat, /className="output-disclaimer"/);
  assert.match(chat, /endDisclaimer/);
  assert.match(chat, /<ChatTable[\s\S]*\{note\}/);
  assert.match(chat, /isQuantityTable/);
  assert.equal(isQuantityTable(["Item", "Description", "Unit", "Quantity", "Working"]), true);
  assert.equal(isQuantityTable(["البند", "الوصف", "الوحدة", "الكمية", "طريقة الحساب"]), true);
  assert.equal(isQuantityTable(["Week", "Cumulative Progress (%)"]), false);
  assert.equal(isQuantityTable(["Item", "Tag", "Service", "Status"]), false);
  assert.match(readFileSync("app/share/view.tsx", "utf8"), /endDisclaimer=\{false\}/);
  assert.match(readFileSync("app/globals.css", "utf8"), /\.output-disclaimer \{[^}]*#9CA3AF/);
  assert.match(readFileSync("lib/reportPdf.ts", "utf8"), /DISCLAIMER_INK/);
  assert.doesNotMatch(readFileSync("lib/reportPdf.ts", "utf8"), /const MUTED = rgb\(0\.612/);
});

const S101 = `
FOOTING SCHEDULE (isolated pad, C30)
F1 1800 x 1800 x 500 thk (4 no.) BOTTOM T16 @ 200 B.W.
F2 2200 x 2200 x 600 thk (2 no.) BOTTOM T16 @ 200 B.W.
COLUMN C1 400 x 400, 6 no., height 3000 (top of footing to soffit of slab), rebar by others
SLAB S1
200 mm THK RC SLAB (C30)
BOTTOM: T12 @ 150 B.W.
TOP: NIL (single mesh)
NOTES
1. All dimensions in mm. Slab edge flush with grid lines (slab 8000 x 6000).
2. Covers: slab 25 mm, footings 75 mm. Straight bars, no laps or hooks.
3.50 mm C15 blinding under footings, projecting 100 mm each side.
4. Underside of blinding at -1.55 m below NGL. Excavation with vertical sides,
300 mm working space each side beyond footing.
5. Steel unit mass: T12 = 0.888 kg/m, T16 = 1.578 kg/m.
`;

function tableBottoms(xml: string): number[] {
  const bottoms: number[] = [];
  for (const part of xml.split("<a:tbl>").slice(0, -1)) {
    const frames = [...part.matchAll(/<a:off x="\d+" y="(\d+)"\/><a:ext cx="\d+" cy="(\d+)"\/>/g)];
    const frame = frames[frames.length - 1];
    if (!frame) continue;
    bottoms.push((Number(frame[1]) + Number(frame[2])) / 914400);
  }
  return bottoms;
}

async function slideXml(bytes: Uint8Array): Promise<string[]> {
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/)![1]) - Number(b.match(/slide(\d+)/)![1]));
  const slides: string[] = [];
  for (const name of names) slides.push(await zip.file(name)!.async("string"));
  return slides;
}

test("a quantity heading stays with its table, and a continued table repeats the header", async () => {
  const parsed = parseDrawingText(S101);
  const lines = calculateTakeoff(parsed.reading);
  for (const locale of ["en", "ar"] as const) {
    const heading = locale === "ar" ? "جدول الكميات" : "Bill of quantities";
    const column = locale === "ar" ? "البند" : "Item";
    const lead = locale === "ar" ? "قرئت الأبعاد من نص ملف PDF" : "Dimensions were read from the PDF text";
    const report = await prepareReport({
      title: "S-101",
      markdown: renderTakeoff(locale, parsed.reading, lines, "pdf-text"),
      locale,
      now: new Date("2026-10-26T12:00:00Z"),
    });
    const pdf = await buildReportPdf(report);
    const doc = await PDFDocument.load(pdf);
    let headingPage = 0;
    for (let page = 1; page <= doc.getPageCount(); page += 1) {
      const text = pdfText(pdf, page);
      if (!text.includes(heading)) continue;
      headingPage = page;
      assert.match(text, new RegExp(column), `${locale} heading page ${page} is missing the table`);
      assert.match(text, /60\.016/, `${locale} heading page ${page} is missing the quantity`);
      assert.match(text, locale === "ar" ? /قرئت/ : new RegExp(lead), `${locale} heading page ${page} dropped the source line`);
    }
    assert.ok(headingPage > 1, `${locale} pdf did not draw ${heading}`);
    const slides = await slideXml(await buildReportPptx(report));
    const withHeading = slides.filter((slide) => slide.includes(heading));
    assert.ok(withHeading.length >= 1, `${locale} pptx heading count`);
    for (const slide of withHeading) {
      assert.match(slide, /<a:tbl/);
      assert.match(slide, new RegExp(column));
      for (const bottom of tableBottoms(slide)) {
        assert.ok(bottom <= 6.45, `${locale} table ends at ${bottom.toFixed(2)}in`);
      }
    }
    assert.ok(withHeading.some((slide) => slide.includes("60.016")));
    assert.ok(withHeading.some((slide) => slide.includes(lead)));
    for (const slide of slides) {
      if (slide.includes(lead)) assert.match(slide, /<a:tbl/, `${locale} intro slide has no table`);
    }
  }

  const header = "| Item | Description | Unit | Quantity | Rate | Amount | Working |";
  const rows = Array.from({ length: 36 }, (_, index) => {
    const n = String(index + 1).padStart(2, "0");
    return `| ${n} | Concrete element ${n} | m3 | ${(index + 1).toFixed(3)} | 120 | ${index + 1} | 12.500 x 8.250 x 0.450 = row-${n} |`;
  });
  const markdown = ["# Take off", "", "Short note before the schedule.", "", "## Bill of quantities", "", header, "| --- | --- | --- | --- | --- | --- | --- |", ...rows].join("\n");
  const report = await prepareReport({ title: "Long BOQ", markdown, locale: "en", now: new Date("2026-10-26T12:00:00Z") });
  const pdf = await buildReportPdf(report);
  const doc = await PDFDocument.load(pdf);
  const pages: string[] = [];
  for (let page = 1; page <= doc.getPageCount(); page += 1) pages.push(pdfText(pdf, page));
  const first = pages.findIndex((text) => text.includes("row-01"));
  const last = pages.findIndex((text) => text.includes("row-36"));
  assert.ok(first > 0 && last > first, `table pages ${first} -> ${last} of ${pages.length}`);
  assert.match(pages[first], /Bill of quantities/);
  assert.match(pages[first], /Item/);
  assert.match(pages[last], /\bItem\b/);
  assert.match(pages[last], /Quantity/);
  assert.equal(pages[last].includes("Bill of quantities"), false);
  const slides = await slideXml(await buildReportPptx(report));
  const continued = slides.filter((slide) => slide.includes("row-36"));
  assert.equal(continued.length, 1);
  assert.match(continued[0], /<a:tbl/);
  assert.match(continued[0], />Item</);
  for (const slide of slides) {
    for (const bottom of tableBottoms(slide)) {
      assert.ok(bottom <= 6.45, `long table ends at ${bottom.toFixed(2)}in`);
    }
  }
});
