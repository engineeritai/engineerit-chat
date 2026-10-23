"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { checkoutFailureKind } from "@/lib/checkoutFailure";
import { useMessages } from "@/lib/useMessages";

function ReturnInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { shell: s } = useMessages();
  const [message, setMessage] = useState(s.profile.confirmingPayment);

  useEffect(() => {
    setMessage(s.profile.confirmingPayment);
  }, [s.profile.confirmingPayment]);

  useEffect(() => {
    const checkout = params.get("checkout") || "";
    const paymentId = params.get("id") || "";
    const pay = params.get("pay") || "";
    const status = (params.get("status") || "").toLowerCase();
    const backToCheckout = (kind: "cancelled" | "failed" | "mismatch" = "failed") => {
      const notice =
        kind === "cancelled"
          ? s.checkout.paymentCancelled
          : kind === "mismatch"
            ? s.checkout.paymentMismatch
            : s.checkout.paymentFailed;
      try {
        sessionStorage.setItem("engineerit_checkout_notice", notice.slice(0, 300));
      } catch {
        /* The checkout page still shows the generic retry message. */
      }
      const next = new URLSearchParams({ retry: "1" });
      if (pay) next.set("pay", pay);
      router.replace(`/checkout/${checkout}?${next.toString()}`);
    };
    if (!/^[0-9a-f-]{36}$/i.test(checkout)) {
      router.replace("/pricing?payment=failed");
      return;
    }
    if (status && status !== "paid") {
      backToCheckout(checkoutFailureKind(status));
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/payments/moyasar/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId: checkout, paymentId }),
      });
      if (cancelled) return;
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { reason?: string };
        backToCheckout(checkoutFailureKind(status, json.reason));
        return;
      }
      setMessage(s.profile.paymentConfirmedGo);
      const next = new URLSearchParams({ checkout });
      if (pay) next.set("pay", pay);
      router.replace(`/payment/success?${next.toString()}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router, s.checkout.paymentCancelled, s.checkout.paymentFailed, s.checkout.paymentMismatch, s.profile.paymentConfirmedGo]);

  return <p>{message}</p>;
}

export default function CheckoutReturnPage() {
  return (
    <div className="page-wrap">
      <Suspense fallback={<p>…</p>}>
        <ReturnInner />
      </Suspense>
    </div>
  );
}
