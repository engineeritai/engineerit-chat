// app/register/page.tsx
"use client";

import { useEffect, useState } from "react";
import MarketingShell from "../components/marketing/MarketingShell";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GoogleAuthButton from "@/app/components/GoogleAuthButton";
import TurnstileField from "@/app/components/TurnstileField";
import { requestAuthEmail } from "@/lib/authEmailClient";
import { CHECKOUT_CONTINUE_PATH, readPendingCheckout } from "@/lib/checkoutClient";
import { registrationFieldErrors, registrationMessage, type RegistrationCode } from "@/lib/registerAccount";
import { shouldTrackSubmittedSignup } from "@/lib/acquisition";
import { safeNextPath } from "@/lib/safeNext";
import { readAcquisitionPayload, trackOnce } from "@/lib/attribution";
import { useMessages } from "@/lib/useMessages";

export default function RegisterPage() {
  const { shell: s, locale } = useMessages();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingPlan, setPendingPlan] = useState(false);
  const [loginHref, setLoginHref] = useState("/login");
  const [nextPath, setNextPath] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [termsNudged, setTermsNudged] = useState(false);
  const [blurred, setBlurred] = useState<{ email?: boolean; password?: boolean }>({});

  const router = useRouter();
  const fieldErrors = registrationFieldErrors({ email, password, accepted });
  const emailError = (submitAttempted || blurred.email) && fieldErrors.email ? registrationMessage(locale, fieldErrors.email) : "";
  const passwordError =
    (submitAttempted || blurred.password) && fieldErrors.password ? registrationMessage(locale, fieldErrors.password) : "";
  const termsError = (submitAttempted || termsNudged) && fieldErrors.terms ? registrationMessage(locale, fieldErrors.terms) : "";

  useEffect(() => {
    const pending = readPendingCheckout();
    const next = safeNextPath(
      new URLSearchParams(window.location.search).get("next"),
      pending ? CHECKOUT_CONTINUE_PATH : "/profile"
    );
    setPendingPlan(Boolean(pending) || next === CHECKOUT_CONTINUE_PATH);
    setLoginHref(`/login?next=${encodeURIComponent(next)}`);
    setNextPath(next);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setSubmitAttempted(true);

    const e1 = email.trim().toLowerCase();
    const validation = registrationFieldErrors({ email: e1, password, accepted });
    if (validation.email || validation.password || validation.terms) return;

    setLoading(true);

    try {
      const pending = readPendingCheckout();
      const { status, data } = await requestAuthEmail("signup", {
        email: e1,
        password,
        captchaToken,
        accepted: true,
        acquisition: readAcquisitionPayload(),
        ...(pending ? { pending } : {}),
      });

      if (!data.ok || status >= 400) {
        const code = (data.code || (status === 429 ? "later" : "generic")) as RegistrationCode;
        setErrorMessage(registrationMessage(locale, code));
        return;
      }

      if (shouldTrackSubmittedSignup(data.needsConfirmation)) {
        trackOnce("register_completed", "register_completed");
      }

      // The profile row is created on the first signed-in request by POST /api/profile/ensure.
      // Name, company, and phone are saved later on the profile page.

      setEmail("");
      setPassword("");
      setAccepted(false);
      setSubmitAttempted(false);
      setBlurred({});
      setTermsNudged(false);

      const destination = safeNextPath(
        typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null,
        "/profile"
      );

      // If email confirmation is ON -> session is null
      if (data.needsConfirmation !== false) {
        try {
          if (destination !== "/profile") {
            window.localStorage.setItem("engineerit_post_auth_next", destination);
          }
        } catch {
          /* ignore */
        }
        setSuccessMessage(s.auth.createdConfirm);
        return;
      }

      // If confirmation is OFF -> user is logged in
      setSuccessMessage(s.auth.createdRedirect);
      setTimeout(() => router.push(nextPath || destination), 900);
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
          {s.auth.registerLeadBefore}
          <Link className="page-subtitle-link" href={`/pricing?lang=${locale}`}>
            {s.auth.registerLeadLink}
          </Link>
          {s.auth.registerLeadAfter}
        </p>

        <div className="card" style={{ marginBottom: 24 }}>
          <h2 className="card-title" style={{ marginBottom: 12 }}>
            {s.auth.createAccount}
          </h2>

          <form className="register-form" onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <GoogleAuthButton
              nextPath={nextPath}
              accepted={accepted}
              onNeedTerms={() => setTermsNudged(true)}
            />

            <div className="form-row">
              <label htmlFor="register-email">{s.auth.email}</label>
              <input
                id="register-email"
                type="email"
                className={emailError ? "input is-invalid" : "input"}
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? "register-email-error" : undefined}
                onBlur={() => setBlurred((current) => ({ ...current, email: true }))}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailError ? (
                <p id="register-email-error" className="form-note is-bad" role="alert">
                  {emailError}
                </p>
              ) : null}
            </div>

            <div className="form-row">
              <label htmlFor="register-password">{s.auth.password}</label>
              <input
                id="register-password"
                type="password"
                className={passwordError ? "input is-invalid" : "input"}
                autoComplete="new-password"
                placeholder=""
                value={password}
                aria-invalid={passwordError ? true : undefined}
                aria-describedby={passwordError ? "register-password-hint register-password-error" : "register-password-hint"}
                onBlur={() => setBlurred((current) => ({ ...current, password: true }))}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p id="register-password-hint" className="password-hint">
                {s.auth.passwordHint}
              </p>
              {passwordError ? (
                <p id="register-password-error" className="form-note is-bad" role="alert">
                  {passwordError}
                </p>
              ) : null}
            </div>

            <TurnstileField onToken={setCaptchaToken} />

            <div className="form-row form-checkbox-row">
              <label className="checkbox-label" htmlFor="register-terms">
                <input
                  id="register-terms"
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                <span>
                  {s.auth.agreeLead}
                  <Link href={`/legal/terms?lang=${locale}`} className="link">
                    {s.auth.termsLink}
                  </Link>
                  {s.auth.agreeAnd}
                  <Link href={`/legal/privacy?lang=${locale}`} className="link">
                    {s.auth.privacyLink}
                  </Link>
                </span>
              </label>
              {termsError ? (
                <p id="register-terms-error" className="form-note is-bad" role="alert">
                  {termsError}
                </p>
              ) : null}
            </div>

            {errorMessage && (
              <div className="form-note is-bad" role="alert">
                <p style={{ margin: "0 0 8px" }}>{errorMessage}</p>
                <Link href={loginHref} className="link">
                  {s.auth.signIn}
                </Link>
              </div>
            )}

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
                  <div style={{ fontWeight: 800, marginBottom: 2 }}>{s.auth.emailConfirmTitle}</div>
                  <div style={{ marginBottom: 6 }}>{successMessage}</div>
                  <div style={{ fontSize: 12, color: "#7C2D12" }}>{s.auth.emailConfirmHint}</div>
                  <Link href={loginHref} className="btn auth-follow">
                    {pendingPlan ? s.auth.continueSignIn : s.auth.signIn}
                  </Link>
                </div>
              </div>
            )}

            <button className="btn" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? s.auth.creating : s.auth.create}
            </button>
          </form>
        </div>

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
          <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>{pendingPlan ? s.auth.planWaiting : s.auth.afterRegister}</p>
          <Link href={pendingPlan ? loginHref : "/pricing"} className="btn auth-follow" style={{ alignSelf: "flex-start", marginTop: 4 }}>
            {pendingPlan ? s.auth.continueSignIn : s.auth.viewPlans}
          </Link>
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{s.auth.upgradeAnytime}</p>
        </div>
      </div>
    </MarketingShell>
  );
}
