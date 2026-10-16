"use client";

import { useLocale } from "@/app/components/LocaleProvider";
import { SarText } from "@/app/components/RiyalAmount";
import { getMarketingContent } from "@/lib/marketing";

export default function PriceRateNote() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);

  return (
    <p className="mkt-price-footnote">
      <SarText>{content.pricing.rateNote}</SarText>
    </p>
  );
}
