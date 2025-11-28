"use client";

import React, { useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

const PLAN_COLORS: Record<PlanId, string> = {
  assistant: "#2563eb", // blue
  engineer: "#f97316", // orange
  professional: "#0f766e", // teal
  consultant: "#7c3aed", // purple
};

// خلفية فاتحة للأيقونة والزر
const PLAN_LIGHT_BG: Record<PlanId, string> = {
  assistant: "rgba(37,99,235,0.08)",
  engineer: "rgba(249,115,22,0.08)",
  professional: "rgba(15,118,110,0.08)",
  consultant: "rgba(124,58,237,0.08)",
};

export default function SubscriptionPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(null);
  const [savingPlanId, setSavingPlanId] = useState<PlanId | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function handleSelect(planId: PlanId) {
    try {
      setErrorMsg(null);
      setInfoMsg(null);
      setSavingPlanId(planId);

      // 1) Assistant (free) → نفس السلوك القديم: حفظ الخطة فقط بدون دفع
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
          .catch(() => ({ error: "Could not save subscription." }));

        if (!res.ok) {
          setErrorMsg(json.error || "Could not save subscription.");
          return;
        }

        setSelectedPlanId(planId);
        setInfoMsg(
          "Your plan has been saved. You can continue from your profile page."
        );
        return;
      }

      // 2) Paid plans: Engineer / Professional / Consultant → مويسر
      const res = await fetch("/api/checkout/moyasar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // مويسر API تتوقع planId = engineer | professional | consultant
        body: JSON.stringify({ planId }),
      });

      const json = await res
        .json()
        .catch(() => ({ error: "Could not start payment." }));

      if (!res.ok || !json.url) {
        setErrorMsg(
          json.error || "Could not start payment. Please try again."
        );
        return;
      }

      // Redirect to Moyasar payment page
      window.location.href = json.url as string;
    } catch (err) {
      console.error(err);
      setErrorMsg("Could not process your request. Please try again.");
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
          <h1 className="page-title">Plans &amp; Subscription</h1>
          <p className="page-subtitle">
            Choose your level: Assistant, Engineer, Professional Engineer, or
            Consultant Engineer.
          </p>

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

          {/* GRID مشابه لصفحة التسجيل */}
          <div
            className="plans-grid"
            style={{
              display: "grid",
              gap: 24,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            {PLANS.map((plan) => {
              const id = plan.id as PlanId;
              const color = PLAN_COLORS[id];
              const lightBg = PLAN_LIGHT_BG[id];
              const isSelected = selectedPlanId === id;
              const isSaving = savingPlanId === id;

              const letter = (plan.shortName || plan.name || "E")
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
                    minHeight: 360,
                    boxShadow: isSelected
                      ? "0 14px 35px rgba(15,23,42,0.18)"
                      : "0 4px 12px rgba(15,23,42,0.04)",
                    transition:
                      "box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease",
                  }}
                >
                  {/* رأس الكرت: دائرة الحرف + الاسم + الوصف القصير */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
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

                  {/* المميزات – تملأ ارتفاع الكرت */}
                  <ul
                    style={{
                      listStyle: "disc",
                      paddingLeft: 20,
                      margin: 0,
                      marginTop: 4,
                      fontSize: 14,
                      color: "#374151",
                      flexGrow: 1,
                    }}
                  >
                    {plan.features.map((f) => (
                      <li key={f} style={{ marginBottom: 6 }}>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* زر الاختيار في الأسفل */}
                  <button
                    type="button"
                    onClick={() => handleSelect(id)}
                    disabled={isSaving}
                    style={{
                      marginTop: 18,
                      width: "100%",
                      padding: "10px 16px",
                      borderRadius: 9999,
                      border: "none",
                      backgroundColor: lightBg,
                      color,
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    {isSaving
                      ? "Saving..."
                      : isSelected
                      ? "Selected ✓"
                      : "Select"}
                  </button>
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
              Back to profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
