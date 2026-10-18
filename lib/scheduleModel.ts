export type GanttTask = {
  id: string;
  name: string;
  group: string;
  start: string;
  end: string;
  milestone: boolean;
  critical: boolean;
  progress: number;
  dependsOn?: string;
};

export type GanttModel = {
  kind: "gantt";
  title: string;
  today: string;
  tasks: GanttTask[];
};

export type TimelineModel = {
  kind: "timeline";
  title: string;
  items: { date: string; label: string }[];
};

export type SeriesModel = {
  kind: "scurve" | "histogram" | "line" | "area" | "bar" | "pie";
  title: string;
  points: { label: string; planned: number; actual: number | null }[];
  seriesNames?: string[];
};

export type ChartModel = GanttModel | TimelineModel | SeriesModel;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIso(value: string): number | null {
  const match = ISO.exec(value.trim());
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatIso(ms: number): string {
  const date = new Date(ms);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

function addDays(ms: number, days: number): number {
  return ms + days * 86_400_000;
}

function durationDays(token: string): number | null {
  const match = /^(\d+)(d|w|m)$/i.exec(token.trim());
  if (!match) return null;
  const count = Number(match[1]);
  if (match[2].toLowerCase() === "w") return count * 7;
  if (match[2].toLowerCase() === "m") return count * 30;
  return count;
}

type Draft = {
  name: string;
  group: string;
  id: string;
  critical: boolean;
  milestone: boolean;
  progress: number;
  dates: string[];
  duration: number | null;
  after: string;
};

function parseTask(line: string, group: string): Draft | null {
  const colon = line.lastIndexOf(":");
  if (colon <= 0) return null;
  const name = line.slice(0, colon).trim();
  const spec = line.slice(colon + 1).trim();
  if (!name || !spec) return null;
  const draft: Draft = {
    name,
    group,
    id: "",
    critical: false,
    milestone: false,
    progress: 0,
    dates: [],
    duration: null,
    after: "",
  };
  for (const part of spec.split(",").map((item) => item.trim()).filter(Boolean)) {
    const lower = part.toLowerCase();
    if (lower === "crit" || lower === "critical") {
      draft.critical = true;
      continue;
    }
    if (lower === "done") {
      draft.progress = 100;
      continue;
    }
    if (lower === "active") {
      if (!draft.progress) draft.progress = 50;
      continue;
    }
    if (lower === "milestone") {
      draft.milestone = true;
      continue;
    }
    const percent = /^(\d{1,3})%$/.exec(lower);
    if (percent) {
      draft.progress = Math.min(100, Number(percent[1]));
      continue;
    }
    if (ISO.test(part)) {
      draft.dates.push(part);
      continue;
    }
    const days = durationDays(part);
    if (days != null) {
      draft.duration = days;
      continue;
    }
    const after = /^after\s+([A-Za-z][\w-]*)$/i.exec(part);
    if (after) {
      draft.after = after[1];
      continue;
    }
    if (!draft.id && /^[A-Za-z][\w-]*$/.test(part)) draft.id = part;
  }
  return draft;
}

export function parseGantt(source: string, today: string): GanttModel | null {
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  let title = "Schedule";
  let group = "";
  const drafts: Draft[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower === "gantt" || lower.startsWith("dateformat") || lower.startsWith("axisformat") || lower.startsWith("excludes") || lower.startsWith("todaymarker")) {
      continue;
    }
    if (lower.startsWith("title ")) {
      title = line.slice(6).trim() || title;
      continue;
    }
    if (lower.startsWith("section ")) {
      group = line.slice(8).trim() || group;
      continue;
    }
    if (lower.startsWith("today ")) {
      const date = line.slice(6).trim();
      if (ISO.test(date)) today = date;
      continue;
    }
    const draft = parseTask(line, group);
    if (draft) drafts.push(draft);
  }
  const byId = new Map<string, { start: number; end: number }>();
  const tasks: GanttTask[] = [];
  let previousEnd: number | null = null;
  drafts.forEach((draft, index) => {
    let startMs: number | null = draft.dates[0] ? parseIso(draft.dates[0]) : null;
    if (startMs == null && draft.after && byId.has(draft.after)) startMs = addDays(byId.get(draft.after)!.end, 1);
    if (startMs == null && previousEnd != null) startMs = addDays(previousEnd, 1);
    if (startMs == null) return;
    let endMs: number | null = draft.dates[1] ? parseIso(draft.dates[1]) : null;
    if (endMs == null && draft.duration != null) endMs = addDays(startMs, Math.max(draft.duration - 1, 0));
    if (endMs == null) endMs = startMs;
    if (endMs < startMs) {
      const swap = startMs;
      startMs = endMs;
      endMs = swap;
    }
    const milestone = draft.milestone || draft.duration === 0;
    if (milestone) endMs = startMs;
    const id = draft.id || `t${index + 1}`;
    byId.set(id, { start: startMs, end: endMs });
    previousEnd = endMs;
    tasks.push({
      id,
      name: draft.name,
      group: draft.group,
      start: formatIso(startMs),
      end: formatIso(endMs),
      milestone,
      critical: draft.critical,
      progress: milestone ? 100 : draft.progress,
      dependsOn: draft.after || undefined,
    });
  });
  if (!tasks.length) return null;
  return { kind: "gantt", title, today, tasks };
}

export function parseTimeline(source: string): TimelineModel | null {
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let title = "Timeline";
  let section = "";
  const items: { date: string; label: string }[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower === "timeline") continue;
    if (lower.startsWith("title ")) {
      title = line.slice(6).trim() || title;
      continue;
    }
    if (lower.startsWith("section ")) {
      section = line.slice(8).trim();
      continue;
    }
    const match = /^(.+?)\s*:\s*(.+)$/.exec(line);
    if (!match) continue;
    const left = match[1].trim();
    const right = match[2].trim();
    if (/^\d{4}/.test(right) && !/^\d{4}/.test(left)) {
      items.push({ date: right, label: section ? `${section} · ${left}` : left });
    } else {
      items.push({ date: section ? `${section} ${left}`.trim() : left, label: right });
    }
  }
  if (items.length < 2) return null;
  return { kind: "timeline", title, items };
}

function unquote(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "").trim();
}

function contentLines(source: string): string[] {
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines[0] !== "---") return lines;
  const end = lines.indexOf("---", 1);
  return end === -1 ? lines : lines.slice(end + 1);
}

function bracketList(line: string): string[] | null {
  const match = /\[([^\]]*)\]/.exec(line);
  if (!match) return null;
  return match[1].split(",").map((part) => unquote(part)).filter(Boolean);
}

function seriesTitle(line: string): string {
  return /["']([^"']+)["']/.exec(line)?.[1]?.trim() || "";
}

function parseXy(lines: string[]): SeriesModel | null {
  let title = "Chart";
  let labels: string[] = [];
  const series: { name: string; values: number[]; bar: boolean }[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("xychart")) continue;
    if (lower.startsWith("title ")) {
      title = unquote(line.slice(6)) || title;
      continue;
    }
    if (lower.startsWith("x-axis")) {
      labels = bracketList(line) || labels;
      continue;
    }
    if (lower.startsWith("y-axis")) continue;
    if (!/^(line|bar|area)\b/i.test(line)) continue;
    const values = (bracketList(line) || []).map(Number).filter((value) => Number.isFinite(value));
    if (values.length < 2) continue;
    series.push({ name: seriesTitle(line) || (lower.startsWith("bar") ? "Bar" : "Value"), values, bar: lower.startsWith("bar") });
  }
  const drawn = series.filter((item) => !item.bar);
  const chosen = drawn.length ? drawn : series;
  if (!chosen.length) return null;
  const count = Math.max(...chosen.map((item) => item.values.length));
  if (!labels.length) labels = Array.from({ length: count }, (_, index) => String(index + 1));
  while (labels.length < count) labels.push(String(labels.length + 1));
  const names = chosen.map((item) => item.name.toLowerCase());
  const paired = chosen.length >= 2 && ((/plan|مخطط/.test(names[0]) && /actual|فعلي/.test(names[1])) || /s-?curve|منحنى/.test(title));
  const kind: SeriesModel["kind"] = paired ? "scurve" : chosen[0].bar && !drawn.length ? "bar" : "line";
  const points = labels.slice(0, count).map((label, index) => ({
    label,
    planned: chosen[0].values[index] ?? 0,
    actual: chosen[1] ? chosen[1].values[index] ?? null : null,
  }));
  return points.length >= 2 ? { kind, title, points, seriesNames: chosen.map((item) => item.name) } : null;
}

function parsePie(lines: string[]): SeriesModel | null {
  let title = "Pie";
  const points: SeriesModel["points"] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower === "showdata") continue;
    if (lower.startsWith("pie")) {
      const inline = /title\s+(.+)$/i.exec(line);
      if (inline) title = unquote(inline[1]) || title;
      continue;
    }
    if (lower.startsWith("title ")) {
      title = unquote(line.slice(6)) || title;
      continue;
    }
    const match = /^(?:"([^"]+)"|'([^']+)'|([^:|]+))\s*[:|]\s*(-?[0-9]+(?:\.[0-9]+)?)\s*$/.exec(line);
    if (!match) continue;
    const label = (match[1] || match[2] || match[3] || "").trim();
    const value = Number(match[4]);
    if (!label || !Number.isFinite(value)) continue;
    points.push({ label, planned: value, actual: null });
  }
  return points.length >= 2 ? { kind: "pie", title, points } : null;
}

export function parseSeries(kind: SeriesModel["kind"], source: string): SeriesModel | null {
  const lines = contentLines(source);
  const fallback = kind === "histogram" || kind === "bar" ? "Resources" : kind === "pie" ? "Pie" : kind === "scurve" ? "S-curve" : "Chart";
  let title = fallback;
  const points: SeriesModel["points"] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower === kind || lower === "xychart-beta" || lower === "---" || lower === "showdata") continue;
    if (lower.startsWith("title ")) {
      title = unquote(line.replace(/^title\s+/i, "")) || title;
      continue;
    }
    if (/^(period|label|month|x-axis|y-axis)\b/i.test(line)) continue;
    const parts = line.split(/[|,]/).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const planned = Number(parts[1].replace(/%$/, ""));
    if (!Number.isFinite(planned)) continue;
    const actualRaw = parts[2];
    const actual = actualRaw == null || actualRaw === "" ? null : Number(actualRaw.replace(/%$/, ""));
    points.push({
      label: parts[0],
      planned,
      actual: actual != null && Number.isFinite(actual) ? actual : null,
    });
  }
  if (points.length < 2) return null;
  if (kind === "scurve" && !points.some((point, index) => index > 0 && point.actual != null)) {
    for (const point of points) point.actual = null;
  }
  const names = kind === "pie" || points.every((point) => point.actual == null) ? [title] : ["Planned", "Actual"];
  return { kind, title, points, seriesNames: names };
}

export function parseChart(lang: string, source: string, today: string): ChartModel | null {
  const key = lang.toLowerCase();
  const lines = contentLines(source);
  const first = (lines[0] || "").toLowerCase();
  if (key !== "gantt" && key !== "timeline" && (first.startsWith("xychart") || key === "xychart")) {
    const chart = parseXy(lines);
    if (chart) return chart;
  }
  if (key !== "gantt" && key !== "timeline" && (first.startsWith("pie") || key === "pie")) {
    const chart = parsePie(lines) || parseSeries("pie", source);
    if (chart) return chart;
  }
  if (key === "gantt") return parseGantt(source, today);
  if (key === "timeline") return parseTimeline(source);
  if (key === "scurve" || key === "line" || key === "area") return parseSeries(key, source);
  if (key === "histogram") return parseSeries("histogram", source);
  if (key === "bar") return parseSeries("bar", source);
  if (key !== "mermaid" && key !== "chart" && key !== "") return null;
  const body = source.toLowerCase();
  if (/^\s*gantt\b/m.test(body) || body.includes("\ngantt")) return parseGantt(source, today);
  if (/^\s*timeline\b/m.test(body)) return parseTimeline(source);
  return null;
}

export function inclusiveDays(start: string, end: string): number {
  const a = parseIso(start);
  const b = parseIso(end);
  if (a == null || b == null) return 1;
  return Math.round((b - a) / 86_400_000) + 1;
}
