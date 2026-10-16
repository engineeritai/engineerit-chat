import { PLANS, type BillingInterval } from "@/lib/plans";
import { displayFeatures, planPriceLabel } from "@/lib/pricingDisplay";

export default function PlanPriceList({
  interval = "month",
  showFeatures = false,
}: {
  interval?: BillingInterval;
  showFeatures?: boolean;
}) {
  return (
    <ul className="mkt-bullets">
      {PLANS.map((plan) => {
        const month = planPriceLabel(plan.id, "month");
        const year = planPriceLabel(plan.id, "year");
        const shown = interval === "year" ? year : month;
        return (
          <li key={plan.id}>
            <strong>{plan.name}</strong>
            {": "}
            {month.primary}
            {month.usd ? ` (approx. ${month.usd})` : ""}
            {year.amountSar > 0 ? ` · ${year.primary} (approx. ${year.usd})` : ""}
            {showFeatures && (
              <ul>
                {displayFeatures(plan, shown.amountSar > 0 && interval === "year" ? "year" : "month").map(
                  (feature) => (
                    <li key={feature}>{feature}</li>
                  )
                )}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
