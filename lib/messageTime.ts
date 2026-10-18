import type { UiLocale } from "@/lib/ksaTime";

/** Fallback when the browser does not expose a time zone. */
export const MESSAGE_TIME_ZONE = "Asia/Riyadh";

export function resolveMessageTimeZone(timeZone?: string): string {
  if (timeZone && timeZone.trim()) return timeZone.trim();
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolved) return resolved;
  } catch {
    /* use the default */
  }
  return MESSAGE_TIME_ZONE;
}

function ymdKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function shiftKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const utc = new Date(Date.UTC(year || 1970, (month || 1) - 1, (day || 1) + days));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function localeTag(locale: UiLocale) {
  return locale === "ar" ? "ar-SA-u-nu-latn" : "en-US";
}

function tidy(value: string) {
  return value.replace(/[\u202f\u00a0]/g, " ").replace(/\s+/g, " ").trim();
}

function clock(date: Date, locale: UiLocale, timeZone: string) {
  return tidy(
    new Intl.DateTimeFormat(localeTag(locale), {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  );
}

function monthDay(date: Date, locale: UiLocale, timeZone: string) {
  return tidy(
    new Intl.DateTimeFormat(localeTag(locale), {
      timeZone,
      month: "short",
      day: "numeric",
    }).format(date)
  );
}

function parsed(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Persistable ISO timestamp. Invalid values are dropped so the database default can apply. */
export function parseCreatedAt(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getUTCFullYear();
  if (year < 2000 || year > 2100) return undefined;
  return date.toISOString();
}

/**
 * Today: "4:32 PM". Yesterday: "Yesterday 4:32 PM". Older: "Oct 16, 4:32 PM".
 * Arabic uses ar-SA with western digits. Missing timestamps stay hidden.
 */
export function formatMessageTime(
  iso: string | null | undefined,
  locale: UiLocale,
  now = new Date(),
  timeZone = MESSAGE_TIME_ZONE
): string | null {
  const date = parsed(iso);
  if (!date) return null;
  const time = clock(date, locale, timeZone);
  const day = ymdKey(date, timeZone);
  const today = ymdKey(now, timeZone);
  if (day === today) return time;
  if (day === shiftKey(today, -1)) return locale === "ar" ? `أمس ${time}` : `Yesterday ${time}`;
  const dateLabel = monthDay(date, locale, timeZone);
  return locale === "ar" ? `${dateLabel}، ${time}` : `${dateLabel}, ${time}`;
}

/** Day chip between messages: "Today", "Yesterday", or the calendar date. */
export function formatDaySeparator(
  iso: string | null | undefined,
  locale: UiLocale,
  now = new Date(),
  timeZone = MESSAGE_TIME_ZONE
): string | null {
  const date = parsed(iso);
  if (!date) return null;
  const day = ymdKey(date, timeZone);
  const today = ymdKey(now, timeZone);
  if (day === today) return locale === "ar" ? "اليوم" : "Today";
  if (day === shiftKey(today, -1)) return locale === "ar" ? "أمس" : "Yesterday";
  return monthDay(date, locale, timeZone);
}

/** Instant for hour:minute on a calendar day offset from `now` in `timeZone`. */
export function isoOnDay(
  dayOffset: number,
  hour: number,
  minute: number,
  now = new Date(),
  timeZone = MESSAGE_TIME_ZONE
): string {
  const key = shiftKey(ymdKey(now, timeZone), dayOffset);
  const [year, month, day] = key.split("-").map(Number);
  let guess = Date.UTC(year || 1970, (month || 1) - 1, day || 1, hour - 3, minute);
  for (let step = 0; step < 4; step += 1) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const pick = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? "0");
    const gotKey = `${pick("year")}-${String(pick("month")).padStart(2, "0")}-${String(pick("day")).padStart(2, "0")}`;
    const [gotYear, gotMonth, gotDay] = gotKey.split("-").map(Number);
    const dayDelta =
      Math.round(Date.UTC(year || 0, (month || 1) - 1, day || 1) - Date.UTC(gotYear || 0, (gotMonth || 1) - 1, gotDay || 1)) /
      86_400_000;
    const minuteDelta = hour * 60 + minute - (pick("hour") * 60 + pick("minute"));
    if (dayDelta === 0 && minuteDelta === 0) break;
    guess += (dayDelta * 24 * 60 + minuteDelta) * 60_000;
  }
  return new Date(guess).toISOString();
}
