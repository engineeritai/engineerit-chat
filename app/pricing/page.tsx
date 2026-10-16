"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { PLANS } from "@/lib/plans";
import { PRICING_PLAN_IDS, planIncludesAdvisors, type AdvisorPlanId } from "@/lib/advisors";
import { useMessages } from "@/lib/useMessages";

const KNOWN_PLAN_IDS = new Set<string>(PRICING_PLAN_IDS);

export default function PricingPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const { m, dir } = useMessages();

  return (
    <div className="app-shell" dir={dir}>
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />
      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />
        <div className="page-wrap">
          <h1 className="page-title">{m.pricing.title}</h1>
          <p className="page-subtitle">{m.pricing.subtitle}</p>

          <div className="advisor-grid">
            {PLANS.map((plan) => {
              const included = planIncludesAdvisors(plan.id);
              const advisorLine = included
                ? m.pricing.advisorsIncluded
                : m.pricing.advisorsLocked;
              const features = plan.features.some((feature) =>
                feature.toLowerCase().includes("ai advisor")
              )
                ? plan.features
                : [...plan.features, advisorLine];

              return (
                <article key={plan.id} className="card advisor-card">
                  <div className="advisor-card-top">
                    <h2>{plan.name}</h2>
                    <span className={included ? "advisor-badge advisor-badge-on" : "advisor-badge"}>
                      {included ? m.pricing.included : m.pricing.locked}
                    </span>
                  </div>
                  <div className="plan-price">
                    <div>{plan.priceMonthly}</div>
                  </div>
                  <p className="plan-tagline">{plan.tagline}</p>
                  <h3 className="advisor-feature-label">{m.pricing.featureListTitle}</h3>
                  <ul className="advisor-capabilities">
                    {features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <h2 className="section-heading" style={{ marginTop: 28 }}>
            {m.pricing.availabilityTitle}
          </h2>
          <p className="page-subtitle">{m.pricing.availabilityNote}</p>
          <div className="card advisor-table-wrap">
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
                      <td>{planLabel(planId, m.plans)}</td>
                      <td>{included ? m.pricing.included : m.pricing.locked}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="page-subtitle" style={{ marginTop: 12 }}>
            {m.pricing.teamEnterpriseNote}
          </p>
          <Link href="/subscription" className="gate-btn gate-btn-primary">
            {m.pricing.manageCta}
          </Link>
        </div>
      </div>
    </div>
  );
}

function planLabel(
  planId: AdvisorPlanId,
  labels: { [key in Exclude<AdvisorPlanId, "guest">]: string }
) {
  if (planId === "guest") return labels.assistant;
  if (!KNOWN_PLAN_IDS.has(planId)) return planId;
  return labels[planId as Exclude<AdvisorPlanId, "guest">];
}
