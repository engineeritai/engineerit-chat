"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";

type SubscriptionRow = {
  id: string;
  plan: string;
  status: string;
  amount_sar: number;
  billing_interval: string;
  seat_limit: number;
  current_period_end: string;
  failure_count: number;
  cancel_at_period_end: boolean;
  customer_email: string | null;
};

type AttemptRow = {
  id: string;
  kind: string;
  status: string;
  amount_halalas: number;
  attempt_number: number;
  error: string | null;
  created_at: string;
};

type TeamRow = {
  id: string;
  name: string | null;
  plan: string;
  status: string;
  seat_limit: number;
  extra_seats: number;
  current_period_end: string;
};

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export default function AdminSubscriptionsPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const headers = await authHeader();
      if (!headers) {
        if (!cancelled) setError("Sign in with an admin account.");
        return;
      }
      const res = await fetch("/api/admin/overview", { headers });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error || "Could not load billing.");
        return;
      }
      setSubscriptions(json.subscriptions || []);
      setAttempts(json.attempts || []);
      setTeams(json.teams || []);
      setReady(true);
      if (Array.isArray(json.errors) && json.errors.length > 0) {
        setError(json.errors.join(" "));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />
      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />
        <div className="page-wrap">
          <h1 className="page-title">Billing monitor</h1>
          <p className="page-subtitle">
            <a href="/admin/promos">Promo codes</a>
          </p>
          <p className="page-subtitle">
            Read-only view of subscriptions, renewal attempts, and teams. Customers buy, renew,
            cancel, and change seats themselves through Moyasar.
          </p>
          {error && <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p>}

          {ready && (
          <>
          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Subscriptions</h2>
            <MonitorTable
              empty="No billing subscriptions yet."
              headers={["Email", "Plan", "Status", "Amount", "Seats", "Renews", "Failures"]}
              rows={subscriptions.map((row) => [
                row.customer_email || row.id,
                row.plan,
                row.cancel_at_period_end ? `${row.status} (cancels)` : row.status,
                `${row.amount_sar} SAR / ${row.billing_interval}`,
                String(row.seat_limit),
                new Date(row.current_period_end).toLocaleDateString("en-GB"),
                String(row.failure_count),
              ])}
            />
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="section-heading" style={{ marginTop: 0 }}>Recent charges</h2>
            <MonitorTable
              empty="No renewal or seat charges yet."
              headers={["When", "Kind", "Attempt", "Amount", "Status", "Note"]}
              rows={attempts.map((row) => [
                new Date(row.created_at).toLocaleString("en-GB"),
                row.kind,
                String(row.attempt_number),
                `SAR ${(row.amount_halalas / 100).toFixed(2)}`,
                row.status,
                row.error || "",
              ])}
            />
          </section>

          <section className="card">
            <h2 className="section-heading" style={{ marginTop: 0 }}>Teams</h2>
            <MonitorTable
              empty="No teams yet."
              headers={["Name", "Plan", "Status", "Seats", "Extra", "Access until"]}
              rows={teams.map((row) => [
                row.name || row.id,
                row.plan,
                row.status,
                String(row.seat_limit),
                String(row.extra_seats),
                new Date(row.current_period_end).toLocaleDateString("en-GB"),
              ])}
            />
          </section>
          </>
          )}
        </div>
      </div>
    </div>
  );
}

function MonitorTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>{empty}</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
