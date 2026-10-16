import { cookies, headers } from "next/headers";
import { isLocale, type Locale } from "@/lib/i18n";
import { LOCALE_COOKIE, preferLocale } from "@/lib/locale";

export async function requestLocale(): Promise<Locale> {
  const jar = await cookies();
  const stored = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;
  const accept = (await headers()).get("accept-language");
  return preferLocale(accept);
}
