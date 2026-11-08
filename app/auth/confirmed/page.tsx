"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/app/components/LocaleProvider";
import { readAnyPendingCheckout } from "@/lib/checkoutClient";
import { shellCopy } from "@/lib/shell";
import { safeNextPath } from "@/lib/safeNext";
import { supabase } from "@/lib/supabaseClient";
import { confirmLinkStatus, hasAuthLinkError, type ConfirmLinkStatus } from "@/lib/authCallback";
import type { EmailOtpType } from "@supabase/supabase-js";

function storedNext() {
  try {
    return window.localStorage.getItem("engineerit_post_auth_next");
  } catch {
    return null;
  }
}

const linkCopy = {
  en: {
    working: "Confirming your email…",
    confirmedTitle: "Email confirmed",
    confirmedBody: "Your email address is confirmed.",
    invalidTitle: "This confirmation link did not work",
    invalidBody: "The link may have expired or already been used. Sign in and send the confirmation email again.",
    idleTitle: "Confirm your email, then sign in",
    idleBody: "Use the confirmation link from your email, then sign in.",
  },
  ar: {
    working: "جاري تأكيد البريد…",
    confirmedTitle: "تم تأكيد البريد",
    confirmedBody: "تم تأكيد بريدك الإلكتروني.",
    invalidTitle: "رابط التأكيد لم يعمل",
    invalidBody: "قد يكون الرابط منتهي الصلاحية أو مستخدما. سجل الدخول وأرسل رسالة التأكيد مرة أخرى.",
    idleTitle: "أكد بريدك ثم سجل الدخول",
    idleBody: "استخدم رابط التأكيد من الرسالة، ثم سجل الدخول.",
  },
} as const;

export default function EmailConfirmedPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const arabic = locale === "ar";
  const copy = shellCopy[arabic ? "ar" : "en"];
  const text = linkCopy[arabic ? "ar" : "en"];
  const [loginHref, setLoginHref] = useState("/login");
  const [status, setStatus] = useState<ConfirmLinkStatus | "pending">("pending");

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code") || "";
      const tokenHash = params.get("token_hash") || "";
      const type = (params.get("type") || "") as EmailOtpType;
      let failed = hasAuthLinkError(window.location.search, window.location.hash);

      if (code && !failed) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        failed = Boolean(error);
      } else if (tokenHash && type && !failed) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        failed = Boolean(error);
      }

      if (code || tokenHash || window.location.hash) {
        window.history.replaceState({}, "", failed ? "/auth/confirmed?error=link" : "/auth/confirmed");
      }

      const pending = await readAnyPendingCheckout();
      const next = safeNextPath(params.get("next") || storedNext(), pending ? "/checkout/continue" : "/profile");
      const href = `/login?next=${encodeURIComponent(next)}`;
      const { data } = await supabase.auth.getSession();
      if (cancel) return;
      setLoginHref(href);
      const nextStatus = confirmLinkStatus({
        hasSession: Boolean(data.session?.access_token),
        failed,
      });
      setStatus(nextStatus);
      if (nextStatus !== "confirmed" || !data.session?.access_token) return;
      await fetch("/api/profile/ensure", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      }).catch(() => undefined);
      if (!cancel) router.replace(next);
    })();
    return () => {
      cancel = true;
    };
  }, [router]);

  const title =
    status === "confirmed" ? text.confirmedTitle : status === "invalid" ? text.invalidTitle : status === "idle" ? text.idleTitle : text.working;
  const body =
    status === "confirmed" ? text.confirmedBody : status === "invalid" ? text.invalidBody : status === "idle" ? text.idleBody : "";

  return (
    <div
      dir={arabic ? "rtl" : "ltr"}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020617",
        padding: 16,
      }}
    >
      <div
        style={{
          maxWidth: 448,
          width: "100%",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(0,0,0,0.7)",
          padding: 32,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#fff", margin: "0 0 8px" }}>{title}</h1>
        {body ? (
          <p style={{ fontSize: 14, color: "#d1d5db", margin: "0 0 16px" }} role="status">
            {body}
          </p>
        ) : null}
        {status === "confirmed" ? (
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 16px" }}>{copy.auth.emailConfirmHint}</p>
        ) : null}
        {status === "pending" ? null : (
          <Link href={loginHref} className="btn auth-follow">
            {copy.auth.continueSignIn}
          </Link>
        )}
      </div>
    </div>
  );
}
