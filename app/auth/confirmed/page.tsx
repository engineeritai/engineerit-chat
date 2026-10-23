"use client";

import { useEffect, useState } from "react";
import { destinationAfterAuth } from "@/lib/postAuth";
import { pendingCheckoutPath, POST_AUTH_NEXT_KEY, readPendingCheckout } from "@/lib/pendingCheckout";
import { safeNextPath } from "@/lib/safeNext";
import { supabase } from "@/lib/supabaseClient";
import { useLocale } from "@/app/components/LocaleProvider";

export default function EmailConfirmedPage() {
  const { locale } = useLocale();
  const arabic = locale === "ar";
  const [href, setHref] = useState("/login");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const pending = readPendingCheckout();
    const fallback = pending ? pendingCheckoutPath(pending) : "/profile";
    if (next) {
      try {
        window.localStorage.setItem(POST_AUTH_NEXT_KEY, safeNextPath(next, fallback));
      } catch {
        /* ignore */
      }
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        const dest = destinationAfterAuth(next, data.session.user.user_metadata);
        setHref(dest);
        window.setTimeout(() => window.location.assign(dest), 1200);
        return;
      }
      const stored = safeNextPath(next, fallback);
      const login = `/login?next=${encodeURIComponent(stored)}`;
      setHref(login);
      window.setTimeout(() => window.location.assign(login), 1200);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-black/70 p-8 text-center">
        <h1 className="text-2xl font-semibold text-white mb-2">
          {arabic ? "تم تأكيد البريد" : "Email confirmed"}
        </h1>
        <p className="text-sm text-gray-300 mb-4">
          {arabic
            ? "تم تأكيد بريدك الإلكتروني. ادخل لفتح الدفع للباقة التي اخترتها."
            : "Your email address is confirmed. Sign in to open checkout for the plan you chose."}
        </p>
        <a className="btn" href={href} style={{ minHeight: 44 }}>
          {href.startsWith("/login")
            ? arabic
              ? "المتابعة إلى الدخول"
              : "Continue to sign in"
            : arabic
              ? "المتابعة إلى الدفع"
              : "Continue to checkout"}
        </a>
      </div>
    </div>
  );
}
