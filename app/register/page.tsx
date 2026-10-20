// app/register/page.tsx
"use client";

import { useState } from "react";
import MarketingShell from "../components/marketing/MarketingShell";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TurnstileField from "@/app/components/TurnstileField";
import { requestAuthEmail } from "@/lib/authEmailClient";
import { safeNextPath } from "@/lib/safeNext";
import { trackProduct } from "@/lib/attribution";
import { useMessages } from "@/lib/useMessages";

export default function RegisterPage() {
  const { shell: s, locale } = useMessages();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

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
      const { status, data } = await requestAuthEmail("signup", {
        email: e1,
        password,
        fullName,
        captchaToken,
      });

      if (!data.ok || status >= 400) {
        setErrorMessage(status === 429 ? s.password.tryLater : data.error || s.auth.genericError);
        return;
      }

      trackProduct("register_completed");

      // ✅ IMPORTANT:
      // We DO NOT insert into profiles here anymore.
      // Profiles row is created by DB trigger (handle_new_user) to avoid RLS/session issues.

      setFullName("");
      setEmail("");
      setConfirmEmail("");
      setPassword("");
      setConfirmPassword("");

      const nextPath = safeNextPath(
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null,
        "/profile"
      );

      // If email confirmation is ON -> session is null
      if (data.needsConfirmation !== false) {
        try {
          if (nextPath !== "/profile") {
            window.localStorage.setItem("engineerit_post_auth_next", nextPath);
          }
        } catch {
          /* ignore */
        }
        setSuccessMessage(s.auth.createdConfirm);
        return;
      }

      // If confirmation is OFF -> user is logged in
      setSuccessMessage(s.auth.createdRedirect);
      setTimeout(() => router.push(nextPath), 900);
    } catch (err) {
      console.error(err);
      setErrorMessage(s.auth.genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketingShell>
        <div className="page-wrap">
          <h1 className="page-title">{s.auth.registerTitle}</h1>
          <p className="page-subtitle">
            {s.auth.registerLeadBefore}<Link className="page-subtitle-link" href={`/pricing?lang=${locale}`}>{s.auth.registerLeadLink}</Link>{s.auth.registerLeadAfter}
          </p>

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

              <TurnstileField onToken={setCaptchaToken} />

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
            <Link href="/pricing" className="btn" style={{ alignSelf: "flex-start", marginTop: 4 }}>
              {s.auth.viewPlans}
            </Link>
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{s.auth.upgradeAnytime}</p>
          </div>
        </div>
    </MarketingShell>
  );
}
