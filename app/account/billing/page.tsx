"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";
import { PLAN_LABELS, formatSar, type PlanId } from "@/lib/plans";

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
  const [sidebar, setSidebar] = useState(false);
  const [sub, setSub] = useState<Sub | null>(null);
  const [card, setCard] = useState<{ brand: string | null; last_four: string | null } | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

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
      setError(json.error || "Could not load billing.");
      return;
    }
    setSub(json.subscription);
    setCard(json.card);
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
      setError(json.error || "Could not update billing.");
      return;
    }
    setInfo(path.endsWith("cancel") ? "Renewal is cancelled at the end of this period." : "Renewal is on again.");
    await load();
  }

  return (
    <div className="app-shell">
      <NavSidebar isMobileOpen={sidebar} onCloseMobile={() => setSidebar(false)} />
      <div className="main">
        <Header onToggleSidebar={() => setSidebar((v) => !v)} />
        <div className="page-wrap">
          <h1 className="page-title">Billing</h1>
          {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
          {info && <p style={{ color: "#166534" }}>{info}</p>}
          {!sub ? (
            <p>No paid subscription yet. Buy a plan on the pricing page. It renews through Moyasar until you cancel.</p>
          ) : (
            <div className="card">
              <p>
                <strong>{PLAN_LABELS[sub.plan] || sub.plan}</strong> · {sub.status}
                {sub.cancel_at_period_end ? " · cancels at period end" : ""}
              </p>
              <p>
                {formatSar(Number(sub.amount_sar), sub.billing_interval === "year" ? "year" : "month")}
                {sub.seat_limit > 1 ? ` · ${sub.seat_limit} seats` : ""}
              </p>
              <p>Renews {new Date(sub.current_period_end).toLocaleDateString("en-GB")} unless you cancel.</p>
              <p>
                Card: {card?.brand || "saved card"} {card?.last_four ? `ending ${card.last_four}` : "not on file yet"}
              </p>
              {sub.failure_count > 0 && (
                <p>The last charge failed. Update the card. The next retry is {sub.next_retry_at ? new Date(sub.next_retry_at).toLocaleDateString("en-GB") : "scheduled"}.</p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btn" href="/account/billing/card">Update card</Link>
                {sub.cancel_at_period_end ? (
                  <button className="btn" type="button" onClick={() => post("/api/billing/resume")}>Resume renewal</button>
                ) : (
                  <button className="btn" type="button" onClick={() => post("/api/billing/cancel")}>Cancel renewal</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
