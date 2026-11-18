"use client";

import { useLocale } from "@/app/components/LocaleProvider";
import type { Locale } from "@/lib/i18n";

export default function LanguageToggle({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { locale, setLocale } = useLocale();
  const english = "EN";
  const arabic = "AR";

  function choose(next: Locale) {
    setLocale(next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }

  return (
    <div
      className={`lang-toggle${compact ? " is-compact" : ""} ${className}`.trim()}
      dir="ltr"
      role="group"
      aria-label={locale === "ar" ? "اللغة" : "Language"}
    >
      <a
        href="?lang=en"
        hrefLang="en"
        lang="en"
        aria-current={locale === "en" ? "page" : undefined}
        onClick={(event) => {
          event.preventDefault();
          choose("en");
        }}
      >
        {english}
      </a>
      <span className="lang-sep" aria-hidden="true">
        |
      </span>
      <a
        href="?lang=ar"
        hrefLang="ar"
        lang="ar"
        aria-current={locale === "ar" ? "page" : undefined}
        onClick={(event) => {
          event.preventDefault();
          choose("ar");
        }}
      >
        {arabic}
      </a>
    </div>
  );
}
