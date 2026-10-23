"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";

type PlanCount = { plan: string; count: number };

type Suggestion = {
  rating: number;
  liked: string | null;
  improve: string | null;
  createdAt: string;
};

type Stats = {
  timezone: string;
  signups: { today: number; days7: number };
  chats: { today: number; days7: number };
  subscriptions: PlanCount[];
  payments7d: { count: number; amountSar: number; byPlan: PlanCount[] };
  feedback: { count: number; averageRating: number | null; latest: Suggestion[] } | null;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}

function formatSar(value: number) {
  return `SAR ${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value)}`;
}

export default function AdminStatsPage() {
  const [sidebar, setSidebar] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (!cancelled) setError("Sign in with the owner account.");
        return;
      }
      const res = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error || "Could not load stats.");
        return;
      }
      setStats(json as Stats);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <NavSidebar isMobileOpen={sidebar} onCloseMobile={() => setSidebar(false)} />
      <div className="main">
        <Header onToggleSidebar={() => setSidebar((open) => !open)} />
        <div className="page-wrap">
          <h1 className="page-title">Traffic and usage</h1>
          <p className="page-subtitle">
            Counts from Supabase, in Arabia time. Page views and the LinkedIn campaign live in Vercel Analytics.
          </p>
          {error ? <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p> : null}
          {!error && !stats ? <p className="page-subtitle">Loading…</p> : null}
          {stats ? (
            <>
              <section className="card" style={{ marginBottom: 16 }}>
                <h2 className="section-heading" style={{ marginTop: 0 }}>New signups</h2>
                <p style={{ margin: "0 0 8px" }}>Auth accounts created. Today {formatCount(stats.signups.today)}. Last 7 days {formatCount(stats.signups.days7)}.</p>
              </section>
              <section className="card" style={{ marginBottom: 16 }}>
                <h2 className="section-heading" style={{ marginTop: 0 }}>Chats</h2>
                <p style={{ margin: "0 0 8px" }}>Saved conversations. Guest chats that were not stored are not included. Today {formatCount(stats.chats.today)}. Last 7 days {formatCount(stats.chats.days7)}.</p>
              </section>
              <section className="card" style={{ marginBottom: 16 }}>
                <h2 className="section-heading" style={{ marginTop: 0 }}>Active subscriptions</h2>
                {stats.subscriptions.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 14, color: "#5c6570" }}>No active billing subscriptions.</p>
                ) : (
                  <PlanTable rows={stats.subscriptions} />
                )}
              </section>
              <section className="card" style={{ marginBottom: 16 }}>
                <h2 className="section-heading" style={{ marginTop: 0 }}>Platform feedback</h2>
                {stats.feedback == null ? (
                  <p style={{ margin: 0 }}>Feedback storage is not set up yet.</p>
                ) : stats.feedback.count === 0 ? (
                  <p style={{ margin: 0 }}>No platform feedback yet.</p>
                ) : (
                  <>
                    <p style={{ margin: "0 0 8px" }}>
                      {formatCount(stats.feedback.count)} responses. Average rating{" "}
                      {stats.feedback.averageRating == null ? "—" : stats.feedback.averageRating.toFixed(1)} out of 5.
                    </p>
                    {stats.feedback.latest.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 14, color: "#5c6570" }}>No written suggestions yet.</p>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {stats.feedback.latest.map((item) => (
                          <li key={item.createdAt + item.rating + (item.liked || "") + (item.improve || "")} style={{ marginBottom: 8 }}>
                            <div>Rating {item.rating}/5</div>
                            {item.liked ? <div>Likes: {item.liked}</div> : null}
                            {item.improve ? <div>Improve: {item.improve}</div> : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </section>
              <section className="card">
                <h2 className="section-heading" style={{ marginTop: 0 }}>Payments, last 7 days</h2>
                <p style={{ margin: "0 0 8px" }}>
                  {formatCount(stats.payments7d.count)} paid invoices, {formatSar(stats.payments7d.amountSar)}.
                </p>
                {stats.payments7d.byPlan.length > 0 ? <PlanTable rows={stats.payments7d.byPlan} /> : null}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PlanTable({ rows }: { rows: PlanCount[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Plan</th>
          <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Count</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.plan}>
            <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>{row.plan}</td>
            <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{formatCount(row.count)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
