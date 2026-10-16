"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import Header from "../components/Header";
import NavSidebar from "../components/NavSidebar";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { localizedPlan, planById, formatMoney } from "@/lib/labels";
import { useMessages } from "@/lib/useMessages";
import type { Locale } from "@/lib/i18n";
import { PLANS, consultantLegacyActive, isPlanId, type PlanId } from "@/lib/plans";
import { displayFeatures, formatSar, formatUsdApprox, planPriceLabel } from "@/lib/pricingDisplay";
import { resolveEffectivePlan } from "@/lib/effectivePlan";

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

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const { locale, shell: s } = useMessages();
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const [effectivePlan, setEffectivePlan] = useState<PlanId>("assistant");
  const [consultantLegacy, setConsultantLegacy] = useState(false);
  const [activeSub, setActiveSub] = useState<SubscriptionRow | null>(null);
  const [subHistory, setSubHistory] = useState<SubscriptionRow[]>([]);
  const [chatCount, setChatCount] = useState<number | null>(null);
  const [docCount, setDocCount] = useState<number | null>(null);

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
          setErrorMsg(s.profile.notLoggedIn);
          setLoading(false);
          return;
        }

        setEmail(user.email ?? null);

        // 1) Handle payment redirect (Moyasar) -> save subscription via SERVER route
        let subscriptionTierOverride: PlanId | null = null;

        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const status = params.get("status");
          const checkoutId = params.get("checkout");

          if (status === "paid" && checkoutId) {
            try {
              const res = await fetch("/api/payments/moyasar/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ checkoutId }),
              });
              const json = await res.json().catch(() => null);
              if (!res.ok) {
                setErrorMsg(s.profile.paymentPending);
              } else if (json?.plan && isPlanId(json.plan)) {
                subscriptionTierOverride = json.plan;
                setInfoMsg(s.profile.paymentConfirmed);
                try {
                  window.history.replaceState({}, "", window.location.pathname);
                } catch {}
              }
            } catch (err) {
              console.error("MOYASAR COMPLETE ERROR:", err);
              setErrorMsg(s.profile.paymentFailed);
            }
          } else if (status === "paid") {
            setErrorMsg(s.profile.paymentMissing);
          }
        }

        // 2) Load profile data
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

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, subscription_tier")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data) {
          if (data.full_name) initialFullName = data.full_name;
          if (data.avatar_url) avatarUrl = data.avatar_url;
          if (data.subscription_tier) subscriptionTier = data.subscription_tier;
        } else if (error) {
          console.error("PROFILE SELECT ERROR:", error);
        }

        if (subscriptionTierOverride) subscriptionTier = subscriptionTierOverride;

        // Ensure row exists (no registration_code here)
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              full_name: initialFullName,
              avatar_url: avatarUrl,
              subscription_tier: subscriptionTier,
            },
            { onConflict: "id" }
          );

        if (upsertError) {
          console.error("PROFILE UPSERT ERROR:", upsertError);
        }

        setProfile({
          full_name: initialFullName,
          avatar_url: avatarUrl,
          subscription_tier: subscriptionTier,
        });
        setFullName(initialFullName);
        const { data: legacyRow, error: legacyError } = await supabase
          .from("profiles")
          .select("consultant_legacy_price_until")
          .eq("id", user.id)
          .maybeSingle();
        setConsultantLegacy(
          !legacyError && consultantLegacyActive(legacyRow?.consultant_legacy_price_until)
        );
        setEffectivePlan(await resolveEffectivePlan(supabase, user.id));

        // 3) Current subscription billing row
        if (subscriptionTier && subscriptionTier !== "assistant") {
          const { data: subs, error: subsError } = await supabase
            .from("subscriptions")
            .select("plan, price, currency, status, start_date, end_date")
            .eq("user_id", user.id)
            .eq("plan", subscriptionTier)
            .order("start_date", { ascending: false })
            .limit(1);

          if (!subsError && subs && subs.length > 0) {
            setActiveSub(subs[0] as SubscriptionRow);
          } else {
            setActiveSub(null);
            if (subsError) console.error("SUBSCRIPTIONS SELECT ERROR:", subsError);
          }
        } else {
          setActiveSub(null);
        }

        // 4) Billing history
        try {
          const { data: history, error: histError } = await supabase
            .from("subscriptions")
            .select("plan, price, currency, status, start_date, end_date")
            .eq("user_id", user.id)
            .order("start_date", { ascending: false })
            .limit(10);

          if (!histError && history) {
            setSubHistory(history as SubscriptionRow[]);
          } else if (histError) {
            console.error("SUBSCRIPTIONS HISTORY ERROR:", histError);
          }
        } catch (e) {
          console.warn("SUBSCRIPTIONS HISTORY WARN:", e);
        }

        // 5) counts (optional)
        try {
          const { count: cCount, error: cErr } = await supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);

          if (!cErr && typeof cCount === "number") setChatCount(cCount);
        } catch {}

        try {
          const { count: dCount, error: dErr } = await supabase
            .from("documents")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);

          if (!dErr && typeof dCount === "number") setDocCount(dCount);
        } catch {}
      } catch (err) {
        console.error("PROFILE LOAD ERROR:", err);
        setErrorMsg(s.profile.loadFailed);
      } finally {
        setLoading(false);
      }
    }

    void loadProfileAndPayment();
  }, []);

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
        setErrorMsg(s.profile.notLoggedIn);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) {
        console.error("PROFILE SAVE ERROR:", error);
        setErrorMsg(s.profile.saveFailed);
        return;
      }

      setProfile((prev) =>
        prev
          ? { ...prev, full_name: fullName }
          : { full_name: fullName, avatar_url: null, subscription_tier: "assistant" }
      );

      setInfoMsg(s.profile.saved);
    } catch (err) {
      console.error("PROFILE SAVE ERROR:", err);
      setErrorMsg(s.profile.saveFailed);
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
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        setErrorMsg(s.profile.notLoggedIn);
        return;
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("AVATAR UPLOAD ERROR:", uploadError);
        setErrorMsg(s.profile.photoFailed);
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
        setErrorMsg(s.profile.photoFailed);
        return;
      }

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });

      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
      setInfoMsg(s.profile.photoSaved);
    } catch (err) {
      console.error("AVATAR UPLOAD ERROR:", err);
      setErrorMsg(s.profile.photoFailed);
    } finally {
      setSavingAvatar(false);
      e.target.value = "";
    }
  }

  const storedPlan = profile?.subscription_tier || "assistant";
  const currentPlan = effectivePlan || "assistant";
  const currentPlanId: PlanId = isPlanId(currentPlan) ? currentPlan : "assistant";
  const currentPlanLabel = planById(locale, currentPlanId).name;
  const catalogSource = PLANS.find((plan) => plan.id === currentPlanId) ?? PLANS[0];
  const catalogPlan = localizedPlan(locale, catalogSource);
  const legacyPrice = consultantLegacy && currentPlanId === "consultant";
  const catalogMonth = planPriceLabel(currentPlanId, "month", 0, locale, legacyPrice);
  const catalogYear = planPriceLabel(currentPlanId, "year", 0, locale, legacyPrice);
  const approx = locale === "ar" ? "تقريباً" : "approx.";
  const teamLapsed =
    (storedPlan === "team" || storedPlan === "enterprise") && currentPlan === "assistant";

  return (
    <div className="app-shell">
      <NavSidebar
        isMobileOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      <div className="main">
        <Header onToggleSidebar={() => setIsSidebarOpenMobile((v) => !v)} />

        <div className="page-wrap">
          <h1 className="page-title">{s.profile.title}</h1>

          {errorMsg && (
            <div
              style={{
                marginBottom: 14,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
                borderRadius: 12,
                padding: "10px 12px",
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
                marginBottom: 14,
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                color: "#166534",
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {infoMsg}
            </div>
          )}

          {/* Profile card */}
          {loading ? (
            <p>{s.profile.loading}</p>
          ) : (
            <div className="card">
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
                      alt={s.header.profileAlt}
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
                      {s.profile.chooseFile}
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
                    {s.profile.avatarHint}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <label>
                  {s.profile.fullName}
                  <input
                    className="input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={s.profile.fullNamePlaceholder}
                  />
                </label>
              </div>

              {email && (
                <div className="form-row">
                  <label>
                    {s.profile.email}
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
                {savingName ? s.profile.saving : s.profile.save}
              </button>
            </div>
          )}

          {/* Subscription card */}
          <div className="card" style={{ marginTop: 24 }}>
            <h2 className="card-title">{s.profile.subscription}</h2>

            <p style={{ marginBottom: 12, fontSize: 15 }}>
              {s.profile.currentPlan}: <strong>{currentPlanLabel}</strong>
            </p>

            {teamLapsed ? (
              <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 10 }}>
                {s.profile.teamLapsed}
              </p>
            ) : currentPlan === "assistant" ? (
              <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 10 }}>
                {s.profile.freeBody}
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
                    {s.profile.status}: <strong>{activeSub.status ?? s.profile.unknown}</strong>
                  </div>
                  {activeSub.price !== null && activeSub.currency && (
                    <div>
                      {s.profile.price}:{" "}
                      <strong>
                        {activeSub.currency === "SAR"
                          ? locale === "ar"
                            ? formatMoney(activeSub.price, "ar")
                            : `${formatSar(activeSub.price)} (approx. ${formatUsdApprox(activeSub.price)})`
                          : `${activeSub.price} ${activeSub.currency}`}
                      </strong>
                    </div>
                  )}
                </div>
                <div>
                  <div>
                    {s.profile.startDate}: <strong>{formatDate(activeSub.start_date, locale)}</strong>
                  </div>
                  <div>
                    {s.profile.endDate}: <strong>{formatDate(activeSub.end_date, locale)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>
                {s.profile.noBilling}
              </p>
            )}

            <p style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>
              {catalogMonth.primary}
              {catalogMonth.usd ? ` (${approx} ${catalogMonth.usd})` : ""}
              {catalogYear.amountSar > 0
                ? ` · ${catalogYear.primary} (${approx} ${catalogYear.usd})`
                : ""}
            </p>
            <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 14, color: "#374151" }}>
              {(locale === "ar" ? catalogPlan.features : displayFeatures(catalogSource, "month")).map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <p style={{ fontSize: 14, color: "#6b7280" }}>
              {s.profile.billingNote}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Link href="/account/billing">
                <button className="btn" type="button" style={{ marginTop: 16 }}>
                  {s.profile.billingLink}
                </button>
              </Link>
              <Link href="/subscription">
                <button className="btn" type="button" style={{ marginTop: 16 }}>
                  {s.profile.manage}
                </button>
              </Link>
              {(currentPlan === "team" ||
                currentPlan === "enterprise" ||
                storedPlan === "team" ||
                storedPlan === "enterprise") && (
                <Link href="/account/team">
                  <button className="btn" type="button" style={{ marginTop: 16 }}>
                    {s.profile.manageTeam}
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* Activity card */}
          <div className="card" style={{ marginTop: 24 }}>
            <h2 className="card-title">{s.profile.activity}</h2>
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
                {s.profile.chats}: <strong>{chatCount !== null ? chatCount : s.profile.soon}</strong>
              </li>
              <li>
                {s.profile.documents}:{" "}
                <strong>{docCount !== null ? docCount : s.profile.soon}</strong>
              </li>
              <li>
                {s.profile.projects}: <strong>{s.profile.soon}</strong>
              </li>
            </ul>
          </div>

          {/* Billing history */}
          <div className="card" style={{ marginTop: 24 }}>
            <h2 className="card-title">{s.profile.history}</h2>

            {subHistory.length === 0 ? (
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
                {s.profile.noPayments}
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
                  <span>{s.profile.plan}</span>
                  <span>{s.profile.amount}</span>
                  <span>{s.profile.status}</span>
                  <span>{s.profile.date}</span>
                </div>

                {subHistory.map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1fr)",
                      gap: 8,
                      padding: "4px 0",
                      borderBottom:
                        idx === subHistory.length - 1 ? "none" : "1px solid #f3f4f6",
                    }}
                  >
                    <span>{planById(locale, isPlanId(row.plan) ? row.plan : "assistant").name}</span>
                    <span>
                      {row.price !== null && row.currency
                        ? row.currency === "SAR"
                          ? locale === "ar"
                            ? formatMoney(row.price, "ar")
                            : `${formatSar(row.price)} (approx. ${formatUsdApprox(row.price)})`
                          : `${row.price} ${row.currency}`
                        : "-"}
                    </span>
                    <span>{row.status || "-"}</span>
                    <span>{formatDate(row.start_date, locale)}</span>
                  </div>
                ))}

                <p style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
                  {s.profile.invoiceNote}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
