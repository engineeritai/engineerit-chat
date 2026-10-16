"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import MoyasarCardForm from "../../components/MoyasarCardForm";
import { supabase } from "@/lib/supabaseClient";
import { PLAN_LABELS, formatSar, type PlanId } from "@/lib/plans";

type Checkout = {
  id: string;
  plan: PlanId;
  billing_interval: string;
  amount_sar: number;
  amount_halalas: number;
  seat_limit: number | null;
};

export default function CheckoutPage() {
  const params = useParams<{ id: string }>();
  const [sidebar, setSidebar] = useState(false);
  const [consent, setConsent] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [publishableKey, setPublishableKey] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        window.location.href = `/login?next=${encodeURIComponent(`/checkout/${params.id}`)}`;
        return;
      }
      const res = await fetch(`/api/checkout/moyasar?id=${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error || "Could not open checkout.");
        return;
      }
      setCheckout(json.checkout);
      setPublishableKey(json.publishableKey || "");
      setCallbackUrl(json.callbackUrl || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const metadata = useMemo(
    () => ({
      checkout_id: checkout?.id || "",
      plan_id: checkout?.plan || "",
      purpose: "checkout",
    }),
    [checkout?.id, checkout?.plan]
  );

  const label = checkout ? PLAN_LABELS[checkout.plan] || checkout.plan : "";

  return (
    <div className="app-shell">
      <NavSidebar isMobileOpen={sidebar} onCloseMobile={() => setSidebar(false)} />
      <div className="main">
        <Header onToggleSidebar={() => setSidebar((v) => !v)} />
        <div className="page-wrap">
          <h1 className="page-title">Checkout</h1>
          {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
          {checkout && (
            <>
              <p className="page-subtitle">
                {label} · {formatSar(Number(checkout.amount_sar), checkout.billing_interval === "year" ? "year" : "month")}
                {checkout.seat_limit && checkout.seat_limit > 1 ? ` · ${checkout.seat_limit} seats` : ""}. Prices include VAT.
                The card is saved for automatic renewal until you cancel.
              </p>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 16 }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>
                  I agree to save this card with Moyasar and to be charged automatically on each renewal until I cancel in billing.
                </span>
              </label>
              {consent && publishableKey && callbackUrl ? (
                <MoyasarCardForm
                  amountHalalas={Number(checkout.amount_halalas)}
                  description={`engineerit.ai ${label}`}
                  callbackUrl={callbackUrl}
                  publishableKey={publishableKey}
                  metadata={metadata}
                />
              ) : consent ? (
                <p>NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY is not set.</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
