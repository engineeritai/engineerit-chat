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

  // ✅ OAuth مع Supabase لـ Google / Apple
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

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
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

      // 2) Upsert profile row
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName,
        avatar_url: null,
        plan: selectedPlanId,
      });

      if (profileError) {
        console.error("Profile upsert error:", profileError);
        // ما نمنع التسجيل، فقط نطبع الخطأ
      }

      // 3) رسالة نجاح + تحويل للبروفايل
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

          {/* ✅ Plans cards – كل الخطط مفعّلة الآن */}
          <div className="plans-grid">
            {PLANS.map((plan) => {
              const isSelected = plan.id === selectedPlanId;

              return (
                <button
                  key={plan.id}
                  type="button"
                  className={`plan-card ${
                    isSelected ? "plan-card-selected" : ""
                  }`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
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

                {/* Microsoft / Huawei: placeholders حتى نفعّلهم لاحقاً */}
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
                  , including cancellation and refund policies, and I understand
                  that engineerit.ai is not responsible or liable for any
                  decisions or mistakes based on the outputs.
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
