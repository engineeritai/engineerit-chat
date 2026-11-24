import { riyadhStart } from "@/lib/adminStats";
import type { DeviceClass, VisitLanguage } from "@/lib/visitPublic";

export function normalizePageViewRow(input: unknown): PageViewRow | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const created_at = typeof row.created_at === "string" ? row.created_at : "";
  const path = typeof row.path === "string" ? row.path : "";
  const visitor_id = typeof row.visitor_id === "string" ? row.visitor_id : "";
  const device = row.device_class === "mobile" || row.device_class === "desktop" ? row.device_class : null;
  const language = row.language === "en" || row.language === "ar" ? row.language : null;
  if (!created_at || !path.startsWith("/") || !/^[0-9a-f]{64}$/.test(visitor_id) || !device || !language) return null;
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim().slice(0, 253) : null);
  return {
    created_at,
    path: path.slice(0, 180),
    referrer_host: text(row.referrer_host),
    utm_source: text(row.utm_source),
    utm_medium: text(row.utm_medium),
    utm_campaign: text(row.utm_campaign),
    device_class: device,
    language,
    visitor_id,
  };
}

export type PageViewRow = {
  created_at: string;
  path: string;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_class: DeviceClass;
  language: VisitLanguage;
  visitor_id: string;
};

export type VisitCount = { views: number; uniques: number };

export type VisitReport =
  | { ready: false; reason: "missing" | "unavailable" }
  | {
      ready: true;
      today: VisitCount;
      days7: VisitCount;
      days30: VisitCount;
      daily: Array<{ date: string; views: number; uniques: number }>;
      topPages: Array<{ label: string; count: number }>;
      topReferrers: Array<{ label: string; count: number }>;
      topSources: Array<{ label: string; count: number }>;
      conversion7: number | null;
      conversion30: number | null;
      confirmed7: number;
      confirmed30: number;
      truncated: boolean;
    };

/** True when page_views has not been created yet. */
export function pageViewsTableMissing(error: unknown) {
  if (!error || (typeof error !== "object" && typeof error !== "string")) return false;
  const record = typeof error === "object" ? (error as { code?: string; message?: string; details?: string; hint?: string }) : {};
  const text = [
    record.code,
    record.message,
    record.details,
    record.hint,
    error instanceof Error ? error.message : "",
    typeof error === "string" ? error : "",
  ]
    .filter(Boolean)
    .join(" ");
  return /page_views/i.test(text) && /does not exist|schema cache|could not find the table|PGRST205|42P01/i.test(text);
}

export function riyadhDateKey(instant: Date) {
  const start = riyadhStart(instant, 0);
  return new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function addCalendarDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function topCounts(values: Array<string | null | undefined>, limit: number) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = (value || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function rate(signups: number, uniques: number) {
  if (uniques <= 0 || !Number.isFinite(signups) || signups < 0) return null;
  return signups / uniques;
}

function bucket() {
  return { views: 0, visitors: new Set<string>() };
}

/**
 * Fold stored page views into the admin windows.
 * `confirmed7` and `confirmed30` come from the existing confirmed-signup count.
 */
export function aggregatePageViews(
  rows: PageViewRow[],
  now: Date,
  confirmed: { days7: number; days30: number },
  truncated = false
): Extract<VisitReport, { ready: true }> {
  const todayStart = riyadhStart(now, 0).getTime();
  const weekStart = riyadhStart(now, 6).getTime();
  const chartStart = riyadhStart(now, 13).getTime();
  const monthStart = riyadhStart(now, 29).getTime();
  const todayKey = riyadhDateKey(now);
  const days: string[] = [];
  for (let back = 13; back >= 0; back -= 1) days.push(addCalendarDays(todayKey, -back));
  const daily = new Map(days.map((date) => [date, bucket()]));
  const today = bucket();
  const days7 = bucket();
  const days30 = bucket();
  const pages: string[] = [];
  const referrers: string[] = [];
  const sources: string[] = [];

  for (const row of rows) {
    const ms = Date.parse(row.created_at);
    if (!Number.isFinite(ms) || ms < monthStart) continue;
    const visitor = row.visitor_id;
    days30.views += 1;
    days30.visitors.add(visitor);
    if (ms >= weekStart) {
      days7.views += 1;
      days7.visitors.add(visitor);
      if (row.path) pages.push(row.path);
      if (row.referrer_host) referrers.push(row.referrer_host);
      if (row.utm_source) sources.push(row.utm_source);
    }
    if (ms >= todayStart) {
      today.views += 1;
      today.visitors.add(visitor);
    }
    if (ms >= chartStart) {
      const key = riyadhDateKey(new Date(ms));
      const day = daily.get(key);
      if (day) {
        day.views += 1;
        day.visitors.add(visitor);
      }
    }
  }

  const pack = (value: { views: number; visitors: Set<string> }): VisitCount => ({
    views: value.views,
    uniques: value.visitors.size,
  });
  const todayCount = pack(today);
  const weekCount = pack(days7);
  const monthCount = pack(days30);
  return {
    ready: true,
    today: todayCount,
    days7: weekCount,
    days30: monthCount,
    daily: days.map((date) => {
      const value = daily.get(date)!;
      return { date, views: value.views, uniques: value.visitors.size };
    }),
    topPages: topCounts(pages, 10),
    topReferrers: topCounts(referrers, 10),
    topSources: topCounts(sources, 10),
    conversion7: rate(confirmed.days7, weekCount.uniques),
    conversion30: rate(confirmed.days30, monthCount.uniques),
    confirmed7: confirmed.days7,
    confirmed30: confirmed.days30,
    truncated,
  };
}
