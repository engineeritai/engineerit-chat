"use client";

import { useState } from "react";
import { PLANS } from "@/lib/plans";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const [selectedPlanId, setSelectedPlanId] = useState("assistant");
  const [accepted, setAccepted] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      // 1) Create Supabase user (instant login since confirm email is off)
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

      // 2) Upsert profile row (link auth user -> profiles table)
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName,
        avatar_url: null,
        plan: selectedPlanId,
      });

      if (profileError) {
        console.error("Profile upsert error:", profileError);
        // We don't block the user for this, only log it
      }

      // 3) Show message + redirect to /profile
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

          {/* Plans cards */}
          <div className="plans-grid">
            {PLANS.map((plan) => {
              const isSelected = plan.id === selectedPlanId;
              const isComingSoon =
                plan.id === "professional" || plan.id === "consultant";

              return (
                <button
                  key={plan.id}
                  type="button"
                  className={`plan-card ${
                    isSelected ? "plan-card-selected" : ""
                  }`}
                  onClick={() => {
                    if (!isComingSoon) {
                      setSelectedPlanId(plan.id);
                    }
                  }}
                  style={
                    isComingSoon
                      ? {
                          opacity: 0.45,
                          position: "relative",
                          pointerEvents: "none",
                        }
                      : {}
                  }
                >
                  {/* COMING SOON badge for Pro / Consultant */}
                  {isComingSoon && (
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        backgroundColor: "#111827",
                        color: "white",
                      }}
                    >
                      COMING SOON
                    </div>
                  )}

                  <div className="plan-card-header">
                    <div className={`plan-icon plan-icon-${plan.id}`}>
                      {plan.shortName[0]}
                    </div>
                    <div>
                      <div className="plan-name">{plan.name}</div>
                      <div className="plan-tagline">{plan.tagline}</div>
                    </div>
                  </div>

                  <div className="plan-price">
                    <div>{plan.priceMonthly}</div>
                    <div className="plan-price-yearly">
                      {plan.priceYearly}
                    </div>
                  </div>

                  <ul className="plan-features">
                    {plan.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* Registration form */}
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
                  value={
                    PLANS.find((p) => p.id === selectedPlanId)?.name ||
                    "Assistant Engineer"
                  }
                />
              </label>
            </div>

            {/* Social sign-in (placeholders for future OAuth) */}
            <div className="form-row">
              <div className="section-heading" style={{ marginBottom: 6 }}>
                Or continue with
              </div>
              <div className="social-login-row">
                <button
                  type="button"
                  className="social-btn social-btn-google"
                  onClick={() => {
                    window.location.href = "/api/auth/signin/google";
                  }}
                >
                  <span className="social-icon">G</span>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  className="social-btn social-btn-apple"
                  onClick={() => {
                    window.location.href = "/api/auth/signin/apple";
                  }}
                >
                  <span className="social-icon"></span>
                  <span>Apple</span>
                </button>

                <button
                  type="button"
                  className="social-btn social-btn-microsoft"
                  onClick={() => {
                    window.location.href = "/api/auth/signin/azure-ad";
                  }}
                >
                  <span className="social-icon">MS</span>
                  <span>Microsoft / Outlook</span>
                </button>

                <button
                  type="button"
                  className="social-btn social-btn-huawei"
                  onClick={() => {
                    window.location.href = "/api/auth/signin/huawei";
                  }}
                >
                  <span className="social-icon">H</span>
                  <span>Huawei</span>
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
                  , including cancellation and refund policies, and I understand
                  that engineerit.ai is not responsible or liable for any
                  decisions or mistakes based on the outputs.
                </span>
              </label>
            </div>

            {/* Error / success messages */}
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
