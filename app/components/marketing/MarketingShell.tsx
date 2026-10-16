import type { ReactNode } from "react";
import { getMarketingContent, type Locale } from "@/lib/marketing";
import MarketingFooter from "@/app/components/marketing/MarketingFooter";
import MarketingHeader from "@/app/components/marketing/MarketingHeader";

export default function MarketingShell({
  locale = "en",
  children,
}: {
  locale?: Locale;
  children: ReactNode;
}) {
  const content = getMarketingContent(locale);

  return (
    <div className="mkt" dir={content.dir} lang={content.htmlLang}>
      <MarketingHeader locale={locale} />
      <main>{children}</main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
