"use client";

import { useLocale } from "@/app/components/LocaleProvider";

export default function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={`lang-toggle ${className}`.trim()}
      dir="ltr"
      role="group"
      aria-label={locale === "ar" ? "اللغة" : "Language"}
    >
      <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>
        EN
      </button>
      <span className="lang-sep" aria-hidden="true">
        |
      </span>
      <button type="button" aria-pressed={locale === "ar"} onClick={() => setLocale("ar")}>
        العربية
      </button>
    </div>
  );
}
