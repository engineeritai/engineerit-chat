import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReportViewer from "../app/components/ReportViewer";
import { exportCapabilities } from "../lib/advisors";
import {
  RLM,
  intentLinks,
  isReportContent,
  nextTrapIndex,
  prefersMobileShare,
  reportLocale,
  sharePayload,
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
  const url = "https://engineerit.ai/share/abc";
  const arabic = sharePayload("حصر القواعد", url, "ar");
  assert.equal(arabic.text.startsWith(RLM), true);
  assert.equal(arabic.title.startsWith(RLM), true);
  assert.equal(arabic.text.includes("حصر القواعد"), true);
  const english = sharePayload("Footing take-off", url, "en");
  assert.equal(english.text.startsWith(RLM), false);
  assert.equal(english.text, "Footing take-off");

  const links = intentLinks("حصر القواعد", url, "ar");
  assert.match(links.whatsapp, /^https:\/\/wa\.me\/\?text=/);
  assert.match(links.linkedin, /^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?url=/);
  assert.match(links.email, /^mailto:\?subject=/);
  assert.match(decodeURIComponent(links.whatsapp), new RegExp(`^https:\\/\\/wa\\.me\\/\\?text=${RLM}`));
  assert.equal(prefersMobileShare({ width: 390, canShare: true }), true);
  assert.equal(prefersMobileShare({ width: 1280, canShare: true }), false);
  assert.equal(prefersMobileShare({ width: 390, canShare: false }), false);
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
      createdAt="2026-10-26T12:00:00.000Z"
      defaultMenu="download"
      onClose={() => undefined}
      onDownload={touch}
      onPreviewPdf={() => {
        calls += 1;
        return Promise.reject(new Error("preview"));
      }}
      onPublish={touch}
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
  assert.match(html, /share-page/);
  assert.match(html, /جدول الكميات/);
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
      createdAt="2026-10-26T12:00:00.000Z"
      onClose={() => undefined}
      onDownload={touch}
      onPreviewPdf={() => Promise.reject(new Error("preview"))}
      onPublish={touch}
    />
  );
  assert.match(english, /dir="ltr"/);
  assert.match(english, /Bill of quantities/);
  assert.match(english, /PDF preview/);
  assert.doesNotMatch(english, /<iframe/);
  assert.equal(calls, 0);
});
