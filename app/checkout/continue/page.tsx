"use client";

import { useEffect, useState } from "react";
import { readPendingCheckout, startMoyasarCheckout } from "@/lib/checkoutClient";
import { useMessages } from "@/lib/useMessages";

export default function CheckoutContinuePage() {
  const { shell: s } = useMessages();
  const [error, setError] = useState("");

  useEffect(() => {
    const pending = readPendingCheckout();
    if (!pending) {
      window.location.replace("/pricing");
      return;
    }
    let cancelled = false;
    void startMoyasarCheckout(pending).then((result) => {
      if (cancelled || result.ok || result.needsAuth) return;
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
