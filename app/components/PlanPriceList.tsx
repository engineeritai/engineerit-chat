"use client";

import { useLocale } from "@/app/components/LocaleProvider";
import { featuresForLocale, localizedPlan } from "@/lib/labels";
import { getMarketingContent } from "@/lib/marketing";
import { PLANS, type BillingInterval } from "@/lib/plans";
import { planPriceLabel } from "@/lib/pricingDisplay";
import PriceRateNote from "@/app/components/marketing/PriceRateNote";
import { SarText } from "@/app/components/RiyalAmount";

export default function PlanPriceList({
  interval = "month",
  showFeatures = false,
}: {
  interval?: BillingInterval;
  showFeatures?: boolean;
}) {
  const { locale } = useLocale();
  const content = getMarketingContent(locale);

  return (
    <div>
      <ul className="mkt-bullets">
      {PLANS.map((source) => {
        const plan = localizedPlan(locale, source);
        const month = planPriceLabel(plan.id, "month", 0, locale);
        const year = planPriceLabel(plan.id, "year", 0, locale);
        const shown = interval === "year" ? year : month;
        return (
          <li key={plan.id}>
            <strong>{plan.name}</strong>
            {": "}
            <SarText>{month.primary}</SarText>
            {month.usd ? ` (${content.pricing.approx} ${month.usd})` : ""}
            {year.amountSar > 0 ? (
              <>
                {" · "}
                <SarText>{year.primary}</SarText>
                {` (${content.pricing.approx} ${year.usd})`}
              </>
            ) : (
              ""
            )}
            {showFeatures && (
              <ul>
                {featuresForLocale(
                  locale,
                  source,
                  shown.amountSar > 0 && interval === "year" ? "year" : "month"
                ).map((feature) => (
                  <li key={feature}>
                    <SarText>{feature}</SarText>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
      </ul>
      <PriceRateNote />
    </div>
  );
}
