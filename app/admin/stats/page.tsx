"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import { presentFeedback } from "@/lib/platformFeedback";
import { supabase } from "@/lib/supabaseClient";

type PlanCount = { plan: string; count: number };

type Suggestion = {
  rating: number;
  liked: string | null;
  improve: string | null;
  createdAt: string;
};

type SourceCounts = {
  linkedin: number;
  x: number;
  email: number;
  unknown: number;
  not_recorded: number;
};

type AttributionStats = {
  confirmedToday: number;
  confirmed7: number;
  unconfirmed7: number;
  excludedTest: number;
  today: SourceCounts;
  days7: SourceCounts;
  methods?: { utm: number; referrer: number; none: number; not_recorded: number };
  visits: null;
  conversion: null;
};

type Stats = {
  timezone: string;
  signups: { today: number; days7: number };
  attribution?: AttributionStats | null;
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
            Account counts from Supabase, in Arabia time. Visit totals are not stored here.
          </p>
          {error ? <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p> : null}
          {!error && !stats ? <p className="page-subtitle">Loading…</p> : null}
          {stats ? (
            <>
              <section className="card" style={{ marginBottom: 16 }}>
                <h2 className="section-heading" style={{ marginTop: 0 }}>New signups</h2>
                <p style={{ margin: "0 0 8px" }}>Auth accounts created, including addresses that have not confirmed email. Today {formatCount(stats.signups.today)}. Last 7 days {formatCount(stats.signups.days7)}.</p>
              </section>
              <AttributionSection value={stats.attribution} />
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
                <FeedbackSummary value={stats.feedback} />
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

const SOURCE_ROWS: Array<{ key: keyof SourceCounts; label: string }> = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "x", label: "X" },
  { key: "email", label: "Email" },
  { key: "unknown", label: "Unknown" },
  { key: "not_recorded", label: "Not recorded" },
];

function AttributionSection({ value }: { value: AttributionStats | null | undefined }) {
  if (!value) {
    return (
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="section-heading" style={{ marginTop: 0 }}>Confirmed signups by source</h2>
        <p style={{ margin: 0 }}>Source counts are not in this response.</p>
      </section>
    );
  }
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2 className="section-heading" style={{ marginTop: 0 }}>Confirmed signups by source</h2>
      <p style={{ margin: "0 0 8px" }}>
        Email-confirmed accounts, excluding test addresses. Today {formatCount(value.confirmedToday)}. Last 7 days {formatCount(value.confirmed7)}.
        Still unconfirmed in the last 7 days: {formatCount(value.unconfirmed7)}. Test addresses excluded from these counts: {formatCount(value.excludedTest)}.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 8 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Source</th>
            <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>7 days</th>
          </tr>
        </thead>
        <tbody>
          {SOURCE_ROWS.map((row) => (
            <tr key={row.key}>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>{row.label}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>{formatCount(value.days7[row.key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: "8px 0" }}>
        Saved from a tagged link: {formatCount(value.methods?.utm ?? 0)}. Saved from the referring site: {formatCount(value.methods?.referrer ?? 0)}. No method stored: {formatCount(value.methods?.none ?? 0)}. Method not recorded: {formatCount(value.methods?.not_recorded ?? 0)}.
      </p>
      <p style={{ margin: 0, fontSize: 14, color: "#5c6570" }}>
        LinkedIn, X, and Email are the only named sources. Unknown means this account stored no allowed source. Not recorded means the account has no source field. The rows count email-confirmed accounts. A tagged link is the label saved at registration. A referring site is only the website host, such as LinkedIn or a mailbox. Page views stay in Vercel Web Analytics. This server cannot read that dashboard. Visits: unavailable. Conversion: unavailable.
      </p>
    </section>
  );
}

function FeedbackSummary({ value }: { value: unknown }) {
  const feedback = presentFeedback(value);
  if (!feedback.ready) {
    return <p style={{ margin: 0 }}>Feedback storage is not set up yet.</p>;
  }
  if (feedback.count === 0) {
    return <p style={{ margin: 0 }}>No platform feedback yet.</p>;
  }
  return (
    <>
      <p style={{ margin: "0 0 8px" }}>
        {formatCount(feedback.count)} responses. Average rating{" "}
        {feedback.averageRating == null ? "—" : feedback.averageRating.toFixed(1)} out of 5.
      </p>
      {feedback.latest.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: "#5c6570" }}>No written suggestions yet.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {feedback.latest.map((item, index) => (
            <li key={`${item.createdAt}-${index}`} style={{ marginBottom: 8 }}>
              <div>Rating {item.rating}/5</div>
              {item.liked ? <div>Likes: {item.liked}</div> : null}
              {item.improve ? <div>Improve: {item.improve}</div> : null}
            </li>
          ))}
        </ul>
      )}
    </>
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
