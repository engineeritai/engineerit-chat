import { cookies, headers } from "next/headers";
import { isLocale, type Locale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/locale";

/**
 * English unless this request asked for Arabic.
 * `?lang=` is copied onto `x-engineerit-locale` by the proxy, because the
 * root layout cannot read the query string. A cookie applies only when the
 * URL does not name a language, so the English canonical URL stays English
 * for crawlers.
 */
export async function requestLocale(): Promise<Locale> {
  const headerStore = await headers();
  const hinted = headerStore.get("x-engineerit-locale");
  if (isLocale(hinted)) return hinted;
  const jar = await cookies();
  const stored = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;
  return "en";
}
