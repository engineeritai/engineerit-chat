"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pendingCheckoutPath, pendingFromMetadata } from "@/lib/pendingCheckout";
import { supabase } from "@/lib/supabaseClient";

const SKIP = ["/checkout", "/payment", "/login", "/register", "/auth", "/reset-password", "/forgot-password"];

/** After email confirmation on any page, a signed-in buyer continues to the plan they chose. */
export default function ResumeCheckout() {
  const pathname = usePathname();

  useEffect(() => {
    if (SKIP.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (cancelled || !data.user) return;
      const pending = pendingFromMetadata(data.user.user_metadata);
      if (!pending) return;
      window.location.assign(pendingCheckoutPath(pending));
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
