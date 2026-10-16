"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/app/components/LocaleProvider";
import MarketingFooter from "@/app/components/marketing/MarketingFooter";
import MarketingHeader from "@/app/components/marketing/MarketingHeader";

export default function MarketingShell({ children }: { children: ReactNode }) {
  const { locale, dir } = useLocale();

  return (
    <div className="mkt" dir={dir} lang={locale === "ar" ? "ar" : "en"}>
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
