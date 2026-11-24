"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import { trafficCopy, type TrafficCopy } from "@/lib/adminTrafficCopy";
import { presentFeedback } from "@/lib/platformFeedback";
import { supabase } from "@/lib/supabaseClient";
import { useMessages } from "@/lib/useMessages";
import type { VisitReport } from "@/lib/visitAggregate";
import { exampleAdminStats } from "@/lib/visitExample";
import { allowVisitExample } from "@/lib/visitPublic";

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
  visits?: VisitReport;
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
  const { locale } = useMessages();
  const copy = trafficCopy[locale];
  const [sidebar, setSidebar] = useState(false);
  const [example, setExample] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const flag = new URLSearchParams(window.location.search).get("example") === "1";
    if (allowVisitExample(window.location.hostname, flag)) {
      const timer = window.setTimeout(() => {
        if (cancelled) return;
        setExample(true);
        setStats(exampleAdminStats());
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }
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
          <h1 className="page-title">
            {copy.title}
            {example ? (
              <span style={{ marginInlineStart: 10, fontSize: 14, fontWeight: 600, color: "#9a3412" }}>{copy.exampleBadge}</span>
            ) : null}
          </h1>
          <p className="page-subtitle">{copy.subtitle}</p>
          {example ? (
            <p role="status" style={{ background: "#fff7ed", border: "1px solid #fdba74", color: "#9a3412", borderRadius: 8, padding: "10px 12px", fontSize: 14, fontWeight: 600 }}>
              {copy.example}
            </p>
          ) : null}
          {error ? <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p> : null}
          {!error && !stats ? <p className="page-subtitle">Loading…</p> : null}
          {stats ? (
            <>
              <TrafficSummary stats={stats} copy={copy} />
              <VisitDetails stats={stats} copy={copy} />
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
  const { locale } = useMessages();
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
        LinkedIn, X, and Email are the only named sources. Unknown means a source field was stored and it matched none of those names. Not recorded means the account has no source field. The numbers are email-confirmed accounts. Tagged link and referring site split those same accounts by how the label was saved. {trafficCopy[locale].attributionTail}
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

function visitState(stats: Stats): VisitReport {
  if (!stats.visits) return { ready: false, reason: "unavailable" };
  return stats.visits;
}

function paidCount(stats: Stats) {
  return stats.subscriptions.reduce((sum, row) => sum + row.count, 0);
}

function Metric({ label, rows }: { label: string; rows: Array<{ label: string; value: string }> }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{label}</div>
      {rows.map((row) => (
        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, padding: "2px 0" }}>
          <span style={{ color: "#5c6570" }}>{row.label}</span>
          <span>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function TrafficSummary({ stats, copy }: { stats: Stats; copy: TrafficCopy }) {
  const visits = visitState(stats);
  const ready = visits.ready ? visits : null;
  const dash = "—";
  const unavailable = visits.ready ? null : visits.reason === "missing" ? copy.missing : copy.unavailable;
  return (
    <section className="card" style={{ marginBottom: 16 }} aria-label={copy.summary}>
      <h2 className="section-heading" style={{ marginTop: 0 }}>{copy.summary}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Metric
          label={copy.visits}
          rows={[
            { label: copy.today, value: ready ? formatCount(ready.today.views) : dash },
            { label: copy.days7, value: ready ? formatCount(ready.days7.views) : dash },
            { label: copy.days30, value: ready ? formatCount(ready.days30.views) : dash },
          ]}
        />
        <Metric
          label={copy.uniques}
          rows={[
            { label: copy.today, value: ready ? formatCount(ready.today.uniques) : dash },
            { label: copy.days7, value: ready ? formatCount(ready.days7.uniques) : dash },
            { label: copy.days30, value: ready ? formatCount(ready.days30.uniques) : dash },
          ]}
        />
        <Metric
          label={copy.signups}
          rows={[
            { label: copy.today, value: formatCount(stats.signups.today) },
            { label: copy.days7, value: formatCount(stats.signups.days7) },
          ]}
        />
        <Metric
          label={copy.chats}
          rows={[
            { label: copy.today, value: formatCount(stats.chats.today) },
            { label: copy.days7, value: formatCount(stats.chats.days7) },
          ]}
        />
        <Metric label={copy.paid} rows={[{ label: copy.activeNow, value: formatCount(paidCount(stats)) }]} />
      </div>
      {unavailable ? <p style={{ margin: "12px 0 0", fontSize: 14, color: "#5c6570" }}>{unavailable}</p> : null}
    </section>
  );
}

function formatRate(value: number | null) {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value * 100)}%`;
}

function formatDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(
    new Date(Date.UTC(year, month - 1, day, 12))
  );
}

function CountTable({ columns, rows }: { columns: [string, string]; rows: Array<{ label: string; count: number }> }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr>
          <th style={{ textAlign: "start", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{columns[0]}</th>
          <th style={{ textAlign: "end", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{columns[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>{row.label}</td>
            <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6", textAlign: "end" }}>{formatCount(row.count)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function VisitDetails({ stats, copy }: { stats: Stats; copy: TrafficCopy }) {
  const visits = visitState(stats);
  if (!visits.ready) return null;
  const max = Math.max(1, ...visits.daily.map((day) => day.views));
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2 className="section-heading" style={{ marginTop: 0 }}>{copy.daily}</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "start", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{copy.date}</th>
            <th style={{ textAlign: "start", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{copy.views}</th>
            <th style={{ textAlign: "end", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{copy.perDay}</th>
          </tr>
        </thead>
        <tbody>
          {visits.daily.map((day) => (
            <tr key={day.date}>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap" }}>{formatDay(day.date)}</td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: "1 1 120px", maxWidth: 160, height: 8, background: "#e8eeff", borderRadius: 4 }}>
                    <div
                      style={{
                        height: 8,
                        width: `${Math.round((day.views / max) * 100)}%`,
                        minWidth: day.views > 0 ? 4 : 0,
                        background: "#1a56ff",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <span>{formatCount(day.views)}</span>
                </div>
              </td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6", textAlign: "end" }}>{formatCount(day.uniques)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {visits.truncated ? <p style={{ margin: "0 0 12px", fontSize: 14, color: "#5c6570" }}>{copy.truncated}</p> : null}
      <h2 className="section-heading">{copy.topPages}</h2>
      {visits.topPages.length === 0 ? (
        <p style={{ margin: "0 0 12px" }}>{copy.noPages}</p>
      ) : (
        <CountTable columns={[copy.page, copy.count]} rows={visits.topPages} />
      )}
      <h2 className="section-heading">{copy.topReferrers}</h2>
      <p style={{ margin: "0 0 8px", fontSize: 14, color: "#5c6570" }}>{copy.directNote}</p>
      {visits.topReferrers.length === 0 ? (
        <p style={{ margin: "0 0 12px" }}>{copy.noReferrers}</p>
      ) : (
        <CountTable columns={[copy.referrer, copy.count]} rows={visits.topReferrers} />
      )}
      <h2 className="section-heading">{copy.topSources}</h2>
      {visits.topSources.length === 0 ? (
        <p style={{ margin: "0 0 12px" }}>{copy.noSources}</p>
      ) : (
        <CountTable columns={[copy.source, copy.count]} rows={visits.topSources} />
      )}
      <h2 className="section-heading">{copy.conversion}</h2>
      <p style={{ margin: "0 0 8px" }}>{copy.conversionLead}</p>
      <p style={{ margin: "0 0 4px" }}>
        {copy.days7}: {formatCount(visits.confirmed7)} / {formatCount(visits.days7.uniques)} = {formatRate(visits.conversion7)}
      </p>
      <p style={{ margin: 0 }}>
        {copy.days30}: {formatCount(visits.confirmed30)} / {formatCount(visits.days30.uniques)} = {formatRate(visits.conversion30)}
      </p>
    </section>
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
