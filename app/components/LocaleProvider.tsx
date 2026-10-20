"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { applyDocumentLocale, persistLocale, readStoredLocale } from "@/lib/locale";
import { metaFor } from "@/lib/pageMeta";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: "ltr" | "rtl";
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(isLocale(initialLocale) ? initialLocale : "en");
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.dataset.hydrated = "1";
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("lang");
    if (isLocale(query)) {
      if (query !== locale) setLocaleState(query);
      return;
    }
    const stored = readStoredLocale();
    if (stored && stored !== locale) setLocaleState(stored);
    // Only reconcile storage on the first client load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyDocumentLocale(locale);
    persistLocale(locale);
    const meta = metaFor(locale, pathname || "/");
    document.title = meta.title;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", meta.description);
  }, [locale, pathname]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      dir: locale === "ar" ? "rtl" : "ltr",
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    return { locale: "en", setLocale: () => undefined, dir: "ltr" };
  }
  return value;
}
