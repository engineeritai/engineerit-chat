// app/register/page.tsx
"use client";

import { useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PLANS } from "@/lib/plans";
import { localizedPlan, toolLabel } from "@/lib/labels";
import { useMessages } from "@/lib/useMessages";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

const PLAN_BADGES: Record<PlanId, { fg: string; bg: string }> = {
  assistant: { fg: "#1d4ed8", bg: "#eff6ff" },
  engineer: { fg: "#ea580c", bg: "#fff7ed" },
  professional: { fg: "#059669", bg: "#ecfdf3" },
  consultant: { fg: "#7c3aed", bg: "#f5f3ff" },
};

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

export default function RegisterPage() {
  const { locale, shell: s } = useMessages();
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // ✅ Validate BEFORE sending email / creating account
    const e1 = email.trim().toLowerCase();
    const e2 = confirmEmail.trim().toLowerCase();

    if (!e1 || !e2) {
      setErrorMessage(s.auth.emailRequired);
      return;
    }
    if (e1 !== e2) {
      setErrorMessage(s.auth.emailMismatch);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(s.auth.passwordMismatch);
      return;
    }
    if (password.length < 8) {
      setErrorMessage(s.auth.passwordMin);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: e1,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // ✅ IMPORTANT:
      // We DO NOT insert into profiles here anymore.
      // Profiles row is created by DB trigger (handle_new_user) to avoid RLS/session issues.

      setFullName("");
      setEmail("");
      setConfirmEmail("");
      setPassword("");
      setConfirmPassword("");

      // If email confirmation is ON -> session is null
      if (!data.session) {
        setSuccessMessage(s.auth.createdConfirm);
        return;
      }

      // If confirmation is OFF -> user is logged in
      setSuccessMessage(s.auth.createdRedirect);
      setTimeout(() => router.push("/profile"), 900);
    } catch (err) {
      console.error(err);
      setErrorMessage(s.auth.genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />

        <div className="page-wrap">
          <h1 className="page-title">{s.auth.registerTitle}</h1>
          <p className="page-subtitle">{s.auth.registerLead}</p>

          {/* Registration card */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 className="card-title" style={{ marginBottom: 12 }}>
              {s.auth.createAccount}
            </h2>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div className="form-row">
                <label>
                  {s.auth.fullName}
                  <input
                    type="text"
                    className="input"
                    placeholder={s.auth.fullNamePlaceholder}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  {s.auth.email}
                  <input
                    type="email"
                    className="input"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  {s.auth.confirmEmail}
                  <input
                    type="email"
                    className="input"
                    required
                    placeholder={s.auth.confirmEmailPlaceholder}
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  {s.auth.password}
                  <input
                    type="password"
                    className="input"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  {s.auth.confirmPassword}
                  <input
                    type="password"
                    className="input"
                    required
                    placeholder={s.auth.confirmPasswordPlaceholder}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row form-checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    required
                  />
                  <span>
                    {s.auth.agreePrefix}{" "}
                    <Link href="/legal/terms" className="link">
                      {s.auth.policyName}
                    </Link>
                    {s.auth.agreeSuffix}
                  </span>
                </label>
              </div>

              {errorMessage && (
                <div
                  style={{
                    marginBottom: 6,
                    fontSize: 13,
                    color: "#b91c1c",
                  }}
                >
                  {errorMessage}
                </div>
              )}

              {/* ✅ Yellow alert box */}
              {successMessage && (
                <div
                  style={{
                    marginBottom: 10,
                    borderRadius: 14,
                    border: "1px solid #FDE68A",
                    background: "#FFFBEB",
                    padding: "10px 12px",
                    color: "#92400E",
                    fontSize: 13,
                    lineHeight: 1.5,
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 9999,
                      background: "#FEF3C7",
                      border: "1px solid #FDE68A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                      fontWeight: 800,
                    }}
                  >
                    !
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, marginBottom: 2 }}>
                      {s.auth.emailConfirmTitle}
                    </div>
                    <div style={{ marginBottom: 6 }}>{successMessage}</div>
                    <div style={{ fontSize: 12, color: "#7C2D12" }}>
                      {s.auth.emailConfirmHint}
                    </div>
                  </div>
                </div>
              )}

              <button
                className="btn"
                type="submit"
                disabled={loading || !accepted}
                style={{ marginTop: 4 }}
              >
                {loading ? s.auth.creating : s.auth.create}
              </button>
            </form>
          </div>

          {/* Subscription hint */}
          <div
            className="card"
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>
              {s.auth.afterRegister}
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => router.push("/subscription")}
              style={{ alignSelf: "flex-start", marginTop: 4 }}
            >
              {s.auth.viewPlans}
            </button>
          </div>

          {/* Plans overview */}
          <div className="card" style={{ marginTop: 8 }}>
            <h2 className="card-title" style={{ marginBottom: 16 }}>
              {s.auth.plansOverview}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {PLANS.map((rawPlan) => {
                const plan = localizedPlan(locale, rawPlan);
                const badge =
                  PLAN_BADGES[plan.id as PlanId] || PLAN_BADGES.assistant;
                const letter = (rawPlan.shortName || plan.name || "E")
                  .charAt(0)
                  .toUpperCase();

                const planId = plan.id as PlanId;
                const enabledTools = TOOL_ACCESS[planId] || [];

                return (
                  <div
                    key={plan.id}
                    className="plan-card"
                    style={{
                      borderRadius: 20,
                      border: "1px solid #e5e7eb",
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      backgroundColor: "white",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "999px",
                          backgroundColor: badge.bg,
                          color: badge.fg,
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

                    <div style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: badge.fg,
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

                    <ul
                      style={{
                        listStyle: "disc",
                        paddingLeft: 20,
                        margin: 0,
                        marginTop: 4,
                        fontSize: 13,
                        color: "#374151",
                        lineHeight: 1.5,
                      }}
                    >
                      {plan.features.map((f) => (
                        <li key={f} style={{ marginBottom: 4 }}>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: "1px dashed #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#4b5563",
                          marginBottom: 6,
                        }}
                      >
                        {s.auth.toolsInPlan}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        {ENGINEER_TOOLS.map((tool) => {
                          const enabled = enabledTools.includes(tool.id);
                          return (
                            <span
                              key={tool.id}
                              style={{
                                fontSize: 11,
                                padding: "3px 8px",
                                borderRadius: 999,
                                border: enabled
                                  ? "1px solid rgba(37,99,235,0.45)"
                                  : "1px solid #e5e7eb",
                                backgroundColor: enabled
                                  ? "rgba(37,99,235,0.06)"
                                  : "#f9fafb",
                                color: enabled ? "#1d4ed8" : "#9ca3af",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {enabled ? "✅" : "🔒"} {toolLabel(locale, tool.id)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 16 }}>
              {s.auth.upgradeAnytime}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
