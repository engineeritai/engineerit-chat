import type { SupabaseClient } from "@supabase/supabase-js";
import { nextPeriodEnd } from "@/lib/billingCycle";
import { periodDays, type BillingInterval } from "@/lib/plans";
import { saveCardFromPayment } from "@/lib/billingAccount";
import { isWalletPaymentSource } from "@/lib/moyasarEnv";
import {
  assessPaidInvoice,
  fetchMoyasarInvoice,
  fetchMoyasarPayment,
  type RemoteInvoice,
  type RemotePayment,
} from "@/lib/moyasar";
import { recordPlanPurchase } from "@/lib/recordPlan";
import { sendReceipt } from "@/lib/receipt";

export type CheckoutRow = {
  id: string;
  invoice_id: string | null;
  plan: string;
  billing_interval: string;
  amount_sar: number;
  amount_halalas: number;
  seat_limit: number | null;
  extra_seats: number | null;
  customer_email: string | null;
  user_id: string | null;
  lead_id: string | null;
  company: string | null;
  status: string;
  activated_at: string | null;
  receipt_sent_at: string | null;
  period_end: string | null;
  payment_id?: string | null;
  purpose?: string | null;
  locale?: string | null;
};

function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function settleCheckout(
  admin: SupabaseClient,
  row: CheckoutRow,
  remote: RemoteInvoice,
  payment?: RemotePayment | null
) {
  const assessment = assessPaidInvoice(Number(row.amount_halalas), remote);
  if (!assessment.ok) {
    return { ok: false as const, reason: assessment.reason };
  }

  const interval: BillingInterval = row.billing_interval === "year" ? "year" : "month";
  let periodEnd = row.period_end;

  if (!row.activated_at) {
    const nowIso = new Date().toISOString();
    const { data: claimed, error: claimErr } = await admin
      .from("moyasar_invoices")
      .update({ status: "paid", paid_at: nowIso, activated_at: nowIso })
      .eq("id", row.id)
      .is("activated_at", null)
      .select("id");

    if (claimErr) throw new Error(claimErr.message);

    if (claimed && claimed.length > 0) {
      try {
        periodEnd = await activateCheckout(admin, row, interval);
        await admin.from("moyasar_invoices").update({ period_end: periodEnd }).eq("id", row.id);
        if (payment && row.user_id) {
          const { data: billing } = await admin
            .from("billing_subscriptions")
            .select("id")
            .eq("user_id", row.user_id)
            .in("status", ["active", "past_due"])
            .maybeSingle();
          const wallet = isWalletPaymentSource(payment.source?.type);
          const savedCardId = wallet
            ? null
            : await saveCardFromPayment(admin, {
                userId: row.user_id,
                payment,
                billingSubscriptionId: (billing?.id as string | undefined) || null,
              });
          const nowIso = new Date().toISOString();
          const autoRenew = Boolean(savedCardId);
          await admin
            .from("billing_subscriptions")
            .update({
              cancel_at_period_end: !autoRenew,
              canceled_at: autoRenew ? null : nowIso,
              updated_at: nowIso,
            })
            .eq("user_id", row.user_id)
            .in("status", ["active", "past_due"]);
        }
        if (row.lead_id) {
          const { error: leadErr } = await admin
            .from("enterprise_leads")
            .update({ status: "paid" })
            .eq("id", row.lead_id);
          if (leadErr) console.warn("enterprise lead status", leadErr);
        }
      } catch (err) {
        await admin
          .from("moyasar_invoices")
          .update({ status: "pending", paid_at: null, activated_at: null })
          .eq("id", row.id);
        throw err;
      }
    }
  }

  if (!row.receipt_sent_at && row.customer_email) {
    const { data: receiptClaim } = await admin
      .from("moyasar_invoices")
      .update({ receipt_sent_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("receipt_sent_at", null)
      .select("id");

    if (receiptClaim && receiptClaim.length > 0) {
      try {
        const sent = await sendReceipt(row.customer_email, {
          plan: row.plan,
          amountSar: Number(row.amount_sar),
          interval,
          seats: row.seat_limit,
          periodEnd,
          locale: row.locale === "ar" ? "ar" : "en",
        });
        if (!sent) {
          await admin
            .from("moyasar_invoices")
            .update({ receipt_sent_at: null })
            .eq("id", row.id);
        }
      } catch (err) {
        console.error("receipt email failed", err);
        await admin.from("moyasar_invoices").update({ receipt_sent_at: null }).eq("id", row.id);
      }
    }
  }

  return { ok: true as const, plan: row.plan, periodEnd };
}

async function activateCheckout(
  admin: SupabaseClient,
  row: CheckoutRow,
  interval: BillingInterval
) {
  const now = new Date();
  let periodEnd = addDays(now, periodDays(interval));
  let periodStart = now.toISOString();
  let cancelAtPeriodEnd = false;
  if (row.purpose === "renew_now" && row.user_id) {
    const { data: billing } = await admin
      .from("billing_subscriptions")
      .select("current_period_start, current_period_end, cancel_at_period_end")
      .eq("user_id", row.user_id)
      .in("status", ["active", "past_due"])
      .maybeSingle();
    const currentEnd = billing?.current_period_end ? new Date(billing.current_period_end) : now;
    periodEnd = nextPeriodEnd(now, Number.isNaN(currentEnd.getTime()) ? now : currentEnd, interval).toISOString();
    if (
      billing?.current_period_start &&
      !Number.isNaN(currentEnd.getTime()) &&
      currentEnd.getTime() > now.getTime()
    ) {
      periodStart = billing.current_period_start as string;
    }
    cancelAtPeriodEnd = Boolean(billing?.cancel_at_period_end);
  }
  const email = row.customer_email?.trim().toLowerCase() || null;
  const plan = row.plan === "enterprise" || row.plan === "team" || row.plan === "engineer" || row.plan === "professional" || row.plan === "consultant"
    ? row.plan
    : null;
  if (!plan) {
    throw new Error("This checkout has no payable plan.");
  }

  if (row.user_id) {
    const result = await recordPlanPurchase(admin, {
      userId: row.user_id,
      email,
      plan,
      interval,
      extraSeats: row.extra_seats || 0,
      seatLimit: row.seat_limit || undefined,
      amountSar: Number(row.amount_sar),
      periodEnd,
      periodStart,
      cancelAtPeriodEnd,
      locale: row.locale === "ar" ? "ar" : "en",
      skipRecent: row.purpose === "renew_now",
      company: row.company,
      source: "moyasar",
    });
    return result.endDate;
  }

  if (plan === "enterprise" || plan === "team") {
    if (!email) throw new Error("Customer email is required to activate this plan.");
    const { error } = await admin.from("pending_plan_grants").insert({
      email,
      plan,
      billing_interval: interval,
      seat_limit: row.seat_limit || 1,
      amount_sar: Number(row.amount_sar),
      current_period_end: periodEnd,
      company: row.company,
    });
    if (error) throw new Error(error.message);
    return periodEnd;
  }

  return periodEnd;
}

export async function loadCheckoutByInvoice(admin: SupabaseClient, invoiceId: string) {
  const { data, error } = await admin
    .from("moyasar_invoices")
    .select(
      "id, invoice_id, payment_id, plan, billing_interval, amount_sar, amount_halalas, seat_limit, extra_seats, customer_email, user_id, lead_id, company, status, activated_at, receipt_sent_at, period_end, purpose, locale"
    )
    .eq("invoice_id", invoiceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CheckoutRow | null) ?? null;
}

export async function loadCheckoutById(admin: SupabaseClient, id: string) {
  const { data, error } = await admin
    .from("moyasar_invoices")
    .select(
      "id, invoice_id, payment_id, plan, billing_interval, amount_sar, amount_halalas, seat_limit, extra_seats, customer_email, user_id, lead_id, company, status, activated_at, receipt_sent_at, period_end, purpose, locale"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CheckoutRow | null) ?? null;
}

export async function confirmCheckout(
  admin: SupabaseClient,
  row: CheckoutRow,
  paymentId?: string | null
) {
  const secret = process.env.MOYASAR_SECRET_KEY;
  if (!secret) throw new Error("MOYASAR_SECRET_KEY is not set in environment.");
  const id = paymentId || row.payment_id;
  if (id) {
    const payment = await fetchMoyasarPayment(secret, id);
    if (payment.metadata?.checkout_id && payment.metadata.checkout_id !== row.id) {
      return { ok: false as const, reason: "checkout_mismatch" as const };
    }
    if (payment.metadata?.checkout_id !== row.id) {
      return { ok: false as const, reason: "checkout_mismatch" as const };
    }
    return settleCheckout(
      admin,
      row,
      { id: payment.id, status: payment.status, amount: payment.amount, currency: payment.currency },
      payment
    );
  }
  if (!row.invoice_id) throw new Error("This checkout has no Moyasar payment yet.");
  const remote = await fetchMoyasarInvoice(secret, row.invoice_id);
  return settleCheckout(admin, row, remote);
}

export async function confirmStoredInvoice(admin: SupabaseClient, row: CheckoutRow) {
  return confirmCheckout(admin, row, row.payment_id);
}
