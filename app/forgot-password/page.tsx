"use client";

import { useState } from "react";
import Link from "next/link";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import TurnstileField from "@/app/components/TurnstileField";
import { requestAuthEmail } from "@/lib/authEmailClient";
import { useMessages } from "@/lib/useMessages";

export default function ForgotPasswordPage() {
  const { shell: s } = useMessages();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setInfo(null);
    setError(null);
    const address = email.trim();
    if (!address.includes("@")) {
      setError(s.auth.emailRequired);
      return;
    }
    setSending(true);
    try {
      const { status, data } = await requestAuthEmail("reset", { email: address, captchaToken });
      if (status === 429) {
        setError(s.password.tryLater);
        return;
      }
      if (!data.ok && status >= 400) {
        setError(s.password.generic);
        return;
      }
      setInfo(s.password.ifExists);
    } catch {
      setError(s.password.generic);
    } finally {
      setSending(false);
    }
  }

  return (
    <MarketingShell>
      <div className="page-wrap">
        <h1 className="page-title">{s.password.forgotTitle}</h1>
        <p className="page-subtitle">{s.password.forgotLead}</p>
        <form className="register-form" onSubmit={(event) => void submit(event)}>
          <div className="form-row">
            <label>
              {s.auth.email}
              <input
                type="email"
                className="input"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          </div>
          <TurnstileField onToken={setCaptchaToken} />
          {error ? <p className="form-note is-bad">{error}</p> : null}
          {info ? <p className="form-note is-ok" data-testid="reset-result">{info}</p> : null}
          <button className="btn" disabled={sending}>
            {sending ? s.password.sending : s.password.sendLink}
          </button>
          <p className="form-aside">
            <Link href="/login" className="link">
              {s.password.backToLogin}
            </Link>
          </p>
        </form>
      </div>
    </MarketingShell>
  );
}
