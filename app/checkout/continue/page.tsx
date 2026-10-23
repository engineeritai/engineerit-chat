"use client";

import { useEffect, useState } from "react";
import { readAnyPendingCheckout, startMoyasarCheckout } from "@/lib/checkoutClient";
import { useMessages } from "@/lib/useMessages";

export default function CheckoutContinuePage() {
  const { shell: s } = useMessages();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void readAnyPendingCheckout().then((pending) => {
      if (cancelled) return;
      if (!pending) {
        window.location.replace("/pricing");
        return;
      }
      return startMoyasarCheckout(pending);
    }).then((result) => {
      if (cancelled || !result || result.ok || result.needsAuth) return;
      setError(result.error);
    });
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
