"use client";

import { PRICING_PLAN_IDS, planIncludesAdvisors, type AdvisorPlanId } from "@/lib/advisors";
import { ENTERPRISE_PLAN, TEAM_PLAN } from "@/lib/pricingDisplay";
import { useMessages } from "@/lib/useMessages";

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export default function AdvisorPricingNote() {
  const { locale, m } = useMessages();

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
        from: ENTERPRISE_PLAN.monthlySarFrom.toLocaleString(locale === "ar" ? "ar-SA" : "en-US"),
      });
    }
    return null;
  };

  return (
    <div className="advisor-table-wrap">
      <h2>{m.pricing.availabilityTitle}</h2>
      <p>{m.pricing.availabilityNote}</p>
      <p>{m.pricing.advisorsIncluded}</p>
      <p>{m.pricing.teamEnterpriseNote}</p>
      <table className="advisor-table">
        <thead>
          <tr>
            <th>{m.pricing.planColumn}</th>
            <th>{m.pricing.accessColumn}</th>
          </tr>
        </thead>
        <tbody>
          {PRICING_PLAN_IDS.map((planId) => {
            const included = planIncludesAdvisors(planId);
            const price = priceNote(planId);
            return (
              <tr key={planId}>
                <td>
                  {m.plans[planId as Exclude<typeof planId, "guest">]}
                  {price ? <div className="advisor-plan-price">{price}</div> : null}
                </td>
                <td>{included ? m.pricing.included : m.pricing.locked}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
