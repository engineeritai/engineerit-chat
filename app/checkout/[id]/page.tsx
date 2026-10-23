"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import MoyasarCardForm from "../../components/MoyasarCardForm";
import PhonePayQr from "../../components/PhonePayQr";
import { supabase } from "@/lib/supabaseClient";
import { type PlanId } from "@/lib/plans";
import { formatMoney, planById } from "@/lib/labels";
import { SarText } from "@/app/components/RiyalAmount";
import { paymentSuccessPath } from "@/lib/checkoutReturn";
import { phonePayStartsOpen, saveCardStartsChecked } from "@/lib/moyasarEnv";
import { addDays, formatBillingDate } from "@/lib/billingCycle";
import { periodDays } from "@/lib/plans";
import { useMessages } from "@/lib/useMessages";
import { trackOnce } from "@/lib/attribution";
import CheckoutCode, { type PromoQuote } from "../../components/CheckoutCode";
import StudentVerify from "../../components/StudentVerify";

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

export default function CheckoutPage() {
  const params = useParams<{ id: string }>();
  const { locale, shell: s } = useMessages();
  const [sidebar, setSidebar] = useState(false);
  const [consent, setConsent] = useState(saveCardStartsChecked);
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
  const [phoneOpen, setPhoneOpen] = useState(phonePayStartsOpen);
  const [payToken, setPayToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);
  const [promo, setPromo] = useState<PromoQuote | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (process.env.NODE_ENV !== "production" && search.get("fixture") === "preview") {
      const desktop = window.matchMedia("(min-width: 900px)").matches;
      setPreview(true);
      setShowPhonePay(desktop);
      setPhonePayUrl("https://engineerit.ai/checkout/preview");
      setCheckout({
        id: params.id,
        plan: "consultant",
        billing_interval: "month",
        amount_sar: 99,
        amount_halalas: 9900,
        seat_limit: null,
        status: "pending",
      });
      return;
    }
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
        window.location.assign(paymentSuccessPath(params.id, pay));
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
    trackOnce(`checkout_opened:${checkout.id}`, "checkout_opened", { plan: checkout.plan });
  }, [checkout]);

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
          window.location.assign(paymentSuccessPath(checkout.id, payToken));
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

  const onPriced = useCallback((next: PromoQuote) => {
    setPromo(next.applied ? next : null);
    setCheckout((current) => {
      if (!current || Number(current.amount_halalas) === next.chargedHalalas) return current;
      return { ...current, amount_sar: next.chargedSar, amount_halalas: next.chargedHalalas };
    });
  }, []);
  const label = checkout ? planById(locale, checkout.plan).name : "";
  const amount = checkout ? formatMoney(Number(checkout.amount_sar), locale) : "";
  const cycle = checkout?.billing_interval === "year" ? s.profile.annual : s.profile.monthly;
  const renewsOn = useMemo(() => {
    if (!checkout) return "";
    const interval = checkout.billing_interval === "year" ? "year" : "month";
    return formatBillingDate(addDays(new Date(), periodDays(interval)), locale);
  }, [checkout, locale]);
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
                      {promo ? (
                        <>
                          <div>
                            <dt>{s.checkout.originalPrice}</dt>
                            <dd>
                              <SarText>{formatMoney(promo.listSar, locale)}</SarText>
                            </dd>
                          </div>
                          <div>
                            <dt>{s.checkout.discount}</dt>
                            <dd>
                              <SarText>{formatMoney(promo.discountSar, locale)}</SarText>
                            </dd>
                          </div>
                        </>
                      ) : null}
                      <div>
                        <dt>{promo ? s.checkout.totalDue : s.profile.amount}</dt>
                        <dd className="checkout-amount">
                          <SarText>{amount}</SarText>
                        </dd>
                      </div>
                    </dl>
                    <CheckoutCode
                      checkoutId={checkout.id}
                      payToken={payToken}
                      preview={preview}
                      copy={s.checkout}
                      onPriced={onPriced}
                      onRedeemed={() => window.location.assign(paymentSuccessPath(checkout.id, payToken))}
                    />
                    <StudentVerify preview={preview} />
                    <p className="checkout-vat-note">{s.checkout.vatNote}</p>
                  </section>
                  <p className="checkout-note">{s.checkout.walletReminder}</p>
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
                    <span className="checkout-consent-copy">
                      <span>{s.checkout.consent}</span>
                    </span>
                  </label>
                  <p className="checkout-help">
                    {saveRejected
                      ? s.checkout.saveRejected
                      : consent
                        ? `${s.billing.renewsOn} ${renewsOn}`
                        : s.checkout.renewManually}
                  </p>
                  <ul className="checkout-trust">
                    <li>
                      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      {s.checkout.securePay}
                    </li>
                    <li>{s.checkout.cancelAnytime}</li>
                    <li>{s.checkout.cardNotStored}</li>
                    <li>
                      <a href="mailto:support@engineerit.ai">support@engineerit.ai</a>
                    </li>
                  </ul>
                  {promo?.free ? (
                    <p className="checkout-note">{s.checkout.freeReady}</p>
                  ) : preview ? (
                    <div className="checkout-preview" data-testid="checkout-preview">
                      <p>{s.checkout.summary}</p>
                    </div>
                  ) : publishableKey && callbackUrl ? (
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
                  {showPhonePay && phonePayUrl ? (
                    <details
                      className="checkout-phone"
                      open={phoneOpen}
                      onToggle={(event) => setPhoneOpen((event.target as HTMLDetailsElement).open)}
                    >
                      <summary>
                        <span className="checkout-phone-title">
                          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="7" y="2" width="10" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                            <circle cx="12" cy="18" r="0.8" fill="currentColor" />
                          </svg>
                          <span>
                            <p className="checkout-phone-kicker">{s.checkout.phonePay}</p>
                            <h2>{s.checkout.scanToPay}</h2>
                          </span>
                        </span>
                      </summary>
                      <PhonePayQr url={phonePayUrl} alt={s.checkout.scanToPay} />
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
                    </details>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
