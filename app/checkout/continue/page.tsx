"use client";

import { useEffect, useState } from "react";
import { startMoyasarCheckout } from "@/lib/checkoutClient";
import { pendingFromMetadata, pendingFromSearch, readPendingCheckout, savePendingCheckout } from "@/lib/pendingCheckout";
import { supabase } from "@/lib/supabaseClient";
import { useMessages } from "@/lib/useMessages";

export default function CheckoutContinuePage() {
  const { shell: s } = useMessages();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      let pending = pendingFromSearch(params) || readPendingCheckout();
      if (!pending) {
        const { data } = await supabase.auth.getUser();
        pending = pendingFromMetadata(data.user?.user_metadata);
      }
      if (cancelled) return;
      if (!pending) {
        window.location.replace("/pricing");
        return;
      }
      savePendingCheckout(pending);
      const result = await startMoyasarCheckout(pending);
      if (cancelled || result.ok || result.needsAuth) return;
      setError(result.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-wrap">
      <p>{error || s.profile.confirmingPayment}</p>
    </div>
  );
}
