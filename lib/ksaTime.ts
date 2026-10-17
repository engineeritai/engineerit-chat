export type UiLocale = "en" | "ar";

const ZONE = "Asia/Riyadh";

function parts(now: Date, locale: UiLocale) {
  const formatted = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB", {
    timeZone: ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) => formatted.find((part) => part.type === type)?.value ?? "";
  return { day: pick("day"), month: pick("month"), year: pick("year"), hour: pick("hour"), minute: pick("minute") };
}

/** Calendar date in Asia/Riyadh as YYYY-MM-DD. */
export function riyadhIsoDate(now = new Date()): string {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return formatted;
}

/** Display stamp such as "17 Oct 2026, 02:34 KSA". */
export function riyadhStamp(now = new Date(), locale: UiLocale = "en"): string {
  const { day, month, year, hour, minute } = parts(now, locale);
  const clock = `${hour}:${minute}`;
  if (locale === "ar") return `${day} ${month} ${year}، ${clock} بتوقيت السعودية`;
  return `${day} ${month} ${year}, ${clock} KSA`;
}
