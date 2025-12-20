"use client";

import { useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PLANS } from "@/lib/plans";

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
  consultant: ["drawing", "design", "itp", "boq", "schedule", "value", "dashboard"],
};

export default function RegisterPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
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
      setPassword("");

      // If email confirmation is ON -> session is null
      if (!data.session) {
        setSuccessMessage(
          "Account created. We sent you a confirmation email. Please check your Inbox, and also Junk/Spam, then confirm your email and sign in from the top bar."
        );
        return;
      }

      // If confirmation is OFF -> user is logged in
      setSuccessMessage("Account created. Redirecting to your profile...");
      setTimeout(() => router.push("/profile"), 900);
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong. Please try again.");
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
          <h1 className="page-title">Register to engineerit.ai</h1>
          <p className="page-subtitle">
            Create your account, start with the free Assistant plan, and upgrade later to Engineer, Professional, or Consultant.
          </p>

          {/* Registration card */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 className="card-title" style={{ marginBottom: 12 }}>
              Create your account
            </h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-row">
                <label>
                  Full name
                  <input
                    type="text"
                    className="input"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Email address
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
                  Password
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

              <div className="form-row form-checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    required
                  />
                  <span>
                    I have read and agree to the{" "}
                    <Link href="/legal/terms" className="link">
                      User Policy &amp; Agreement
                    </Link>
                    , including cancellation and refund policies, and I understand that engineerit.ai is not responsible or liable
                    for any decisions or mistakes based on the outputs.
                  </span>
                </label>
              </div>

              {errorMessage && (
                <div style={{ marginBottom: 6, fontSize: 13, color: "#b91c1c" }}>
                  {errorMessage}
                </div>
              )}

              {/* ✅ UPDATED: Yellow alert style (no other logic changes) */}
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
                      Email confirmation required
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      We sent you a confirmation email. Please check your <b>Inbox</b> and also <b>Junk/Spam</b>, then click the confirmation link.
                    </div>
                    <div style={{ fontSize: 12, color: "#7C2D12" }}>
                      After confirmation, come back and sign in from the top bar.
                    </div>
                  </div>
                </div>
              )}

              <button className="btn" type="submit" disabled={loading || !accepted} style={{ marginTop: 4 }}>
                {loading ? "Creating account..." : "Create account"}
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
              After registration, your account will start on the free Assistant plan.
              When you are ready to upgrade, go to the subscription page to select Engineer, Professional, or Consultant with secure payment.
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => router.push("/subscription")}
              style={{ alignSelf: "flex-start", marginTop: 4 }}
            >
              View plans &amp; subscribe
            </button>
          </div>

          {/* Plans overview */}
          <div className="card" style={{ marginTop: 8 }}>
            <h2 className="card-title" style={{ marginBottom: 16 }}>
              Plans overview &amp; engineer tools
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {PLANS.map((plan) => {
                const badge = PLAN_BADGES[plan.id as PlanId] || PLAN_BADGES.assistant;
                const letter = (plan.shortName || plan.name || "E").charAt(0).toUpperCase();

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
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
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
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 2 }}>
                          {plan.name}
                        </div>
                        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.35 }}>
                          {plan.tagline}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: badge.fg }}>
                        {plan.priceMonthly}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        {plan.priceYearly}
                      </div>
                    </div>

                    <ul style={{ listStyle: "disc", paddingLeft: 20, margin: 0, marginTop: 4, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                      {plan.features.map((f) => (
                        <li key={f} style={{ marginBottom: 4 }}>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed #e5e7eb" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 6 }}>
                        Engineer tools in this plan
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {ENGINEER_TOOLS.map((tool) => {
                          const enabled = enabledTools.includes(tool.id);
                          return (
                            <span
                              key={tool.id}
                              style={{
                                fontSize: 11,
                                padding: "3px 8px",
                                borderRadius: 999,
                                border: enabled ? "1px solid rgba(37,99,235,0.45)" : "1px solid #e5e7eb",
                                backgroundColor: enabled ? "rgba(37,99,235,0.06)" : "#f9fafb",
                                color: enabled ? "#1d4ed8" : "#9ca3af",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {enabled ? "✅" : "🔒"} {tool.label}
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
              You can upgrade or change your plan any time from your profile or the subscription page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
