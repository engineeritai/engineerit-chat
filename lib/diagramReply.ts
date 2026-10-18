/** Detect diagram requests, repair mermaid flowcharts, and never leave a claimed diagram blank. */

import { riyadhIsoDate } from "@/lib/ksaTime";
import { parseGantt } from "@/lib/scheduleModel";

const GANTT_ASK =
  /gantt|gannt|مخطط\s*جانت|جدول\s*زمني|\btimeline\b|\bschedule\b|bar\s*chart\s+(?:for|of)\s+activit/i;

const SCURVE_ASK = /s-?\s*curve|scurve|منحنى|progress\s+curve|cumulative\s+progress/i;

const FLOW_ASK =
  /(?:\b(?:diagram|flowchart|flow\s*chart|process\s*flow|workflow|draw)\b|put it in diagram|ارسم|رسم تخطيطي|مخطط)/i;

const CLAIM =
  /(?:\b(?:diagram|flowchart|flow\s*chart|visual representation)\b|flowchart format|رسم تخطيطي|مخطط انسيابي|مخطط سير|هذا المخطط|المخطط التالي)/i;

export type ChartRequest = { gantt: boolean; scurve: boolean; flowchart: boolean };

/** Gantt and S-curve win over a flowchart. A bare مخطط is a flowchart; مخطط جانت is a Gantt. */
export function requestedCharts(text: string): ChartRequest {
  const source = text || "";
  const gantt = GANTT_ASK.test(source);
  const scurve = SCURVE_ASK.test(source);
  const flowchart = FLOW_ASK.test(source) && !gantt;
  return { gantt, scurve, flowchart };
}

export function asksForDiagram(text: string): boolean {
  return requestedCharts(text).flowchart;
}

export function claimsDiagram(text: string): boolean {
  return CLAIM.test(text || "");
}

export function mermaidFence(text: string): { source: string; start: number; end: number } | null {
  const match = /```mermaid\s*\n([\s\S]*?)```/i.exec(text || "");
  if (!match || match.index == null) return null;
  return { source: match[1].trim(), start: match.index, end: match.index + match[0].length };
}

function escapeLabel(label: string): string {
  return label
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/"/g, "'")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[:：]\s*$/u, "")
    .slice(0, 80);
}

type Shape = { id: string; label: string; start: number; end: number };

function extractShapes(line: string): Shape[] {
  const shapes: Shape[] = [];
  const re = /([A-Za-z_][\w]*)\s*(\[|\(|\{)/g;
  let cursor = 0;
  while (cursor < line.length) {
    re.lastIndex = cursor;
    const match = re.exec(line);
    if (!match || match.index == null) break;
    const id = match[1];
    const open = match[2];
    const from = match.index + match[0].length;
    const close = open === "[" ? "]" : open === "(" ? ")" : "}";
    let depth = 1;
    let end = from;
    while (end < line.length && depth > 0) {
      if (line[end] === open) depth += 1;
      else if (line[end] === close) depth -= 1;
      if (depth > 0) end += 1;
    }
    if (depth !== 0) {
      cursor = from;
      continue;
    }
    let label = line.slice(from, end).trim();
    if ((label.startsWith('"') && label.endsWith('"')) || (label.startsWith("'") && label.endsWith("'"))) {
      label = label.slice(1, -1);
    }
    shapes.push({ id, label: escapeLabel(label || id), start: match.index, end: end + 1 });
    cursor = end + 1;
  }
  return shapes;
}

function stripShapes(line: string): string {
  const shapes = extractShapes(line).sort((a, b) => b.start - a.start);
  let next = line;
  for (const shape of shapes) next = next.slice(0, shape.start) + shape.id + next.slice(shape.end);
  return next;
}

function extractEdges(line: string): { from: string; to: string }[] {
  const edges: { from: string; to: string }[] = [];
  const re = /([A-Za-z_][\w]*)\s*(?:-->|---|-\.->|==>)\s*(?:\|[^|]*\|\s*)?([A-Za-z_][\w]*)/g;
  for (const match of line.matchAll(re)) edges.push({ from: match[1], to: match[2] });
  return edges;
}

/** Quote labels and run process flows top to bottom so they fit the message column. */
export function sanitizeFlowchart(source: string): string | null {
  if (!/flowchart|\bgraph\b/i.test(source || "")) return null;
  const nodes = new Map<string, string>();
  const order: string[] = [];
  const edges: { from: string; to: string }[] = [];
  const add = (id: string, label?: string) => {
    const clean = label ? escapeLabel(label) : "";
    if (!nodes.has(id)) {
      nodes.set(id, clean || id);
      order.push(id);
      return;
    }
    if (clean && nodes.get(id) === id) nodes.set(id, clean);
  };
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("%%") || /^flowchart\b/i.test(line) || /^graph\b/i.test(line)) continue;
    if (/^(subgraph|end|direction|classDef|class|style|click)\b/i.test(line)) continue;
    for (const shape of extractShapes(line)) add(shape.id, shape.label);
    for (const edge of extractEdges(stripShapes(line))) {
      add(edge.from);
      add(edge.to);
      edges.push(edge);
    }
  }
  if (order.length < 2) return null;
  const lines = ["flowchart TD"];
  for (const id of order) lines.push(`  ${id}["${nodes.get(id) || id}"]`);
  const seen = new Set<string>();
  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}`;
    if (seen.has(key) || edge.from === edge.to) continue;
    seen.add(key);
    lines.push(`  ${edge.from} --> ${edge.to}`);
  }
  if (seen.size === 0) {
    for (let index = 1; index < order.length; index += 1) lines.push(`  ${order[index - 1]} --> ${order[index]}`);
  }
  return lines.join("\n");
}

export function hasRenderableFlow(text: string): boolean {
  const fence = mermaidFence(text);
  return Boolean(fence && sanitizeFlowchart(fence.source));
}

export function stepsFromMarkdown(markdown: string): string[] {
  const steps: string[] = [];
  const plain = (value: string) =>
    value
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  for (const line of (markdown || "").split("\n")) {
    if (/^\s{2,}(?:[-*]|\d+[.)])\s+/.test(line)) continue;
    const item = /^\s*(?:[-*]|\d+[.)])\s+(.+)$/.exec(line);
    if (!item) continue;
    const text = plain(item[1]);
    if (text.length < 2) continue;
    const clean = escapeLabel(text);
    if (clean.length < 2) continue;
    steps.push(clean.length > 72 ? `${clean.slice(0, 71)}…` : clean);
    if (steps.length >= 10) return steps;
  }
  if (steps.length >= 2) return steps;
  const heads: string[] = [];
  for (const line of (markdown || "").split("\n")) {
    const heading = /^#{2,3}\s+(.+)$/.exec(line.trim());
    if (!heading) continue;
    const text = plain(heading[1]);
    if (!text || claimsDiagram(text)) continue;
    const clean = escapeLabel(text);
    if (clean.length < 2 || claimsDiagram(clean)) continue;
    heads.push(clean.length > 72 ? `${clean.slice(0, 71)}…` : clean);
  }
  return heads.length >= 2 ? heads.slice(0, 10) : steps;
}

function topicSteps(text: string): string[] {
  const source = text || "";
  if (/[\u0600-\u06FF]/.test(source)) {
    const sentence =
      source
        .split(/[\n.؟?]/)
        .map((part) => part.trim())
        .find((part) => /ارسم|مخطط|رسم/.test(part)) || source;
    const topic = sentence
      .replace(/ارسم|رسم تخطيطي|مخطط|عملية|وحدة|ثم|اعرض|أعرض|منحنى/g, " ")
      .replace(/[^\u0600-\u06FF\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
    return ["التغذية", topic.length >= 3 ? topic : "المعالجة", "المفاعل", "الفصل", "المنتجات"];
  }
  const of = /(?:\bof|\bfor)\s+([^.:\n]+)/i.exec(source);
  const topic = (of?.[1] || "")
    .replace(/\bthen\b[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (topic.length < 3) return [];
  return [`Feed to ${topic}`, "Reactor", "Separator", "Products"];
}

export function flowchartFromSteps(steps: string[]): string {
  const lines = ["flowchart TD"];
  steps.forEach((step, index) => {
    lines.push(`  n${index + 1}["${escapeLabel(step)}"]`);
  });
  for (let index = 1; index < steps.length; index += 1) lines.push(`  n${index} --> n${index + 1}`);
  return lines.join("\n");
}

function replaceFence(text: string, fence: { start: number; end: number }, source: string) {
  return `${text.slice(0, fence.start)}\`\`\`mermaid\n${source}\n\`\`\`${text.slice(fence.end)}`;
}

function stripFlowFences(text: string): string {
  return text.replace(/```mermaid\s*\n[\s\S]*?```/gi, (block) => (/flowchart|\bgraph\b/i.test(block) ? "" : block)).trim();
}

function addIsoDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year || 1970, (month || 1) - 1, (day || 1) + days));
  return date.toISOString().slice(0, 10);
}

function ganttTitle(userText: string): string {
  const arabic = /[\u0600-\u06FF]/.test(userText);
  if (/shutdown|إيقاف|اغلاق|إغلاق|توقف/i.test(userText)) return arabic ? "إيقاف المحطة" : "Plant shutdown";
  return arabic ? "الجدول الزمني" : "Schedule";
}

function defaultGanttSteps(userText: string): string[] {
  if (/[\u0600-\u06FF]/.test(userText)) return ["التحضير", "الإيقاف", "ما بعد الإيقاف"];
  return ["Preparation", "Shutdown", "Post-shutdown"];
}

/** Tasks, durations, and finish-to-start links. The first bar starts on today. */
export function ganttFromSteps(steps: string[], userText: string, today = riyadhIsoDate()): string {
  const names = (steps.length >= 2 ? steps : defaultGanttSteps(userText)).map((step) => escapeLabel(step)).filter((step) => step.length >= 2).slice(0, 8);
  const title = ganttTitle(userText);
  const lines = ["gantt", `    title ${title}`, "    dateFormat YYYY-MM-DD", `    today ${today}`];
  names.forEach((name, index) => {
    const id = `t${index + 1}`;
    const days = 4 + (index % 3);
    const critical = /^(shutdown|الإيقاف)$/i.test(name) ? "crit, " : "";
    if (index === 0) lines.push(`    ${name} :${critical}${id}, ${today}, ${days}d`);
    else lines.push(`    ${name} :${critical}${id}, after t${index}, ${days}d`);
  });
  return lines.join("\n");
}

export function hasRenderableGantt(text: string): boolean {
  const fence = mermaidFence(text);
  return Boolean(fence && parseGantt(fence.source, riyadhIsoDate()));
}

export function ensureGanttMarkdown(markdown: string, userText: string, today = riyadhIsoDate()): string {
  const kept = stripFlowFences(markdown || "");
  if (hasRenderableGantt(kept)) return kept;
  const names = stepsFromMarkdown(kept);
  const source = ganttFromSteps(names, userText, today);
  return `${kept.trim()}\n\n\`\`\`mermaid\n${source}\n\`\`\`\n`;
}

export function hasRenderableScurve(text: string): boolean {
  return /```scurve\b/i.test(text || "");
}

export function ensureScurveMarkdown(markdown: string, userText: string): string {
  const keepFlow = requestedCharts(userText).flowchart;
  let text = markdown || "";
  if (!keepFlow) text = stripFlowFences(text);
  if (hasRenderableScurve(text)) return text;
  const names = stepsFromMarkdown(text).map((step) => escapeLabel(step)).filter((step) => step.length >= 2).slice(0, 6);
  const labels = names.length >= 2 ? names : ["Start", "Wk1", "Wk2", "Wk3", "Wk4"];
  const lines = ["title S-curve", ...labels.map((label, index) => {
    const planned = Math.round((index / Math.max(labels.length - 1, 1)) * 100);
    return `${label} | ${planned} | `;
  })];
  return `${text.trim()}\n\n\`\`\`scurve\n${lines.join("\n")}\n\`\`\`\n`;
}

/**
 * Apply the requested chart and refuse a flowchart when the user asked for a Gantt or an S-curve.
 */
export function ensureReplyCharts(markdown: string, userText: string, prior = ""): string {
  const ask = requestedCharts(userText);
  let next = markdown || "";
  if (ask.gantt) next = ensureGanttMarkdown(next, userText);
  else if (ask.flowchart) next = ensureDiagramMarkdown(next, `${prior}\n${userText}`, true);
  else next = ensureDiagramMarkdown(next, prior, false);
  if (ask.scurve) next = ensureScurveMarkdown(next, userText);
  return next;
}

/**
 * Keep a valid flowchart, repair a broken one, or append a top-down flowchart
 * when the user asked for a diagram or the reply claims one.
 * A Gantt or S-curve request never receives this flowchart.
 */
export function ensureDiagramMarkdown(markdown: string, context = "", force = false): string {
  const ask = requestedCharts(context);
  if (ask.gantt && !ask.flowchart) return ensureGanttMarkdown(markdown, context);
  if (ask.scurve && !ask.flowchart && !force) return ensureScurveMarkdown(markdown, context);
  const text = markdown || "";
  const fence = mermaidFence(text);
  if (fence && /flowchart|\bgraph\b/i.test(fence.source)) {
    const clean = sanitizeFlowchart(fence.source);
    if (clean) return replaceFence(text, fence, clean);
  } else if (fence && !force && !asksForDiagram(context)) {
    return text;
  }
  const wanted = force || asksForDiagram(text) || asksForDiagram(context) || claimsDiagram(text);
  if (!wanted) return text;
  const own = stepsFromMarkdown(text);
  const fromContext = stepsFromMarkdown(context);
  const steps = own.length >= 2 ? own : fromContext.length >= 2 ? fromContext : topicSteps(`${context}\n${text}`);
  if (steps.length < 2) return text;
  const withoutBroken = fence ? `${text.slice(0, fence.start)}${text.slice(fence.end)}`.trim() : text.trim();
  return `${withoutBroken}\n\n\`\`\`mermaid\n${flowchartFromSteps(steps)}\n\`\`\`\n`;
}

export function diagramRetryNeeded(reply: string, userText: string): boolean {
  return asksForDiagram(userText) && !hasRenderableFlow(reply);
}

export const stageGateReplyEn = `Here's a visual representation of the Project Stage-Gate Workflow in a flowchart format.

## Project Stage-Gate Workflow Diagram

1. Identify the opportunity
2. Feasibility and concept select
3. Define the scope and basis
4. Execute the project
5. Start up and handover
6. Operate and close`;

export const stageGateReplyAr = `هذه صورة بصرية لسير عمل بوابات المرحلة في شكل مخطط انسيابي.

## مخطط سير بوابات المرحلة

1. تحديد الفرصة
2. الجدوى واختيار المفهوم
3. تحديد النطاق والأساس
4. تنفيذ المشروع
5. البدء والتسليم
6. التشغيل والإغلاق`;

export const hydroReplyEn = `## Hydrocracker (HCK) Plant Process Diagram

\`\`\`mermaid
flowchart LR
  Feed[Feedstock (Vacuum Gas Oil)] --> Reactor[Hydrocracker Reactor]
  Reactor --> Separator[HP Separator & Recycle]
  Separator --> Fractionator[Fractionator]
  Fractionator --> Naphtha[Naphtha]
  Fractionator --> Diesel[Diesel]
  Fractionator --> Unconverted[Unconverted oil]
\`\`\`
`;

export const hydroReplyAr = `## مخطط عملية وحدة التكسير الهيدروجيني

\`\`\`mermaid
flowchart RL
  Feed[لقيم (زيت الغاز الفراغي)] --> Reactor[مفاعل التكسير]
  Reactor --> Separator[فاصل الضغط العالي وإعادة التدوير]
  Separator --> Fractionator[برج الفصل]
  Fractionator --> Naphtha[نافثا]
  Fractionator --> Diesel[ديزل]
  Fractionator --> Unconverted[زيت غير محول]
\`\`\`
`;
