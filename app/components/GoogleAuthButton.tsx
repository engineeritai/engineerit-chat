"use client";

import { useState } from "react";
import Link from "next/link";
import { readPendingCheckout } from "@/lib/checkoutClient";
import { googleAuthEnabled, googleRedirectUrl, saveGooglePending } from "@/lib/googleAuth";
import { readAcquisitionPayload } from "@/lib/attribution";
import { supabase } from "@/lib/supabaseClient";
import { useMessages } from "@/lib/useMessages";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

export default function GoogleAuthButton({
  nextPath,
  accepted,
  onNeedTerms,
  showAgreement = false,
}: {
  nextPath: string | null;
  accepted: boolean;
  onNeedTerms?: () => void;
  showAgreement?: boolean;
}) {
  const { shell: s, locale } = useMessages();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!googleAuthEnabled()) return null;

  const start = async () => {
    setError("");
    if (!accepted) {
      onNeedTerms?.();
      setError(s.auth.policyRequired);
      const terms = document.getElementById("register-terms");
      terms?.scrollIntoView({ block: "center" });
      return;
    }
    setBusy(true);
    try {
      saveGooglePending({
        next: nextPath,
        termsAcceptedAt: new Date().toISOString(),
        acquisition: readAcquisitionPayload(),
        pending: readPendingCheckout(),
      });
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: googleRedirectUrl(window.location.origin),
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) {
        setError(s.auth.googleFailed);
        setBusy(false);
      }
    } catch {
      setError(s.auth.googleFailed);
      setBusy(false);
    }
  };

  return (
    <div className="auth-google-block">
      <button
        type="button"
        className="auth-google"
        data-testid="continue-google"
        onClick={() => void start()}
        disabled={busy}
      >
        <GoogleMark />
        <span>{busy ? s.auth.googleWorking : s.auth.continueGoogle}</span>
      </button>
      {showAgreement ? (
        <p className="auth-google-agree">
          {s.auth.googleAgreeBefore}
          <Link href={`/legal/terms?lang=${locale}`} className="link">
            {s.auth.termsLink}
          </Link>
          {s.auth.agreeAnd}
          <Link href={`/legal/privacy?lang=${locale}`} className="link">
            {s.auth.privacyLink}
          </Link>
          {s.auth.googleAgreeAfter}
        </p>
      ) : null}
      {error ? (
        <p className="form-note is-bad" role="alert">
          {error}
        </p>
      ) : null}
      <p className="auth-or">{s.auth.orDivider}</p>
    </div>
  );
}
