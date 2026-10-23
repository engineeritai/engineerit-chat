"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import PasswordField from "@/app/components/PasswordField";
import { changePassword } from "@/lib/authEmailClient";
import { supabase } from "@/lib/supabaseClient";
import { authCallbackKind } from "@/lib/authCallback";
import { passwordProblem, passwordStrength } from "@/lib/password";
import { useMessages } from "@/lib/useMessages";
import type { EmailOtpType } from "@supabase/supabase-js";

function hashParams(hash: string) {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return {
    accessToken: params.get("access_token") || "",
    refreshToken: params.get("refresh_token") || "",
    type: params.get("type") || "",
  };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const { shell: s } = useMessages();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const strength = passwordStrength(password);
  const strengthLabel =
    strength === "short" ? s.password.strengthShort : strength === "strong" ? s.password.strengthStrong : strength === "ok" ? s.password.strengthOk : "";

  useEffect(() => {
    if (authCallbackKind(window.location.search, window.location.hash) === "signup") return;

    let cancel = false;
    const { data: auth } = supabase.auth.onAuthStateChange((event) => {
      if (cancel) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setInvalid(false);
        setReady(true);
      }
    });

    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code") || "";
      const tokenHash = params.get("token_hash") || "";
      const type = (params.get("type") || "") as EmailOtpType;
      let failed = false;

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        failed = Boolean(exchangeError);
      } else if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        failed = Boolean(verifyError);
      } else {
        const hashed = hashParams(window.location.hash);
        if (hashed.accessToken && hashed.refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: hashed.accessToken,
            refresh_token: hashed.refreshToken,
          });
          failed = Boolean(sessionError);
        }
      }

      if (code || tokenHash || window.location.hash) {
        window.history.replaceState({}, "", "/reset-password");
      }

      if (cancel) return;
      if (failed) {
        setInvalid(true);
        setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancel) return;
      setInvalid(!data.session);
      setReady(true);
    })();

    return () => {
      cancel = true;
      auth.subscription.unsubscribe();
    };
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const problem = passwordProblem(password, confirm);
    if (problem === "short") {
      setError(s.password.tooShort);
      return;
    }
    if (problem === "mismatch") {
      setError(s.password.mismatch);
      return;
    }
    setSaving(true);
    try {
      const { data: before } = await supabase.auth.getUser();
      const email = before.user?.email || "";
      const { error: updateError } = await changePassword(password);
      if (updateError) {
        setError(s.password.generic);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session && email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(s.password.generic);
          return;
        }
      }
      setInfo(s.password.savedRedirect);
      window.setTimeout(() => router.push("/chat"), 700);
    } catch {
      setError(s.password.generic);
    } finally {
      setSaving(false);
    }
  }

  return (
    <MarketingShell>
      <div className="page-wrap">
        <h1 className="page-title">{s.password.resetTitle}</h1>
        <p className="page-subtitle">{s.password.resetLead}</p>
        {!ready ? (
          <p className="page-subtitle">{s.profile.loading}</p>
        ) : invalid ? (
          <form className="register-form">
            <p className="form-note is-bad">{s.password.linkInvalid}</p>
            <p className="form-aside">
              <Link href="/forgot-password" className="link">
                {s.password.requestNew}
              </Link>
            </p>
          </form>
        ) : (
          <form className="register-form" onSubmit={(event) => void save(event)}>
            <PasswordField
              label={s.password.newPassword}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              showLabel={s.password.show}
              hideLabel={s.password.hide}
              hint={strengthLabel ? `${s.password.hint} ${strengthLabel}` : s.password.hint}
            />
            <PasswordField
              label={s.password.confirm}
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              showLabel={s.password.show}
              hideLabel={s.password.hide}
            />
            {error ? <p className="form-note is-bad">{error}</p> : null}
            {info ? <p className="form-note is-ok">{info}</p> : null}
            <button className="btn" disabled={saving}>
              {saving ? s.password.updating : s.password.save}
            </button>
          </form>
        )}
      </div>
    </MarketingShell>
  );
}
