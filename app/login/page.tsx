"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MarketingShell from "../components/marketing/MarketingShell";
import TurnstileField from "@/app/components/TurnstileField";
import Link from "next/link";
import { requestAuthEmail } from "@/lib/authEmailClient";
import { supabase } from "@/lib/supabaseClient";
import { useMessages } from "@/lib/useMessages";
import { signInProblem } from "@/lib/registerAccount";
import { safeNextPath } from "@/lib/safeNext";

export default function LoginPage() {
  const { shell: s, locale } = useMessages();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resendNote, setResendNote] = useState("");
  const [resending, setResending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [registerHref, setRegisterHref] = useState("/register");

  const router = useRouter();

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) setRegisterHref(`/register?next=${encodeURIComponent(next)}`);
  }, []);

  const resendConfirmation = async () => {
    setResendNote("");
    setResending(true);
    try {
      const { status, data } = await requestAuthEmail("resend", {
        email: email.trim(),
        captchaToken,
      });
      if (status === 429) {
        setErrorMessage(s.password.tryLater);
        return;
      }
      if (!data.ok && status >= 400) {
        setErrorMessage(data.code === "captcha" ? s.auth.captchaRequired : s.auth.genericError);
        return;
      }
      setResendNote(s.auth.resendSent);
    } catch {
      setErrorMessage(s.auth.genericError);
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(signInProblem(locale, error.message));
        setLoading(false);
        return;
      }

      if (!data.session) {
        setErrorMessage(s.auth.unable);
        setLoading(false);
        return;
      }

      await fetch("/api/profile/ensure", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      }).catch(() => undefined);

      setSuccessMessage(s.auth.loggedIn);
      const fromQuery =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem("engineerit_post_auth_next");
        window.localStorage.removeItem("engineerit_post_auth_next");
      } catch {
        /* ignore */
      }
      const nextPath = safeNextPath(fromQuery || stored, "/profile");
      setTimeout(() => {
        router.push(nextPath);
      }, 1000);
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
          <h1 className="page-title">{s.auth.signInTitle}</h1>
          <p className="page-subtitle">{s.auth.signInLead}</p>

          <form className="register-form" onSubmit={handleSubmit}>
            <h2 className="section-heading">{s.auth.welcome}</h2>

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

            <p className="form-aside">
              <Link href="/forgot-password" className="link">
                {s.header.forgot}
              </Link>
            </p>

            {errorMessage && (
              <div
                style={{
                  marginBottom: 12,
                  fontSize: 13,
                  color: "#b91c1c",
                }}
                role="alert"
              >
                <p style={{ margin: "0 0 8px" }}>{errorMessage}</p>
                {errorMessage === s.auth.emailNotConfirmed ? (
                  <>
                    <TurnstileField onToken={setCaptchaToken} />
                    <button
                      type="button"
                      className="btn auth-follow"
                      disabled={resending}
                      onClick={() => void resendConfirmation()}
                    >
                      {resending ? s.auth.creating : s.auth.resendConfirm}
                    </button>
                    {resendNote ? <p style={{ margin: "8px 0 0", color: "#15803d" }}>{resendNote}</p> : null}
                  </>
                ) : null}
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

            <button className="btn" disabled={loading}>
              {loading ? s.auth.signingIn : s.auth.signIn}
            </button>

            <p
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "#4b5563",
              }}
            >
              {s.header.noAccount}{" "}
              <Link href={registerHref} className="link">
                {s.auth.createHere}
              </Link>
              .
            </p>
          </form>
        </div>
    </MarketingShell>
  );
}
