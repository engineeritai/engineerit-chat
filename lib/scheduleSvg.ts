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

function text(x: number, y: number, value: string, opts: { size?: number; fill?: string; anchor?: "start" | "end" | "middle"; weight?: number; rtl?: boolean; halo?: string; haloWidth?: number }) {
  const anchor = opts.anchor ?? (opts.rtl ? "end" : "start");
  const arabic = opts.rtl || containsArabic(value);
  const direction = arabic ? ` direction="rtl"` : "";
  const family = arabic ? "Noto Sans Arabic" : "Inter";
  const halo = opts.halo ? ` stroke="${opts.halo}" stroke-width="${opts.haloWidth ?? 2}" paint-order="stroke" stroke-linejoin="round"` : "";
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${opts.fill ?? "#0f172a"}" font-size="${opts.size ?? 12}" font-weight="${opts.weight ?? 500}" font-family="${family}" text-anchor="${anchor}"${direction}${halo}>${esc(value)}</text>`;
}

function edgeAnchor(value: string, edge: "left" | "right"): "start" | "end" {
  const flips = containsArabic(value);
  if (edge === "left") return flips ? "end" : "start";
  return flips ? "start" : "end";
}

export const GANTT_HEADER = 36;
export const GANTT_ROW = 34;

export function ganttRows(model: GanttModel): { kind: "group" | "task"; label: string }[] {
  const rows: { kind: "group" | "task"; label: string }[] = [];
  let lastGroup = "";
  for (const task of model.tasks) {
    if (task.group && task.group !== lastGroup) {
      rows.push({ kind: "group", label: task.group });
      lastGroup = task.group;
    }
    rows.push({ kind: "task", label: task.name });
  }
  return rows;
}

function ganttSvg(model: GanttModel, rtl: boolean, theme: ChartTheme, fit = false, from = 0, to = Number.POSITIVE_INFINITY, labels = true): string {
  const colors = palette[theme];
  const pad = 12;
  const dayMs = 86_400_000;
  const starts = model.tasks.map((task) => parseIso(task.start)!);
  const ends = model.tasks.map((task) => parseIso(task.end)!);
  const min = Math.min(...starts) - dayMs;
  const max = Math.max(...ends) + 2 * dayMs;
  const span = Math.max(max - min, dayMs);
  const spanDays = Math.max(1, Math.round(span / dayMs));
  const labelW = fit ? 300 : 0;
  const axisW = fit ? 680 : Math.max(280, spanDays * 22);
  const width = fit ? labelW + 16 + axisW : pad * 2 + axisW;
  const axisX = fit ? (rtl ? pad : labelW + 16) : pad;
  const xOf = (ms: number) => {
    const t = (ms - min) / span;
    return rtl ? axisX + axisW - t * axisW : axisX + t * axisW;
  };
  const allRows = ganttRows(model);
  const rows = allRows.slice(from, to);
  const headerH = GANTT_HEADER;
  const rowH = GANTT_ROW;
  const height = headerH + rows.length * rowH;
  const fitted = `data-chart="gantt" data-fit="1" data-font="12" style="display:block;width:100%;max-width:100%;height:auto"`;
  const scrolling = `data-chart="gantt" data-font="12" style="width:${width}px;max-width:none;height:${height}px"`;
  const parts = [svgOpen(width, height, theme).replace("<svg ", `<svg ${fit ? fitted : scrolling} `)];
  parts.push(`<defs><marker id="gantt-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${colors.muted}"/></marker></defs>`);

  let cursor = min;
  const week = 7 * 86_400_000;
  while (cursor <= max) {
    const x = xOf(cursor);
    const date = new Date(cursor);
    const monthStart = date.getUTCDate() <= 7;
    parts.push(`<line x1="${x.toFixed(1)}" y1="${headerH - 4}" x2="${x.toFixed(1)}" y2="${height - 8}" stroke="${monthStart ? colors.month : colors.grid}" stroke-width="${monthStart ? 1.4 : 1}"/>`);
    if (monthStart) {
      const label = date.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
      parts.push(text(x + (rtl ? -4 : 4), 16, label, { size: 12, fill: colors.muted, weight: 700, anchor: rtl ? "end" : "start" }));
    }
    cursor += week;
  }

  const todayMs = parseIso(model.today);
  const bars = new Map<string, { x1: number; x2: number; y: number }>();
  let taskCursor = allRows.slice(0, from).filter((row) => row.kind === "task").length;
  rows.forEach((row, index) => {
    const y = headerH + index * rowH;
    if (row.kind === "group") {
      parts.push(`<rect x="0" y="${y}" width="${width}" height="${rowH}" fill="${colors.group}"/>`);
      return;
    }
    const task = model.tasks[taskCursor];
    taskCursor += 1;
    if (!task) return;
    const start = parseIso(task.start)!;
    const end = parseIso(task.end)! + 86_400_000;
    if (task.milestone) {
      const cx = xOf(start);
      const cy = y + rowH / 2 - 2;
      const fill = task.critical ? colors.crit : colors.bar;
      bars.set(task.id, { x1: cx, x2: cx, y: cy });
      parts.push(`<polygon data-kind="milestone" data-id="${esc(task.id)}" points="${cx},${cy - 8} ${cx + 8},${cy} ${cx},${cy + 8} ${cx - 8},${cy}" fill="${fill}"/>`);
      return;
    }
    const x1 = xOf(start);
    const x2 = xOf(end);
    const x = Math.min(x1, x2);
    const w = Math.max(Math.abs(x2 - x1), 8);
    bars.set(task.id, { x1, x2, y: y + rowH / 2 - 2 });
    const fill = task.critical ? colors.crit : colors.bar;
    const done = task.critical ? colors.critDone : colors.barDone;
    parts.push(`<rect data-kind="bar" data-id="${esc(task.id)}" x="${x.toFixed(1)}" y="${y + 8}" width="${w.toFixed(1)}" height="16" rx="8" fill="${fill}"/>`);
    if (task.progress > 0) {
      const pw = w * (task.progress / 100);
      const px = rtl ? x + w - pw : x;
      parts.push(`<rect x="${px.toFixed(1)}" y="${y + 8}" width="${pw.toFixed(1)}" height="16" rx="8" fill="${done}"/>`);
    }
  });

  for (const task of model.tasks) {
    if (!task.dependsOn) continue;
    const from = bars.get(task.dependsOn);
    const to = bars.get(task.id);
    if (!from || !to) continue;
    const startX = from.x2;
    const endX = to.x1;
    const midY = from.y + (to.y - from.y) * 0.45;
    parts.push(`<path data-kind="dependency" data-from="${esc(task.dependsOn)}" data-to="${esc(task.id)}" d="M ${startX.toFixed(1)} ${from.y.toFixed(1)} V ${midY.toFixed(1)} H ${endX.toFixed(1)} V ${to.y.toFixed(1)}" fill="none" stroke="${colors.muted}" stroke-width="1.5" marker-end="url(#gantt-arrow)"/>`);
  }

  if (todayMs != null && todayMs >= min && todayMs <= max) {
    const x = xOf(todayMs);
    parts.push(`<line data-kind="today" x1="${x.toFixed(1)}" y1="4" x2="${x.toFixed(1)}" y2="${height - 2}" stroke="${colors.ink}" stroke-width="1.5" stroke-dasharray="4 4"/>`);
    parts.push(text(x, 14, rtl ? "اليوم" : "Today", { size: 12, fill: colors.ink, weight: 700, anchor: "middle" }));
  }
  if (fit && labels) {
    rows.forEach((row, index) => {
      const y = headerH + index * rowH + 22;
      const label = clip(row.label, 28);
      const weight = row.kind === "group" ? 700 : 500;
      if (rtl) parts.push(text(width - 8, y, label, { size: 12, anchor: "end", fill: colors.ink, weight, rtl: true }));
      else parts.push(text(8, y, label, { size: 12, anchor: "start", fill: colors.ink, weight }));
    });
  }
  parts.push("</svg>");
  return parts.join("");
}

/** Export bands: labels included, each band short enough for an A4/Letter portrait page. */
export function ganttFitBands(model: GanttModel, rtl: boolean, per = 14): string[] {
  const count = ganttRows(model).length;
  if (count <= per) return [ganttSvg(model, rtl, "light", true)];
  const bands: string[] = [];
  for (let start = 0; start < count; start += per) bands.push(ganttSvg(model, rtl, "light", true, start, start + per));
  return bands;
}

export function asExportSvg(svg: string): string {
  return svg
    .replace(/\swidth="[\d.]+"/, ' width="100%"')
    .replace(/\sheight="[\d.]+"/, "")
    .replace(/style="[^"]*"/, 'style="display:block;width:100%;max-width:100%;height:auto"');
}

/** HTML export: bars scale in the SVG, task names sit in HTML so Arabic is not clipped. */
function ganttHtmlBands(model: GanttModel, rtl: boolean, theme: ChartTheme = "light"): string[] {
  const rows = ganttRows(model);
  const per = 14;
  const bands: string[] = [];
  for (let start = 0; start < rows.length; start += per) {
    const slice = rows.slice(start, start + per);
    const svg = ganttSvg(model, rtl, theme, true, start, start + per, false);
    const names = [
      `<div class="gantt-fit-head"></div>`,
      ...slice.map((row) => `<div class="gantt-fit-name${row.kind === "group" ? " is-group" : ""}">${esc(row.label)}</div>`),
    ].join("");
    const tracks = `${GANTT_HEADER}fr repeat(${slice.length}, ${GANTT_ROW}fr)`;
    bands.push(
      `<div class="gantt-fit" dir="${rtl ? "rtl" : "ltr"}">${svg}<div class="gantt-fit-names" style="grid-template-rows:${tracks}">${names}</div></div>`
    );
  }
  return bands.length ? bands : [ganttSvg(model, rtl, "light", true, 0, 0, false)];
}

export function renderFittedChartParts(model: ChartModel, dir: "ltr" | "rtl", theme: ChartTheme = "light"): string[] {
  if (model.kind === "gantt") return ganttHtmlBands(model, dir === "rtl", theme);
  return [asExportSvg(renderChartSvg(model, dir, theme))];
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

function monotonePath(xs: number[], ys: number[]) {
  const n = xs.length;
  if (!n) return "";
  if (n === 1) return `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = xs[i + 1] - xs[i] || 1;
    slope[i] = (ys[i + 1] - ys[i]) / dx[i];
  }
  const tangent = new Array<number>(n);
  tangent[0] = slope[0];
  tangent[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i += 1) {
    if (Math.abs(slope[i]) < 1e-6) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const hypot = a * a + b * b;
    if (hypot > 9) {
      const scale = 3 / Math.sqrt(hypot);
      tangent[i] = scale * a * slope[i];
      tangent[i + 1] = scale * b * slope[i];
    }
  }
  let path = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const c1x = xs[i] + dx[i] / 3;
    const c1y = ys[i] + (tangent[i] * dx[i]) / 3;
    const c2x = xs[i + 1] - dx[i] / 3;
    const c2y = ys[i + 1] - (tangent[i + 1] * dx[i]) / 3;
    path += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${xs[i + 1].toFixed(1)},${ys[i + 1].toFixed(1)}`;
  }
  return path;
}

function axisTick(label: string) {
  const text = label.trim();
  if (text === "Start" || text === "البداية") return text;
  const latin = /^(?:wk|week|w)\s*(\d+)$/i.exec(text);
  if (latin) return `Wk${latin[1]}`;
  const arabicWeek = /^(?:أسبوع|شهر|فترة|يوم)\s*(\d+)$/.exec(text);
  if (arabicWeek) {
    const digits = "٠١٢٣٤٥٦٧٨٩";
    return `أ${[...arabicWeek[1]].map((ch) => digits[Number(ch)] ?? ch).join("")}`;
  }
  return clip(label, 6);
}

function scurveSvg(model: SeriesModel, rtl: boolean, theme: ChartTheme, pixelWidth = 420): string {
  const colors = palette[theme];
  const blue = theme === "dark" ? "#93c5fd" : "#0d60e4";
  const orange = theme === "dark" ? "#fdba74" : "#ea580c";
  const width = Math.round(Math.max(280, Math.min(720, pixelWidth || 420)));
  const arabic = rtl || model.points.some((point) => /[\u0600-\u06FF]/.test(point.label));
  const startLabel = arabic ? "البداية" : "Start";
  const points = model.points[0] && model.points[0].planned <= 0.5 && (model.points[0].actual == null || model.points[0].actual <= 0.5)
    ? model.points
    : [{ label: startLabel, planned: 0, actual: model.points.some((point) => point.actual != null) ? 0 : null }, ...model.points];
  const grouped = points.some((point) => point.actual != null);
  const dataDate = grouped ? points.reduce((found, point, index) => (point.actual != null ? index : found), -1) : -1;
  const padL = rtl ? 40 : 32;
  const padR = rtl ? 28 : 20;
  const top = 16;
  const bottom = 188;
  const legend = grouped
    ? (arabic ? ["المخطط", "الفعلي"] : ["Planned (baseline)", "Actual (to date)"])
    : (arabic ? ["التقدم التراكمي", "التقدم الأسبوعي"] : ["Cumulative progress", "Weekly progress"]);
  const legendW = Math.min(width - padL - padR, grouped ? (arabic ? 148 : 188) : arabic ? 188 : 196);
  const legendH = 12 + legend.length * 18;
  const legendX = rtl ? width - padR - legendW : padL;
  const legendY = bottom + 46;
  const height = legendY + legendH + 10;
  const plotW = width - padL - padR;
  const yOf = (value: number) => bottom - (Math.max(0, Math.min(100, value)) / 100) * (bottom - top);
  const xOf = (index: number) => {
    const t = points.length === 1 ? 0.5 : index / (points.length - 1);
    return rtl ? padL + plotW - t * plotW : padL + t * plotW;
  };
  const parts = [svgOpen(width, height, theme).replace("<svg ", `<svg data-chart="scurve" data-font="12" data-plot-bottom="${bottom}" `)];
  for (const tick of [0, 20, 40, 60, 80, 100]) {
    const y = yOf(tick);
    parts.push(`<line x1="${padL}" y1="${y.toFixed(1)}" x2="${padL + plotW}" y2="${y.toFixed(1)}" stroke="${colors.grid}"/>`);
    parts.push(text(rtl ? width - 8 : 4, y + 4, String(tick), { size: 12, fill: colors.muted, anchor: rtl ? "end" : "start" }));
  }
  if (!grouped) {
    const bw = Math.min(28, (plotW / Math.max(points.length - 1, 1)) * 0.4);
    points.forEach((point, index) => {
      if (index === 0) return;
      const gain = Math.max(0, point.planned - points[index - 1].planned);
      const x = xOf(index) - bw / 2;
      const y = yOf(gain);
      parts.push(`<rect data-kind="increment" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, bottom - y).toFixed(1)}" rx="2" fill="${blue}" opacity="0.18"/>`);
    });
  }
  const seriesPath = (key: "planned" | "actual") => {
    const xs: number[] = [];
    const ys: number[] = [];
    points.forEach((point, index) => {
      if (key === "actual" && dataDate >= 0 && index > dataDate) return;
      const value = key === "planned" ? point.planned : point.actual;
      if (value == null) return;
      xs.push(xOf(index));
      ys.push(yOf(value));
    });
    return monotonePath(xs, ys);
  };
  const planned = seriesPath("planned");
  const actual = grouped ? seriesPath("actual") : "";
  if (planned) parts.push(`<path data-kind="planned" d="${planned}" fill="none" stroke="${blue}" stroke-width="2.5" stroke-linecap="round"/>`);
  if (actual) parts.push(`<path data-kind="actual" d="${actual}" fill="none" stroke="${orange}" stroke-width="2.5" stroke-linecap="round"/>`);
  points.forEach((point, index) => {
    const x = xOf(index);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${yOf(point.planned).toFixed(1)}" r="3.5" fill="${blue}" stroke="${colors.bg}" stroke-width="1.5"/>`);
    if (point.actual != null && index <= dataDate) {
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${yOf(point.actual).toFixed(1)}" r="3.5" fill="${orange}" stroke="${colors.bg}" stroke-width="1.5"/>`);
    }
    parts.push(text(x, bottom + 16, axisTick(point.label), { size: 12, fill: colors.muted, anchor: "middle", rtl }));
  });
  if (dataDate >= 0) {
    const x = xOf(dataDate);
    const guide = theme === "dark" ? "#94a3b8" : "#64748b";
    parts.push(`<line data-kind="data-date" x1="${x.toFixed(1)}" y1="${top}" x2="${x.toFixed(1)}" y2="${bottom}" stroke="${guide}" stroke-dasharray="3 3" stroke-width="1.25"/>`);
    const caption = arabic ? `تاريخ البيانات (${axisTick(points[dataDate].label)})` : `Data date (${axisTick(points[dataDate].label)})`;
    const captionW = [...caption].length * (arabic ? 6.2 : 5.4);
    const captionX = Math.max(captionW / 2 + 2, Math.min(width - captionW / 2 - 2, x));
    parts.push(text(captionX, bottom + 32, caption, { size: 12, fill: guide, weight: 600, anchor: "middle", rtl, halo: colors.bg, haloWidth: 2 }));
  }
  points.forEach((point, index) => {
    if (grouped || Math.round(point.planned) <= 0) return;
    const x = xOf(index);
    const percent = arabic ? `${Math.round(point.planned)}٪` : `${Math.round(point.planned)}%`;
    const above = yOf(point.planned) - 14;
    const labelY = above >= 12 ? above : yOf(point.planned) + 16;
    const labelW = [...percent].length * 7;
    const hitsLegend = x + labelW / 2 > legendX && x - labelW / 2 < legendX + legendW && labelY > legendY && labelY - 12 < legendY + legendH;
    if (!hitsLegend) parts.push(text(x, labelY, percent, { size: 12, fill: colors.ink, weight: 600, anchor: "middle", halo: colors.bg, haloWidth: 2 }));
  });
  parts.push(`<rect data-kind="legend" x="${legendX}" y="${legendY}" width="${legendW}" height="${legendH}" rx="6" fill="${colors.card}" stroke="${colors.grid}" stroke-width="1"/>`);
  legend.forEach((name, index) => {
    const y = legendY + 16 + index * 18;
    const markX = rtl ? legendX + legendW - 16 : legendX + 16;
    const labelX = rtl ? markX - 12 : markX + 12;
    if (!grouped && index === 1) {
      parts.push(`<rect x="${(markX - 5).toFixed(1)}" y="${(y - 9).toFixed(1)}" width="10" height="10" rx="2" fill="${blue}" opacity="0.28"/>`);
    } else {
      const color = index === 0 ? blue : orange;
      parts.push(`<line x1="${(markX - 7).toFixed(1)}" y1="${y - 4}" x2="${(markX + 7).toFixed(1)}" y2="${y - 4}" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>`);
    }
    parts.push(text(labelX, y, name, { size: 12, fill: colors.ink, weight: 600, rtl, anchor: rtl ? edgeAnchor(name, "right") : "start" }));
  });
  if (grouped && dataDate >= 0) {
    const plannedAt = points[dataDate].planned;
    const actualAt = points[dataDate].actual ?? plannedAt;
    const delta = Math.round(actualAt - plannedAt);
    const spi = plannedAt > 0 ? (actualAt / plannedAt).toFixed(2) : "";
    const behind = delta < -0.5;
    const ahead = delta > 0.5;
    const line1 = arabic
      ? behind
        ? `متأخر عن المخطط: ${delta}٪`
        : ahead
          ? `متقدم على المخطط: +${delta}٪`
          : "على المخطط"
      : behind
        ? `Behind plan: ${delta}%`
        : ahead
          ? `Ahead of plan: +${delta}%`
          : "On plan";
    const line2 = spi ? `SPI ≈ ${spi}` : "";
    const tone = behind ? (theme === "dark" ? "#fca5a5" : "#dc2626") : ahead ? (theme === "dark" ? "#86efac" : "#15803d") : colors.ink;
    const dx = xOf(dataDate);
    const upper = Math.min(yOf(plannedAt), yOf(actualAt));
    const lower = Math.max(yOf(plannedAt), yOf(actualAt));
    const textW = Math.max(78, [...line1].length * (containsArabic(line1) ? 7.1 : 6.15));
    const inkH = line2 ? 24 : 12;
    const lead = 13;
    const hitsLegend = (x0: number, top: number, x1: number, bottom: number) =>
      x1 > legendX - 2 && x0 < legendX + legendW + 2 && bottom > legendY && top < legendY + legendH;
    const curveClear = (x0: number, blockTop: number, x1: number, blockBottom: number) => {
      if (x0 < 2 || x1 > width - 2 || blockTop < 2 || blockBottom > bottom - 4) return false;
      if (hitsLegend(x0, blockTop, x1, blockBottom)) return false;
      for (let i = 0; i < points.length - 1; i += 1) {
        const segL = Math.min(xOf(i), xOf(i + 1));
        const segR = Math.max(xOf(i), xOf(i + 1));
        if (segR < x0 || segL > x1) continue;
        const spans = (yA: number, yB: number) => {
          const yLo = Math.min(yA, yB);
          const yHi = Math.max(yA, yB);
          return yHi >= blockTop - 3 && yLo <= blockBottom + 3;
        };
        if (spans(yOf(points[i].planned), yOf(points[i + 1].planned))) return false;
        const actualA = points[i].actual;
        const actualB = points[i + 1].actual;
        if (i < dataDate && actualA != null && actualB != null && spans(yOf(actualA), yOf(actualB))) return false;
      }
      for (let i = 0; i < points.length; i += 1) {
        const x = xOf(i);
        if (x < x0 - 4 || x > x1 + 4) continue;
        const ys = [yOf(points[i].planned)];
        const actual = points[i].actual;
        if (actual != null && i <= dataDate) ys.push(yOf(actual));
        if (ys.some((y) => y >= blockTop - 4 && y <= blockBottom + 4)) return false;
      }
      return true;
    };
    const candidates: { toLeft: boolean; top: number }[] = [];
    const push = (toLeft: boolean, top: number) => candidates.push({ toLeft, top });
    push(!rtl, (upper + lower) / 2 - inkH / 2);
    push(!rtl, upper - inkH - 6);
    push(rtl, upper + 8);
    push(rtl, upper - inkH - 6);
    push(!rtl, lower + 8);
    let placed = candidates
      .map((candidate) => {
        const x = candidate.toLeft ? dx - 8 : dx + 8;
        const x0 = candidate.toLeft ? x - textW : x;
        const x1 = candidate.toLeft ? x : x + textW;
        return { ...candidate, x, x0, x1, ok: curveClear(x0, candidate.top, x1, candidate.top + inkH) };
      })
      .find((candidate) => candidate.ok);
    if (!placed) {
      const toLeft = rtl;
      const x = toLeft ? dx - 8 : dx + 8;
      const top = Math.min(bottom - inkH - 8, Math.max(legendY + legendH + 4, upper + 8));
      placed = { toLeft, top, x, x0: toLeft ? x - textW : x, x1: toLeft ? x : x + textW, ok: false };
    }
    const y1 = placed.top + 9;
    const y2 = y1 + lead;
    parts.push(`<g data-kind="callout">`);
    parts.push(text(placed.x, y1, line1, { size: 12, fill: tone, weight: 600, anchor: placed.toLeft ? edgeAnchor(line1, "right") : edgeAnchor(line1, "left"), halo: colors.bg, haloWidth: 2 }));
    if (line2) parts.push(text(placed.x, y2, line2, { size: 12, fill: tone, weight: 600, anchor: placed.toLeft ? edgeAnchor(line2, "right") : edgeAnchor(line2, "left"), halo: colors.bg, haloWidth: 2 }));
    parts.push(`</g>`);
  }
  parts.push("</svg>");
  return parts.join("");
}

function seriesSvg(model: SeriesModel, rtl: boolean, theme: ChartTheme, pixelWidth?: number): string {
  if (model.kind === "scurve") return scurveSvg(model, rtl, theme, pixelWidth);
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
    const fillArea = model.kind === "area";
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
    if (planned) parts.push(`<path data-kind="planned" d="${planned}" fill="none" stroke="${colors.bar}" stroke-width="3"/>`);
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

export function renderChartSvg(model: ChartModel, dir: "ltr" | "rtl", theme: ChartTheme = "light", pixelWidth?: number): string {
  const rtl = dir === "rtl";
  if (model.kind === "gantt") return ganttSvg(model, rtl, theme);
  if (model.kind === "timeline") return timelineSvg(model, rtl, theme);
  if (model.kind === "pie") return pieSvg(model, rtl, theme);
  return seriesSvg(model, rtl, theme, pixelWidth);
}
