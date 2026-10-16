"use client";

import { useEffect, useState } from "react";
import { isLocale, LOCALE_STORAGE_KEY, translate, type Locale, type Messages } from "@/lib/i18n";

export function useMessages(): {
  locale: Locale;
  m: Messages;
  dir: "ltr" | "rtl";
} {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(stored)) setLocale(stored);
    } catch {
      /* keep English */
    }
  }, []);

  return {
    locale,
    m: translate(locale),
    dir: locale === "ar" ? "rtl" : "ltr",
  };
}
