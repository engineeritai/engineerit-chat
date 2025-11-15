"use client";

import { useState } from "react";
import { PLANS } from "@/lib/plans";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import Link from "next/link";

export default function RegisterPage() {
  const [selectedPlanId, setSelectedPlanId] = useState("assistant");
  const [accepted, setAccepted] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

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
          <form
            className="register-form"
            onSubmit={(e) => e.preventDefault()}
          >
            <h2 className="section-heading">Create your account</h2>

            <div className="form-row">
              <label>
                Full name
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="Your full name"
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

            <button className="btn" disabled={!accepted}>
              Continue registration
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
