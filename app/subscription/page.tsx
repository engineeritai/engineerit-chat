"use client";

import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";
import { localizedPlan, toolLabel } from "@/lib/labels";
import { useMessages } from "@/lib/useMessages";
import { supabase } from "@/lib/supabaseClient";

const PLAN_COLORS: Record<PlanId, string> = {
  assistant: "#2563eb", // blue
  engineer: "#f97316", // orange
  professional: "#0f766e", // teal
  consultant: "#7c3aed", // purple
};

// خلفية فاتحة للأيقونة
const PLAN_LIGHT_BG: Record<PlanId, string> = {
  assistant: "rgba(37,99,235,0.08)",
  engineer: "rgba(249,115,22,0.08)",
  professional: "rgba(15,118,110,0.08)",
  consultant: "rgba(124,58,237,0.08)",
};

/* ============================
   Engineer tools configuration
   ============================ */

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

/**
 * صلاحيات الأدوات حسب نوع الاشتراك:
 * - Assistant: الكل مقفول
 * - Engineer: Drawing + Design
 * - Professional: + ITP & BOQ
 * - Consultant: كل الأدوات
 */
const TOOL_ACCESS: Record<PlanId, ToolId[]> = {
  assistant: [],
  engineer: ["drawing", "design"],
  professional: ["drawing", "design", "itp", "boq"],
  consultant: [
    "drawing",
    "design",
    "itp",
    "boq",
    "schedule",
    "value",
    "dashboard",
  ],
};

function hasTool(planId: PlanId, toolId: ToolId) {
  return TOOL_ACCESS[planId]?.includes(toolId);
}

export default function SubscriptionPage() {
  const { locale, shell: s } = useMessages();
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(null);
  const [savingPlanId, setSavingPlanId] = useState<PlanId | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const router = useRouter();

  // نتحقق هل المستخدم مسجل دخول أو لا
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsLoggedIn(!!user);
    };

    void checkAuth();
  }, []);

  async function handleSelect(planId: PlanId) {
    try {
      setErrorMsg(null);
      setInfoMsg(null);

      // لو المستخدم مو مسجل → نمنع الاشتراك ونحوّله للتسجيل
      if (!isLoggedIn) {
        setErrorMsg(s.subscription.loginRequired);
        router.push("/register");
        return;
      }

      setSavingPlanId(planId);

      // 1) Assistant (free) → يحفظ الخطة بدون دفع
      if (planId === "assistant") {
        const res = await fetch("/api/subscription/select", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: planId }),
        });

        const json = await res
          .json()
          .catch(() => ({ error: s.subscription.saveFailed }));

        if (!res.ok) {
          setErrorMsg(json.error || s.subscription.saveFailed);
          return;
        }

        setSelectedPlanId(planId);
        setInfoMsg(
          s.subscription.freeSaved
        );
        return;
      }

      // 2) Paid plans → Engineer / Professional / Consultant → Moyasar checkout
      const res = await fetch("/api/checkout/moyasar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });

      const json = await res
        .json()
        .catch(() => ({ error: s.subscription.paymentStartFailed }));

      if (!res.ok || !json.url) {
        setErrorMsg(json.error || s.subscription.paymentStartFailed);
        return;
      }

      window.location.href = json.url as string;
    } catch (err) {
      console.error(err);
      setErrorMsg(s.subscription.processFailed);
    } finally {
      setSavingPlanId(null);
    }
  }

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      <div className="main">
        <Header
          onToggleSidebar={() =>
            setIsSidebarOpenMobile((prev) => !prev)
          }
        />

        <div className="page-wrap">
          <h1 className="page-title">{s.subscription.title}</h1>
          <p className="page-subtitle">{s.subscription.lead}</p>

          {errorMsg && (
            <p
              style={{
                color: "#b91c1c",
                marginBottom: 12,
                fontSize: 14,
              }}
            >
              {errorMsg}
            </p>
          )}

          {infoMsg && (
            <p
              style={{
                color: "#16a34a",
                marginBottom: 12,
                fontSize: 14,
              }}
            >
              {infoMsg}
            </p>
          )}

          {/* GRID – نفس روح صفحة التسجيل، بدون سكرول أفقي */}
          <div
            className="plans-grid"
            style={{
              display: "grid",
              gap: 24,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            {PLANS.map((rawPlan) => {
              const plan = localizedPlan(locale, rawPlan);
              const id = plan.id as PlanId;
              const color = PLAN_COLORS[id];
              const lightBg = PLAN_LIGHT_BG[id];
              const isSelected = selectedPlanId === id;
              const isSaving = savingPlanId === id;

              const letter = (rawPlan.shortName || plan.name || "E")
                .charAt(0)
                .toUpperCase();

              return (
                <div
                  key={plan.id}
                  className="plan-card"
                  style={{
                    borderRadius: 28,
                    border: isSelected
                      ? `2px solid ${color}`
                      : "1px solid #e5e7eb",
                    padding: 24,
                    backgroundColor: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 380,
                    boxShadow: isSelected
                      ? "0 14px 35px rgba(15,23,42,0.18)"
                      : "0 4px 12px rgba(15,23,42,0.04)",
                    transition:
                      "box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease",
                  }}
                >
                  {/* رأس الكرت */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "9999px",
                        backgroundColor: lightBg,
                        color: color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        fontWeight: 700,
                        marginRight: 14,
                        flexShrink: 0,
                      }}
                    >
                      {letter}
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#111827",
                          marginBottom: 2,
                        }}
                      >
                        {plan.name}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#6b7280",
                          lineHeight: 1.35,
                        }}
                      >
                        {plan.tagline}
                      </div>
                    </div>
                  </div>

                  {/* السعر */}
                  <div style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color,
                      }}
                    >
                      {plan.priceMonthly}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginTop: 2,
                      }}
                    >
                      {plan.priceYearly}
                    </div>
                  </div>

                  {/* المميزات العامة */}
                  <ul
                    style={{
                      listStyle: "disc",
                      paddingLeft: 20,
                      margin: 0,
                      marginTop: 4,
                      fontSize: 14,
                      color: "#374151",
                    }}
                  >
                    {plan.features.map((f:string) => (
                      <li key={f} style={{ marginBottom: 6 }}>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Engineer tools لهذه الخطة */}
                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#6b7280",
                        marginBottom: 6,
                      }}
                    >
                      {s.subscription.toolsInPlan}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {ENGINEER_TOOLS.map((tool) => {
                        const enabled = hasTool(id, tool.id);
                        return (
                          <div
                            key={tool.id}
                            style={{
                              fontSize: 11,
                              padding: "4px 8px",
                              borderRadius: 999,
                              border: enabled
                                ? `1px solid ${color}`
                                : "1px solid #e5e7eb",
                              backgroundColor: enabled ? lightBg : "#f9fafb",
                              color: enabled ? color : "#6b7280",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {enabled ? "✅" : "🔒"} {toolLabel(locale, tool.id)}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* زر الاشتراك / الترقية أو شريط الخطة المجانية */}
                  {id === "assistant" ? (
                    <div
                      style={{
                        marginTop: 16,
                        width: "100%",
                        padding: "10px 0",
                        borderRadius: 9999,
                        backgroundColor: lightBg,
                        color,
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: 14,
                        opacity: 0.95,
                      }}
                    >
                      {s.subscription.freePlan}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelect(id)}
                      disabled={isSaving}
                      style={{
                        marginTop: 16,
                        width: "100%",
                        padding: "10px 16px",
                        borderRadius: 9999,
                        border: "none",
                        backgroundColor: color,
                        color: "#ffffff",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      {isSaving ? s.subscription.processing : s.subscription.subscribe}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* زر الرجوع للبروفايل */}
          <div
            style={{
              marginTop: 32,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Link
              href="/profile"
              className="btn"
              style={{
                textDecoration: "none",
                padding: "10px 20px",
                borderRadius: 9999,
                backgroundColor: "#e5e7eb",
                color: "#111827",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {s.subscription.back}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}