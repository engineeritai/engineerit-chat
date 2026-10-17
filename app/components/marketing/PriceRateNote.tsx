"use client";

import { useLocale } from "@/app/components/LocaleProvider";
import { FeatureLine } from "@/app/components/RiyalAmount";
import { getMarketingContent } from "@/lib/marketing";

export default function PriceRateNote() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);

  return (
    <p className="mkt-price-footnote">
      <FeatureLine>{content.pricing.rateNote}</FeatureLine>
    </p>
  );
}
