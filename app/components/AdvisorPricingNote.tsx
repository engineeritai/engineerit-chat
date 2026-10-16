"use client";

import { ADVISOR_ACCESS, PRICING_PLAN_IDS, type AdvisorPlanId } from "@/lib/advisors";
import { ENTERPRISE_EXTRA_SEAT_SAR, ENTERPRISE_INCLUDED_SEATS } from "@/lib/plans";
import { ENTERPRISE_PLAN, TEAM_PLAN } from "@/lib/pricingDisplay";
import { useMessages } from "@/lib/useMessages";
import PriceRateNote from "@/app/components/marketing/PriceRateNote";
import { SarText } from "@/app/components/RiyalAmount";

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export default function AdvisorPricingNote() {
  const { m } = useMessages();

  const priceNote = (planId: AdvisorPlanId) => {
    if (planId === "team") {
      return fill(m.pricing.teamPrice, {
        monthly: TEAM_PLAN.monthlySar,
        seats: TEAM_PLAN.includedSeats,
        extra: TEAM_PLAN.extraSeatMonthlySar,
      });
    }
    if (planId === "enterprise") {
      return fill(m.pricing.enterprisePrice, {
        monthly: ENTERPRISE_PLAN.monthlySarFrom.toLocaleString("en-US"),
        seats: ENTERPRISE_INCLUDED_SEATS,
        extra: ENTERPRISE_EXTRA_SEAT_SAR.month,
      });
    }
    return null;
  };

  return (
    <div className="advisor-table-wrap">
      <h2>{m.pricing.availabilityTitle}</h2>
      <p>{m.pricing.availabilityNote}</p>
      <table className="advisor-table">
        <thead>
          <tr>
            <th>{m.pricing.planColumn}</th>
            <th>{m.pricing.accessColumn}</th>
          </tr>
        </thead>
        <tbody>
          {PRICING_PLAN_IDS.map((planId) => {
            const advisors = ADVISOR_ACCESS[planId];
            const price = priceNote(planId);
            const access =
              advisors.length > 0
                ? advisors.map((id) => m.advisors.items[id].name).join(" · ")
                : m.pricing.locked;
            return (
              <tr key={planId}>
                <td>
                  {m.plans[planId as Exclude<typeof planId, "guest">]}
                  {price ? (
                    <div className="advisor-plan-price">
                      <SarText>{price}</SarText>
                    </div>
                  ) : null}
                </td>
                <td>{access}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <PriceRateNote />
    </div>
  );
}
