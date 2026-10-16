"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import MoyasarCardForm from "../../components/MoyasarCardForm";
import PhonePayQr from "../../components/PhonePayQr";
import { supabase } from "@/lib/supabaseClient";
import { type PlanId } from "@/lib/plans";
import { formatMoney, planById } from "@/lib/labels";
import { useMessages } from "@/lib/useMessages";

type Checkout = {
  id: string;
  plan: PlanId;
  billing_interval: string;
  amount_sar: number;
  amount_halalas: number;
  seat_limit: number | null;
  status?: string;
};

const NETWORKS = ["mada", "Visa", "Mastercard", "Amex", "UnionPay"];
const NOTICE_KEY = "engineerit_checkout_notice";

function successPath(id: string, pay: string) {
  const next = new URLSearchParams({ checkout: id });
  if (pay) next.set("pay", pay);
  return `/payment/success?${next.toString()}`;
}

export default function CheckoutPage() {
  const params = useParams<{ id: string }>();
  const { locale, shell: s } = useMessages();
  const [sidebar, setSidebar] = useState(false);
  const [consent, setConsent] = useState(false);
  const [saveRejected, setSaveRejected] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [publishableKey, setPublishableKey] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [samsungPayServiceId, setSamsungPayServiceId] = useState("");
  const [phonePayUrl, setPhonePayUrl] = useState("");
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [showPhonePay, setShowPhonePay] = useState(false);
  const [payToken, setPayToken] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const pay = search.get("pay") || "";
    const desktop = window.matchMedia("(min-width: 900px)").matches;
    setPayToken(pay);
    setShowPhonePay(desktop && !pay);
    if (loadAttempt === 0) {
      let notice = "";
      try {
        notice = sessionStorage.getItem(NOTICE_KEY) || "";
        if (notice) sessionStorage.removeItem(NOTICE_KEY);
      } catch {
        notice = "";
      }
      if (notice) setPaymentError(notice);
      else if (search.get("retry") === "1") setPaymentError(s.checkout.paymentFailed);
    }

    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token && !pay) {
        window.location.href = `/login?next=${encodeURIComponent(`/checkout/${params.id}`)}`;
        return;
      }
      const qs = new URLSearchParams({ id: params.id });
      if (pay) qs.set("pay", pay);
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/checkout/moyasar?${qs}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        if (json.reason === "expired") setError(s.checkout.phonePayExpired);
        else if (pay && (json.reason === "invalid" || json.reason === "mismatch")) setError(s.checkout.phonePayInvalid);
        else setError(json.error || s.checkout.openFailed);
        return;
      }
      if (json.checkout?.status === "paid") {
        window.location.assign(successPath(params.id, pay));
        return;
      }
      setError("");
      setCheckout(json.checkout);
      setPublishableKey(json.publishableKey || "");
      setCallbackUrl(json.callbackUrl || "");
      setSamsungPayServiceId(json.samsungPayServiceId || "");
      setPhonePayUrl(json.phonePayUrl || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, loadAttempt, s.checkout.openFailed, s.checkout.paymentFailed, s.checkout.phonePayExpired, s.checkout.phonePayInvalid]);

  useEffect(() => {
    if (!checkout || checkout.status === "paid") return;
    const timer = window.setInterval(() => {
      void (async () => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const qs = new URLSearchParams({ id: checkout.id, watch: "1" });
        if (payToken) qs.set("pay", payToken);
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`/api/checkout/moyasar?${qs}`, { headers });
        const json = await res.json().catch(() => ({}));
        if (json.status === "paid") {
          window.location.assign(successPath(checkout.id, payToken));
        }
      })();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [checkout, payToken]);

  const metadata = useMemo(
    () => ({
      checkout_id: checkout?.id || "",
      plan_id: checkout?.plan || "",
      purpose: "checkout",
    }),
    [checkout?.id, checkout?.plan]
  );

  const label = checkout ? planById(locale, checkout.plan).name : "";
  const amount = checkout ? formatMoney(Number(checkout.amount_sar), locale) : "";
  const cycle = checkout?.billing_interval === "year" ? s.profile.annual : s.profile.monthly;
  const banner = paymentError || error;

  return (
    <div className="app-shell">
      <NavSidebar isMobileOpen={sidebar} onCloseMobile={() => setSidebar(false)} />
      <div className="main">
        <Header onToggleSidebar={() => setSidebar((v) => !v)} />
        <div className="page-wrap">
          <div className="checkout-layout">
            <div className="checkout-main">
              <h1 className="page-title">{s.checkout.title}</h1>
              {banner && (
                <div className="checkout-error" role="alert">
                  <p>{banner}</p>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setPaymentError("");
                      if (error) {
                        setError("");
                        setLoadAttempt((n) => n + 1);
                      } else {
                        setAttempt((n) => n + 1);
                      }
                    }}
                  >
                    {s.checkout.retry}
                  </button>
                </div>
              )}
              {checkout && (
                <>
                  <section className="checkout-summary" aria-label={s.checkout.summary}>
                    <h2>{s.checkout.summary}</h2>
                    <dl>
                      <div>
                        <dt>{s.profile.plan}</dt>
                        <dd>{label}</dd>
                      </div>
                      <div>
                        <dt>{s.profile.cycle}</dt>
                        <dd>{cycle}</dd>
                      </div>
                      {checkout.seat_limit && checkout.seat_limit > 1 ? (
                        <div>
                          <dt>{s.checkout.seats}</dt>
                          <dd>{checkout.seat_limit}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>{s.profile.amount}</dt>
                        <dd className="checkout-amount">{amount}</dd>
                      </div>
                    </dl>
                    <p className="checkout-vat-note">{s.checkout.vatNote}</p>
                  </section>
                  <p className="page-subtitle">{s.checkout.walletReminder}</p>
                  <ul className="checkout-networks" aria-label={s.checkout.networks}>
                    {NETWORKS.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                  <label className="checkout-consent">
                    <input
                      type="checkbox"
                      checked={consent && !saveRejected}
                      onChange={(e) => {
                        setSaveRejected(false);
                        setConsent(e.target.checked);
                      }}
                    />
                    <span>{s.checkout.consent}</span>
                  </label>
                  <p className="page-subtitle">
                    {saveRejected ? s.checkout.saveRejected : consent ? s.checkout.savedCard : s.checkout.payOnce}
                  </p>
                  {publishableKey && callbackUrl ? (
                    <MoyasarCardForm
                      amountHalalas={Number(checkout.amount_halalas)}
                      description={`engineerit.ai ${label}`}
                      callbackUrl={callbackUrl}
                      publishableKey={publishableKey}
                      metadata={metadata}
                      saveCard={consent && !saveRejected}
                      locale={locale}
                      wallets
                      samsungPayServiceId={samsungPayServiceId}
                      orderNumber={checkout.id}
                      attempt={attempt}
                      failureFallback={s.checkout.paymentFailed}
                      onSaveCardRejected={() => setSaveRejected(true)}
                      onPaymentError={(message) => setPaymentError(message || s.checkout.paymentFailed)}
                    />
                  ) : (
                    <p>{s.checkout.missingKey}</p>
                  )}
                </>
              )}
            </div>
            {showPhonePay && phonePayUrl ? (
              <aside className="checkout-phone">
                <h2>{s.checkout.phonePay}</h2>
                <PhonePayQr url={phonePayUrl} alt={s.checkout.phonePay} />
                <p>{s.checkout.phonePayHint}</p>
                <p>{s.checkout.phonePayWaiting}</p>
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => {
                    void navigator.clipboard?.writeText(phonePayUrl).then(() => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                >
                  {copied ? s.checkout.copied : s.checkout.copyLink}
                </button>
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
