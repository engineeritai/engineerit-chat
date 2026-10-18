import type { SeriesModel } from "@/lib/scheduleModel";

const PERIOD_HEADER = /week|wk|period|month|date|أسبوع|شهر|فترة|تاريخ/i;
const PROGRESS_HEADER = /%|percent|progress|cumulative|planned|actual|تقدم|تراكمي|مخطط|فعلي|نسبة|إنجاز/i;
const PLANNED = /plan|baseline|مخطط|أساس/i;
const ACTUAL = /actual|فعلي|محقق/i;

function isPeriodLabel(value: string) {
  const text = value.trim();
  return (
    /^(wk|week|w|m|mon|month|p|period|q|day|d)\s*\d+/i.test(text) ||
    /^(أسبوع|شهر|فترة|يوم)\s*\d+/i.test(text) ||
    /^\d{1,2}$/.test(text) ||
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text)
  );
}

function parsePercent(value: string): number | null {
  const text = value.trim();
  if (!text || text === "—" || text === "-" || text === "–") return null;
  const match = /(-?\d+(?:\.\d+)?)\s*[%٪]?/.exec(text.replace(/,/g, ""));
  if (!match) return null;
  if (!/[%٪]/.test(text) && /[A-Za-z\u0600-\u06FF]/.test(text.replace(match[1], ""))) return null;
  const number = Number(match[1]);
  if (!Number.isFinite(number) || number < 0 || number > 100) return null;
  return number;
}

function monotonic(values: number[]) {
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] + 0.5 < values[i - 1]) return false;
  }
  return values.length >= 2;
}

export function scurveFromTable(headers: string[], rows: string[][], title = "S-curve"): SeriesModel | null {
  if (headers.length < 2 || headers.length > 4 || rows.length < 2) return null;
  const periodLike =
    PERIOD_HEADER.test(headers[0] || "") || rows.filter((row) => isPeriodLabel(row[0] || "")).length >= Math.ceil(rows.length / 2);
  const headerBlob = headers.join(" ");
  if (!periodLike || !PROGRESS_HEADER.test(headerBlob)) return null;

  const roles = headers.map((header, index) => {
    if (index === 0) return "period" as const;
    if (ACTUAL.test(header) && !PLANNED.test(header)) return "actual" as const;
    if (PLANNED.test(header)) return "planned" as const;
    if (PROGRESS_HEADER.test(header)) return "percent" as const;
    return "other" as const;
  });
  const valueIndexes = roles
    .map((role, index) => (role === "planned" || role === "actual" || role === "percent" ? index : -1))
    .filter((index) => index >= 0);
  if (!valueIndexes.length || valueIndexes.length > 2) return null;

  const plannedIndex = roles.indexOf("planned") >= 0 ? roles.indexOf("planned") : valueIndexes[0];
  const actualIndex = roles.indexOf("actual") >= 0 ? roles.indexOf("actual") : valueIndexes.length > 1 ? valueIndexes[1] : -1;
  const points: SeriesModel["points"] = [];
  for (const row of rows) {
    const label = (row[0] || "").trim();
    if (!label) continue;
    const planned = parsePercent(row[plannedIndex] || "");
    if (planned == null) return null;
    const actual = actualIndex >= 0 ? parsePercent(row[actualIndex] || "") : null;
    points.push({ label, planned, actual });
  }
  if (points.length < 2) return null;
  if (!monotonic(points.map((point) => point.planned))) return null;
  const actuals = points.map((point) => point.actual).filter((value): value is number => value != null);
  const grouped = actuals.length >= 1;
  if (grouped && actuals.length >= 2 && !monotonic(actuals) && roles.indexOf("actual") < 0) return null;
  const arabic = /[\u0600-\u06FF]/.test(headerBlob);
  return {
    kind: "scurve",
    title: title || (arabic ? "منحنى التقدم" : "S-curve"),
    points,
    seriesNames: grouped ? (arabic ? ["المخطط", "الفعلي"] : ["Planned", "Actual"]) : [arabic ? "التقدم" : "Progress"],
  };
}
