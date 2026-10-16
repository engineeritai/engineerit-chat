"use client";

import { useEffect, useState } from "react";
import LanguageToggle from "@/app/components/LanguageToggle";
import { useLocale } from "@/app/components/LocaleProvider";
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
  const { locale } = useLocale();
  const { shell: s } = useMessages();
  const arabic = locale === "ar";
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout") || "";
    if (!/^[0-9a-f-]{36}$/i.test(checkout)) {
      setError(s.profile.paymentMissing);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        window.location.href = `/login?next=${encodeURIComponent(`/payment/success?checkout=${checkout}`)}`;
        return;
      }
      const res = await fetch(`/api/invoices/${checkout}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
  const cycle =
    invoice?.billing_interval === "year" ? s.profile.annual : s.profile.monthly;
  const until = invoice?.period_end
    ? new Date(invoice.period_end).toLocaleDateString(arabic ? "ar-SA-u-nu-latn" : "en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full space-y-4">
        <LanguageToggle />
        <h1 className="text-3xl font-semibold" style={{ color: error ? "#b91c1c" : "#16a34a" }}>
          {error ? (arabic ? "تعذر عرض الفاتورة" : "Invoice unavailable") : arabic ? "تم الدفع" : "Payment successful"}
        </h1>
        {error ? (
          <p className="text-sm text-gray-800">{error}</p>
        ) : invoice ? (
          <div className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-800 space-y-2">
            <h2 className="text-lg font-semibold">{s.profile.invoiceHeading}</h2>
            <p>
              {s.profile.plan}: <strong>{planName}</strong>
            </p>
            <p>
              {s.profile.cycle}: <strong>{cycle}</strong>
            </p>
            <p>
              {s.profile.amount}: <strong>{amount}</strong>
            </p>
            {until ? (
              <p>
                {s.profile.nextRenewal}: <strong>{until}</strong>
              </p>
            ) : null}
            <button
              type="button"
              className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium bg-black text-white"
              disabled={downloading}
              onClick={() => {
                setDownloading(true);
                void supabase.auth.getSession().then(async ({ data }) => {
                  const token = data.session?.access_token;
                  if (!token) return;
                  try {
                    await downloadInvoicePdf(invoice.id, token);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : s.profile.paymentFailed);
                  } finally {
                    setDownloading(false);
                  }
                });
              }}
            >
              {s.profile.downloadInvoice}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-800">{s.profile.confirmingPayment}</p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <a
            href="/chat"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-transparent text-sm font-medium bg-black text-white hover:opacity-90"
          >
            {s.profile.continueChat}
          </a>
          <a
            href="/profile"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {arabic ? "الذهاب إلى الملف" : "Go to profile"}
          </a>
        </div>
      </div>
    </div>
  );
}
