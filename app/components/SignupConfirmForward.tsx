"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { shouldForwardSignupConfirm } from "@/lib/authCallback";
import { supabase } from "@/lib/supabaseClient";

/** Move a Site URL confirmation onto /auth/confirmed without a new Supabase redirect. */
export default function SignupConfirmForward() {
  const router = useRouter();
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (!shouldForwardSignupConfirm(pathname, window.location.search, window.location.hash)) return;
    let cancel = false;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") || "";

    const finish = async (token: string) => {
      await fetch("/api/profile/ensure", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
      if (!cancel) router.replace("/auth/confirmed");
    };

    const { data: auth } = supabase.auth.onAuthStateChange((event, session) => {
      if (code || cancel || event === "PASSWORD_RECOVERY" || !session?.access_token) return;
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") void finish(session.access_token);
    });

    void (async () => {
      if (code) {
        const exchanged = await supabase.auth.exchangeCodeForSession(code).catch(() => ({
          error: { message: "exchange failed" },
        }));
        if (exchanged.error || cancel) return;
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (cancel || !token) return;
      await finish(token);
    })();

    return () => {
      cancel = true;
      auth.subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
