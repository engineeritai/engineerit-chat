"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/app/components/LocaleProvider";
import { readAnyPendingCheckout } from "@/lib/checkoutClient";
import { shellCopy } from "@/lib/shell";
import { safeNextPath } from "@/lib/safeNext";
import { supabase } from "@/lib/supabaseClient";
import type { EmailOtpType } from "@supabase/supabase-js";

function storedNext() {
  try {
    return window.localStorage.getItem("engineerit_post_auth_next");
  } catch {
    return null;
  }
}

export default function EmailConfirmedPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const arabic = locale === "ar";
  const copy = shellCopy[arabic ? "ar" : "en"];
  const [loginHref, setLoginHref] = useState("/login");

  useEffect(() => {
    let cancel = false;
    let timer = 0;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code") || "";
      const tokenHash = params.get("token_hash") || "";
      const type = (params.get("type") || "") as EmailOtpType;
      if (code) await supabase.auth.exchangeCodeForSession(code);
      else if (tokenHash && type) await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

      const pending = await readAnyPendingCheckout();
      const next = safeNextPath(params.get("next") || storedNext(), pending ? "/checkout/continue" : "/profile");
      const href = `/login?next=${encodeURIComponent(next)}`;
      if (cancel) return;
      setLoginHref(href);

      const { data } = await supabase.auth.getSession();
      if (cancel) return;
      if (data.session?.access_token) {
        await fetch("/api/profile/ensure", {
          method: "POST",
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        }).catch(() => undefined);
        router.replace(next);
        return;
      }
      timer = window.setTimeout(() => {
        if (!cancel) router.push(href);
      }, 2500);
    })();
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4" dir={arabic ? "rtl" : "ltr"}>
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-black/70 p-8 text-center">
        <h1 className="text-2xl font-semibold text-white mb-2">
          {arabic ? "تم تأكيد البريد" : "Email confirmed"}
        </h1>
        <p className="text-sm text-gray-300 mb-4">
          {arabic ? "تم تأكيد بريدك الإلكتروني." : "Your email address is confirmed."}
        </p>
        <p className="text-xs text-gray-400 mb-4">{copy.auth.emailConfirmHint}</p>
        <Link href={loginHref} className="btn auth-follow">
          {copy.auth.continueSignIn}
        </Link>
      </div>
    </div>
  );
}
