import { isLocale, LOCALE_STORAGE_KEY, type Locale } from "@/lib/i18n";

export const LOCALE_COOKIE = "engineerit_locale";

export function preferLocale(acceptLanguage: string | null | undefined): Locale {
  const header = acceptLanguage ?? "";
  const parts = header.split(",").map((part) => part.trim().split(";")[0]?.toLowerCase() ?? "");
  for (const part of parts) {
    if (part.startsWith("ar")) return "ar";
    if (part.startsWith("en")) return "en";
  }
  return "en";
}

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode */
  }
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function applyDocumentLocale(locale: Locale) {
  const root = document.documentElement;
  root.lang = locale === "ar" ? "ar" : "en";
  root.dir = locale === "ar" ? "rtl" : "ltr";
}
