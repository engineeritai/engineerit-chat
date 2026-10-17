import { containsArabic } from "@/lib/arabicShape";
import { parseIso, type ChartModel, type GanttModel, type SeriesModel, type TimelineModel } from "@/lib/scheduleModel";

export type ChartTheme = "light" | "dark";

const palette = {
  light: {
    bg: "#ffffff",
    ink: "#0f172a",
    muted: "#64748b",
    grid: "#e2e8f0",
    month: "#cbd5e1",
    group: "#f1f5f9",
    bar: "#1a56ff",
    barDone: "#1239b8",
    crit: "#c2410c",
    critDone: "#9a3412",
    card: "#ffffff",
    line: "#1a56ff",
    actual: "#0f766e",
  },
  dark: {
    bg: "#0b1220",
    ink: "#e2e8f0",
    muted: "#94a3b8",
    grid: "#334155",
    month: "#475569",
    group: "#1e293b",
    bar: "#60a5fa",
    barDone: "#1d4ed8",
    crit: "#fb923c",
    critDone: "#c2410c",
    card: "#111827",
    line: "#60a5fa",
    actual: "#2dd4bf",
  },
} as const;

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clip(value: string, max: number): string {
  const chars = [...value];
  if (chars.length <= max) return value;
  return `${chars.slice(0, max - 1).join("")}…`;
}

function svgOpen(width: number, height: number, theme: ChartTheme): string {
  const colors = palette[theme];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
<rect width="${width}" height="${height}" fill="${colors.bg}"/>
<style>
text { font-family: "Noto Sans Arabic", Inter, sans-serif; }
</style>`;
}

function text(x: number, y: number, value: string, opts: { size?: number; fill?: string; anchor?: "start" | "end" | "middle"; weight?: number; rtl?: boolean }) {
  const anchor = opts.anchor ?? (opts.rtl ? "end" : "start");
  const arabic = opts.rtl || containsArabic(value);
  const direction = arabic ? ` direction="rtl"` : "";
  const family = arabic ? "Noto Sans Arabic" : "Inter";
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${opts.fill ?? "#0f172a"}" font-size="${opts.size ?? 13}" font-weight="${opts.weight ?? 500}" font-family="${family}" text-anchor="${anchor}"${direction}>${esc(value)}</text>`;
}

function ganttSvg(model: GanttModel, rtl: boolean, theme: ChartTheme): string {
  const colors = palette[theme];
  const width = 1400;
  const labelW = 280;
  const pad = 28;
  const axisX = rtl ? pad : pad + labelW;
  const axisW = width - labelW - pad * 2;
  const labelX = rtl ? width - pad : pad;
  const starts = model.tasks.map((task) => parseIso(task.start)!);
  const ends = model.tasks.map((task) => parseIso(task.end)!);
  const min = Math.min(...starts) - 3 * 86_400_000;
  const max = Math.max(...ends) + 4 * 86_400_000;
  const span = Math.max(max - min, 86_400_000);
  const xOf = (ms: number) => {
    const t = (ms - min) / span;
    return rtl ? axisX + axisW - t * axisW : axisX + t * axisW;
  };
  const rows: { kind: "group" | "task"; label: string; task?: GanttModel["tasks"][number] }[] = [];
  let lastGroup = "";
  for (const task of model.tasks) {
    if (task.group && task.group !== lastGroup) {
      rows.push({ kind: "group", label: task.group });
      lastGroup = task.group;
    }
    rows.push({ kind: "task", label: task.name, task });
  }
  const headerH = 92;
  const rowH = 36;
  const height = headerH + rows.length * rowH + 36;
  const parts = [svgOpen(width, height, theme)];
  parts.push(text(rtl ? width - pad : pad, 32, model.title, { size: 22, weight: 700, fill: colors.ink, rtl, anchor: rtl ? "end" : "start" }));
  const legend = rtl
    ? "معلم  ·  مسار حرج  ·  مهمة  ·  اليوم"
    : "Task   Critical   Milestone   Today";
  parts.push(text(rtl ? width - pad : pad, 54, legend, { size: 12, fill: colors.muted, rtl, anchor: rtl ? "end" : "start" }));

  let cursor = min;
  const week = 7 * 86_400_000;
  while (cursor <= max) {
    const x = xOf(cursor);
    const date = new Date(cursor);
    const monthStart = date.getUTCDate() <= 7;
    parts.push(`<line x1="${x.toFixed(1)}" y1="70" x2="${x.toFixed(1)}" y2="${height - 20}" stroke="${monthStart ? colors.month : colors.grid}" stroke-width="${monthStart ? 1.4 : 1}"/>`);
    if (monthStart) {
      const label = date.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
      parts.push(text(x + (rtl ? -6 : 6), 84, label, { size: 12, fill: colors.muted, weight: 700, anchor: rtl ? "end" : "start" }));
    }
    cursor += week;
  }

  const todayMs = parseIso(model.today);
  rows.forEach((row, index) => {
    const y = headerH + index * rowH;
    if (row.kind === "group") {
      parts.push(`<rect x="${pad}" y="${y}" width="${width - pad * 2}" height="${rowH - 4}" rx="8" fill="${colors.group}"/>`);
      parts.push(text(rtl ? width - pad - 12 : pad + 12, y + 22, row.label, { size: 13, weight: 700, fill: colors.ink, rtl, anchor: rtl ? "end" : "start" }));
      return;
    }
    const task = row.task!;
    parts.push(text(rtl ? labelX - 8 : labelX, y + 22, clip(task.name, 32), { size: 13, fill: colors.ink, rtl, anchor: rtl ? "end" : "start" }));
    const start = parseIso(task.start)!;
    const end = parseIso(task.end)! + 86_400_000;
    if (task.milestone) {
      const cx = xOf(start);
      const cy = y + rowH / 2 - 2;
      const fill = task.critical ? colors.crit : colors.bar;
      parts.push(`<polygon data-kind="milestone" data-id="${esc(task.id)}" points="${cx},${cy - 8} ${cx + 8},${cy} ${cx},${cy + 8} ${cx - 8},${cy}" fill="${fill}"/>`);
      return;
    }
    const x1 = xOf(start);
    const x2 = xOf(end);
    const x = Math.min(x1, x2);
    const w = Math.max(Math.abs(x2 - x1), 8);
    const fill = task.critical ? colors.crit : colors.bar;
    const done = task.critical ? colors.critDone : colors.barDone;
    parts.push(`<rect data-kind="bar" data-id="${esc(task.id)}" x="${x.toFixed(1)}" y="${y + 8}" width="${w.toFixed(1)}" height="16" rx="8" fill="${fill}"/>`);
    if (task.progress > 0) {
      const pw = w * (task.progress / 100);
      const px = rtl ? x + w - pw : x;
      parts.push(`<rect x="${px.toFixed(1)}" y="${y + 8}" width="${pw.toFixed(1)}" height="16" rx="8" fill="${done}"/>`);
    }
  });

  if (todayMs != null && todayMs >= min && todayMs <= max) {
    const x = xOf(todayMs);
    parts.push(`<line data-kind="today" x1="${x.toFixed(1)}" y1="64" x2="${x.toFixed(1)}" y2="${height - 16}" stroke="${colors.ink}" stroke-width="1.5" stroke-dasharray="4 4"/>`);
    parts.push(text(x, 66, rtl ? "اليوم" : "Today", { size: 11, fill: colors.ink, weight: 700, anchor: "middle" }));
  }
  parts.push("</svg>");
  return parts.join("");
}

function timelineSvg(model: TimelineModel, rtl: boolean, theme: ChartTheme): string {
  const colors = palette[theme];
  const width = 1400;
  const height = 280;
  const pad = 48;
  const parts = [svgOpen(width, height, theme)];
  parts.push(text(rtl ? width - pad : pad, 40, model.title, { size: 22, weight: 700, fill: colors.ink, rtl, anchor: rtl ? "end" : "start" }));
  const n = model.items.length;
  const left = 70;
  const right = width - 70;
  const y = 150;
  parts.push(`<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="${colors.line}" stroke-width="3" stroke-linecap="round"/>`);
  model.items.forEach((item, index) => {
    const t = n === 1 ? 0.5 : index / (n - 1);
    const x = rtl ? right - t * (right - left) : left + t * (right - left);
    const above = index % 2 === 0;
    const cardY = above ? 58 : 176;
    parts.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${above ? cardY + 52 : cardY}" stroke="${colors.grid}" stroke-width="1.5"/>`);
    parts.push(`<rect data-kind="card" x="${x - 78}" y="${cardY}" width="156" height="52" rx="12" fill="${colors.card}" stroke="${colors.line}" stroke-width="1.5"/>`);
    parts.push(text(x, cardY + 22, clip(item.date, 18), { size: 12, fill: colors.muted, weight: 700, anchor: "middle", rtl }));
    parts.push(text(x, cardY + 40, clip(item.label, 18), { size: 13, fill: colors.ink, weight: 650, anchor: "middle", rtl }));
    parts.push(`<circle cx="${x}" cy="${y}" r="7" fill="${colors.bar}" stroke="${colors.bg}" stroke-width="2"/>`);
  });
  parts.push("</svg>");
  return parts.join("");
}

function seriesSvg(model: SeriesModel, rtl: boolean, theme: ChartTheme): string {
  const colors = palette[theme];
  const width = 1400;
  const height = 460;
  const padL = rtl ? 36 : 72;
  const padR = rtl ? 72 : 36;
  const top = 72;
  const bottom = 400;
  const plotW = width - padL - padR;
  const parts = [svgOpen(width, height, theme)];
  parts.push(text(rtl ? width - 28 : 28, 36, model.title, { size: 22, weight: 700, fill: colors.ink, rtl, anchor: rtl ? "end" : "start" }));
  const values = model.points.flatMap((point) => [point.planned, ...(point.actual == null ? [] : [point.actual])]);
  const max = Math.max(1, ...values) * 1.15;
  const yOf = (value: number) => bottom - (value / max) * (bottom - top);
  const xOf = (index: number) => {
    const t = model.points.length === 1 ? 0.5 : index / (model.points.length - 1);
    return rtl ? padL + plotW - t * plotW : padL + t * plotW;
  };
  for (let step = 0; step <= 4; step++) {
    const value = (max / 4) * step;
    const y = yOf(value);
    parts.push(`<line x1="${padL}" y1="${y.toFixed(1)}" x2="${padL + plotW}" y2="${y.toFixed(1)}" stroke="${colors.grid}"/>`);
    parts.push(text(rtl ? width - 28 : 16, y + 4, String(Math.round(value)), { size: 11, fill: colors.muted, anchor: rtl ? "end" : "start" }));
  }
  const grouped = model.points.some((point) => point.actual != null);
  if (model.kind === "histogram" || model.kind === "bar") {
    const gap = plotW / model.points.length;
    model.points.forEach((point, index) => {
      const cx = xOf(index);
      const bw = Math.min(28, gap * (grouped ? 0.28 : 0.46));
      const plannedH = Math.max(0, bottom - yOf(point.planned));
      const plannedX = grouped ? cx - bw - 3 : cx - bw / 2;
      parts.push(`<rect data-kind="bar" x="${plannedX.toFixed(1)}" y="${yOf(point.planned).toFixed(1)}" width="${bw}" height="${plannedH.toFixed(1)}" rx="6" fill="${colors.bar}" opacity="${grouped ? "0.45" : "1"}"/>`);
      if (point.actual != null) {
        const actualH = Math.max(0, bottom - yOf(point.actual));
        parts.push(`<rect data-kind="bar" x="${(cx + 3).toFixed(1)}" y="${yOf(point.actual).toFixed(1)}" width="${bw}" height="${actualH.toFixed(1)}" rx="6" fill="${colors.actual}"/>`);
      }
      parts.push(text(cx, bottom + 24, clip(point.label, 12), { size: 12, fill: colors.muted, anchor: "middle", rtl }));
    });
  } else {
    const fillArea = model.kind === "area" || model.kind === "scurve";
    const dashedPlanned = model.kind === "scurve" && grouped;
    const line = (key: "planned" | "actual") => {
      const cmds: string[] = [];
      model.points.forEach((point, index) => {
        const value = key === "planned" ? point.planned : point.actual;
        if (value == null) return;
        cmds.push(`${cmds.length ? "L" : "M"}${xOf(index).toFixed(1)},${yOf(value).toFixed(1)}`);
      });
      return cmds.join(" ");
    };
    const planned = line("planned");
    const actual = line("actual");
    const areaFor = (path: string, key: "planned" | "actual") => {
      const present = model.points.map((point, index) => (key === "planned" ? point.planned != null : point.actual != null) ? index : -1).filter((index) => index >= 0);
      if (!path || present.length < 2) return "";
      const first = present[0];
      const last = present[present.length - 1];
      return `${path} L${xOf(last).toFixed(1)},${bottom} L${xOf(first).toFixed(1)},${bottom} Z`;
    };
    if (fillArea && model.kind === "area" && planned) parts.push(`<path data-kind="area" d="${areaFor(planned, "planned")}" fill="${colors.bar}" opacity="0.16"/>`);
    if (fillArea && actual) parts.push(`<path data-kind="area" d="${areaFor(actual, "actual")}" fill="${colors.actual}" opacity="0.16"/>`);
    if (planned) {
      const dash = dashedPlanned ? ` stroke-dasharray="7 5"` : "";
      parts.push(`<path data-kind="planned" d="${planned}" fill="none" stroke="${colors.bar}" stroke-width="3"${dash}/>`);
    }
    if (actual) parts.push(`<path data-kind="actual" d="${actual}" fill="none" stroke="${colors.actual}" stroke-width="3.5"/>`);
    model.points.forEach((point, index) => {
      const x = xOf(index);
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${yOf(point.planned).toFixed(1)}" r="4.5" fill="${colors.bar}"/>`);
      if (point.actual != null) parts.push(`<circle cx="${x.toFixed(1)}" cy="${yOf(point.actual).toFixed(1)}" r="4.5" fill="${colors.actual}"/>`);
      parts.push(text(x, bottom + 24, clip(point.label, 12), { size: 12, fill: colors.muted, anchor: "middle", rtl }));
    });
  }
  const names = model.seriesNames?.filter(Boolean) || [];
  const legend = names.length >= 2 ? names.slice(0, 2).join("    ") : names[0] && !grouped ? names[0] : grouped ? (rtl ? "مخطط    فعلي" : "Planned    Actual") : "";
  if (legend) parts.push(text(rtl ? width - 28 : 28, height - 16, legend, { size: 12, fill: colors.muted, rtl, anchor: rtl ? "end" : "start" }));
  parts.push("</svg>");
  return parts.join("").replace("<svg ", `<svg data-chart="${model.kind}" `);
}

const PIE_COLORS = ["#1a56ff", "#0f766e", "#c2410c", "#7c3aed", "#b45309", "#0369a1", "#be123c", "#15803d", "#4338ca", "#a16207"];

function pieSvg(model: SeriesModel, rtl: boolean, theme: ChartTheme): string {
  const colors = palette[theme];
  const width = 1400;
  const height = 460;
  const parts = [svgOpen(width, height, theme).replace("<svg ", `<svg data-chart="pie" `)];
  parts.push(text(rtl ? width - 28 : 28, 36, model.title, { size: 22, weight: 700, fill: colors.ink, rtl, anchor: rtl ? "end" : "start" }));
  const slices = model.points.filter((point) => point.planned > 0);
  const total = slices.reduce((sum, point) => sum + point.planned, 0) || 1;
  const cx = rtl ? 980 : 420;
  const cy = 250;
  const radius = 150;
  let angle = -Math.PI / 2;
  slices.forEach((point, index) => {
    const sweep = (point.planned / total) * Math.PI * 2;
    const color = PIE_COLORS[index % PIE_COLORS.length];
    if (sweep >= Math.PI * 2 - 0.001) {
      parts.push(`<circle data-kind="pie" cx="${cx}" cy="${cy}" r="${radius}" fill="${color}"/>`);
    } else {
      const end = angle + sweep;
      const large = sweep > Math.PI ? 1 : 0;
      const x1 = cx + radius * Math.cos(angle);
      const y1 = cy + radius * Math.sin(angle);
      const x2 = cx + radius * Math.cos(end);
      const y2 = cy + radius * Math.sin(end);
      parts.push(`<path data-kind="pie" d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${radius},${radius} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${color}"/>`);
    }
    angle += sweep;
  });
  slices.forEach((point, index) => {
    const y = 92 + index * 28;
    const x = rtl ? 360 : 760;
    const color = PIE_COLORS[index % PIE_COLORS.length];
    const mark = rtl ? x + 220 : x;
    parts.push(`<rect x="${mark}" y="${y - 12}" width="14" height="14" rx="3" fill="${color}"/>`);
    const share = Math.round((point.planned / total) * 100);
    parts.push(text(rtl ? mark - 10 : mark + 22, y, `${clip(point.label, 22)}  ${share}%`, { size: 14, fill: colors.ink, rtl, anchor: rtl ? "end" : "start" }));
  });
  parts.push("</svg>");
  return parts.join("");
}

export function renderChartSvg(model: ChartModel, dir: "ltr" | "rtl", theme: ChartTheme = "light"): string {
  const rtl = dir === "rtl";
  if (model.kind === "gantt") return ganttSvg(model, rtl, theme);
  if (model.kind === "timeline") return timelineSvg(model, rtl, theme);
  if (model.kind === "pie") return pieSvg(model, rtl, theme);
  return seriesSvg(model, rtl, theme);
}
