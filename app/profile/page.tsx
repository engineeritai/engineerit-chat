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
  registration_code: string | null;
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
  const [chatCount, setChatCount] = useState<number | null>(null);
  const [docCount, setDocCount] = useState<number | null>(null);

  // ─────────────────────────────
  // Load profile + handle payment + subscription + counts
  // ─────────────────────────────
  useEffect(() => {
    async function loadProfileAndPayment() {
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
          setLoading(false);
          return;
        }

        setEmail(user.email ?? null);

        // ---------- 1) معالجة رجوع الدفع من Moyasar ----------
        // ✅ التغيير الوحيد: بدل تحديث profiles من المتصفح، ننادي Route ثابتة
        let subscriptionTierOverride: PlanId | null = null;

        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const status = params.get("status");
          const planParam = params.get("plan") as PlanId | null;

          const allowedPlans: PlanId[] = [
            "assistant",
            "engineer",
            "professional",
            "consultant",
          ];

          if (status === "paid" && planParam && allowedPlans.includes(planParam)) {
            try {
              const res = await fetch("/api/subscription/select", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: planParam }),
              });

              const json = await res.json().catch(() => ({}));

              if (!res.ok) {
                console.error("SUBSCRIPTION API ERROR:", json);
                setErrorMsg(
                  "Could not save subscription after payment. Please contact support."
                );
              } else {
                subscriptionTierOverride = planParam;
                setInfoMsg("Payment successful and subscription updated.");

                // امسح باراميترات الدفع حتى لا يعيد يحاول كل Refresh
                params.delete("status");
                params.delete("plan");
                const newUrl = `${window.location.pathname}${
                  params.toString() ? `?${params.toString()}` : ""
                }`;
                window.history.replaceState({}, "", newUrl);
              }
            } catch (err) {
              console.error("SUBSCRIPTION API FETCH ERROR:", err);
              setErrorMsg(
                "Could not save subscription after payment. Please contact support."
              );
            }
          }
        }

        // ---------- 2) تحميل بيانات البروفايل ----------
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
        let registrationCode: string | null = null;

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, subscription_tier, registration_code")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data) {
          if (data.full_name) initialFullName = data.full_name;
          if (data.avatar_url) avatarUrl = data.avatar_url;
          if (data.subscription_tier) subscriptionTier = data.subscription_tier;
          if (data.registration_code) registrationCode = data.registration_code;
        } else if (error) {
          console.error("PROFILE SELECT ERROR:", error);
        }

        // لو الدفع نجح نستخدم الخطة الجديدة
        if (subscriptionTierOverride) {
          subscriptionTier = subscriptionTierOverride;
        }

        // ---------- 2.a توليد رقم التسجيل إذا مافيه ----------
        // (يبقى كما هو - إذا تبغاه ينشال لاحقاً نقفله في UI بدون كسر DB)
        if (!registrationCode) {
          try {
            const now = new Date();
            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const prefix = yy + mm;

            const { data: sameMonthProfiles, error: regErr } = await supabase
              .from("profiles")
              .select("registration_code")
              .ilike("registration_code", `${prefix}%`);

            if (regErr) console.error("REGISTRATION CODE COUNT ERROR:", regErr);

            const count = sameMonthProfiles?.length ?? 0;
            const sequence = count + 1;
            const seqStr = String(sequence).padStart(4, "0");
            registrationCode = `${prefix}${seqStr}`;

            const { error: regUpdateErr } = await supabase
              .from("profiles")
              .update({ registration_code: registrationCode })
              .eq("id", user.id);

            if (regUpdateErr) {
              console.error("REGISTRATION CODE UPDATE ERROR:", regUpdateErr);
            }
          } catch (e) {
            console.error("REGISTRATION CODE GENERATION ERROR:", e);
          }
        }

        // ضمان وجود صف
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              full_name: initialFullName,
              avatar_url: avatarUrl,
              subscription_tier: subscriptionTier,
              registration_code: registrationCode,
            },
            { onConflict: "id" }
          );

        if (upsertError) console.error("PROFILE UPSERT ERROR:", upsertError);

        const row: ProfileRow = {
          full_name: initialFullName,
          avatar_url: avatarUrl,
          subscription_tier: subscriptionTier,
          registration_code: registrationCode,
        };

        setProfile(row);
        setFullName(initialFullName);

        // ---------- 3) بيانات الاشتراك الحالي ----------
        if (subscriptionTier) {
          const { data: subs, error: subsError } = await supabase
            .from("subscriptions")
            .select("plan, price, currency, status, start_date, end_date")
            .eq("user_id", user.id)
            .eq("plan", subscriptionTier)
            .order("start_date", { ascending: false })
            .limit(1);

          if (!subsError && subs && subs.length > 0) {
            setActiveSub(subs[0] as SubscriptionRow);
          } else if (subsError) {
            console.error("SUBSCRIPTIONS SELECT ERROR:", subsError);
          } else {
            setActiveSub(null);
          }
        }

        // ---------- 4) سجل المدفوعات ----------
        try {
          const { data: history, error: histError } = await supabase
            .from("subscriptions")
            .select("plan, price, currency, status, start_date, end_date")
            .eq("user_id", user.id)
            .order("start_date", { ascending: false })
            .limit(5);

          if (!histError && history) {
            setSubHistory(history as SubscriptionRow[]);
          } else if (histError) {
            console.error("SUBSCRIPTIONS HISTORY ERROR:", histError);
          }
        } catch (e) {
          console.warn("SUBSCRIPTIONS HISTORY WARN:", e);
        }

        // ---------- 5) عدد الرسائل والملفات ----------
        try {
          const { count: cCount, error: cErr } = await supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);

          if (!cErr && typeof cCount === "number") setChatCount(cCount);
        } catch (e) {
          console.warn("CHAT COUNT ERROR (optional):", e);
        }

        try {
          const { count: dCount, error: dErr } = await supabase
            .from("documents")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);

          if (!dErr && typeof dCount === "number") setDocCount(dCount);
        } catch (e) {
          console.warn("DOC COUNT ERROR (optional):", e);
        }
      } catch (err) {
        console.error("PROFILE LOAD ERROR:", err);
        setErrorMsg("Could not load profile.");
      } finally {
        setLoading(false);
      }
    }

    void loadProfileAndPayment();
  }, []);

  // ─────────────────────────────
  // Save name
  // ─────────────────────────────
  async function handleSaveName() {
    try {
      setSavingName(true);
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

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) {
        console.error("PROFILE SAVE ERROR:", error);
        setErrorMsg("Could not save profile.");
        return;
      }

      setProfile((prev) =>
        prev
          ? { ...prev, full_name: fullName }
          : {
              full_name: fullName,
              avatar_url: null,
              subscription_tier: "assistant",
              registration_code: null,
            }
      );
      setInfoMsg("Profile updated successfully.");
    } catch (err) {
      console.error("PROFILE SAVE ERROR:", err);
      setErrorMsg("Could not save profile.");
    } finally {
      setSavingName(false);
    }
  }

  // ─────────────────────────────
  // Avatar upload
  // ─────────────────────────────
  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSavingAvatar(true);
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

      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("AVATAR UPLOAD ERROR:", uploadError);
        setErrorMsg("Could not upload profile photo.");
        return;
      }

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = publicData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        console.error("AVATAR UPDATE ERROR:", updateError);
        setErrorMsg("Could not save profile photo.");
        return;
      }

      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
      setInfoMsg("Profile photo updated.");
    } catch (err) {
      console.error("AVATAR UPLOAD ERROR:", err);
      setErrorMsg("Could not upload profile photo.");
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
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />

        <div className="page-wrap">
          <h1 className="page-title">Profile &amp; Subscription</h1>

          {errorMsg && (
            <p
              style={{
                color: "#b91c1c",
                marginBottom: 12,
                fontSize: 14,
              }}
            >
              {errorMsg}
            </p>
          )}

          {infoMsg && (
            <p
              style={{
                color: "#16a34a",
                marginBottom: 12,
                fontSize: 14,
              }}
            >
              {infoMsg}
            </p>
          )}

          {/* Profile card */}
          {loading ? (
            <p>Loading profile…</p>
          ) : (
            <div className="card">
              {/* Profile photo */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
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
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
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
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    JPG, PNG, or GIF. Max 5 MB.
                  </div>
                </div>
              </div>

              {/* Full name + email + registered ID */}
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

              <button
                className="btn"
                type="button"
                onClick={handleSaveName}
                disabled={savingName}
              >
                {savingName ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}

          {/* Subscription card */}
          <div className="card" style={{ marginTop: 24 }}>
            <h2 className="card-title">Subscription</h2>

            <p style={{ marginBottom: 12, fontSize: 15 }}>
              Current plan: <strong>{currentPlanLabel}</strong>
            </p>

            {currentPlan === "assistant" ? (
              <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 10 }}>
                You are on the <strong>free Assistant</strong> plan. No charges
                will be applied until you upgrade to a paid plan.
              </p>
            ) : activeSub ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 24,
                  fontSize: 14,
                  color: "#374151",
                  marginBottom: 10,
                }}
              >
                <div>
                  <div>
                    Status: <strong>{activeSub.status ?? "unknown"}</strong>
                  </div>
                  {activeSub.price !== null && activeSub.currency && (
                    <div>
                      Price:{" "}
                      <strong>
                        {activeSub.price} {activeSub.currency}
                      </strong>
                    </div>
                  )}
                </div>
                <div>
                  <div>
                    Start date: <strong>{formatDate(activeSub.start_date)}</strong>
                  </div>
                  <div>
                    End date: <strong>{formatDate(activeSub.end_date)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>
                No billing data found yet for this plan.
              </p>
            )}

            <p style={{ fontSize: 14, color: "#6b7280" }}>
              Plan changes are controlled by engineerit.ai billing only. You can
              manage or upgrade your plan from the subscription page.
            </p>

            <Link href="/subscription">
              <button className="btn" type="button" style={{ marginTop: 16 }}>
                Manage / Upgrade subscription
              </button>
            </Link>
          </div>

          {/* Activity card */}
          <div className="card" style={{ marginTop: 24 }}>
            <h2 className="card-title">Activity</h2>
            <ul
              style={{
                paddingLeft: 20,
                margin: 0,
                fontSize: 14,
                color: "#374151",
                lineHeight: 1.7,
              }}
            >
              <li>
                Total chats: <strong>{chatCount !== null ? chatCount : "soon"}</strong>
              </li>
              <li>
                Total uploaded documents:{" "}
                <strong>{docCount !== null ? docCount : "soon"}</strong>
              </li>
              <li>
                Saved projects: <strong>soon</strong>
              </li>
            </ul>
          </div>

          {/* Billing history */}
          <div className="card" style={{ marginTop: 24 }}>
            <h2 className="card-title">Billing history</h2>
            {subHistory.length === 0 ? (
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
                No payments recorded yet. Your future subscriptions will appear
                here.
              </p>
            ) : (
              <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1fr)",
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
                      gridTemplateColumns:
                        "minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1fr)",
                      gap: 8,
                      padding: "4px 0",
                      borderBottom:
                        idx === subHistory.length - 1
                          ? "none"
                          : "1px solid #f3f4f6",
                    }}
                  >
                    <span>
                      {(s.plan || "assistant").charAt(0).toUpperCase() +
                        (s.plan || "assistant").slice(1)}
                    </span>
                    <span>
                      {s.price !== null && s.currency ? `${s.price} ${s.currency}` : "-"}
                    </span>
                    <span>{s.status || "-"}</span>
                    <span>{formatDate(s.start_date)}</span>
                  </div>
                ))}

                <p style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
                  Detailed invoices are also emailed to you by the payment provider
                  (Moyasar). Keep those emails as official receipts.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
