import { readFile } from "node:fs/promises";
import path from "node:path";
import { formatCoverDate, formatCoverTime, riyadhIsoDate, type UiLocale } from "@/lib/ksaTime";
import { coverSubtitle, pickTopicSource, REPORT_LABEL, shortTopic } from "@/lib/exportName";
import { resolveMessageTimeZone } from "@/lib/messageTime";
import { REPORT_FOOTER_LINE } from "@/lib/reportBrand";

export { REPORT_FOOTER_LINE };
import { appendixHeading, ganttAppendix, parseMessage, plainTopic, type Block } from "@/lib/messageDocument";
import { flowSvg } from "@/lib/flowSvg";
import { pngSize, svgToPng } from "@/lib/rasterSvg";
import { asExportSvg, ganttFitBands, renderChartSvg } from "@/lib/scheduleSvg";

export type ReportImage = {
  png: Uint8Array;
  width: number;
  height: number;
};

export type PreparedReport = {
  title: string;
  subtitle: string;
  locale: UiLocale;
  stamp: string;
  /** Full cover date in the reader's time zone, such as "Sunday, 1 November 2026". */
  coverDate: string;
  /** Clock time in the reader's time zone, such as "14:32". No zone name. */
  coverTime: string;
  blocks: Block[];
  images: Map<number, ReportImage>;
  /** Small eit mark for header and footer corners. */
  logo: Uint8Array;
  /** Official cover wordmark. Drawn as-is; do not recolor or stretch. */
  wordmark: Uint8Array;
};

export type ReportRequest = {
  title?: string;
  subtitle?: string;
  prompt?: string;
  markdown: string;
  locale?: string;
  now?: Date;
  /** IANA zone from the browser. Omitted uses the device zone. */
  timeZone?: string;
  diagrams?: { index: number; pngBase64: string }[];
};

function reportTimeZone(value: string | undefined): string {
  const candidate = (value || "").trim();
  if (candidate) {
    try {
      Intl.DateTimeFormat("en-GB", { timeZone: candidate });
      return candidate;
    } catch {
      /* ignore an unknown zone */
    }
  }
  return resolveMessageTimeZone();
}

function localeOf(value: string | undefined, markdown: string): UiLocale {
  if (value === "ar" || value === "en") return value;
  return /[\u0600-\u06FF]/.test(markdown) ? "ar" : "en";
}

let logoBytes: Uint8Array | null = null;
let wordmarkBytes: Uint8Array | null = null;

async function loadLogo(): Promise<Uint8Array> {
  if (logoBytes) return logoBytes;
  logoBytes = new Uint8Array(await readFile(path.join(process.cwd(), "public/icon-192.png")));
  return logoBytes;
}

async function loadWordmark(): Promise<Uint8Array> {
  if (wordmarkBytes) return wordmarkBytes;
  wordmarkBytes = new Uint8Array(await readFile(path.join(process.cwd(), "public/brand/engineerit-wordmark.png")));
  return wordmarkBytes;
}

export async function prepareReport(input: ReportRequest): Promise<PreparedReport> {
  const locale = localeOf(input.locale, input.markdown);
  const now = input.now ?? new Date();
  const today = riyadhIsoDate(now);
  const blocks = parseMessage(input.markdown, today);
  const appendix = ganttAppendix(blocks, locale);
  if (appendix) {
    blocks.push({ type: "heading", level: 2, text: appendixHeading(locale) });
    blocks.push({ type: "table", headers: appendix.headers, rows: appendix.rows });
  }
  const images = new Map<number, ReportImage>();
  const dir = locale === "ar" ? "rtl" : "ltr";
  for (const block of blocks) {
    if (block.type === "chart") {
      const svg = block.model.kind === "gantt" ? ganttFitBands(block.model, dir === "rtl", 10000)[0] : asExportSvg(renderChartSvg(block.model, dir, "light"));
      const png = svgToPng(svg);
      const size = pngSize(png);
      images.set(block.index, { png, width: size.width, height: size.height });
      continue;
    }
    if (block.type !== "diagram") continue;
    const svg = flowSvg(block.source, dir);
    if (!svg) continue;
    const png = svgToPng(asExportSvg(svg));
    const size = pngSize(png);
    if (!size.width || !size.height) continue;
    images.set(block.index, { png, width: size.width, height: size.height });
  }
  for (const diagram of input.diagrams ?? []) {
    if (images.has(diagram.index) || !diagram.pngBase64) continue;
    const png = Buffer.from(diagram.pngBase64, "base64");
    if (png.length < 32) continue;
    const size = pngSize(png);
    if (!size.width || !size.height) continue;
    images.set(diagram.index, { png, width: size.width, height: size.height });
  }
  const heading = input.markdown.match(/^#{1,6}\s+(.+)$/m)?.[1];
  const picked = pickTopicSource(input.title, input.prompt, heading);
  const raw = plainTopic(picked, locale) || picked;
  const zone = reportTimeZone(input.timeZone);
  const coverDate = formatCoverDate(now, locale, zone);
  const coverTime = formatCoverTime(now, locale, zone);
  return {
    title: shortTopic(raw, REPORT_LABEL[locale]),
    subtitle: (input.subtitle || coverSubtitle(raw, locale)).slice(0, 160),
    locale,
    stamp: `${coverDate}, ${coverTime}`,
    coverDate,
    coverTime,
    blocks,
    images,
    logo: await loadLogo(),
    wordmark: await loadWordmark(),
  };
}
