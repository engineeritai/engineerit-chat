"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import { supabase } from "@/lib/supabaseClient";
import {
  AI_ADVISORS_FEATURE,
  EXTRA_SEAT_SAR,
  PLAN_LABELS,
  extraSeatPrice,
  formatSar,
  includedSeats,
  type PlanId,
  type SelfServePlanId,
} from "@/lib/plans";
import { formatUsdApprox, planPriceLabel } from "@/lib/pricingDisplay";

type Member = {
  id: string;
  email: string;
  role: string;
  status: string;
  accepted_at: string | null;
  invited_at: string | null;
};

type TeamPayload = {
  team: {
    id: string;
    name: string;
    plan: string;
    seat_limit: number;
    extra_seats: number;
    billing_interval: string;
    status: string;
    current_period_end: string;
  } | null;
  members: Member[];
  isOwner: boolean;
  access: boolean;
  seatsUsed?: number;
  seatsAvailable?: number;
};

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export default function TeamPage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<TeamPayload | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [seatDraft, setSeatDraft] = useState("0");

  async function load() {
    setError("");
    const headers = await authHeaders();
    if (!headers) {
      setPayload(null);
      setLoading(false);
      setError("Sign in to manage a team.");
      return;
    }
    await fetch("/api/team/claim", { method: "POST", headers }).catch(() => null);
    const res = await fetch("/api/team", { headers });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || "Could not load the team.");
      setLoading(false);
      return;
    }
    const next = json as TeamPayload;
    setPayload(next);
    if (next.team) setSeatDraft(String(next.team.extra_seats ?? 0));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const headers = await authHeaders();
      if (!headers) {
        setError("Sign in to invite colleagues.");
        return;
      }
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers,
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Could not send the invite.");
        return;
      }
      setEmail("");
      setInfo("Invite sent.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function transfer(memberId: string) {
    setError("");
    setInfo("");
    const headers = await authHeaders();
    if (!headers) return;
    const res = await fetch("/api/team/transfer", {
      method: "POST",
      headers,
      body: JSON.stringify({ memberId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Could not transfer ownership.");
      return;
    }
    setInfo("Ownership transferred.");
    await load();
  }

  async function updateSeats(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");
    const headers = await authHeaders();
    if (!headers) return;
    const res = await fetch("/api/team/seats", {
      method: "POST",
      headers,
      body: JSON.stringify({ extraSeats: Number(seatDraft) }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Could not update seats.");
      return;
    }
    const charged = Number(json.chargedHalalas || 0) / 100;
    const credit = Number(json.creditHalalas || 0) / 100;
    setInfo(
      charged > 0
        ? `Seats updated. Moyasar charged SAR ${charged} for the rest of this period.`
        : credit > 0
          ? `Seats updated. SAR ${credit} is credited to the next renewal.`
          : "Seats updated."
    );
    await load();
  }

  async function removeMember(memberId: string) {
    setError("");
    setInfo("");
    const headers = await authHeaders();
    if (!headers) return;
    const res = await fetch("/api/team/members", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ memberId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Could not remove that member.");
      return;
    }
    setInfo("Seat freed.");
    await load();
  }

  const team = payload?.team;
  const teamMonth = planPriceLabel("team", "month");
  const teamYear = planPriceLabel("team", "year");
  const planName =
    team && (team.plan === "team" || team.plan === "enterprise")
      ? PLAN_LABELS[team.plan as PlanId]
      : "Team";

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />
      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />
        <div className="page-wrap">
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">
            The buyer is the owner. Colleagues who accept an invite get Consultant-tier
            access, including {AI_ADVISORS_FEATURE}, until the subscription ends.
          </p>

          {error && <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p>}
          {info && <p style={{ color: "#166534", fontSize: 14 }}>{info}</p>}

          {loading ? (
            <p>Loading team…</p>
          ) : !team ? (
            <div className="card">
              <p style={{ marginTop: 0 }}>
                You are not on a team yet. Team is {teamMonth.primary} (approx. {teamMonth.usd}) for 5
                seats, or {teamYear.primary} (approx. {teamYear.usd}). Extra seats are{" "}
                {formatSar(EXTRA_SEAT_SAR.month, "month")} (approx. {formatUsdApprox(EXTRA_SEAT_SAR.month)}).{" "}
                {AI_ADVISORS_FEATURE} is included.
              </p>
              <Link href="/pricing" className="btn" style={{ display: "inline-block" }}>
                View Team pricing
              </Link>
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <h2 className="section-heading" style={{ marginTop: 0 }}>
                  {team.name || planName}
                </h2>
                <p style={{ margin: 0, fontSize: 14, color: "#374151" }}>
                  Plan: <strong>{planName}</strong>
                  {" · "}
                  {team.billing_interval === "year" ? "Annual" : "Monthly"}
                  {" · "}
                  {payload?.access ? "Active" : "Not active"}
                </p>
                <p style={{ fontSize: 14, color: "#374151" }}>
                  Seats: {payload?.seatsUsed ?? 0} used of {team.seat_limit}.{" "}
                  {payload?.seatsAvailable ?? 0} open.
                </p>
                <p style={{ fontSize: 14, color: "#6b7280" }}>
                  Access through {new Date(team.current_period_end).toLocaleDateString("en-GB")}
                  . When this date passes, every seat loses the team access.
                </p>
              </div>

              {payload?.isOwner && (
                <form className="card" onSubmit={invite} style={{ marginBottom: 16 }}>
                  <h2 className="section-heading" style={{ marginTop: 0 }}>
                    Invite by email
                  </h2>
                  <div className="form-row">
                    <label>
                      Colleague email
                      <input
                        className="input"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="colleague@company.com"
                      />
                    </label>
                  </div>
                  <button className="btn" type="submit" disabled={busy || !payload.access}>
                    {busy ? "Sending..." : "Send invite"}
                  </button>
                  {!payload.access && (
                    <p style={{ fontSize: 13, color: "#6b7280" }}>
                      Invites stay closed until the subscription is active.
                    </p>
                  )}
                </form>
              )}

              {payload?.isOwner && team && (team.plan === "team" || team.plan === "enterprise") && (
                <form className="card" onSubmit={updateSeats} style={{ marginBottom: 16 }}>
                  <h2 className="section-heading" style={{ marginTop: 0 }}>
                    Extra seats
                  </h2>
                  <p style={{ fontSize: 14, color: "#374151" }}>
                    {includedSeats(team.plan as SelfServePlanId)} seats are included. Each extra seat is{" "}
                    {formatSar(extraSeatPrice(team.plan as SelfServePlanId).month, "month")} (approx.{" "}
                    {formatUsdApprox(extraSeatPrice(team.plan as SelfServePlanId).month)}), or{" "}
                    {formatSar(extraSeatPrice(team.plan as SelfServePlanId).year, "year")} on an annual plan.
                    Adding seats charges the saved card for the rest of this period. Removing seats credits
                    the next renewal.
                  </p>
                  <div className="form-row">
                    <label>
                      Extra seats
                      <input
                        className="input"
                        type="number"
                        min={0}
                        max={200}
                        required
                        value={seatDraft}
                        onChange={(e) => setSeatDraft(e.target.value)}
                      />
                    </label>
                  </div>
                  <button className="btn" type="submit" disabled={!payload.access}>
                    Update seats
                  </button>
                </form>
              )}

              <div className="card">
                <h2 className="section-heading" style={{ marginTop: 0 }}>
                  Seats
                </h2>
                {(payload?.members || []).length === 0 ? (
                  <p style={{ fontSize: 14, color: "#6b7280" }}>No seats yet.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {payload?.members.map((member) => (
                      <li
                        key={member.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "8px 0",
                          borderBottom: "1px solid #f3f4f6",
                          fontSize: 14,
                        }}
                      >
                        <span>
                          {member.email}{" "}
                          <span style={{ color: "#6b7280" }}>
                            · {member.role} · {member.status}
                          </span>
                        </span>
                        {payload.isOwner && member.role !== "owner" && member.status !== "removed" && (
                          <span style={{ display: "flex", gap: 8 }}>
                            {member.status === "active" && (
                              <button type="button" className="btn" onClick={() => transfer(member.id)}>
                                Make owner
                              </button>
                            )}
                            <button type="button" className="btn" onClick={() => removeMember(member.id)}>
                              Remove
                            </button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
