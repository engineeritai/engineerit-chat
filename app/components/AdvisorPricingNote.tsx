"use client";

import { PRICING_PLAN_IDS, planIncludesAdvisors } from "@/lib/advisors";
import { useMessages } from "@/lib/useMessages";

export default function AdvisorPricingNote() {
  const { m } = useMessages();

  return (
    <div className="advisor-table-wrap">
      <h2>{m.pricing.availabilityTitle}</h2>
      <p>{m.pricing.availabilityNote}</p>
      <p>{m.pricing.advisorsIncluded}</p>
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
            return (
              <tr key={planId}>
                <td>{m.plans[planId as Exclude<typeof planId, "guest">]}</td>
                <td>{included ? m.pricing.included : m.pricing.locked}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
