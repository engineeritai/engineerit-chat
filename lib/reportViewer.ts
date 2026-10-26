/**
 * In-chat report viewer helpers.
 * The panel renders through ShareView. Disclaimer text, content RTL, and
 * centred Unit / Quantity cells stay in that renderer so this branch does
 * not fork them.
 * Opening the HTML panel does not call an export route.
 */

export const RLM = "\u200F";

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

/** Arabic UI or Arabic content opens the panel right-to-left. */
export function reportLocale(markdown: string, uiLocale: string): "en" | "ar" {
  if (uiLocale === "ar") return "ar";
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(markdown || "")) return "ar";
  return "en";
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

export function sharePayload(title: string, url: string, locale: "en" | "ar") {
  const cleanTitle = title.trim() || (locale === "ar" ? "تقرير" : "Report");
  const text = locale === "ar" ? `${RLM}${cleanTitle}` : cleanTitle;
  return { title: text, text, url };
}

export function intentLinks(title: string, url: string, locale: "en" | "ar") {
  const payload = sharePayload(title, url, locale);
  const message = `${payload.text}\n${url}`;
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    email: `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(message)}`,
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
