"use client";

import { useLocale } from "@/app/components/LocaleProvider";
import { getMarketingContent } from "@/lib/marketing";

export default function PriceRateNote() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);

  return <p className="mkt-price-footnote">{content.pricing.rateNote}</p>;
}
