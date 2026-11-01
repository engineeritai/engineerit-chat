import { flowSvg } from "@/lib/flowSvg";
import { riyadhCoverDate } from "@/lib/ksaTime";
import { coverHtml, coverZone, ICON_URL, REPORT_FOOTER_LINE } from "@/lib/reportBrand";
import { parseMessage, plainInline, tokenizeInline, type ListItem } from "@/lib/messageDocument";
import {
  isCenteredBoqColumn,
  isOutputDisclaimer,
  outputDisclaimerBody,
  pageDisclaimerHtml,
  OUTPUT_DISCLAIMER_GRAY,
  OUTPUT_POLICY_LABEL,
  OUTPUT_POLICY_URL,
} from "@/lib/outputDisclaimer";
import { asExportSvg, renderFittedChartParts } from "@/lib/scheduleSvg";
import { blockDirection, hasArabicContent, isolatePieces, RLM, shareDir, shareLanguage } from "@/lib/shareDirection";

/**
 * In-chat report viewer helpers.
 * The panel renders the message as HTML in the browser. It does not create a
 * share page and it does not call Supabase. Opening the panel does not call
 * an export route. Downloads stay on the existing export endpoints.
 */

export { RLM };

/**
 * NEXT_PUBLIC_REPORT_VIEWER is read at build time.
 * Unset, 1, true, or on keeps the viewer. 0, false, or off restores the
 * previous export buttons. Preview stays on when the variable is unset.
 * Set it to 0 on Production and redeploy that environment to turn it off.
 */
export function reportViewerEnabled(raw: string | undefined = process.env.NEXT_PUBLIC_REPORT_VIEWER): boolean {
  const value = (raw ?? "").trim().toLowerCase();
  return value !== "0" && value !== "false" && value !== "off";
}

export type ViewerDownload = "pdf" | "docx" | "pptx" | "xlsx";

export type ReportViewerLabels = {
  close: string;
  share: string;
  download: string;
  pdf: string;
  word: string;
  powerPoint: string;
  excel: string;
  copied: string;
  copyLink: string;
  linkedIn: string;
  email: string;
  whatsapp: string;
  report: string;
  pdfPreview: string;
  preparing: string;
  shareFailed: string;
  pdfFailed: string;
};

const BOQ_HEADING =
  /^#{1,6}[^\n]*(\bbill of quantities\b|\bquantity take-?off\b|\btake-?off\b|\bboq\b|جدول الكميات|حصر الكميات|كشف الكميات)/im;
const REPORT_HEADING = /^#{1,6}[^\n]*(\breport\b|status pack|تقرير)/im;
const MEASURE = /^(item|unit|quantity|qty|working|البند|الوحدة|الكمية|طريقة الحساب)$/i;

function headerCells(line: string): string[] {
  return line
    .split("|")
    .map((cell) => cell.replace(/[*_`]/g, "").trim())
    .filter(Boolean);
}

/** True when a reply is a report or a quantity take-off / bill of quantities. */
export function isReportContent(markdown: string): boolean {
  const text = markdown || "";
  if (BOQ_HEADING.test(text) || REPORT_HEADING.test(text)) return true;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const hits = headerCells(trimmed).filter((cell) => MEASURE.test(cell));
    if (hits.length >= 2) return true;
  }
  return false;
}

/**
 * Reports, flow diagrams, and charts (roadmap, timeline, Gantt, S-curve) open
 * the viewer. A plain answer does not. Plan caps still decide the downloads.
 */
export function isViewerContent(markdown: string): boolean {
  if (isReportContent(markdown)) return true;
  return parseMessage(markdown || "").some((block) => block.type === "diagram" || block.type === "chart");
}

/** Arabic UI or Arabic content opens the panel right-to-left. Same rule as a shared answer. */
export function reportLocale(markdown: string, uiLocale: string): "en" | "ar" {
  return shareLanguage(markdown, uiLocale === "ar" ? "ar" : "en");
}

/**
 * PDF on Professional and above. Word, PowerPoint, and the workbook on
 * Consultant and above (the wordPpt capability, including team and enterprise).
 */
export function viewerDownloads(caps: { pdf: boolean; wordPpt: boolean }): ViewerDownload[] {
  const items: ViewerDownload[] = [];
  if (caps.pdf) items.push("pdf");
  if (caps.wordPpt) items.push("docx", "pptx", "xlsx");
  return items;
}

/** Same wording and colour as the export footer. */
export const DISCLAIMER_GRAY = OUTPUT_DISCLAIMER_GRAY;
export const POLICY_LABEL = OUTPUT_POLICY_LABEL;
export const POLICY_URL = OUTPUT_POLICY_URL;

export function disclaimerBody(locale: "en" | "ar"): string {
  return outputDisclaimerBody(locale);
}

/** Unit and quantity headers, in English or Arabic. Other columns stay as they are. */
export function isMeasureColumn(header: string): boolean {
  return isCenteredBoqColumn(header.replace(/[*_`]/g, ""));
}

/** A share URL already present in the message. This does not create one. */
export function messageShareUrl(markdown: string): string | null {
  const match = /https?:\/\/[^\s<>"')]+\/share\/[A-Za-z0-9_-]{8,32}\b/.exec(markdown || "");
  return match ? match[0] : null;
}

export function shareText(title: string, locale: "en" | "ar", existingUrl?: string | null): string {
  const cleanTitle = title.trim() || (locale === "ar" ? "تقرير" : "Report");
  const line = locale === "ar" ? `${RLM}${cleanTitle}` : cleanTitle;
  const url = (existingUrl || "").trim();
  return url ? `${line}\n${url}` : line;
}

export function intentLinks(title: string, locale: "en" | "ar", existingUrl?: string | null) {
  const text = shareText(title, locale, existingUrl);
  const subject = shareText(title, locale);
  const url = (existingUrl || "").trim();
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    linkedin: url ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` : null,
    email: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
  };
}

/** Phone widths use the system share sheet when the browser provides one. */
export function prefersMobileShare(args: { width: number; canShare: boolean }): boolean {
  return args.canShare && args.width > 0 && args.width <= 800;
}

/** Next focusable index inside a dialog. A missing current index wraps in from the edge. */
export function nextTrapIndex(index: number, count: number, shift: boolean): number {
  if (count <= 0) return 0;
  const current = Number.isFinite(index) ? index : 0;
  if (shift) return current <= 0 ? count - 1 : current - 1;
  return current >= count - 1 ? 0 : current + 1;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isolatedHtml(value: string, force = false): string {
  if (!/[\u0600-\u06FF]/.test(value)) return force ? `<bdi dir="ltr">${esc(value)}</bdi>` : esc(value);
  return isolatePieces(value)
    .map((piece) => (piece.isolate ? `<bdi dir="ltr">${esc(piece.text)}</bdi>` : esc(piece.text)))
    .join("");
}

function inlineHtml(value: string, forceIsolate = false): string {
  const isolate = forceIsolate || /[\u0600-\u06FF]/.test(value);
  return tokenizeInline(value)
    .map((token) => {
      if (token.type === "link") {
        const label = isolate ? `<bdi dir="ltr">${esc(token.text)}</bdi>` : esc(token.text);
        return `<a href="${esc(token.href)}">${label}</a>`;
      }
      const text = isolate ? isolatedHtml(token.text, forceIsolate) : esc(token.text);
      return token.bold ? `<strong>${text}</strong>` : text;
    })
    .join("");
}

function listText(items: ListItem[]): string {
  return items.map((item) => `${item.text}\n${listText(item.children)}`).join("\n");
}

function listHtml(ordered: boolean, items: ListItem[], docDir: "ltr" | "rtl"): string {
  const tag = ordered ? "ol" : "ul";
  const dir = hasArabicContent(listText(items)) ? "rtl" : docDir;
  const body = items
    .map((item, index) => {
      const nested = item.children.length ? listHtml(item.orderedChildren, item.children, docDir) : "";
      return `<li dir="${blockDirection(item.text)}"${ordered ? ` value="${index + 1}"` : ""}>${inlineHtml(item.text)}${nested}</li>`;
    })
    .join("");
  return `<${tag} dir="${dir}">${body}</${tag}>`;
}

function cellHtml(value: string, rtlDoc: boolean): string {
  return inlineHtml(value, rtlDoc);
}

function taggedCell(tag: "th" | "td", header: string, value: string, rtlDoc: boolean): string {
  const measure = isMeasureColumn(header);
  const attrs = measure ? ' class="measure" style="text-align:center"' : "";
  return `<${tag}${attrs}>${cellHtml(value, rtlDoc)}</${tag}>`;
}

export function disclaimerHtml(locale: "en" | "ar"): string {
  const dir = locale === "ar" ? "rtl" : "ltr";
  return `<footer class="report-disclaimer" dir="${dir}" style="color:${DISCLAIMER_GRAY};font-size:12px"><p class="output-disclaimer">${pageDisclaimerHtml(locale)}</p><div class="footer-meta" style="display:flex;align-items:baseline;justify-content:space-between"><span class="footer-brand"><img src="${ICON_URL}" alt="eit" width="16" height="16"/> <span>${REPORT_FOOTER_LINE}</span></span></div></footer>`;
}

/** Report body rendered in the panel. No network and no share-page record. */
export function reportFragmentHtml(markdown: string, locale: "en" | "ar", title = "", now = new Date(), absolute = false): string {
  const dir = shareDir(markdown, locale);
  const blocks = parseMessage(markdown || "")
    .map((block) => {
      if (block.type === "heading") {
        return `<h${block.level} dir="${blockDirection(block.text)}">${inlineHtml(block.text)}</h${block.level}>`;
      }
      if (block.type === "paragraph") {
        const plain = plainInline(block.text);
        if (isOutputDisclaimer(plain, locale) || isOutputDisclaimer(plain, locale === "ar" ? "en" : "ar")) return "";
        return `<p dir="${blockDirection(block.text)}">${inlineHtml(block.text)}</p>`;
      }
      if (block.type === "list") return listHtml(block.ordered, block.items, dir);
      if (block.type === "table") {
        const tableText = [...block.headers, ...block.rows.flat()].join("\n");
        const tableDir = hasArabicContent(tableText) ? "rtl" : dir;
        const isolate = tableDir === "rtl";
        const head = block.headers.map((cell) => taggedCell("th", cell, cell, isolate)).join("");
        const body = block.rows
          .map((row) => `<tr>${block.headers.map((header, index) => taggedCell("td", header, row[index] ?? "", isolate)).join("")}</tr>`)
          .join("");
        return `<div class="report-table" dir="${tableDir}"><table dir="${tableDir}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
      }
      if (block.type === "chart") {
        const parts = renderFittedChartParts(block.model, dir).map((svg) => `<div class="chart-band">${svg}</div>`).join("");
        return `<figure class="report-chart"><figcaption>${esc(block.model.title)}</figcaption>${parts}</figure>`;
      }
      if (block.type === "diagram") {
        const svg = flowSvg(block.source, dir);
        return svg ? `<figure class="report-chart">${asExportSvg(svg)}</figure>` : `<pre>${esc(block.source)}</pre>`;
      }
      return `<pre dir="ltr">${esc(block.text)}</pre>`;
    })
    .join("\n");
  const heading = (markdown || "").match(/^#{1,6}\s+(.+)$/m)?.[1]?.replace(/[*_`]/g, "").trim() || "";
  const coverTitle = title.trim() || heading || (locale === "ar" ? "تقرير" : "Report");
  return `${coverHtml({
    title: coverTitle,
    date: riyadhCoverDate(now, locale),
    zone: coverZone(locale),
    locale,
    absolute,
  })}\n${blocks}`;
}

const REPORT_STYLE = `
  body { margin: 0; color: #14213D; background: #fff; font-family: Inter, "Noto Naskh Arabic", "IBM Plex Sans Arabic", "Segoe UI", sans-serif; }
  main { max-width: 980px; margin: 0 auto; padding: 8px 16px 32px; }
  h1, h2, h3 { line-height: 1.35; }
  article h1, h2, h3, h4, main h1, main h2, main h3, main h4 { color: #0D60E4; }
  .cover-title, .cover-date, .cover-zone, .cover-sub, .cover-site, .cover-mail { text-align: center; }
  .cover { position: relative; display: flex; flex-direction: column; min-height: 100vh; background: #fff; break-after: page; page-break-after: always; }
  .cover-bar { height: 17px; background: #0D60E4; }
  .cover-body { margin: auto 0; padding: 48px 28px 12px; text-align: center; }
  .cover-mark { width: min(340px, 78%); height: auto; }
  .cover-rule { width: 112px; height: 2px; margin: 22px auto 26px; background: #0D60E4; }
  .cover-title { margin: 0; color: #14213D; font-size: 32px; line-height: 1.25; font-weight: 700; }
  .cover-date { margin: 22px 0 0; color: #14213D; font-size: 15px; font-weight: 700; }
  .cover-zone { margin: 4px 0 0; color: #5B6475; font-size: 12px; }
  .cover-contact { padding: 0 24px 40px; text-align: center; }
  .cover-site { color: #0D60E4; font-weight: 700; font-size: 15px; }
  .cover-mail { color: #5B6475; font-size: 12px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; background: #fff; }
  th, td { padding: 8px 10px; border: 1px solid #D9E2F2; text-align: start; vertical-align: top; white-space: normal; min-width: 0; overflow-wrap: anywhere; }
  th { background: #0D60E4; color: #fff; }
  th.measure, td.measure { text-align: center; }
  .report-disclaimer, .report-disclaimer a { color: ${DISCLAIMER_GRAY}; font-size: 12px; }
  .report-table { overflow-x: auto; }
  figure, .chart-band { max-width: 100%; }
  figure svg, .chart-band svg { display: block; width: 100%; max-width: 100%; height: auto; }
  .gantt-fit { position: relative; max-width: 100%; }
  .gantt-fit-names { position: absolute; top: 0; bottom: 0; width: 30.12%; display: grid; }
  .gantt-fit[dir="ltr"] .gantt-fit-names { left: 0; }
  .gantt-fit[dir="rtl"] .gantt-fit-names { right: 0; }
  .gantt-fit-name, .gantt-fit-head { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; padding-inline: 8px; font-size: clamp(9px, 1.5vw, 13px); line-height: 1.1; color: #0f172a; }
  .gantt-fit-name.is-group { font-weight: 700; }
  @media (max-width: 560px) {
    .cover-title { font-size: 22px; }
    .report-table { overflow: visible; }
    table { table-layout: fixed; }
    th, td { min-width: 0; overflow-wrap: anywhere; }
    figure, .chart-band, figure svg, .chart-band svg { max-width: 100%; }
  }
  @media print {
    h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; break-inside: avoid; }
    figure, .chart-band { break-before: avoid; page-break-before: avoid; max-width: 100%; }
    figure svg, .chart-band svg { width: 100% !important; max-width: 100% !important; height: auto !important; }
    .chart-band { break-inside: avoid; page-break-inside: avoid; }
    .report-table { overflow: visible; max-width: 100%; }
    table { width: 100%; table-layout: fixed; }
    th, td { min-width: 0; overflow-wrap: anywhere; }
  }
`;

/** Standalone HTML file for the share sheet. Built in the browser from the message. */
export function reportDocumentHtml(args: { title: string; markdown: string; locale: "en" | "ar"; now?: Date }): string {
  const lang = shareLanguage(args.markdown, args.locale);
  const dir = shareDir(args.markdown, args.locale);
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(args.title)}</title>
<style>${REPORT_STYLE}</style>
</head>
<body>
<main dir="${dir}">
${reportFragmentHtml(args.markdown, lang, args.title, args.now ?? new Date(), true)}
${disclaimerHtml(lang)}
</main>
</body>
</html>`;
}
