"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  EXTRA_SEAT_SAR,
  PLANS,
  PLAN_COLORS,
  TEAM_INCLUDED_SEATS,
  featureTier,
  formatSar,
  quoteSelfServe,
  type BillingInterval,
  type PlanId,
  type SelfServePlanId,
} from "@/lib/plans";

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
};

export default function PlanCatalog({ heading = "Plans" }: Props) {
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [extraSeats, setExtraSeats] = useState(0);
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function startCheckout(planId: SelfServePlanId) {
    setErrorMsg(null);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setErrorMsg("Create an account and sign in before subscribing.");
      if (window.location.pathname !== "/register") {
        router.push("/login?next=/pricing");
      }
      return;
    }

    setBusyPlan(planId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/checkout/moyasar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          planId,
          interval,
          extraSeats: planId === "team" ? extraSeats : 0,
        }),
      });
      const json = await res.json().catch(() => ({ error: "Could not start payment." }));
      if (!res.ok || !json.url) {
        setErrorMsg(json.error || "Could not start payment. Please try again.");
        return;
      }
      window.location.href = json.url as string;
    } catch (err) {
      console.error(err);
      setErrorMsg("Could not start payment. Please try again.");
    } finally {
      setBusyPlan(null);
    }
  }

  const teamQuote = quoteSelfServe("team", interval, extraSeats);

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
          aria-label="Billing period"
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
                {value === "month" ? "Monthly" : "Annual · 10× monthly"}
              </button>
            );
          })}
        </div>
      </div>

      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0 }}>
        Annual billing is 10× the monthly price. Team and Enterprise prices include VAT.
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
        {PLANS.map((plan) => {
          const color = PLAN_COLORS[plan.id];
          const tier = featureTier(plan.id);
          const tools = TOOL_ACCESS[tier];
          const price =
            plan.id === "team"
              ? formatSar(teamQuote.amountSar, interval)
              : interval === "year"
                ? plan.priceYearly
                : plan.priceMonthly;

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

              <div style={{ fontSize: 18, fontWeight: 800, color, marginBottom: 8 }}>{price}</div>
              {(plan.id === "team" || plan.id === "enterprise") && (
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>VAT included</div>
              )}

              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151", lineHeight: 1.45 }}>
                {plan.features.map((feature) => {
                  const line =
                    plan.id === "team" && feature.startsWith("Extra seat")
                      ? `Extra seat ${formatSar(EXTRA_SEAT_SAR[interval], interval)}`
                      : feature;
                  return (
                    <li key={feature} style={{ marginBottom: 4 }}>
                      {line}
                    </li>
                  );
                })}
              </ul>

              {plan.id === "team" && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                    Extra seats ({formatSar(EXTRA_SEAT_SAR[interval], interval)} each)
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={200}
                      value={extraSeats}
                      onChange={(e) => setExtraSeats(Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
                    />
                  </label>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    {TEAM_INCLUDED_SEATS} included + {teamQuote.extraSeats} extra = {teamQuote.seatLimit} seats.
                  </div>
                </div>
              )}

              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>
                  Engineer tools in this plan
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
                        {enabled ? "Yes" : "Locked"} {tool.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: "auto", paddingTop: 14 }}>
                {plan.id === "assistant" ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "10px 0",
                      borderRadius: 999,
                      background: `${color}14`,
                      color,
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    Included with every account
                  </div>
                ) : plan.id === "enterprise" ? (
                  <Link
                    href="/enterprise"
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "10px 16px",
                      borderRadius: 999,
                      background: color,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    Contact sales
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCheckout(plan.id as SelfServePlanId)}
                    disabled={busyPlan === plan.id}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      borderRadius: 999,
                      border: "none",
                      background: color,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    {busyPlan === plan.id ? "Processing..." : "Subscribe"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
