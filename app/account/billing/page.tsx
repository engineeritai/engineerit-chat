"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";
import { formatSar, type PlanId } from "@/lib/plans";
import { planById } from "@/lib/labels";
import { SarText } from "@/app/components/RiyalAmount";
import { formatBillingDate } from "@/lib/billingCycle";
import { useMessages } from "@/lib/useMessages";

type Sub = {
  plan: PlanId;
  billing_interval: string;
  amount_sar: number;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  failure_count: number;
  next_retry_at: string | null;
  seat_limit: number;
};

export default function BillingPage() {
  const { locale, shell: s } = useMessages();
  const [sidebar, setSidebar] = useState(false);
  const [sub, setSub] = useState<Sub | null>(null);
  const [card, setCard] = useState<{ brand: string | null; last_four: string | null } | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      window.location.href = "/login?next=/account/billing";
      return;
    }
    const res = await fetch("/api/billing", { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || s.billing.loadFailed);
      setLoaded(true);
      return;
    }
    setSub(json.subscription);
    setCard(json.card);
    setLoaded(true);
  }

  useEffect(() => {
    void load();
  }, []);

  async function post(path: string) {
    setError("");
    setInfo("");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || s.billing.updateFailed);
      return;
    }
    setInfo(path.endsWith("cancel") ? s.billing.cancelledInfo : s.billing.resumedInfo);
    await load();
  }

  const renewalDate = sub ? formatBillingDate(sub.current_period_end, locale) : "";

  return (
    <div className="app-shell">
      <NavSidebar isMobileOpen={sidebar} onCloseMobile={() => setSidebar(false)} />
      <div className="main">
        <Header onToggleSidebar={() => setSidebar((v) => !v)} />
        <div className="page-wrap">
          <h1 className="page-title">{s.billing.title}</h1>
          {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
          {info && <p style={{ color: "#166534" }}>{info}</p>}
          {loaded && !sub ? (
            <p>{s.billing.empty}</p>
          ) : null}
          {sub ? (
            <div className="card">
              <p>
                <strong>{planById(locale, sub.plan).name}</strong> · {sub.status}
                {sub.cancel_at_period_end ? ` · ${s.billing.cancelsAtEnd}` : ""}
              </p>
              <p>
                <SarText>
                  {formatSar(Number(sub.amount_sar), sub.billing_interval === "year" ? "year" : "month")}
                </SarText>
                {sub.seat_limit > 1 ? ` · ${sub.seat_limit} ${s.billing.seats}` : ""}
              </p>
              <p>
                {sub.cancel_at_period_end
                  ? `${s.billing.endsOn} ${renewalDate}`
                  : `${s.billing.renewsOn} ${renewalDate}`}
              </p>
              <p>
                {s.billing.cardLabel}: {card?.brand ? `${card.brand} ` : ""}
                {card?.last_four ? `${s.billing.ending} ${card.last_four}` : s.billing.cardMissing}
              </p>
              {sub.failure_count > 0 && (
                <p>
                  {s.billing.chargeFailed}{" "}
                  {sub.next_retry_at
                    ? `${s.billing.nextRetry} ${formatBillingDate(sub.next_retry_at, locale)}.`
                    : ""}
                </p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btn" href="/account/billing/card">{s.billing.updateCard}</Link>
                {sub.cancel_at_period_end ? (
                  <button className="btn" type="button" onClick={() => post("/api/billing/resume")}>{s.billing.resumeRenewal}</button>
                ) : (
                  <button className="btn" type="button" onClick={() => post("/api/billing/cancel")}>{s.billing.cancelRenewal}</button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
