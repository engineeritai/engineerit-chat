import { readFile } from "node:fs/promises";
import path from "node:path";
import { riyadhIsoDate, riyadhStamp, type UiLocale } from "@/lib/ksaTime";
import { coverSubtitle, pickTopicSource, shortTopic } from "@/lib/exportName";
import { appendixHeading, ganttAppendix, parseMessage, type Block } from "@/lib/messageDocument";
import { pngSize, svgToPng } from "@/lib/rasterSvg";
import { renderChartSvg } from "@/lib/scheduleSvg";

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
  blocks: Block[];
  images: Map<number, ReportImage>;
  /** Small eit mark for header and footer corners. */
  logo: Uint8Array;
  /** Official cover wordmark. Drawn as-is; do not recolor or stretch. */
  wordmark: Uint8Array;
};

export const REPORT_FOOTER_LINE = "engineerit.ai · support@engineerit.ai";

export type ReportRequest = {
  title?: string;
  subtitle?: string;
  prompt?: string;
  markdown: string;
  locale?: string;
  now?: Date;
  diagrams?: { index: number; pngBase64: string }[];
};

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
  for (const block of blocks) {
    if (block.type !== "chart") continue;
    const svg = renderChartSvg(block.model, locale === "ar" ? "rtl" : "ltr", "light");
    const png = svgToPng(svg);
    const size = pngSize(png);
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
  const raw = pickTopicSource(input.title, input.prompt, heading);
  return {
    title: shortTopic(raw, locale === "ar" ? "تقرير هندسي" : "Engineering report"),
    subtitle: (input.subtitle || coverSubtitle(raw, locale)).slice(0, 160),
    locale,
    stamp: riyadhStamp(now, locale),
    blocks,
    images,
    logo: await loadLogo(),
    wordmark: await loadWordmark(),
  };
}
