"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/payments/moyasar/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId: checkout, paymentId }),
      });
      if (cancelled) return;
      if (!res.ok) {
        router.replace("/pricing?payment=failed");
        return;
      }
      setMessage(s.profile.paymentConfirmedGo);
      router.replace(`/payment/success?checkout=${encodeURIComponent(checkout)}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router, s.profile.paymentConfirmedGo]);

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
