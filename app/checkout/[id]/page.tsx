"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import MoyasarCardForm from "../../components/MoyasarCardForm";
import { supabase } from "@/lib/supabaseClient";
import { type PlanId } from "@/lib/plans";
import { formatMoney, planById } from "@/lib/labels";
import { useMessages } from "@/lib/useMessages";

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
  const { locale, shell: s } = useMessages();
  const [sidebar, setSidebar] = useState(false);
  const [consent, setConsent] = useState(false);
  const [saveRejected, setSaveRejected] = useState(false);
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
        setError(json.error || s.checkout.openFailed);
        return;
      }
      setCheckout(json.checkout);
      setPublishableKey(json.publishableKey || "");
      setCallbackUrl(json.callbackUrl || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, s.checkout.openFailed]);

  const metadata = useMemo(
    () => ({
      checkout_id: checkout?.id || "",
      plan_id: checkout?.plan || "",
      purpose: "checkout",
    }),
    [checkout?.id, checkout?.plan]
  );

  const label = checkout ? planById(locale, checkout.plan).name : "";
  const amount = checkout ? formatMoney(Number(checkout.amount_sar), locale) : "";
  const cycle = checkout?.billing_interval === "year" ? s.profile.annual : s.profile.monthly;

  return (
    <div className="app-shell">
      <NavSidebar isMobileOpen={sidebar} onCloseMobile={() => setSidebar(false)} />
      <div className="main">
        <Header onToggleSidebar={() => setSidebar((v) => !v)} />
        <div className="page-wrap">
          <h1 className="page-title">{s.checkout.title}</h1>
          {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
          {checkout && (
            <>
              <p className="page-subtitle">
                {label} · {amount} · {cycle}
                {checkout.seat_limit && checkout.seat_limit > 1
                  ? ` · ${checkout.seat_limit} ${s.checkout.seats}`
                  : ""}
                .
              </p>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 16 }}>
                <input
                  type="checkbox"
                  checked={consent && !saveRejected}
                  onChange={(e) => {
                    setSaveRejected(false);
                    setConsent(e.target.checked);
                  }}
                />
                <span>{s.checkout.consent}</span>
              </label>
              <p className="page-subtitle">
                {saveRejected ? s.checkout.saveRejected : consent ? s.checkout.savedCard : s.checkout.payOnce}
              </p>
              {publishableKey && callbackUrl ? (
                <MoyasarCardForm
                  amountHalalas={Number(checkout.amount_halalas)}
                  description={`engineerit.ai ${label}`}
                  callbackUrl={callbackUrl}
                  publishableKey={publishableKey}
                  metadata={metadata}
                  saveCard={consent && !saveRejected}
                  onSaveCardRejected={() => setSaveRejected(true)}
                />
              ) : (
                <p>{s.checkout.missingKey}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
