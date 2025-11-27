"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { plans } from "@/lib/subscriptions";

const planFeatures: Record<
  string,
  { subtitle: string; bullets: string[] }
> = {
  assistant: {
    subtitle: "Basic access to Engineerit AI",
    bullets: [
      "AI chat in all disciplines",
      "Read Word, Excel, PowerPoint, PDF",
      "Simple PFD / P&ID / block diagrams",
      "Basic data digitization (tables & tags)",
    ],
  },
  engineer: {
    subtitle: "More AI power and extended limits",
    bullets: [
      "Everything in Assistant plan",
      "Export Word, Excel & PowerPoint outputs",
      "Technical report drafts",
      "Engineering calculation sheets",
    ],
  },
  professional: {
    subtitle: "Advanced AI tools and design checks",
    bullets: [
      "Everything in Engineer plan",
      "Advanced designs, equations, & formulas",
      "Finite element & modeling (where available)",
      "ITP & QA/QC checklist templates",
    ],
  },
  consultant: {
    subtitle: "Full professional suite for consultants",
    bullets: [
      "Everything in Professional plan",
      "Equipment list & BOQ extraction",
      "Value engineering packages",
      "Resource, cost, and schedule helpers",
    ],
  },
};

// ألوان وأيقونات كل خطة (مثل صفحة التسجيل تقريباً)
const planIcons: Record<
  string,
  { label: string; fg: string; bg: string }
> = {
  assistant: { label: "A", fg: "#1d4ed8", bg: "#eff6ff" }, // أزرق
  engineer: { label: "E", fg: "#ea580c", bg: "#fff7ed" }, // برتقالي
  professional: { label: "P", fg: "#059669", bg: "#ecfdf3" }, // أخضر
  consultant: { label: "C", fg: "#7c3aed", bg: "#f5f3ff" }, // بنفسجي
};

export default function SubscriptionPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleSelect(planId: string) {
    try {
      setErrorMsg(null);
      setSelectedPlan(planId);
      setLoadingPlan(planId);

      const res = await fetch("/api/subscription/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: planId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Could not save subscription choice.");
      }

      // بعد حفظ الخطة نرجّع المستخدم للبروفايل
      router.push("/profile");
    } catch (err: any) {
      console.error("SUBSCRIPTION SELECT ERROR:", err);
      setErrorMsg(err.message ?? "Something went wrong.");
      setLoadingPlan(null);
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
            setIsSidebarOpenMobile((v) => !v)
          }
        />

        <div className="page-wrap">
          <h1 className="page-title">Plans &amp; Subscription</h1>
          <p className="page-subtitle">
            Choose your level: Assistant, Engineer, Professional, or Consultant.
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

          {/* GRID للكروت */}
          <div className="plans-grid">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isLoading = loadingPlan === plan.id;

              const extra =
                planFeatures[plan.id] ||
                ({
                  subtitle: plan.description,
                  bullets: [],
                } as (typeof planFeatures)[string]);

              const icon = planIcons[plan.id] || {
                label: plan.name.charAt(0),
                fg: "#2563eb",
                bg: "#eff6ff",
              };

              return (
                <div
                  key={plan.id}
                  style={{
                    background: "#fff",
                    borderRadius: 24,
                    padding: 24,
                    border: isSelected
                      ? "2px solid #2563eb"
                      : "1px solid #e5e7eb",
                    boxShadow: isSelected
                      ? "0 0 0 3px rgba(37,99,235,0.15)"
                      : "0 1px 2px rgba(0,0,0,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: 280,
                  }}
                >
                  <div>
                    {/* الأيقونة + اسم الخطة */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "999px",
                          background: icon.bg,
                          color: icon.fg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 18,
                        }}
                      >
                        {icon.label}
                      </div>
                      <h2
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                        }}
                      >
                        {plan.name}
                      </h2>
                    </div>

                    <p
                      style={{
                        color: "#6b7280",
                        fontSize: 14,
                        marginBottom: 12,
                      }}
                    >
                      {extra.subtitle}
                    </p>

                    <p
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        marginBottom: extra.bullets.length ? 8 : 16,
                      }}
                    >
                      {plan.price === 0
                        ? "Free"
                        : `${plan.price} SAR / month`}
                    </p>

                    {extra.bullets.length > 0 && (
                      <ul
                        style={{
                          fontSize: 13,
                          color: "#4b5563",
                          paddingLeft: 18,
                          listStyleType: "disc",
                        }}
                      >
                        {extra.bullets.map((b) => (
                          <li key={b} style={{ marginBottom: 4 }}>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelect(plan.id)}
                    disabled={isLoading}
                    style={{
                      marginTop: 16,
                      width: "100%",
                      padding: "12px 0",
                      borderRadius: 999,
                      border: "none",
                      background: "#2563eb",
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {isLoading
                      ? "Saving..."
                      : isSelected
                      ? "Selected ✓"
                      : "Select"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* زر رجوع إلى البروفايل */}
          <div style={{ marginTop: 32 }}>
            <button
              type="button"
              onClick={() => router.push("/profile")}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#fff",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              ← Back to Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
