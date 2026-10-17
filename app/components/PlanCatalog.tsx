"use client";

import { useState } from "react";
import { useMessages } from "@/lib/useMessages";
import { featuresForLocale, localizedPlan, toolLabel } from "@/lib/labels";
import { getMarketingContent } from "@/lib/marketing";
import {
  PLANS,
  PLAN_COLORS,
  extraSeatPrice,
  featureTier,
  includedSeats,
  quoteSelfServe,
  type BillingInterval,
} from "@/lib/plans";
import { planPriceLabel } from "@/lib/pricingDisplay";
import BuyPlanButton from "@/app/components/BuyPlanButton";
import PriceRateNote from "@/app/components/marketing/PriceRateNote";
import { FeatureLine, SarText } from "@/app/components/RiyalAmount";

const ENGINEER_TOOLS = [
  { id: "drawing", label: "Drawing & Diagrams" },
  { id: "design", label: "Design & Code Check" },
  { id: "itp", label: "ITP & QA/QC" },
  { id: "boq", label: "BOQ & Quantities" },
  { id: "schedule", label: "Schedule & Resources" },
  { id: "value", label: "Value Engineering" },
  { id: "dashboard", label: "Project Dashboards" },
] as const;

type ToolId = (typeof ENGINEER_TOOLS)[number]["id"];

const TOOL_ACCESS: Record<"assistant" | "engineer" | "professional" | "consultant", ToolId[]> = {
  assistant: [],
  engineer: ["drawing", "design"],
  professional: ["drawing", "design", "itp", "boq"],
  consultant: ["drawing", "design", "itp", "boq", "schedule", "value", "dashboard"],
};

type Props = {
  heading?: string;
  verb?: "buy" | "upgrade";
};

export default function PlanCatalog({ heading = "Plans", verb = "buy" }: Props) {
  const { locale, shell: s } = useMessages();
  const content = getMarketingContent(locale);
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [extraSeats, setExtraSeats] = useState({ team: 0, enterprise: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h2 className="card-title" style={{ margin: 0 }}>
          {heading}
        </h2>
        <div
          role="group"
          aria-label={`${content.pricing.monthly}. ${content.pricing.annual}`}
          style={{
            display: "inline-flex",
            border: "1px solid #e5e7eb",
            borderRadius: 999,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {(["month", "year"] as BillingInterval[]).map((value) => {
            const active = interval === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setInterval(value)}
                style={{
                  border: "none",
                  background: active ? "#111827" : "transparent",
                  color: active ? "#fff" : "#374151",
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {value === "month" ? content.pricing.monthly : `${content.pricing.annual} · ${content.pricing.twoMonthsFree}`}
              </button>
            );
          })}
        </div>
      </div>

      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0 }}>
        {content.pricing.annualExplainer}
      </p>

      {errorMsg && (
        <p style={{ color: "#b91c1c", fontSize: 14, marginTop: 0 }}>{errorMsg}</p>
      )}

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        }}
      >
        {PLANS.map((source) => {
          const plan = localizedPlan(locale, source);
          const color = PLAN_COLORS[plan.id];
          const tier = featureTier(plan.id);
          const tools = TOOL_ACCESS[tier];
          const firmId = plan.id === "team" || plan.id === "enterprise" ? plan.id : null;
          const planExtra = firmId ? extraSeats[firmId] : 0;
          const price = planPriceLabel(plan.id, interval, planExtra, locale);
          const seatQuote = firmId ? quoteSelfServe(firmId, interval, planExtra) : null;
          const features = featuresForLocale(locale, source, interval);

          return (
            <div
              key={plan.id}
              style={{
                borderRadius: 24,
                border: "1px solid #e5e7eb",
                padding: 18,
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                minHeight: 360,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    background: `${color}14`,
                    color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {plan.shortName}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{plan.name}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.35 }}>{plan.tagline}</div>
                </div>
              </div>

              <div style={{ fontSize: 18, fontWeight: 800, color, marginBottom: 4 }}>
                <SarText>{price.primary}</SarText>
              </div>
              {price.usd && (
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                  {content.pricing.approx} {price.usd}
                </div>
              )}

              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151", lineHeight: 1.45 }}>
                {features.map((feature) => (
                  <li key={feature} style={{ marginBottom: 4 }}>
                    <FeatureLine>{feature}</FeatureLine>
                  </li>
                ))}
              </ul>

              {firmId && seatQuote && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                    <SarText>
                      {locale === "ar"
                        ? `مقاعد إضافية (${extraSeatPrice(firmId)[interval].toLocaleString("en-US")} ر.س)`
                        : `Extra seats (SAR ${extraSeatPrice(firmId)[interval].toLocaleString("en-US")})`}
                    </SarText>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={200}
                      value={planExtra}
                      onChange={(e) =>
                        setExtraSeats((current) => ({
                          ...current,
                          [firmId]: Math.max(0, Math.min(200, Number(e.target.value) || 0)),
                        }))
                      }
                    />
                  </label>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    {locale === "ar"
                      ? `${includedSeats(firmId)} مشمولة + ${seatQuote.extraSeats} إضافية = ${seatQuote.seatLimit} مقاعد.`
                      : `${includedSeats(firmId)} included + ${seatQuote.extraSeats} extra = ${seatQuote.seatLimit} seats.`}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>
                  {s.auth.toolsInPlan}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ENGINEER_TOOLS.map((tool) => {
                    const enabled = tools.includes(tool.id);
                    return (
                      <span
                        key={tool.id}
                        style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: enabled ? `1px solid ${color}` : "1px solid #e5e7eb",
                          color: enabled ? color : "#9ca3af",
                          background: enabled ? `${color}10` : "#f9fafb",
                        }}
                      >
                        {enabled ? (locale === "ar" ? "نعم" : "Yes") : locale === "ar" ? "مقفل" : "Locked"}{" "}
                        {toolLabel(locale, tool.id)}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: "auto", paddingTop: 14 }}>
                <BuyPlanButton
                  planId={plan.id}
                  interval={interval}
                  extraSeats={planExtra}
                  verb={verb}
                  onError={setErrorMsg}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "center",
                    padding: "10px 16px",
                    borderRadius: 999,
                    border: "none",
                    background: color,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    textDecoration: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <PriceRateNote />
    </div>
  );
}
