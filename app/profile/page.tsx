"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: string | null;
};

type SubscriptionRow = {
  plan: string | null;
  price: number | null;
  currency: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
};

type PlanId = "assistant" | "engineer" | "professional" | "consultant";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const [activeSub, setActiveSub] = useState<SubscriptionRow | null>(null);
  const [subHistory, setSubHistory] = useState<SubscriptionRow[]>([]);

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        setErrorMsg(null);
        setInfoMsg(null);

        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) {
          setErrorMsg("You are not logged in.");
          return;
        }

        setEmail(user.email ?? null);

        // 1) Handle return from Moyasar (use API route to save subscription)
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const status = params.get("status");
          const planParam = params.get("plan") as PlanId | null;

          const allowedPlans: PlanId[] = ["assistant", "engineer", "professional", "consultant"];

          if (status === "paid" && planParam && allowedPlans.includes(planParam)) {
            try {
              const res = await fetch("/api/subscription/select", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: planParam }),
              });

              const json = await res.json().catch(() => ({}));

              if (!res.ok || !json?.success) {
                setErrorMsg("Could not save subscription after payment. Please contact support.");
              } else {
                setInfoMsg("Payment successful and subscription updated.");
              }

              // تنظيف الرابط
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, "", cleanUrl);
            } catch {
              setErrorMsg("Could not save subscription after payment. Please contact support.");
            }
          }
        }

        // 2) Load profile row
        let initialFullName =
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          user.email?.split("@")[0] ??
          "";

        let avatarUrl: string | null =
          (user.user_metadata?.avatar_url as string | undefined) ??
          (user.user_metadata?.picture as string | undefined) ??
          null;

        let subscriptionTier: string | null = "assistant";

        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, subscription_tier")
          .eq("id", user.id)
          .maybeSingle();

        if (!profErr && prof) {
          if (prof.full_name) initialFullName = prof.full_name;
          if (prof.avatar_url) avatarUrl = prof.avatar_url;
          if (prof.subscription_tier) subscriptionTier = prof.subscription_tier;
        }

        // Ensure row exists (safe upsert)
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name: initialFullName,
            avatar_url: avatarUrl,
            subscription_tier: subscriptionTier ?? "assistant",
          },
          { onConflict: "id" }
        );

        setProfile({
          full_name: initialFullName,
          avatar_url: avatarUrl,
          subscription_tier: subscriptionTier ?? "assistant",
        });
        setFullName(initialFullName);

        // 3) Load current subscription billing data (latest paid row for user)
        const { data: subs, error: subsErr } = await supabase
          .from("subscriptions")
          .select("plan, price, currency, status, start_date, end_date")
          .eq("user_id", user.id)
          .order("start_date", { ascending: false })
          .limit(1);

        if (!subsErr && subs && subs.length > 0) {
          setActiveSub(subs[0] as SubscriptionRow);
        } else {
          setActiveSub(null);
        }

        // 4) History (last 10)
        const { data: history, error: histErr } = await supabase
          .from("subscriptions")
          .select("plan, price, currency, status, start_date, end_date")
          .eq("user_id", user.id)
          .order("start_date", { ascending: false })
          .limit(10);

        if (!histErr && history) setSubHistory(history as SubscriptionRow[]);
      } catch (e) {
        console.error(e);
        setErrorMsg("Could not load profile.");
      } finally {
        setLoading(false);
      }
    }

    void loadAll();
  }, []);

  async function handleSaveName() {
    try {
      setSavingName(true);
      setErrorMsg(null);
      setInfoMsg(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErrorMsg("You are not logged in.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) {
        console.error(error);
        setErrorMsg("Could not save profile.");
        return;
      }

      setProfile((prev) => (prev ? { ...prev, full_name: fullName } : prev));
      setInfoMsg("Profile updated successfully.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSavingAvatar(true);
      setErrorMsg(null);
      setInfoMsg(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErrorMsg("You are not logged in.");
        return;
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error(uploadError);
        setErrorMsg("Could not upload profile photo.");
        return;
      }

      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = publicData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        console.error(updateError);
        setErrorMsg("Could not save profile photo.");
        return;
      }

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
      setInfoMsg("Profile photo updated.");
    } finally {
      setSavingAvatar(false);
      e.target.value = "";
    }
  }

  const currentPlan = profile?.subscription_tier || "assistant";
  const currentPlanLabel =
    currentPlan === "assistant"
      ? "Assistant (Free)"
      : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);

  return (
    <div className="app-shell">
      <NavSidebar isMobileOpen={isSidebarOpenMobile} onCloseMobile={() => setIsSidebarOpenMobile(false)} />

      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />

        <div className="page-wrap">
          <h1 className="page-title">Profile &amp; Subscription</h1>

          {errorMsg && (
            <div
              style={{
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
                padding: "10px 12px",
                borderRadius: 12,
                marginBottom: 12,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div
              style={{
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                color: "#166534",
                padding: "10px 12px",
                borderRadius: 12,
                marginBottom: 12,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {infoMsg}
            </div>
          )}

          {loading ? (
            <p>Loading profile…</p>
          ) : (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "9999px",
                    background: "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    fontSize: 28,
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    (fullName?.trim()[0] || "E").toUpperCase()
                  )}
                </div>

                <div>
                  <div style={{ marginBottom: 6 }}>
                    <label
                      style={{
                        display: "inline-block",
                        padding: "6px 12px",
                        borderRadius: 9999,
                        background: "#2563eb",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleAvatarChange}
                        disabled={savingAvatar}
                      />
                    </label>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>JPG, PNG, or GIF. Max 5 MB.</div>
                </div>
              </div>

              <div className="form-row">
                <label>
                  Full name
                  <input
                    className="input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </label>
              </div>

              {email && (
                <div className="form-row">
                  <label>
                    Email
                    <input className="input" type="email" value={email} readOnly />
                  </label>
                </div>
              )}

              <button className="btn" type="button" onClick={handleSaveName} disabled={savingName}>
                {savingName ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}

          <div className="card" style={{ marginTop: 24 }}>
            <h2 className="card-title">Subscription</h2>

            <p style={{ marginBottom: 12, fontSize: 15 }}>
              Current plan: <strong>{currentPlanLabel}</strong>
            </p>

            {currentPlan === "assistant" ? (
              <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 10 }}>
                You are on the <strong>free Assistant</strong> plan. No charges will be applied until you upgrade.
              </p>
            ) : activeSub ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 24, fontSize: 14, color: "#374151", marginBottom: 10 }}>
                <div>
                  <div>Status: <strong>{activeSub.status ?? "paid"}</strong></div>
                  {activeSub.price !== null && activeSub.currency && (
                    <div>Price: <strong>{activeSub.price} {activeSub.currency}</strong></div>
                  )}
                </div>
                <div>
                  <div>Start date: <strong>{formatDate(activeSub.start_date)}</strong></div>
                  <div>End date: <strong>{formatDate(activeSub.end_date)}</strong></div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>
                No billing data found yet for this plan.
              </p>
            )}

            <p style={{ fontSize: 14, color: "#6b7280" }}>
              Plan changes are controlled by engineerit.ai billing only. You can manage or upgrade your plan from the subscription page.
            </p>

            <Link href="/subscription">
              <button className="btn" type="button" style={{ marginTop: 16 }}>
                Manage / Upgrade subscription
              </button>
            </Link>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <h2 className="card-title">Billing history</h2>
            {subHistory.length === 0 ? (
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
                No payments recorded yet.
              </p>
            ) : (
              <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1fr)",
                    gap: 8,
                    fontWeight: 600,
                    borderBottom: "1px solid #e5e7eb",
                    paddingBottom: 6,
                    marginBottom: 6,
                  }}
                >
                  <span>Plan</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span>Date</span>
                </div>

                {subHistory.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1fr)",
                      gap: 8,
                      padding: "4px 0",
                      borderBottom: idx === subHistory.length - 1 ? "none" : "1px solid #f3f4f6",
                    }}
                  >
                    <span>{(s.plan || "assistant").charAt(0).toUpperCase() + (s.plan || "assistant").slice(1)}</span>
                    <span>{s.price !== null && s.currency ? `${s.price} ${s.currency}` : "-"}</span>
                    <span>{s.status || "-"}</span>
                    <span>{formatDate(s.start_date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
