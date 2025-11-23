"use client";

import { useState } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { PLANS } from "@/lib/plans";

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

const PLAN_COLORS: Record<PlanId, string> = {
  assistant: "#2563eb", // blue
  engineer: "#f97316", // orange / gold
  professional: "#0f766e", // green
  consultant: "#7c3aed", // purple
};

// Current monthly prices in SAR (used when inserting into subscriptions)
const PLAN_PRICES: Record<PlanId, number> = {
  assistant: 0,
  engineer: 19,
  professional: 41,
  consultant: 79,
};

const PLAN_DURATION_DAYS = 30; // initial subscription period

export default function RegisterPage() {
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("assistant");
  const [accepted, setAccepted] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // OAuth login with Supabase (Google / Apple)
  const handleOAuthLogin = async (provider: "google" | "apple") => {
    try {
      setErrorMessage("");
      setLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + "/profile",
        },
      });

      if (error) {
        console.error("OAuth error:", error);
        setErrorMessage(error.message || "Could not sign in. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      // 0) Calculate subscription dates and price
      const now = new Date();
      const expires =
        selectedPlanId === "assistant"
          ? null
          : new Date(
              now.getTime() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000
            );

      const price = PLAN_PRICES[selectedPlanId] ?? 0;
      const currency = "SAR";

      // 1) Create Supabase user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            plan: selectedPlanId,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErrorMessage("Unable to create account. Please try again.");
        setLoading(false);
        return;
      }

      const userId = data.user.id;

      // 2) Upsert into profiles table
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName,
        avatar_url: null,
        plan: selectedPlanId,
        billing_currency: currency,
        plan_started_at: now.toISOString(),
        plan_expires_at: expires ? expires.toISOString() : null,
      });

      if (profileError) {
        console.error("Profile upsert error:", profileError);
        // Do not block user; just log
      }

      // 3) Insert into subscriptions table
      const { error: subError } = await supabase.from("subscriptions").insert({
        user_id: userId,
        plan: selectedPlanId,
        price,
        currency,
        status: "active",
        start_date: now.toISOString(),
        end_date: expires ? expires.toISOString() : null,
      });

      if (subError) {
        console.error("Subscription insert error:", subError);
        // Also do not block user; just log for later troubleshooting
      }

      // 4) Show success and redirect
      setSuccessMessage("Account created. Redirecting to your profile...");
      setTimeout(() => {
        window.location.href = "/profile";
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanName =
    PLANS.find((p) => p.id === selectedPlanId)?.name || "Assistant Engineer";

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />

        <div className="page-wrap">
          <h1 className="page-title">Plans & Registration</h1>
          <p className="page-subtitle">
            Choose your level: Assistant Engineer, Engineer, Professional
            Engineer, or Consultant Engineer.
          </p>

          {/* ===== PLANS GRID (same look as main page) ===== */}
          <div className="plans-grid">
            {PLANS.map((plan) => {
              const isSelected = plan.id === selectedPlanId;
              const color =
                PLAN_COLORS[plan.id as PlanId] || PLAN_COLORS.assistant;
              const letter =
                (plan.shortName || plan.name || "E").charAt(0).toUpperCase();

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id as PlanId)}
                  className="plan-card"
                  style={{
                    // Only a light visual highlight when selected.
                    borderColor: isSelected ? color : undefined,
                    boxShadow: isSelected
                      ? "0 14px 35px rgba(15,23,42,0.18)"
                      : undefined,
                    transform: isSelected ? "translateY(-2px)" : undefined,
                    transition:
                      "box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease",
                  }}
                >
                  {/* Header: colored circle + title + tagline */}
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
                        borderRadius: "50%",
                        backgroundColor: color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        fontWeight: 700,
                        color: "white",
                        marginRight: 14,
                        flexShrink: 0,
                      }}
                    >
                      {letter}
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: "#111827",
                          marginBottom: 2,
                        }}
                      >
                        {plan.name}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: "#6b7280",
                          lineHeight: 1.35,
                        }}
                      >
                        {plan.tagline}
                      </div>
                    </div>
                  </div>

                  {/* Price block */}
                  <div style={{ marginBottom: 12 }}>
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
                        fontSize: 13,
                        color: "#6b7280",
                        marginTop: 2,
                      }}
                    >
                      {plan.priceYearly}
                    </div>
                  </div>

                  {/* Features list */}
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
                </button>
              );
            })}
          </div>

          {/* ===== REGISTRATION FORM ===== */}
          <form className="register-form" onSubmit={handleSubmit}>
            <h2 className="section-heading">Create your account</h2>

            <div className="form-row">
              <label>
                Full name
                <input
                  type="text"
                  className="input"
                  required
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

            <div className="form-row">
              <label>
                Selected plan
                <input
                  type="text"
                  className="input"
                  readOnly
                  value={selectedPlanName}
                />
              </label>
            </div>

            {/* Social sign-in */}
            <div className="form-row">
              <div className="section-heading" style={{ marginBottom: 6 }}>
                Or continue with
              </div>
              <div className="social-login-row">
                <button
                  type="button"
                  className="social-btn social-btn-google"
                  onClick={() => handleOAuthLogin("google")}
                  disabled={loading}
                >
                  <span className="social-icon">G</span>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  className="social-btn social-btn-apple"
                  onClick={() => handleOAuthLogin("apple")}
                  disabled={loading}
                >
                  <span className="social-icon"></span>
                  <span>Apple</span>
                </button>

                {/* Placeholders for future providers */}
                <button
                  type="button"
                  className="social-btn social-btn-microsoft"
                  disabled
                  style={{ opacity: 0.5, cursor: "not-allowed" }}
                >
                  <span className="social-icon">MS</span>
                  <span>Microsoft / Outlook (soon)</span>
                </button>

                <button
                  type="button"
                  className="social-btn social-btn-huawei"
                  disabled
                  style={{ opacity: 0.5, cursor: "not-allowed" }}
                >
                  <span className="social-icon">H</span>
                  <span>Huawei (soon)</span>
                </button>
              </div>
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
                    User Policy & Agreement
                  </Link>
                  , including cancellation and refund policies, and I
                  understand that engineerit.ai is not responsible or liable
                  for any decisions or mistakes based on the outputs.
                </span>
              </label>
            </div>

            {errorMessage && (
              <div
                style={{
                  marginBottom: 12,
                  fontSize: 13,
                  color: "#b91c1c",
                }}
              >
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  marginBottom: 12,
                  fontSize: 13,
                  color: "#15803d",
                }}
              >
                {successMessage}
              </div>
            )}

            <button className="btn" disabled={!accepted || loading}>
              {loading ? "Creating account..." : "Continue registration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
