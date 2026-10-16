"use client";

import { useLocale } from "@/app/components/LocaleProvider";
import { translate, type Locale, type Messages } from "@/lib/i18n";
import { shellCopy, type ShellCopy } from "@/lib/shell";

export function useMessages(): {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  m: Messages;
  shell: ShellCopy;
  dir: "ltr" | "rtl";
} {
  const { locale, setLocale, dir } = useLocale();
  return {
    locale,
    setLocale,
    m: translate(locale),
    shell: shellCopy[locale],
    dir,
  };
}
