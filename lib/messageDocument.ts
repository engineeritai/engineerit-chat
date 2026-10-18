import { claimsDiagram, requestedCharts, sanitizeFlowchart, stepsFromMarkdown, flowchartFromSteps } from "@/lib/diagramReply";
import { coverSubtitle, pickTopicSource, shortTopic } from "@/lib/exportName";
import { riyadhIsoDate } from "@/lib/ksaTime";
import { scurveFromTable } from "@/lib/scurveFromTable";
import { inclusiveDays, parseChart, type ChartModel, type GanttModel } from "@/lib/scheduleModel";
import type { UiLocale } from "@/lib/ksaTime";

export type Inline =
  | { type: "text"; text: string; bold?: boolean }
  | { type: "link"; text: string; href: string };

export type ListItem = { text: string; orderedChildren: boolean; children: ListItem[] };

export type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: ListItem[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "chart"; model: ChartModel; index: number }
  | { type: "diagram"; source: string; index: number }
  | { type: "code"; text: string };

const ARABIC = /[\u0600-\u06FF]/;
const LATIN = /[A-Za-z]/;

export function blockDir(text: string, locale: UiLocale): "rtl" | "ltr" {
  const arabic = ARABIC.test(text);
  const latin = LATIN.test(text);
  if (arabic && !latin) return "rtl";
  if (latin && !arabic) return "ltr";
  return locale === "ar" ? "rtl" : "ltr";
}

export function tokenizeInline(input: string): Inline[] {
  const tokens: Inline[] = [];
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let cursor = 0;
  for (const match of input.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ type: "text", text: input.slice(cursor, index) });
    if (match[1] && match[2]) tokens.push({ type: "link", text: match[1], href: match[2] });
    else if (match[3]) tokens.push({ type: "text", text: match[3], bold: true });
    else if (match[4]) tokens.push({ type: "text", text: match[4] });
    cursor = index + match[0].length;
  }
  if (cursor < input.length) tokens.push({ type: "text", text: input.slice(cursor) });
  return tokens.length ? tokens : [{ type: "text", text: input }];
}

export function plainInline(input: string): string {
  return tokenizeInline(input).map((token) => token.text).join("");
}

function isAsciiArt(text: string): boolean {
  const marks = text.match(/[+\-|/\\│┌┐└┘├┤┬┴┼─v^]/g)?.length ?? 0;
  return marks > 12 && marks / Math.max(text.length, 1) > 0.05;
}

function asciiLabel(lines: string[]): string {
  return lines
    .map((line) => line.replace(/^\||\|$/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
}

/** Turn a vertical or horizontal box sketch into a mermaid flowchart. */
export function asciiToMermaid(source: string, dir: "ltr" | "rtl"): string | null {
  const nodes: string[] = [];
  let bucket: string[] = [];
  const flush = () => {
    const label = asciiLabel(bucket);
    bucket = [];
    if (label) nodes.push(label.replace(/"/g, "'"));
  };
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\+[-+=]+\+$/.test(line)) {
      flush();
      continue;
    }
    const cell = /^\|(.+)\|$/.exec(line);
    if (cell) {
      bucket.push(cell[1]);
      continue;
    }
  }
  flush();
  if (nodes.length < 2) return null;
  const vertical = /\n\s*v\s*\n/i.test(`\n${source}\n`) || !/-->|—>/.test(source);
  const kind = vertical ? "TD" : dir === "rtl" ? "RL" : "LR";
  const ids = nodes.map((_, index) => `n${index + 1}`);
  const declared = nodes.map((label, index) => `  ${ids[index]}["${label}"]`);
  const edges = ids.slice(1).map((id, index) => `  ${ids[index]} --> ${id}`);
  return `flowchart ${kind}\n${declared.join("\n")}\n${edges.join("\n")}`;
}

function readList(lines: string[], start: number): { ordered: boolean; items: ListItem[]; next: number } | null {
  const first = /^(\s*)([-*]|\d+[.)])\s+(.+)$/.exec(lines[start] || "");
  if (!first) return null;
  const base = first[1].length;
  const ordered = /\d/.test(first[2]);
  const items: ListItem[] = [];
  let i = start;
  while (i < lines.length) {
    if (!lines[i]?.trim()) {
      let next = i + 1;
      while (next < lines.length && !lines[next].trim()) next += 1;
      const peek = /^(\s*)([-*]|\d+[.)])\s+/.exec(lines[next] || "");
      if (!peek || peek[1].length < base) break;
      if (peek[1].length === base && /\d/.test(peek[2]) !== ordered) break;
      i = next;
      continue;
    }
    const match = /^(\s*)([-*]|\d+[.)])\s+(.+)$/.exec(lines[i] || "");
    if (!match) break;
    const pad = match[1].length;
    if (pad < base) break;
    if (pad > base) {
      const nested = readList(lines, i);
      if (!nested || !items.length) break;
      items[items.length - 1].orderedChildren = nested.ordered;
      items[items.length - 1].children.push(...nested.items);
      i = nested.next;
      continue;
    }
    if (/\d/.test(match[2]) !== ordered && items.length) break;
    items.push({ text: match[3].trim(), orderedChildren: false, children: [] });
    i += 1;
  }
  return items.length ? { ordered, items, next: i } : null;
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isDivider(line: string): boolean {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

export function parseMessage(markdown: string, today = riyadhIsoDate()): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  let i = 0;
  const pushParagraph = (buffer: string[]) => {
    const text = buffer.join(" ").replace(/\s+/g, " ").trim();
    buffer.length = 0;
    if (text) blocks.push({ type: "paragraph", text });
  };
  const paragraph: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    const fence = /^```([\w-]*)\s*$/.exec(line.trim());
    if (fence) {
      pushParagraph(paragraph);
      const lang = (fence[1] || "").toLowerCase();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      const source = body.join("\n").trim();
      if (!source) continue;
      const chart = parseChart(lang || "mermaid", source, today);
      if (chart) {
        blocks.push({ type: "chart", model: chart, index });
        index += 1;
        continue;
      }
      if (lang !== "mermaid" && isAsciiArt(source)) {
        const mermaid = asciiToMermaid(source, "ltr");
        if (mermaid) {
          blocks.push({ type: "diagram", source: mermaid, index });
          index += 1;
        }
        continue;
      }
      if (lang === "mermaid") {
        blocks.push({ type: "diagram", source, index });
        index += 1;
        continue;
      }
      blocks.push({ type: "code", text: source });
      continue;
    }
    if (!line.trim()) {
      pushParagraph(paragraph);
      i += 1;
      continue;
    }
    if (/^\+[-+=]+\+$/.test(line.trim()) || isAsciiArt(line)) {
      pushParagraph(paragraph);
      const art: string[] = [];
      while (i < lines.length && (lines[i].trim() && (isAsciiArt(lines[i]) || /^\+[-+=]+\+$/.test(lines[i].trim()) || /^\|/.test(lines[i].trim()) || /^[vV|^]$/.test(lines[i].trim())))) {
        art.push(lines[i]);
        i += 1;
      }
      const mermaid = asciiToMermaid(art.join("\n"), "ltr");
      if (mermaid) {
        blocks.push({ type: "diagram", source: mermaid, index });
        index += 1;
      }
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (heading) {
      pushParagraph(paragraph);
      const level = heading[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({ type: "heading", level, text: heading[2].trim() });
      i += 1;
      continue;
    }
    if (line.includes("|") && i + 1 < lines.length && isDivider(lines[i + 1])) {
      pushParagraph(paragraph);
      const headers = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        const row = splitRow(lines[i]);
        rows.push(headers.map((_, cell) => row[cell] ?? ""));
        i += 1;
      }
      if (headers.length) blocks.push({ type: "table", headers, rows });
      continue;
    }
    if (/^(\s*)([-*]|\d+[.)])\s+/.test(line)) {
      pushParagraph(paragraph);
      const list = readList(lines, i);
      if (list) {
        blocks.push({ type: "list", ordered: list.ordered, items: list.items });
        i = list.next;
        continue;
      }
    }
    paragraph.push(line.trim());
    i += 1;
  }
  pushParagraph(paragraph);
  return withDiagramFallback(withScurveFallback(blocks), markdown);
}

function withDiagramFallback(blocks: Block[], markdown: string): Block[] {
  let chartIndex = blocks.reduce(
    (max, block) => (block.type === "chart" || block.type === "diagram" ? Math.max(max, block.index + 1) : max),
    0
  );
  const next = blocks.map((block) => {
    if (block.type !== "diagram") return block;
    const clean = sanitizeFlowchart(block.source);
    return clean ? { ...block, source: clean } : block;
  });
  if (next.some((block) => block.type === "diagram")) return next;
  if (!claimsDiagram(markdown)) return next;
  const ask = requestedCharts(markdown);
  if (ask.gantt || (ask.scurve && !ask.flowchart)) return next;
  if (next.some((block) => block.type === "chart" && (block.model.kind === "gantt" || block.model.kind === "scurve"))) return next;
  const steps = stepsFromMarkdown(markdown);
  if (steps.length < 2) return next;
  next.push({ type: "diagram", source: flowchartFromSteps(steps), index: chartIndex });
  return next;
}

function withScurveFallback(blocks: Block[]): Block[] {
  if (blocks.some((block) => block.type === "chart" && block.model.kind === "scurve")) return blocks;
  const title = blocks.find((block) => block.type === "heading" && /s-?\s*curve|progress curve|منحنى/i.test(block.text));
  const heading = title && title.type === "heading" ? title.text : "S-curve";
  let chartIndex = blocks.reduce((max, block) => (block.type === "chart" || block.type === "diagram" ? Math.max(max, block.index + 1) : max), 0);
  const next: Block[] = [];
  let added = false;
  for (const block of blocks) {
    next.push(block);
    if (added || block.type !== "table") continue;
    const model = scurveFromTable(block.headers, block.rows, heading);
    if (!model) continue;
    next.push({ type: "chart", model, index: chartIndex });
    chartIndex += 1;
    added = true;
  }
  return next;
}

export function ganttAppendix(blocks: Block[], locale: UiLocale): { headers: string[]; rows: string[][] } | null {
  const tasks = blocks.flatMap((block) => (block.type === "chart" && block.model.kind === "gantt" ? block.model.tasks : []));
  if (!tasks.length) return null;
  const headers = locale === "ar"
    ? ["المهمة", "البداية", "النهاية", "المدة (يوم)", "نسبة الإنجاز"]
    : ["Task", "Start", "End", "Duration (days)", "% complete"];
  const rows = tasks.map((task: GanttModel["tasks"][number]) => [
    task.name,
    task.start,
    task.end,
    String(inclusiveDays(task.start, task.end)),
    task.milestone ? "100" : String(task.progress),
  ]);
  return { headers, rows };
}

export function exportMeta(markdown: string, requested: string | undefined, locale: UiLocale, prompt?: string) {
  const heading = markdown.match(/^#{1,6}\s+(.+)$/m)?.[1]?.trim();
  const source = pickTopicSource(requested, prompt, heading);
  const fallback = locale === "ar" ? "تقرير هندسي" : "Engineering report";
  return {
    source,
    title: shortTopic(source, fallback),
    subtitle: coverSubtitle(source, locale),
  };
}

export function topicFrom(markdown: string, requested: string | undefined, locale: UiLocale, prompt?: string): string {
  return exportMeta(markdown, requested, locale, prompt).title;
}

export function subtitleFor(source: string | undefined, locale: UiLocale): string {
  return coverSubtitle(source, locale);
}

export function appendixHeading(locale: UiLocale): string {
  return locale === "ar" ? "ملحق بيانات الجدول الزمني" : "Schedule data";
}
