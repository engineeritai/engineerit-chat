"use client";

import AdvisorPricingNote from "@/app/components/AdvisorPricingNote";
import PricingBoard from "@/app/components/marketing/PricingBoard";
import { useLocale } from "@/app/components/LocaleProvider";
import { getMarketingContent } from "@/lib/marketing";

export default function PricingView() {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);

  return (
    <div className="mkt-section">
      <h1>{content.pricing.title}</h1>
      <p className="mkt-lead">{content.pricing.intro}</p>
      <PricingBoard />
      <AdvisorPricingNote />
    </div>
  );
}
