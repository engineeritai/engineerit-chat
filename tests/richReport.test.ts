import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { assistantRules, freshnessRules } from "../lib/assistantRules";
import { appendSources, sourcesFromResponse } from "../lib/citations";
import { riyadhStamp } from "../lib/ksaTime";
import { ganttAppendix, parseMessage } from "../lib/messageDocument";
import { buildReportDocx } from "../lib/reportDocx";
import { REPORT_FOOTER_LINE, prepareReport } from "../lib/reportModel";
import { buildReportPdf } from "../lib/reportPdf";
import { buildReportPptx } from "../lib/reportPptx";
import { buildReportXlsx } from "../lib/reportXlsx";
import { chartCaseAr, chartCaseEn, sampleAr, sampleEn } from "../lib/richSamples";
import { parseChart, parseGantt } from "../lib/scheduleModel";
import { renderChartSvg } from "../lib/scheduleSvg";
import { buildShareHtml } from "../lib/shareDocument";
import { toWhatsApp } from "../lib/whatsappText";

const now = new Date("2026-10-16T23:34:00Z");

test("riyadh stamp and prompt forbid a cutoff and require mermaid schedules", () => {
  const stamp = riyadhStamp(now, "en");
  assert.match(stamp, /2026/);
  assert.match(stamp, /KSA/);
  const rules = assistantRules({ now, locale: "en" });
  assert.match(rules, /Asia\/Riyadh/);
  assert.match(rules, /Never mention a training cutoff/);
  assert.match(rules, /flowchart LR/);
  assert.match(rules, /crit/);
  assert.match(freshnessRules(now, "ar"), /بتوقيت السعودية/);
});

test("citations are appended once", () => {
  const parsed = sourcesFromResponse({
    output_text: "API 610 was revised.",
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: "API 610 was revised.",
            annotations: [{ type: "url_citation", url: "https://example.com/api610", title: "API 610" }],
          },
        ],
      },
    ],
  });
  const reply = appendSources(parsed.text, parsed.sources, "en");
  assert.match(reply, /\[API 610\]\(https:\/\/example.com\/api610\)/);
  assert.equal(appendSources(reply, parsed.sources, "en").split("https://example.com/api610").length, 2);
});

test("gantt parser keeps groups, the critical path, and milestones", () => {
  const model = parseGantt(sampleEn.match(/```mermaid\n([\s\S]*?)```/)?.[1] || "", "2026-10-16");
  assert.ok(model);
  assert.equal(model.tasks.length, 4);
  assert.equal(model.tasks.find((task) => task.id === "proc")?.critical, true);
  assert.equal(model.tasks.find((task) => task.id === "hand")?.milestone, true);
  assert.equal(model.tasks[0].group, "Engineering");
  const ltr = renderChartSvg(model, "ltr");
  const rtl = renderChartSvg(model, "rtl");
  assert.match(ltr, /data-kind="today"/);
  assert.match(ltr, /data-kind="milestone"/);
  const xOf = (svg: string, id: string) => Number(new RegExp(`data-id="${id}"[^>]*\\sx="([\\d.]+)"`).exec(svg)?.[1]);
  assert.ok(xOf(ltr, "des") < xOf(ltr, "inst"));
  assert.ok(xOf(rtl, "des") > xOf(rtl, "inst"));
});

test("charts, loose numbered lists, and wrapped tables survive the model formats", () => {
  for (const sample of [chartCaseEn, chartCaseAr]) {
    const blocks = parseMessage(sample);
    const charts = blocks.filter((block) => block.type === "chart");
    assert.equal(charts.length, 5);
    assert.deepEqual(charts.map((block) => (block.type === "chart" ? block.model.kind : "")), ["scurve", "line", "bar", "area", "pie"]);
    const svg = charts.map((block) => (block.type === "chart" ? renderChartSvg(block.model, "ltr") : ""));
    assert.match(svg[0], /data-chart="scurve"/);
    assert.match(svg[0], /data-kind="planned"/);
    assert.match(svg[0], /data-kind="actual"/);
    assert.match(svg[1], /data-chart="line"/);
    assert.match(svg[2], /data-kind="bar"/);
    assert.match(svg[3], /data-kind="area"/);
    assert.match(svg[4], /data-kind="pie"/);
    const list = blocks.find((block) => block.type === "list");
    assert.ok(list && list.type === "list" && list.ordered && list.items.length === 3);
    const table = blocks.find((block) => block.type === "table");
    assert.ok(table && table.type === "table" && table.headers.length === 4);
    assert.equal(table.rows[0][0].includes("|"), false);
  }
  const xy = parseChart("mermaid", chartCaseEn.match(/```mermaid\n([\s\S]*?)```/)?.[1] || "", "2026-10-17");
  assert.equal(xy?.kind, "scurve");
  const plain = toWhatsApp(chartCaseEn);
  assert.match(plain, /1\. Confirm the baseline/);
  assert.match(plain, /2\. Issue the traffic/);
  assert.match(plain, /3\. Book the asphalt/);
  assert.equal(plain.split(/\n1\. /).length, 2);
  const share = buildShareHtml({ title: "Road", markdown: chartCaseEn, locale: "en", now });
  assert.match(share, /<ol>/);
  assert.equal(share.match(/<li\b/g)?.length, 3);
  assert.match(share, /data-chart="pie"/);
  assert.match(share, /white-space: normal/);
});

test("markdown keeps a wide table and drops ascii art", () => {
  const blocks = parseMessage(`${sampleEn}\n\n\`\`\`\n+---+\n| A |\n+---+\n| B |\n+---+\n\`\`\``);
  const table = blocks.find((block) => block.type === "table");
  assert.ok(table && table.type === "table");
  assert.equal(table.headers.length, 10);
  assert.equal(blocks.some((block) => block.type === "code" && block.text.includes("+---+")), false);
  assert.ok(blocks.some((block) => block.type === "chart" && block.model.kind === "gantt"));
  assert.ok(blocks.some((block) => block.type === "chart" && block.model.kind === "scurve"));
  const appendix = ganttAppendix(blocks, "en");
  assert.deepEqual(appendix?.headers, ["Task", "Start", "End", "Duration (days)", "% complete"]);
});

test("share html carries open graph tags and direction", () => {
  const html = buildShareHtml({
    title: "تركيب مضخة التغذية",
    markdown: sampleAr,
    locale: "ar",
    origin: "https://engineerit.ai",
    id: "abc123xyz",
    now,
  });
  assert.match(html, /property="og:title"/);
  assert.match(html, /https:\/\/engineerit\.ai\/share\/abc123xyz/);
  assert.match(html, /twitter:card" content="summary_large_image"/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /<table>/);
  assert.match(html, /data-kind="milestone"/);
});

async function writeSamples(name: string, bytes: Uint8Array) {
  const dir = "/opt/cursor/artifacts/samples";
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
}

test("cover title is the short topic and the dropped clause stays on the cover", async () => {
  const report = await prepareReport({
    title: "Technical Grade Urea Production – SABIC Process Workflow",
    subtitle: "SABIC Process Workflow",
    markdown: "Ammonia is converted to technical grade urea.",
    locale: "en",
    now,
  });
  assert.equal(report.title, "Technical Grade Urea Production");
  assert.equal(report.subtitle, "SABIC Process Workflow");
  const fromSource = await prepareReport({
    title: "Technical Grade Urea Production – SABIC Process Workflow",
    markdown: "Ammonia is converted to technical grade urea.",
    locale: "en",
    now,
  });
  assert.equal(fromSource.title, "Technical Grade Urea Production");
  assert.equal(fromSource.subtitle, "SABIC Process Workflow");
  const pdf = await buildReportPdf(report);
  const pdfDoc = await PDFDocument.load(pdf);
  assert.equal(pdfDoc.getTitle(), "Technical Grade Urea Production");
  assert.equal(pdfDoc.getSubject(), "SABIC Process Workflow");
  const docx = await buildReportDocx(report);
  const word = await JSZip.loadAsync(docx);
  const xml = await word.file("word/document.xml")!.async("string");
  const core = await word.file("docProps/core.xml")!.async("string");
  assert.match(xml, /Technical Grade Urea Production/);
  assert.match(xml, /SABIC Process Workflow/);
  assert.match(core, /Technical Grade Urea Production/);
  const deck = await JSZip.loadAsync(await buildReportPptx(report));
  const cover = await deck.file("ppt/slides/slide1.xml")!.async("string");
  assert.match(cover, /Technical Grade Urea Production/);
  assert.match(cover, /SABIC Process Workflow/);
});

test("exports build pdf, docx, pptx, and xlsx in english and arabic", async () => {
  for (const [locale, markdown, title] of [
    ["en", sampleEn, "Feed pump installation"],
    ["ar", sampleAr, "تركيب مضخة التغذية"],
  ] as const) {
    const report = await prepareReport({ title, markdown, locale, now });
    assert.ok(report.blocks.some((block) => block.type === "heading" && block.text.includes(locale === "ar" ? "ملحق" : "Schedule data")));
    const pdf = await buildReportPdf(report);
    const docx = await buildReportDocx(report);
    const pptx = await buildReportPptx(report);
    const xlsx = await buildReportXlsx(report);
    assert.equal(pdf[0], 0x25);
    assert.equal(docx[0], 0x50);
    assert.equal(pptx[0], 0x50);
    assert.equal(xlsx[0], 0x50);
    const pdfDoc = await PDFDocument.load(pdf);
    const sizes = pdfDoc.getPages().map((page) => page.getSize());
    assert.ok(sizes.some((size) => size.width > size.height), "a chart or wide table uses a landscape page");
    const word = await JSZip.loadAsync(docx);
    const xml = await word.file("word/document.xml")!.async("string");
    assert.match(xml, /w:tblHeader/);
    assert.match(xml, /Heading1|Title/);
    const deck = await JSZip.loadAsync(pptx);
    const slides = Object.keys(deck.files).filter((name) => /ppt\/slides\/slide\d+\.xml/.test(name));
    assert.ok(slides.length >= 4);
    const sheet = await JSZip.loadAsync(xlsx);
    const workbook = await sheet.file("xl/workbook.xml")!.async("string");
    assert.match(workbook, /workbook/);
    await writeSamples(`${locale}.pdf`, pdf);
    await writeSamples(`${locale}.docx`, docx);
    await writeSamples(`${locale}.pptx`, pptx);
    await writeSamples(`${locale}.xlsx`, xlsx);
  }
});

test("covers use the official wordmark and footers keep the eit line", async () => {
  const wordmark = readFileSync("public/brand/engineerit-wordmark.png");
  const icon = readFileSync("public/icon-192.png");
  assert.equal(wordmark.readUInt32BE(16), 834);
  assert.equal(wordmark.readUInt32BE(20), 188);
  assert.equal(REPORT_FOOTER_LINE, "engineerit.ai · support@engineerit.ai");
  const report = await prepareReport({ title: "Feed pump installation", markdown: sampleEn, locale: "en", now });
  assert.ok(Buffer.from(report.wordmark).equals(wordmark));
  assert.ok(Buffer.from(report.logo).equals(icon));

  const word = await JSZip.loadAsync(await buildReportDocx(report));
  const footer = await word.file("word/footer1.xml")!.async("string");
  assert.match(footer, /support@engineerit\.ai/);
  assert.match(footer, /instrText[^>]*>PAGE</);
  const wordMedia = Object.keys(word.files).filter((name) => name.startsWith("word/media/") && name.endsWith(".png"));
  const wordBlobs = await Promise.all(wordMedia.map((name) => word.file(name)!.async("nodebuffer")));
  assert.ok(wordBlobs.some((blob) => blob.equals(wordmark)));
  assert.ok(wordBlobs.some((blob) => blob.equals(icon)));
  const documentXml = await word.file("word/document.xml")!.async("string");
  const wordmarkCx = Math.round((400 / 72) * 914400);
  const wordmarkCy = Math.round((wordmarkCx * 188) / 834);
  assert.match(documentXml, new RegExp(`cx="${wordmarkCx}"`));
  assert.match(documentXml, new RegExp(`cy="${wordmarkCy}"`));

  const deck = await JSZip.loadAsync(await buildReportPptx(report));
  const slide = await deck.file("ppt/slides/slide1.xml")!.async("string");
  assert.match(slide, /support@engineerit\.ai/);
  assert.match(slide, new RegExp(`cx="${wordmarkCx}"`));
  assert.match(slide, new RegExp(`cy="${wordmarkCy}"`));
  const pptMedia = Object.keys(deck.files).filter((name) => name.startsWith("ppt/media/") && name.endsWith(".png"));
  const pptBlobs = await Promise.all(pptMedia.map((name) => deck.file(name)!.async("nodebuffer")));
  assert.ok(pptBlobs.some((blob) => blob.equals(wordmark)));
  assert.ok(pptBlobs.some((blob) => blob.equals(icon)));

  const pdfPath = path.join(tmpdir(), "engineerit-wordmark-footer.pdf");
  await writeFile(pdfPath, await buildReportPdf(report));
  const text = execFileSync("pdftotext", ["-layout", "-f", "2", "-l", "2", pdfPath, "-"], { encoding: "utf8" });
  assert.match(text, /support@engineerit\.ai/);
  assert.match(text, /Page 2 of \d+/);
  const listing = execFileSync("pdfimages", ["-list", pdfPath], { encoding: "utf8" });
  assert.match(listing, /834\s+188/);
  assert.match(listing, /192\s+192/);
});
