"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Header from "../../../components/Header";
import NavSidebar from "../../../components/NavSidebar";
import MoyasarCardForm from "../../../components/MoyasarCardForm";
import { supabase } from "@/lib/supabaseClient";

function CardForm() {
  const params = useSearchParams();
  const [sidebar, setSidebar] = useState(false);
  const [consent, setConsent] = useState(false);
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const key = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY || "";
  const paymentId = params.get("id");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = "/login?next=/account/billing/card";
        return;
      }
      setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/billing/card", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      setMessage(res.ok ? "Card updated. Future renewals use this card." : json.error || "Could not save the card.");
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <div className="app-shell">
      <NavSidebar isMobileOpen={sidebar} onCloseMobile={() => setSidebar(false)} />
      <div className="main">
        <Header onToggleSidebar={() => setSidebar((v) => !v)} />
        <div className="page-wrap">
          <h1 className="page-title">Update card</h1>
          <p className="page-subtitle">
            Moyasar verifies the card with a SAR 1 charge and saves it for renewal. This does not change the plan period.
          </p>
          {message && <p>{message}</p>}
          {userId && !paymentId && (
            <label style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>I agree to replace the saved card used for automatic Moyasar renewals.</span>
            </label>
          )}
          {consent && userId && key && !paymentId && (
            <MoyasarCardForm
              amountHalalas={100}
              description="engineerit.ai card verification"
              callbackUrl={`${origin}/account/billing/card`}
              publishableKey={key}
              metadata={{ purpose: "card_update", user_id: userId }}
              saveCard
              onSaveCardRejected={() =>
                setMessage("Saving the card is unavailable until Moyasar tokenization is enabled.")
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function UpdateCardPage() {
  return (
    <Suspense fallback={<p>Loading card update…</p>}>
      <CardForm />
    </Suspense>
  );
}
