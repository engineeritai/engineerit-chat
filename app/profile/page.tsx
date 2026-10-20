"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import MarketingShell from "../components/marketing/MarketingShell";
import { useAccount } from "../components/marketing/AccountState";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { localizedPlan, planById, formatMoney } from "@/lib/labels";
import ChangePasswordCard from "@/app/components/ChangePasswordCard";
import { useMessages } from "@/lib/useMessages";
import type { Locale } from "@/lib/i18n";
import { PLANS, PLAN_THEME, consultantLegacyActive, isPlanId, isSelfServePlan, type PlanId } from "@/lib/plans";
import { displayFeatures, formatSar, formatUsdApprox, planPriceLabel } from "@/lib/pricingDisplay";
import { FeatureLine, SarText } from "@/app/components/RiyalAmount";
import { resolveEffectivePlan } from "@/lib/effectivePlan";
import { downloadInvoicePdf } from "@/lib/invoiceDownload";
import { statusPillClass, usdApproxLine } from "@/lib/invoiceTable";
import AvatarCropper from "@/app/components/AvatarCropper";
import { DISCIPLINES } from "@/lib/disciplines";
import { disciplineLabel } from "@/lib/labels";

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: string | null;
  job_title?: string | null;
  company?: string | null;
  phone?: string | null;
  country?: string | null;
  discipline?: string | null;
};

type TopicRow = {
  id: string;
  title: string;
  discipline: string | null;
  updated_at: string | null;
};

type FileRow = {
  id: string;
  conversationId: string;
  name: string;
  size: number | null;
  createdAt: string | null;
};

type PlanHistoryRow = {
  id: string;
  plan: string;
  billing_interval: string;
  amount_sar: number;
  status: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  period_end?: string | null;
};

type BillingView = {
  plan: PlanId;
  billing_interval: "month" | "year";
  amount_sar: number;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  seat_limit: number | null;
};

type InvoiceRow = {
  id: string;
  plan: string;
  billing_interval: string;
  amount_sar: number;
  paid_at: string | null;
  period_end: string | null;
};

type SubscriptionRow = {
  plan: string | null;
  price: number | null;
  currency: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
};

function ThemedPlanShell({
  fallbackPlanId,
  fallbackStart,
  fallbackEnd,
  children,
}: {
  fallbackPlanId: PlanId;
  fallbackStart: string | null;
  fallbackEnd: string | null;
  children: (shown: {
    planId: PlanId;
    theme: (typeof PLAN_THEME)[PlanId];
    start: string | null;
    end: string | null;
    label: string;
  }) => React.ReactNode;
}) {
  const account = useAccount();
  const { locale } = useMessages();
  const planId = account.ready && account.signedIn ? account.planId : fallbackPlanId;
  return children({
    planId,
    theme: PLAN_THEME[planId],
    start: account.ready && account.signedIn ? account.periodStart : fallbackStart,
    end: account.ready && account.signedIn ? account.periodEnd : fallbackEnd,
    label: planById(locale, planId).name,
  });
}

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

function StatusPill({ status }: { status: string | null | undefined }) {
  const label = status && status.trim() ? status : "—";
  return <span className={statusPillClass(status)}>{label}</span>;
}

function HistoryAmount({
  price,
  currency,
  locale,
}: {
  price: number | null;
  currency: string | null;
  locale: Locale;
}) {
  if (price === null || !currency) return <>—</>;
  if (currency !== "SAR") {
    return (
      <span className="cell-value">
        {price} {currency}
      </span>
    );
  }
  return (
    <span className="amount-stack cell-value">
      <SarText>{locale === "ar" ? formatMoney(price, "ar") : formatSar(price)}</SarText>
      {locale === "en" ? <span className="amount-usd">{usdApproxLine(formatUsdApprox(price))}</span> : null}
    </span>
  );
}

export default function ProfilePage() {
  const { locale, shell: s } = useMessages();
  const [photoBroken, setPhotoBroken] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [discipline, setDiscipline] = useState("General");
  const [tab, setTab] = useState<"overview" | "billing" | "topics">("overview");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested === "billing" || requested === "topics" || requested === "overview") {
      setTab(requested);
    }
  }, []);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [planHistory, setPlanHistory] = useState<PlanHistoryRow[]>([]);
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
  const [billing, setBilling] = useState<BillingView | null>(null);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [busyAction, setBusyAction] = useState("");
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
          .select("full_name, avatar_url, subscription_tier, job_title, company, phone, country, discipline")
          .eq("id", user.id)
          .maybeSingle();

        let row: {
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: string | null;
          job_title?: string | null;
          company?: string | null;
          phone?: string | null;
          country?: string | null;
          discipline?: string | null;
        } | null = data;
        if (error) {
          const fallback = await supabase
            .from("profiles")
            .select("full_name, avatar_url, subscription_tier")
            .eq("id", user.id)
            .maybeSingle();
          row = fallback.data as typeof row;
          if (fallback.error) console.error("PROFILE SELECT ERROR:", fallback.error);
        }

        if (row) {
          if (row.full_name) initialFullName = row.full_name;
          if (row.avatar_url) avatarUrl = row.avatar_url;
          if (row.subscription_tier) subscriptionTier = row.subscription_tier;
          setJobTitle(row.job_title || "");
          setCompany(row.company || "");
          setPhone(row.phone || "");
          setCountry(row.country || "");
          if (row.discipline) setDiscipline(row.discipline);
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

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          const billingRes = await fetch("/api/billing", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const billingJson = await billingRes.json().catch(() => ({}));
          if (billingRes.ok && billingJson.subscription && isPlanId(billingJson.subscription.plan)) {
            setBilling(billingJson.subscription as BillingView);
            setBillingNotice(null);
          } else {
            setBilling(null);
            setBillingNotice(billingRes.ok && billingJson.notice === "downgraded" ? "downgraded" : null);
          }
          const invoiceRes = await fetch("/api/invoices", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const invoiceJson = await invoiceRes.json().catch(() => ({}));
          if (invoiceRes.ok && Array.isArray(invoiceJson.invoices)) {
            setInvoices(invoiceJson.invoices as InvoiceRow[]);
          }
          const libraryRes = await fetch("/api/profile/library", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const library = await libraryRes.json().catch(() => ({}));
          if (libraryRes.ok) {
            setTopics(Array.isArray(library.conversations) ? library.conversations : []);
            setFiles(Array.isArray(library.files) ? library.files : []);
            const subs = Array.isArray(library.subscriptions) ? library.subscriptions : [];
            const inv = Array.isArray(library.invoices) ? library.invoices : [];
            setPlanHistory([...subs, ...inv]);
          }
        }

        // 5) counts (optional)
        try {
          const { count: cCount, error: cErr } = await supabase
            .from("conversations")
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

  async function bearer() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function renewNow() {
    setBusyAction("renew");
    setErrorMsg(null);
    try {
      const token = await bearer();
      const res = await fetch("/api/checkout/moyasar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ purpose: "renew_now", locale }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        setErrorMsg(json.error || s.profile.paymentFailed);
        return;
      }
      window.location.href = json.url as string;
    } finally {
      setBusyAction("");
    }
  }

  async function toggleAutoRenew() {
    if (!billing) return;
    setBusyAction("toggle");
    setErrorMsg(null);
    try {
      const token = await bearer();
      const turningOn = billing.cancel_at_period_end;
      const res = await fetch(turningOn ? "/api/billing/resume" : "/api/billing/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && json.needsCard) {
        setErrorMsg(s.profile.cardRequired);
        window.location.href = "/account/billing/card";
        return;
      }
      if (!res.ok) {
        setErrorMsg(json.error || s.profile.saveFailed);
        return;
      }
      setBilling({ ...billing, cancel_at_period_end: !turningOn });
    } finally {
      setBusyAction("");
    }
  }

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
        .update({
          full_name: fullName,
          job_title: jobTitle,
          company,
          phone,
          country,
          discipline,
        })
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

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCropSrc(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function saveCroppedAvatar(blob: Blob) {
    setCropSrc(null);
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

      const filePath = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) {
        const message = (uploadError.message || "").toLowerCase();
        const missing = message.includes("bucket") || message.includes("not found");
        setErrorMsg(missing ? s.profile.photoUnavailable : s.profile.photoFailed);
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
    }
  }

  const storedPlan = profile?.subscription_tier || "assistant";
  const currentPlan = effectivePlan || "assistant";
  const currentPlanId: PlanId = isPlanId(currentPlan) ? currentPlan : "assistant";
  const currentPlanLabel = planById(locale, currentPlanId).name;
  const catalogSource = PLANS.find((plan) => plan.id === currentPlanId) ?? PLANS[0];
  const legacyPrice = consultantLegacy && currentPlanId === "consultant";
  const approx = locale === "ar" ? "تقريبا" : "approx.";
  const teamLapsed =
    (storedPlan === "team" || storedPlan === "enterprise") && currentPlan === "assistant";

  return (
    <MarketingShell>
        <div className="page-wrap">
          <div className="profile-hero">
            <div className="profile-photo">
              {profile?.avatar_url && !photoBroken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={s.profile.photo} onError={() => setPhotoBroken(true)} />
              ) : (
                <span>{(fullName.trim()[0] || "E").toLocaleUpperCase(locale === "ar" ? "ar" : "en")}</span>
              )}
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 4 }}>{fullName || s.profile.title}</h1>
              <p className="page-subtitle" style={{ marginBottom: 0 }}>
                {[jobTitle, disciplineLabel(locale, discipline), company, country].filter(Boolean).join(" · ") || currentPlanLabel}
              </p>
            </div>
          </div>
          <div className="profile-tabs" role="tablist">
            <button type="button" className={tab === "overview" ? "is-active" : ""} onClick={() => setTab("overview")}>{s.profile.tabOverview}</button>
            <button type="button" className={tab === "billing" ? "is-active" : ""} onClick={() => setTab("billing")}>{s.profile.tabBilling}</button>
            <button type="button" className={tab === "topics" ? "is-active" : ""} onClick={() => setTab("topics")}>{s.profile.tabTopics}</button>
          </div>

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

          {tab === "overview" && (loading ? (
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
                  {profile?.avatar_url && !photoBroken ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={s.header.profileAlt}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={() => setPhotoBroken(true)}
                    />
                  ) : (
                    (fullName?.trim()[0] || (locale === "ar" ? "م" : "E")).toLocaleUpperCase(
                      locale === "ar" ? "ar" : "en"
                    )
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

              <div className="form-grid two">
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

              <div className="form-row">
                <label>
                  {s.profile.jobTitle}
                  <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                </label>
              </div>
              <div className="form-row">
                <label>
                  {s.profile.company}
                  <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
                </label>
              </div>
              <div className="form-row">
                <label>
                  {s.profile.phone}
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
              </div>
              <div className="form-row">
                <label>
                  {s.profile.country}
                  <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} />
                </label>
              </div>
              <div className="form-row">
                <label>
                  {s.profile.discipline}
                  <select className="select" value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
                    {DISCIPLINES.map((name) => (
                      <option key={name} value={name}>{disciplineLabel(locale, name)}</option>
                    ))}
                  </select>
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
              </div>

              <button
                className="btn"
                type="button"
                onClick={handleSaveName}
                disabled={savingName}
              >
                {savingName ? s.profile.saving : s.profile.save}
              </button>
            </div>
          ))}

          {tab === "overview" && (
          <ThemedPlanShell
            fallbackPlanId={currentPlanId}
            fallbackStart={billing?.current_period_start ?? null}
            fallbackEnd={billing?.current_period_end ?? null}
          >
          {(shown) => {
            const shownSource = PLANS.find((plan) => plan.id === shown.planId) ?? catalogSource;
            const shownPlan = localizedPlan(locale, shownSource);
            const shownLegacy = legacyPrice && shown.planId === "consultant";
            const shownMonth = planPriceLabel(shown.planId, "month", 0, locale, shownLegacy);
            const shownYear = planPriceLabel(shown.planId, "year", 0, locale, shownLegacy);
            return (
          <div className="plan-premium card" style={{ marginTop: 24, background: shown.theme.soft, borderColor: shown.theme.accent }}>
            <span className="plan-ribbon" style={{ background: shown.theme.accent }}>{s.profile.yourPlan}</span>
            <h2 className="card-title" style={{ color: shown.theme.ink }}>{shown.label}</h2>

            <p style={{ marginBottom: 12, fontSize: 15 }}>
              {s.profile.currentPlan}: <strong>{shown.label}</strong>
            </p>

            {teamLapsed ? (
              <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 10 }}>
                {s.profile.teamLapsed}
              </p>
            ) : shown.planId === "assistant" ? (
              <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 10 }}>
                {billingNotice === "downgraded" ? s.billing.downgraded : s.profile.freeBody}
              </p>
            ) : billing ? (
              <div style={{ fontSize: 14, color: "#374151", marginBottom: 10, lineHeight: 1.7 }}>
                <div>
                  {s.profile.status}: <strong>{billing.status}</strong>
                </div>
                <div>
                  {s.profile.price}: <strong><SarText>{formatMoney(Number(billing.amount_sar), locale)}</SarText></strong>
                </div>
                <div>
                  {s.profile.cycle}:{" "}
                  <strong>{billing.billing_interval === "year" ? s.profile.annual : s.profile.monthly}</strong>
                </div>
                <div>
                  {s.profile.startDate}: <strong>{formatDate(billing.current_period_start, locale)}</strong>
                </div>
                <div>
                  {s.profile.nextRenewal}: <strong>{formatDate(billing.current_period_end, locale)}</strong>
                </div>
                <div>
                  {s.profile.autoRenew}:{" "}
                  <strong>{billing.cancel_at_period_end ? s.profile.autoRenewOff : s.profile.autoRenewOn}</strong>
                </div>
                <div>
                  {billing.cancel_at_period_end
                    ? `${s.billing.endsOn} ${formatDate(billing.current_period_end, locale)}`
                    : `${s.billing.renewsOn} ${formatDate(billing.current_period_end, locale)}`}
                </div>
                {billing.status === "past_due" ? <div>{s.billing.chargeFailed}</div> : null}
              </div>
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
                        {activeSub.currency === "SAR" ? (
                          <SarText>
                            {locale === "ar"
                              ? formatMoney(activeSub.price, "ar")
                              : `${formatSar(activeSub.price)} (approx. ${formatUsdApprox(activeSub.price)})`}
                          </SarText>
                        ) : (
                          `${activeSub.price} ${activeSub.currency}`
                        )}
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
            ) : shown.start || shown.end ? (
              <div style={{ fontSize: 14, color: "#374151", marginBottom: 10, lineHeight: 1.7 }}>
                <div>
                  {s.profile.startDate}: <strong>{formatDate(shown.start, locale)}</strong>
                </div>
                <div>
                  {s.profile.endDate}: <strong>{formatDate(shown.end, locale)}</strong>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>
                {s.profile.noBilling}
              </p>
            )}

            <p style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>
              <SarText>{shownMonth.primary}</SarText>
              {shownMonth.usd ? ` (${approx} ${shownMonth.usd})` : ""}
              {shownYear.amountSar > 0 ? (
                <>
                  {" · "}
                  <SarText>{shownYear.primary}</SarText>
                  {` (${approx} ${shownYear.usd})`}
                </>
              ) : null}
            </p>
            <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 14, color: "#374151" }}>
              {(locale === "ar" ? shownPlan.features : displayFeatures(shownSource, "month")).map((feature) => (
                <li key={feature}>
                  <FeatureLine>{feature}</FeatureLine>
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 14, color: "#6b7280" }}>
              {s.profile.billingNote}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {billing && isSelfServePlan(billing.plan) && (
                <button
                  className="btn"
                  type="button"
                  style={{ marginTop: 16 }}
                  onClick={() => void renewNow()}
                  disabled={busyAction !== ""}
                >
                  {busyAction === "renew" ? s.profile.renewing : s.profile.renewNow}
                </button>
              )}
              {billing && (
                <button
                  className="btn"
                  type="button"
                  style={{ marginTop: 16 }}
                  onClick={() => void toggleAutoRenew()}
                  disabled={busyAction !== ""}
                >
                  {billing.cancel_at_period_end ? s.billing.resumeRenewal : s.billing.cancelRenewal}
                </button>
              )}
              <Link href="/pricing">
                <button className="btn" type="button" style={{ marginTop: 16 }}>
                  {s.profile.changePlan}
                </button>
              </Link>
              <Link href="/account/billing">
                <button className="btn" type="button" style={{ marginTop: 16 }}>
                  {s.profile.billingLink}
                </button>
              </Link>
              {billing ? (
                <Link href="/account/billing/card">
                  <button className="btn" type="button" style={{ marginTop: 16 }}>
                    {s.billing.updateCard}
                  </button>
                </Link>
              ) : null}
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
            );
          }}
          </ThemedPlanShell>
          )}

          {tab === "overview" && (
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
          )}

          {tab === "overview" && <ChangePasswordCard />}

          {tab === "billing" && (
          <>
          <div className="card" style={{ marginTop: 24 }}>
            <h2 className="card-title">{s.profile.invoices}</h2>

            {invoices.length > 0 ? (
              <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
                {invoices.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <span>{planById(locale, isPlanId(row.plan) ? row.plan : "assistant").name}</span>
                    <span>
                      <SarText>{formatMoney(Number(row.amount_sar), locale)}</SarText>
                    </span>
                    <span>{row.billing_interval === "year" ? s.profile.annual : s.profile.monthly}</span>
                    <span>{formatDate(row.paid_at, locale)}</span>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        void (async () => {
                          const token = await bearer();
                          if (!token) return;
                          try {
                            await downloadInvoicePdf(row.id, token, "", locale);
                          } catch (err) {
                            setErrorMsg(err instanceof Error ? err.message : s.profile.paymentFailed);
                          }
                        })();
                      }}
                    >
                      {s.profile.downloadInvoice}
                    </button>
                  </div>
                ))}
                <p style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>{s.profile.invoiceNote}</p>
              </div>
            ) : subHistory.length === 0 ? (
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
                {s.profile.noPayments}
              </p>
            ) : (
              <div className="profile-table-wrap">
                <table className="profile-table stack-phone">
                  <thead>
                    <tr>
                      <th className="col-plan">{s.profile.plan}</th>
                      <th className="col-amount">{s.profile.amount}</th>
                      <th className="col-status">{s.profile.status}</th>
                      <th className="col-date">{s.profile.date}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subHistory.map((row, idx) => (
                      <tr key={idx}>
                        <td className="col-plan" data-label={s.profile.plan}>
                          <span className="cell-value">
                            {planById(locale, isPlanId(row.plan) ? row.plan : "assistant").name}
                          </span>
                        </td>
                        <td className="col-amount" data-label={s.profile.amount}>
                          <HistoryAmount price={row.price} currency={row.currency} locale={locale} />
                        </td>
                        <td className="col-status" data-label={s.profile.status}>
                          <span className="cell-value">
                            <StatusPill status={row.status} />
                          </span>
                        </td>
                        <td className="col-date" data-label={s.profile.date}>
                          <span className="cell-value">{formatDate(row.start_date, locale)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>{s.profile.invoiceNote}</p>
              </div>
            )}
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h2 className="card-title">{s.profile.history}</h2>
            {planHistory.length === 0 ? (
              <p className="page-subtitle">{s.profile.noPayments}</p>
            ) : (
              <div className="profile-table-wrap">
                <table className="profile-table stack-phone">
                  <thead>
                    <tr>
                      <th className="col-plan">{s.profile.plan}</th>
                      <th className="col-amount">{s.profile.amount}</th>
                      <th className="col-status">{s.profile.status}</th>
                      <th className="col-date">{s.profile.date}</th>
                      <th className="col-invoice">{s.profile.invoices}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planHistory.map((row) => (
                      <tr key={row.id}>
                        <td className="col-plan" data-label={s.profile.plan}>
                          <span className="cell-value">
                            {planById(locale, isPlanId(row.plan) ? row.plan : "assistant").name}
                          </span>
                        </td>
                        <td className="col-amount" data-label={s.profile.amount}>
                          <span className="amount-stack cell-value">
                            <SarText>{formatMoney(Number(row.amount_sar), locale)}</SarText>
                          </span>
                        </td>
                        <td className="col-status" data-label={s.profile.status}>
                          <span className="cell-value">
                            <StatusPill status={row.status} />
                          </span>
                        </td>
                        <td className="col-date" data-label={s.profile.date}>
                          <span className="cell-value">
                            {formatDate(row.paid_at || row.current_period_start || row.created_at, locale)}
                          </span>
                        </td>
                        <td className="col-invoice" data-label={s.profile.invoices}>
                          <span className="cell-value">
                          {row.paid_at ? (
                            <button
                              className="btn"
                              type="button"
                              onClick={() => {
                                void (async () => {
                                  const token = await bearer();
                                  if (!token) return;
                                  try {
                                    await downloadInvoicePdf(row.id, token);
                                  } catch (err) {
                                    setErrorMsg(err instanceof Error ? err.message : s.profile.paymentFailed);
                                  }
                                })();
                              }}
                            >
                              {s.profile.downloadInvoice}
                            </button>
                          ) : (
                            "—"
                          )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </>
          )}

          {tab === "topics" && (
            <>
              <div className="card">
                <h2 className="card-title">{s.profile.chats}</h2>
                {topics.length === 0 ? (
                  <p className="page-subtitle">{s.profile.topicsEmpty}</p>
                ) : (
                  <div className="profile-table-wrap">
                    <table className="profile-table">
                      <tbody>
                        {topics.map((topic) => (
                          <tr key={topic.id}>
                            <td>{topic.title || s.chat.newConversation}</td>
                            <td>{topic.discipline ? disciplineLabel(locale, topic.discipline) : "—"}</td>
                            <td>{formatDate(topic.updated_at, locale)}</td>
                            <td><Link href={`/chat?c=${topic.id}`}>{s.profile.openTopic}</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="card" style={{ marginTop: 16 }}>
                <h2 className="card-title">{s.profile.documents}</h2>
                {files.length === 0 ? (
                  <p className="page-subtitle">{s.profile.filesEmpty}</p>
                ) : (
                  <div className="profile-table-wrap">
                    <table className="profile-table">
                      <tbody>
                        {files.map((file) => (
                          <tr key={file.id}>
                            <td>{file.name}</td>
                            <td>{file.size != null ? `${Math.ceil(file.size / 1024)} KB` : "—"}</td>
                            <td>{formatDate(file.createdAt, locale)}</td>
                            <td><Link href={`/chat?c=${file.conversationId}`}>{s.profile.openTopic}</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {cropSrc && (
            <AvatarCropper
              src={cropSrc}
              title={s.profile.cropTitle}
              applyLabel={s.profile.cropApply}
              cancelLabel={s.profile.cropCancel}
              onCancel={() => setCropSrc(null)}
              onApply={(blob) => void saveCroppedAvatar(blob)}
            />
          )}
        </div>
    </MarketingShell>
  );
}
