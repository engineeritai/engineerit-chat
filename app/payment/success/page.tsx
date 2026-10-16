"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import NavSidebar from "../../components/NavSidebar";
import { useMessages } from "@/lib/useMessages";
import { planById, formatMoney } from "@/lib/labels";
import { isPlanId, type PlanId } from "@/lib/plans";
import { downloadInvoicePdf } from "@/lib/invoiceDownload";
import { supabase } from "@/lib/supabaseClient";

type Invoice = {
  id: string;
  plan: string;
  billing_interval: string;
  amount_sar: number;
  seat_limit: number | null;
  paid_at: string | null;
  period_end: string | null;
};

export default function PaymentSuccessPage() {
  const { locale, shell: s } = useMessages();
  const arabic = locale === "ar";
  const [sidebar, setSidebar] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout") || "";
    const pay = params.get("pay") || "";
    if (!/^[0-9a-f-]{36}$/i.test(checkout)) {
      setError(s.profile.paymentMissing);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token && !pay) {
        window.location.href = `/login?next=${encodeURIComponent(`/payment/success?checkout=${checkout}`)}`;
        return;
      }
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const qs = pay ? `?pay=${encodeURIComponent(pay)}` : "";
      const res = await fetch(`/api/invoices/${checkout}${qs}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok || !json.invoice) {
        setError(json.error || s.profile.paymentPending);
        return;
      }
      setInvoice(json.invoice);
    })();
    const timer = window.setTimeout(() => {
      window.location.href = "/chat";
    }, 20000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [s.profile.paymentMissing, s.profile.paymentPending]);

  const planId: PlanId = invoice && isPlanId(invoice.plan) ? invoice.plan : "assistant";
  const planName = planById(locale, planId).name;
  const amount = invoice ? formatMoney(Number(invoice.amount_sar), locale) : "";
  const cycle = invoice?.billing_interval === "year" ? s.profile.annual : s.profile.monthly;
  const until = invoice?.period_end
    ? new Date(invoice.period_end).toLocaleDateString(arabic ? "ar-SA-u-nu-latn" : "en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="app-shell" dir={arabic ? "rtl" : "ltr"} lang={arabic ? "ar" : "en"}>
      <NavSidebar isMobileOpen={sidebar} onCloseMobile={() => setSidebar(false)} />
      <div className="main">
        <Header onToggleSidebar={() => setSidebar((v) => !v)} />
        <div className="page-wrap">
          <div className="pay-success">
            <div className={error ? "checkout-error" : "pay-success-banner"} role="status">
              {error ? null : (
                <span className="pay-success-mark" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M5 12.5 9.2 17 19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
              <div>
                <h1>{error ? s.profile.invoiceUnavailable : s.profile.paymentSuccess}</h1>
                <p>{error || (invoice ? s.profile.paymentConfirmedGo : s.profile.confirmingPayment)}</p>
              </div>
            </div>

            {invoice ? (
              <section className="pay-success-card" aria-label={s.profile.invoiceHeading}>
                <h2>{s.profile.invoiceHeading}</h2>
                <dl>
                  <div>
                    <dt>{s.profile.plan}</dt>
                    <dd>{planName}</dd>
                  </div>
                  <div>
                    <dt>{s.profile.cycle}</dt>
                    <dd>{cycle}</dd>
                  </div>
                  <div>
                    <dt>{s.profile.amount}</dt>
                    <dd>{amount}</dd>
                  </div>
                  {until ? (
                    <div>
                      <dt>{s.profile.nextRenewal}</dt>
                      <dd>{until}</dd>
                    </div>
                  ) : null}
                </dl>
                <button
                  type="button"
                  className="btn pay-success-download"
                  disabled={downloading}
                  onClick={() => {
                    setDownloading(true);
                    void supabase.auth.getSession().then(async ({ data }) => {
                      const token = data.session?.access_token || "";
                      const pay = new URLSearchParams(window.location.search).get("pay") || "";
                      if (!token && !pay) return;
                      try {
                        await downloadInvoicePdf(invoice.id, token, pay, locale);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : s.profile.paymentFailed);
                      } finally {
                        setDownloading(false);
                      }
                    });
                  }}
                >
                  {downloading ? s.profile.renewing : s.profile.downloadInvoice}
                </button>
              </section>
            ) : null}

            <div className="pay-success-actions">
              <a className="btn" href="/chat">
                {s.profile.continueChat}
              </a>
              <a className="btn btn-quiet" href="/profile">
                {s.profile.goToProfile}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
