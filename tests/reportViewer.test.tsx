import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReportViewer from "../app/components/ReportViewer";
import MessageShareMenu from "../app/components/MessageShareMenu";
import { shareSheetLabels } from "../lib/chatActions";
import { buildShareHtml } from "../lib/shareDocument";
import { exportCapabilities } from "../lib/advisors";
import {
  DISCLAIMER_GRAY,
  RLM,
  intentLinks,
  isMeasureColumn,
  isReportContent,
  isViewerContent,
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

test("diagrams and roadmaps open the viewer on every plan while downloads stay capped", () => {
  const roadmap = "```timeline\ntitle Factory roadmap\n2026-01-01 : Project Initiation\n2026-03-01 : Site Selection\n```";
  const flow = "```mermaid\nflowchart LR\nA-->B\n```";
  const curve = "```scurve\ntitle Progress\nSep | 20 | 18\nOct | 45 | 40\n```";
  assert.equal(isViewerContent(EN_BOQ), true);
  assert.equal(isViewerContent(roadmap), true);
  assert.equal(isViewerContent(flow), true);
  assert.equal(isViewerContent(curve), true);
  assert.equal(isViewerContent(SCURVE), false);
  assert.equal(isViewerContent("The footing is 500 mm deep."), false);
  assert.equal(isReportContent(roadmap), false);
  assert.deepEqual(viewerDownloads(exportCapabilities("engineer")), []);
  assert.deepEqual(viewerDownloads(exportCapabilities("professional")), ["pdf"]);
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
  assert.match(arabic, /مُولَّد بالذكاء الاصطناعي، <a href="https:\/\/engineerit\.ai\/legal\/terms">تُطبَّق سياسة الاستخدام<\/a>/);
  assert.doesNotMatch(arabic, /قد يحتوي على أخطاء/);
  assert.match(arabic, new RegExp(`color:${DISCLAIMER_GRAY}`, "i"));
  assert.match(arabic, /font-size:12px/);

  const english = reportDocumentHtml({ title: "Footing take-off", markdown: EN_BOQ, locale: "en", now: new Date("2026-10-26T12:00:00Z") });
  assert.match(english, /dir="ltr"/);
  assert.match(english, /th\.measure, td\.measure \{ text-align: center; \}/);
  assert.match(english, /class="measure" style="text-align:center"[^>]*>Unit/);
  assert.match(english, /class="measure" style="text-align:center"[^>]*>Quantity/);
  assert.match(english, /AI-generated, <a href="https:\/\/engineerit\.ai\/legal\/terms">User Policy Applied<\/a>/);
  assert.doesNotMatch(english, /may contain errors/);
  assert.equal(isMeasureColumn("Working"), false);
  assert.equal(isMeasureColumn("طريقة الحساب"), false);
});

test("an Arabic answer uses Arabic sheet labels even when the interface is English", () => {
  const arabic = "يمكن استخدام نظم المعلومات الجغرافية مع أوتوكاد لتخطيط شبكات المياه.";
  const sheet = shareSheetLabels(arabic, "en");
  assert.equal(sheet.lang, "ar");
  assert.equal(sheet.dir, "rtl");
  assert.deepEqual(
    [sheet.copy, sheet.share, sheet.saveHtml, sheet.print, sheet.whatsapp, sheet.close],
    ["نسخ", "مشاركة", "حفظ HTML", "طباعة", "واتساب", "إغلاق"]
  );
  const english = shareSheetLabels("The footing is 500 mm deep.", "en");
  assert.equal(english.lang, "en");
  assert.equal(english.dir, "ltr");
  assert.equal(english.copy, "Copy");
  assert.equal(english.saveHtml, "Save HTML");
  const fallback = shareSheetLabels("The footing is 500 mm deep.", "ar");
  assert.equal(fallback.lang, "ar");
  assert.equal(fallback.dir, "rtl");
  assert.equal(fallback.close, "إغلاق");

  const html = renderToStaticMarkup(
    <MessageShareMenu
      open
      dir={sheet.dir}
      label={sheet.share}
      onClose={() => undefined}
      actions={[
        { icon: "copy", label: sheet.copy, onSelect: () => undefined },
        { icon: "share", label: sheet.share, onSelect: () => undefined },
        { icon: "html", label: sheet.saveHtml, onSelect: () => undefined },
        { icon: "print", label: sheet.print, onSelect: () => undefined },
        { icon: "whatsapp", label: sheet.whatsapp, onSelect: () => undefined },
        { icon: "close", label: sheet.close, onSelect: () => undefined },
      ]}
    />
  );
  assert.match(html, /dir="rtl"/);
  assert.match(html, /حفظ HTML/);
  assert.doesNotMatch(html, />Copy</);
  const footer = buildShareHtml({ title: "شبكات المياه", markdown: arabic, locale: "en" });
  assert.match(footer, /تُطبَّق سياسة الاستخدام/);
  assert.doesNotMatch(footer.slice(footer.indexOf("<footer")), /may contain errors/);
  assert.match(readFileSync("app/chat/page.tsx", "utf8"), /shareSheetLabels\(m\.content, locale\)/);
  assert.match(readFileSync("app/chat/page.tsx", "utf8"), /locale=\{shareSheetLabels\(reportViewer\.markdown, locale\)\.lang\}/);
});

test("message Share opens the app sheet and does not call the system share", () => {
  const page = readFileSync("app/chat/page.tsx", "utf8");
  const advisor = readFileSync("app/components/AdvisorChat.tsx", "utf8");
  for (const source of [page, advisor]) {
    const start = source.indexOf('className="msg-actions"');
    const menu = source.indexOf("<MessageShareMenu", start);
    const closeAt = source.indexOf('icon: "close"', menu);
    assert.ok(start > 0 && menu > start && closeAt > menu);
    const row = source.slice(start, menu);
    const block = source.slice(menu, closeAt + 'icon: "close"'.length);
    assert.doesNotMatch(row, /publishAndShare|navigator\.share|📋|🔗/);
    assert.match(row, /ShareGlyph name="share"/);
    assert.match(row, /setOpenShareFor/);
    const order = ["copy", "share", "html", "print", "whatsapp", "close"].map((icon) => block.indexOf(`icon: "${icon}"`));
    assert.ok(order.every((index) => index > 0));
    assert.deepEqual(order, [...order].sort((a, b) => a - b));
    assert.match(block, /publishAndShare/);
  }
  assert.match(readFileSync("app/components/MessageShareMenu.tsx", "utf8"), /msg-share-handle/);
  assert.match(readFileSync("app/share/[id]/page.tsx", "utf8"), /force-dynamic/);
  assert.match(readFileSync("app/s/[id]/page.tsx", "utf8"), /force-dynamic/);
  assert.doesNotMatch(readFileSync("app/share/[id]/page.tsx", "utf8") + readFileSync("app/s/[id]/page.tsx", "utf8"), /revalidate/);
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
  assert.match(page, /if \(viewerOn && isViewerContent\(content\)\)/);
  assert.match(page, /viewerOn && isViewerContent\(m\.content\)/);
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
  assert.match(html, /تُطبَّق سياسة الاستخدام/);
  assert.doesNotMatch(html, /قد يحتوي على أخطاء/);
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
