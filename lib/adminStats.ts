import { sourceFromMetadata, viaFromMetadata, type SourceLabel, type ViaLabel } from "@/lib/acquisition";
import { isTestRecipient } from "@/lib/mailPolicy";

/** Owner stats use Arabia Standard Time (UTC+3, no daylight saving). */

export function riyadhWindows(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const todayStart = new Date(Date.UTC(year, month - 1, day, -3, 0, 0));
  const weekStart = new Date(Date.UTC(year, month - 1, day - 6, -3, 0, 0));
  return { todayStart, weekStart };
}

export function foldSignups(stamps: string[], todayMs: number, weekMs: number) {
  let today = 0;
  let days7 = 0;
  for (const stamp of stamps) {
    const ms = Date.parse(stamp);
    if (!Number.isFinite(ms) || ms < weekMs) continue;
    days7 += 1;
    if (ms >= todayMs) today += 1;
  }
  return { today, days7 };
}

export function countByPlan(plans: string[]) {
  const counts = new Map<string, number>();
  for (const plan of plans) {
    const key = plan.trim() || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([plan, count]) => ({ plan, count }))
    .sort((a, b) => b.count - a.count || a.plan.localeCompare(b.plan));
}

export type SignupObservation = {
  createdAt: string;
  confirmedAt: string | null;
  source: SourceLabel;
  via: ViaLabel;
  test: boolean;
};

/** Labels stored on the auth user. The email stays out of the observation. */
export function signupObservation(user: {
  created_at?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  email?: string | null;
  user_metadata?: unknown;
}): SignupObservation | null {
  const createdAt = user.created_at || "";
  if (!createdAt) return null;
  return {
    createdAt,
    confirmedAt: user.email_confirmed_at || user.confirmed_at || null,
    source: sourceFromMetadata(user.user_metadata),
    via: viaFromMetadata(user.user_metadata),
    test: isTestRecipient(user.email || ""),
  };
}

export function emptySourceCounts(): Record<SourceLabel, number> {
  return { linkedin: 0, x: 0, email: 0, unknown: 0, not_recorded: 0 };
}

/**
 * Confirmed accounts only. Test addresses are counted aside and omitted from the source buckets.
 * A missing source field is not_recorded. An explicit empty tag is unknown. Neither is a visit.
 */
export function foldConfirmedSignups(rows: SignupObservation[], todayMs: number, weekMs: number) {
  const today = emptySourceCounts();
  const days7 = emptySourceCounts();
  const methods: Record<ViaLabel, number> = { utm: 0, referrer: 0, none: 0, not_recorded: 0 };
  let confirmedToday = 0;
  let confirmed7 = 0;
  let unconfirmed7 = 0;
  let excludedTest = 0;
  for (const row of rows) {
    const created = Date.parse(row.createdAt);
    const confirmed = row.confirmedAt ? Date.parse(row.confirmedAt) : NaN;
    const createdInWeek = Number.isFinite(created) && created >= weekMs;
    const confirmedInWeek = Number.isFinite(confirmed) && confirmed >= weekMs;
    if (row.test) {
      if (createdInWeek || confirmedInWeek) excludedTest += 1;
      continue;
    }
    if (!Number.isFinite(confirmed)) {
      if (createdInWeek) unconfirmed7 += 1;
      continue;
    }
    if (!confirmedInWeek) continue;
    days7[row.source] += 1;
    methods[row.via] += 1;
    confirmed7 += 1;
    if (confirmed >= todayMs) {
      today[row.source] += 1;
      confirmedToday += 1;
    }
  }
  return { confirmedToday, confirmed7, unconfirmed7, excludedTest, today, days7, methods, visits: null, conversion: null };
}

export function sumSar(amounts: Array<number | string | null>) {
  return amounts.reduce<number>((sum, amount) => {
    const value = typeof amount === "number" ? amount : Number(amount);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}
