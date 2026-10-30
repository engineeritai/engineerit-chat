import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { flowSvg } from "../lib/flowSvg";
import { parseMessage } from "../lib/messageDocument";
import { prepareReport } from "../lib/reportModel";
import { buildReportDocx } from "../lib/reportDocx";
import { buildReportPdf } from "../lib/reportPdf";
import { buildReportPptx } from "../lib/reportPptx";
import { buildReportXlsx } from "../lib/reportXlsx";
import { reportDocumentHtml, reportFragmentHtml } from "../lib/reportViewer";
import { asExportSvg, ganttFitBands, renderChartSvg } from "../lib/scheduleSvg";
import { buildShareHtml } from "../lib/shareDocument";

const now = new Date("2026-10-16T23:34:00Z");

const ganttEn = `## 5. Gantt Chart

\`\`\`mermaid
gantt
    title CDU turnaround
    dateFormat YYYY-MM-DD
    section Outage
    Design package :des, 2026-09-01, 20d
    Isolate the unit :iso, 2026-09-22, 10d
    Open equipment :opn, 2026-10-02, 14d
\`\`\`

\`\`\`mermaid
flowchart LR
    A[Isolate] --> B[Open]
    B --> C[Inspect]
\`\`\`

\`\`\`bar
title Manhours
Sep | 6 | 5
Oct | 12 | 14
Nov | 9 | 8
\`\`\`

\`\`\`pie
title Cost split
Materials | 40
Labor | 35
Equipment | 25
\`\`\`
`;

const ganttAr = `## مخطط جانت للإيقاف

\`\`\`mermaid
gantt
    title إيقاف الوحدة
    dateFormat YYYY-MM-DD
    section الأعمال
    عزل الوحدة :t1, 2026-03-01, 10d
    فتح المعدات :t2, 2026-03-12, 14d
\`\`\`

\`\`\`mermaid
flowchart RL
    A[عزل] --> B[فتح]
    B --> C[فحص]
\`\`\`
`;

function ganttModel(markdown: string) {
  const block = parseMessage(markdown).find((item) => item.type === "chart" && item.model.kind === "gantt");
  assert.ok(block && block.type === "chart" && block.model.kind === "gantt");
  return block.model;
}

test("fitted gantt keeps task labels and scales to the content width", () => {
  const model = ganttModel(ganttEn);
  const fitted = ganttFitBands(model, false);
  assert.equal(fitted.length, 1);
  assert.match(fitted[0], /data-fit="1"/);
  assert.match(fitted[0], /width:100%/);
  assert.match(fitted[0], />Design package</);
  assert.match(fitted[0], />Isolate the unit</);
  assert.match(fitted[0], /text-anchor="start"/);
  const chat = renderChartSvg(model, "ltr");
  assert.match(chat, /style="width:\d+px/);
  assert.doesNotMatch(chat, />Design package</);
  const rows = Array.from({ length: 16 }, (_, index) => `Task ${index + 1} :t${index + 1}, 2026-09-01, 5d`).join("\n");
  const long = ganttModel(`\`\`\`mermaid\ngantt\n    title Long\n    dateFormat YYYY-MM-DD\n    section Work\n${rows}\n\`\`\``);
  const bands = ganttFitBands(long, false);
  assert.ok(bands.length >= 2);
  assert.match(bands[0], />Task 1</);
  assert.match(bands[1], />Task 16</);
  assert.doesNotMatch(bands[0], />Task 16</);
});

test("arabic fitted gantt puts labels on the right", () => {
  const model = ganttModel(ganttAr);
  const svg = ganttFitBands(model, true)[0];
  assert.match(svg, /data-fit="1"/);
  assert.match(svg, /width:100%/);
  assert.match(svg, />عزل الوحدة</);
  assert.match(svg, /text-anchor="end"/);
  assert.match(svg, /direction="rtl"/);
  const width = Number(/viewBox="0 0 ([\d.]+)/.exec(svg)?.[1]);
  const labelX = Number(/<text x="([\d.]+)"[^>]*>عزل الوحدة<\/text>/.exec(svg)?.[1]);
  assert.ok(labelX > width * 0.6, `label x ${labelX} width ${width}`);
});

test("flow, bar, and pie exports scale without dropping labels", () => {
  const raw = flowSvg("flowchart LR\nA[Isolate]-->B[Open]", "ltr");
  assert.ok(raw);
  assert.match(raw, /width:\d+px/);
  assert.doesNotMatch(raw, /width:100%/);
  assert.match(raw, />Isolate</);
  const fitted = asExportSvg(raw);
  assert.match(fitted, /width="100%"/);
  assert.match(fitted, /width:100%/);
  assert.match(fitted, /viewBox=/);
  assert.match(fitted, />Isolate</);
  const blocks = parseMessage(ganttEn);
  const bar = blocks.find((block) => block.type === "chart" && block.model.kind === "bar");
  const pie = blocks.find((block) => block.type === "chart" && block.model.kind === "pie");
  assert.ok(bar && bar.type === "chart" && pie && pie.type === "chart");
  const barSvg = asExportSvg(renderChartSvg(bar.model, "ltr"));
  const pieSvg = asExportSvg(renderChartSvg(pie.model, "ltr"));
  assert.match(barSvg, /width="100%"/);
  assert.match(barSvg, /Planned/);
  assert.match(pieSvg, /width="100%"/);
  assert.match(pieSvg, /Materials/);
  assert.match(pieSvg, /Labor/);
});

test("print html, save html, and the report viewer keep the heading with a fitted chart", () => {
  const share = buildShareHtml({ title: "Turnaround Package for CDU Plant", markdown: ganttEn, locale: "en", now });
  const saved = reportDocumentHtml({ title: "Turnaround Package for CDU Plant", markdown: ganttEn, locale: "en", now });
  const viewer = reportFragmentHtml(ganttEn, "en");
  for (const html of [share, saved, viewer]) {
    assert.match(html, /data-fit="1"/);
    assert.match(html, /width:100%/);
    assert.match(html, />Design package</);
    assert.match(html, /Isolate/);
    assert.match(html, /Materials/);
    assert.match(html, /chart-band/);
  }
  for (const html of [share, saved]) {
    assert.match(html, /break-after:\s*avoid/);
    assert.match(html, /break-before:\s*avoid/);
    assert.match(html, /table-layout:\s*fixed/);
  }
  const viewerCss = readFileSync("app/design.css", "utf8");
  assert.match(viewerCss, /@media print[\s\S]*report-viewer-doc svg[\s\S]*width:\s*100%/);
  assert.match(viewerCss, /break-after:\s*avoid/);
  const arabic = buildShareHtml({ title: "إيقاف الوحدة", markdown: ganttAr, locale: "ar", now });
  assert.match(arabic, /dir="rtl"/);
  assert.match(arabic, />عزل الوحدة</);
  assert.match(arabic, /width:100%/);
});

test("pdf, word, slides, and excel fit charts on A4 and Letter in both languages", async () => {
  for (const page of ["a4", "letter"] as const) {
    for (const [locale, markdown, heading] of [
      ["en", ganttEn, "Gantt Chart"],
      ["ar", ganttAr, "مخطط جانت"],
    ] as const) {
      const report = await prepareReport({
        title: locale === "ar" ? "اعمل جدول إيقاف الوحدة" : "Create Turnaround package for CDU plant",
        markdown,
        locale,
        now,
      });
      if (locale === "en") assert.equal(report.title, "Turnaround Package for CDU Plant");
      if (locale === "ar") assert.equal(report.title, "جدول إيقاف الوحدة");
      const pdf = await buildReportPdf(report, page);
      const doc = await PDFDocument.load(pdf);
      const pages = doc.getPages().map((item) => item.getSize());
      assert.ok(pages.length >= 2);
      const expected = page === "letter" ? { w: 612, h: 792 } : { w: 595.28, h: 841.89 };
      assert.ok(pages.some((size) => Math.abs(size.width - expected.w) < 1 && Math.abs(size.height - expected.h) < 1));
      const chartPages = pages.filter((size) => Math.abs(size.width - expected.w) < 1);
      assert.ok(chartPages.length >= 1);
      assert.equal(doc.getTitle(), report.title);

      const word = await JSZip.loadAsync(await buildReportDocx(report));
      const xml = await word.file("word/document.xml")!.async("string");
      assert.match(xml, new RegExp(heading));
      assert.match(xml, /w:keepNext/);
      const extents = [...xml.matchAll(/cx="(\d+)" cy="(\d+)"/g)].map((match) => ({
        cx: Number(match[1]),
        cy: Number(match[2]),
      }));
      const contentCx = Math.floor(((11906 - 1440) / 1440) * 96) * 9525;
      const contentCy = 900 * 9525;
      const pictures = extents.filter((item) => item.cx > 400 * 9525);
      assert.ok(pictures.length >= 1);
      for (const picture of pictures) {
        assert.ok(picture.cx <= contentCx + 1000, `docx width ${picture.cx}`);
        assert.ok(picture.cy <= contentCy + 1000, `docx height ${picture.cy}`);
      }

      const deck = await JSZip.loadAsync(await buildReportPptx(report));
      const slides = Object.keys(deck.files).filter((name) => /ppt\/slides\/slide\d+\.xml$/.test(name));
      const slideW = 13.333 * 914400;
      const slideH = 7.5 * 914400;
      let fitted = 0;
      for (const name of slides) {
        const slide = await deck.file(name)!.async("string");
        if (!slide.includes("<p:pic")) continue;
        for (const match of slide.matchAll(/<a:off x="(\d+)" y="(\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/g)) {
          const x = Number(match[1]);
          const y = Number(match[2]);
          const cx = Number(match[3]);
          const cy = Number(match[4]);
          if (cx < 2 * 914400) continue;
          fitted += 1;
          assert.ok(x >= 0 && y >= 0);
          assert.ok(x + cx <= slideW + 2000, `${name} overflows width`);
          assert.ok(y + cy <= slideH + 2000, `${name} overflows height`);
        }
      }
      assert.ok(fitted >= 1);

      const book = await JSZip.loadAsync(await buildReportXlsx(report));
      const workbook = await book.file("xl/workbook.xml")!.async("string");
      assert.match(workbook, locale === "ar" ? /مخططات/ : /Charts/);
      const drawing = Object.keys(book.files).find((name) => /xl\/drawings\/drawing\d+\.xml$/.test(name));
      assert.ok(drawing);
      const draw = await book.file(drawing)!.async("string");
      assert.match(draw, /pic/);
      const widths = [...draw.matchAll(/cx="(\d+)"/g)].map((match) => Number(match[1]));
      assert.ok(widths.some((width) => width > 400 * 9525 && width <= 700 * 9525));
    }
  }
});
