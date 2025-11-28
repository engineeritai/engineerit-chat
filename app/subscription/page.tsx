"use client";

import { useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import Link from "next/link";
import { PLANS } from "@/lib/plans";

const PLAN_COLORS: Record<string, string> = {
  assistant: "#2563eb",      // Blue
  engineer: "#f97316",       // Orange
  professional: "#0f766e",   // Teal/Green
  consultant: "#7c3aed",     // Purple
};

export default function SubscriptionPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />

        <div className="page-wrap">
          <h1 className="page-title">Plans & Subscription</h1>
          <p className="page-subtitle">
            Choose your level: Assistant, Engineer, Professional, or Consultant.
          </p>

          {/* ===== GRID 4 CARDS ===== */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "22px",
              marginTop: 20,
            }}
          >
            {PLANS.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const color = PLAN_COLORS[plan.id];
              const letter = plan.shortName;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  style={{
                    cursor: "pointer",
                    border: `2px solid ${isSelected ? color : "#e5e7eb"}`,
                    borderRadius: 22,
                    padding: "26px 24px",
                    background: "white",
                    transition: "0.15s ease",
                    boxShadow: isSelected
                      ? "0 14px 35px rgba(15,23,42,0.16)"
                      : "0 2px 8px rgba(0,0,0,0.05)",
                    transform: isSelected ? "translateY(-3px)" : "none",
                  }}
                >
                  {/* ICON + TITLE */}
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        backgroundColor: color,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        fontWeight: 700,
                        marginRight: 14,
                      }}
                    >
                      {letter}
                    </div>

                    <div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 20,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {plan.name}
                      </h2>
                      <p
                        style={{
                          margin: 0,
                          marginTop: 4,
                          fontSize: 14,
                          color: "#6b7280",
                        }}
                      >
                        {plan.tagline}
                      </p>
                    </div>
                  </div>

                  {/* PRICE */}
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color,
                      }}
                    >
                      {plan.priceMonthly}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                        marginTop: 2,
                      }}
                    >
                      {plan.priceYearly}
                    </div>
                  </div>

                  {/* FEATURES */}
                  <ul
                    style={{
                      listStyle: "disc",
                      paddingLeft: 20,
                      marginTop: 8,
                      marginBottom: 0,
                      fontSize: 14,
                      color: "#374151",
                    }}
                  >
                    {plan.features.map((f) => (
                      <li key={f} style={{ marginBottom: 6 }}>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* SELECT BUTTON */}
                  <button
                    style={{
                      marginTop: 20,
                      width: "100%",
                      backgroundColor: color,
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "none",
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {isSelected ? "Selected ✓" : "Select"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* BACK BUTTON */}
          <div style={{ marginTop: 32, textAlign: "center" }}>
            <Link
              href="/profile"
              style={{
                background: "#2563eb",
                color: "white",
                padding: "12px 22px",
                borderRadius: 12,
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Back to Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
