"use client";

import { useLocale } from "@/app/components/LocaleProvider";

export default function LanguageToggle({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { locale, setLocale } = useLocale();
  const english = compact ? "EN" : locale === "ar" ? "الإنجليزية" : "English";
  const arabic = compact ? "AR" : locale === "ar" ? "العربية" : "Arabic";

  return (
    <div
      className={`lang-toggle ${className}`.trim()}
      dir="ltr"
      role="group"
      aria-label={locale === "ar" ? "اللغة" : "Language"}
    >
      <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>
        {english}
      </button>
      <span className="lang-sep" aria-hidden="true">
        |
      </span>
      <button type="button" aria-pressed={locale === "ar"} onClick={() => setLocale("ar")}>
        {arabic}
      </button>
    </div>
  );
}
