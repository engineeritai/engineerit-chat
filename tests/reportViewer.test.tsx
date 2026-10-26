import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReportViewer from "../app/components/ReportViewer";
import { exportCapabilities } from "../lib/advisors";
import {
  DISCLAIMER_GRAY,
  RLM,
  disclaimerBody,
  intentLinks,
  isMeasureColumn,
  isReportContent,
  messageShareUrl,
  nextTrapIndex,
  prefersMobileShare,
  reportDocumentHtml,
  reportFragmentHtml,
  reportLocale,
  reportViewerEnabled,
  shareText,
  viewerDownloads,
  type ReportViewerLabels,
} from "../lib/reportViewer";

const EN_BOQ = `# Footing take-off

## Bill of quantities

| Item | Description | Unit | Quantity | Working |
| --- | --- | --- | --- | --- |
| F1 | Footing | m3 | 1.620 | 1.8 × 1.8 × 0.5 = 1.620 |
`;

const AR_BOQ = `# حصر القواعد

## جدول الكميات

| البند | الوصف | الوحدة | الكمية | طريقة الحساب |
| --- | --- | --- | --- | --- |
| F1 | قاعدة | م3 | 1.620 | 1.8 × 1.8 × 0.5 = 1.620 |
`;

const SCURVE = `## Weekly Progress Data

| Week | Cumulative Progress (%) |
| --- | --- |
| Wk1 | 10% |

## S-Curve Chart

The curve reaches 100% in week 5.`;

const labels: ReportViewerLabels = {
  close: "Close",
  share: "Share",
  download: "Download",
  pdf: "PDF",
  word: "Word",
  powerPoint: "PowerPoint",
  excel: "Excel",
  copied: "Copied",
  copyLink: "Copy link",
  linkedIn: "LinkedIn",
  email: "Email",
  whatsapp: "WhatsApp",
  report: "Report",
  pdfPreview: "PDF preview",
  preparing: "Preparing the PDF…",
  shareFailed: "Could not create the share link.",
  pdfFailed: "PDF export failed.",
};

test("a take-off or report opens the viewer and a chart reply does not", () => {
  assert.equal(isReportContent(EN_BOQ), true);
  assert.equal(isReportContent(AR_BOQ), true);
  assert.equal(isReportContent("# Status pack\n\n## Snapshot\n\nReady."), true);
  assert.equal(isReportContent("# تقرير الحصر\n\nنص"), true);
  assert.equal(isReportContent(SCURVE), false);
  assert.equal(isReportContent("The footing is 500 mm deep."), false);
});

test("Arabic content is right to left even when the chat locale is English", () => {
  assert.equal(reportLocale(AR_BOQ, "en"), "ar");
  assert.equal(reportLocale(EN_BOQ, "ar"), "ar");
  assert.equal(reportLocale(EN_BOQ, "en"), "en");
});

test("download menu follows the plan", () => {
  assert.deepEqual(viewerDownloads(exportCapabilities("guest", true)), []);
  assert.deepEqual(viewerDownloads(exportCapabilities("assistant")), []);
  assert.deepEqual(viewerDownloads(exportCapabilities("engineer")), []);
  assert.deepEqual(viewerDownloads(exportCapabilities("professional")), ["pdf"]);
  assert.deepEqual(viewerDownloads(exportCapabilities("consultant")), ["pdf", "docx", "pptx", "xlsx"]);
  assert.deepEqual(viewerDownloads(exportCapabilities("team")), ["pdf", "docx", "pptx", "xlsx"]);
  assert.deepEqual(viewerDownloads(exportCapabilities("enterprise")), ["pdf", "docx", "pptx", "xlsx"]);
});

test("Arabic share text carries an RLM prefix and intent links", () => {
  const url = "https://engineerit.ai/share/abc12345";
  const arabic = shareText("حصر القواعد", "ar", url);
  assert.equal(arabic.startsWith(RLM), true);
  assert.equal(arabic.includes("حصر القواعد"), true);
  assert.equal(arabic.includes(url), true);
  const english = shareText("Footing take-off", "en");
  assert.equal(english.startsWith(RLM), false);
  assert.equal(english, "Footing take-off");
  assert.equal(messageShareUrl(`See ${url} for the sheet.`), url);
  assert.equal(messageShareUrl(EN_BOQ), null);

  const links = intentLinks("حصر القواعد", "ar", url);
  assert.match(links.whatsapp, /^https:\/\/wa\.me\/\?text=/);
  assert.match(links.linkedin || "", /^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?url=/);
  assert.match(links.email, /^mailto:\?subject=/);
  assert.match(decodeURIComponent(links.whatsapp), new RegExp(`^https:\\/\\/wa\\.me\\/\\?text=${RLM}`));
  assert.equal(intentLinks("Footing take-off", "en").linkedin, null);
  assert.equal(prefersMobileShare({ width: 390, canShare: true }), true);
  assert.equal(prefersMobileShare({ width: 1280, canShare: true }), false);
  assert.equal(prefersMobileShare({ width: 390, canShare: false }), false);
});

test("the report HTML is right to left, centres unit and quantity, and carries the gray disclaimer", () => {
  const arabic = reportDocumentHtml({ title: "حصر القواعد", markdown: AR_BOQ, locale: "ar", now: new Date("2026-10-26T12:00:00Z") });
  assert.match(arabic, /dir="rtl"/);
  assert.match(arabic, /class="measure" style="text-align:center"[^>]*>[\s\S]*الوحدة/);
  assert.match(arabic, /class="measure" style="text-align:center"[^>]*>[\s\S]*الكمية/);
  assert.doesNotMatch(reportFragmentHtml(AR_BOQ, "ar"), /class="measure"[^>]*>[\s\S]*الوصف/);
  assert.match(arabic, new RegExp(disclaimerBody("ar").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(arabic, new RegExp(`color:${DISCLAIMER_GRAY}`, "i"));
  assert.match(arabic, /https:\/\/engineerit\.ai\/legal\/terms\?lang=ar/);

  const english = reportDocumentHtml({ title: "Footing take-off", markdown: EN_BOQ, locale: "en", now: new Date("2026-10-26T12:00:00Z") });
  assert.match(english, /dir="ltr"/);
  assert.match(english, /th\.measure, td\.measure \{ text-align: center; \}/);
  assert.match(english, /class="measure" style="text-align:center"[^>]*>Unit/);
  assert.match(english, /class="measure" style="text-align:center"[^>]*>Quantity/);
  assert.match(english, new RegExp(disclaimerBody("en").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(isMeasureColumn("Working"), false);
  assert.equal(isMeasureColumn("طريقة الحساب"), false);
});

test("the viewer flag defaults on and off restores direct export", () => {
  assert.equal(reportViewerEnabled(""), true);
  assert.equal(reportViewerEnabled("1"), true);
  assert.equal(reportViewerEnabled("true"), true);
  assert.equal(reportViewerEnabled("on"), true);
  assert.equal(reportViewerEnabled("0"), false);
  assert.equal(reportViewerEnabled("false"), false);
  assert.equal(reportViewerEnabled("OFF"), false);
  const page = readFileSync("app/chat/page.tsx", "utf8");
  assert.match(page, /const viewerOn = reportViewerEnabled\(\)/);
  assert.match(page, /if \(viewerOn && isReportContent\(content\)\)/);
  assert.match(page, /viewerOn && reportViewer/);
  assert.match(page, /await exportPdf\(m\.content, \{ title: meta\.source \|\| topic, subtitle: meta\.subtitle, locale, diagrams \}\)/);
  assert.match(page, /await exportWordDocx\(m\.content, \{ title: meta\.source \|\| topic, subtitle: meta\.subtitle, locale, diagrams \}\)/);
  assert.match(page, /await exportPptx\(m\.content, \{ title: meta\.source \|\| topic, subtitle: meta\.subtitle, locale, diagrams \}\)/);
});

test("the viewer adds no Supabase client usage", () => {
  const banned = /supabase|@supabase\/|\/api\/share|publishShare|createShare|shared_pages|createClient\(/i;
  const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const file of ["lib/reportViewer.ts", "app/components/ReportViewer.tsx"]) {
    assert.doesNotMatch(code(readFileSync(file, "utf8")), banned);
  }
  const page = readFileSync("app/chat/page.tsx", "utf8");
  const start = page.indexOf("<ReportViewer");
  const end = page.indexOf("/>", start);
  assert.ok(start > 0 && end > start);
  const usage = page.slice(start, end);
  assert.doesNotMatch(usage, banned);
  assert.doesNotMatch(usage, /onPublish/);
});

test("focus wraps inside the dialog", () => {
  assert.equal(nextTrapIndex(0, 3, false), 1);
  assert.equal(nextTrapIndex(2, 3, false), 0);
  assert.equal(nextTrapIndex(0, 3, true), 2);
  assert.equal(nextTrapIndex(-1, 4, false), 0);
  assert.equal(nextTrapIndex(-1, 4, true), 3);
});

test("opening the viewer renders the share page and does not export", () => {
  let calls = 0;
  const touch = () => {
    calls += 1;
    return Promise.resolve(null);
  };
  const html = renderToStaticMarkup(
    <ReportViewer
      title="حصر القواعد"
      markdown={AR_BOQ}
      locale="ar"
      labels={{ ...labels, close: "إغلاق", share: "مشاركة", download: "تنزيل" }}
      downloads={["pdf", "docx", "pptx", "xlsx"]}
      canShare
      defaultMenu="download"
      onClose={() => undefined}
      onDownload={touch}
      onPreviewPdf={() => {
        calls += 1;
        return Promise.reject(new Error("preview"));
      }}
    />
  );
  assert.equal(calls, 0);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /lang="ar"/);
  assert.match(html, /إغلاق/);
  assert.match(html, /مشاركة/);
  assert.match(html, /تنزيل/);
  assert.match(html, />PDF</);
  assert.match(html, />Word</);
  assert.match(html, />PowerPoint</);
  assert.match(html, />Excel</);
  assert.match(html, /report-viewer-disclaimer/);
  assert.match(html, /مولد بالذكاء الاصطناعي/);
  assert.match(html, /جدول الكميات/);
  assert.match(html, /text-align:center/);
  assert.doesNotMatch(html, /<iframe/);
  assert.doesNotMatch(html, /\/api\/export/);

  const english = renderToStaticMarkup(
    <ReportViewer
      title="Footing take-off"
      markdown={EN_BOQ}
      locale="en"
      labels={labels}
      downloads={["pdf"]}
      canShare
      onClose={() => undefined}
      onDownload={touch}
      onPreviewPdf={() => Promise.reject(new Error("preview"))}
    />
  );
  assert.match(english, /dir="ltr"/);
  assert.match(english, /Bill of quantities/);
  assert.match(english, /PDF preview/);
  assert.doesNotMatch(english, /<iframe/);
  assert.equal(calls, 0);
});
