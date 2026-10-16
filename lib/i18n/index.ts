import ar from "./ar";
import en from "./en";
import type { Locale, Messages } from "./types";

export type { AdvisorCopy, Locale, Messages, PlaybookCopy } from "./types";

/**
 * English is the default catalog.
 * Arabic is ready: `ar` has the same keys as `en`.
 * Set localStorage `engineerit_locale` to "ar" or "en" to switch.
 * Adding another locale means a new catalog that satisfies `Messages`.
 */
export const messages: Record<Locale, Messages> = { en, ar };

export const LOCALE_STORAGE_KEY = "engineerit_locale";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ar";
}

export function translate(locale: Locale | null | undefined): Messages {
  if (locale && messages[locale]) return messages[locale];
  return messages.en;
}
