"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ReturnInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("Confirming the Moyasar payment…");

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
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setMessage(json.error || "Moyasar has not confirmed this payment yet.");
        return;
      }
      setMessage("Payment confirmed. A receipt is on its way.");
      router.replace(`/profile?status=paid&plan=${json.plan || ""}&checkout=${checkout}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return <p>{message}</p>;
}

export default function CheckoutReturnPage() {
  return (
    <div className="page-wrap">
      <Suspense fallback={<p>Confirming the Moyasar payment…</p>}>
        <ReturnInner />
      </Suspense>
    </div>
  );
}
