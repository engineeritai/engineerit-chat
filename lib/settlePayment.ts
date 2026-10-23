import type { SupabaseClient } from "@supabase/supabase-js";
import { nextPeriodEnd } from "@/lib/billingCycle";
import { periodDays, type BillingInterval } from "@/lib/plans";
import { saveCardFromPayment } from "@/lib/billingAccount";
import { shouldStorePaymentToken } from "@/lib/moyasarEnv";
import {
  assessPaidInvoice,
  currencyIsSar,
  fetchMoyasarInvoice,
  fetchMoyasarPayment,
  findMoyasarPaymentsForCheckout,
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
          const savedCardId = shouldStorePaymentToken(payment.source)
            ? await saveCardFromPayment(admin, {
                userId: row.user_id,
                payment,
                billingSubscriptionId: (billing?.id as string | undefined) || null,
              })
            : null;
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
          periodStart: new Date().toISOString(),
          periodEnd,
          locale: row.locale === "ar" ? "ar" : "en",
          invoiceNumber: row.invoice_id || row.id,
          customerName: row.company,
          customerEmail: row.customer_email,
          paymentMethod: payment?.source?.type || null,
          paymentId: payment?.id || row.payment_id || null,
          issuedAt: new Date().toISOString(),
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

export function paymentBelongsToCheckout(
  payment: RemotePayment,
  row: Pick<CheckoutRow, "id" | "amount_halalas">
) {
  return (
    payment.metadata?.checkout_id === row.id &&
    payment.amount === Number(row.amount_halalas) &&
    currencyIsSar(payment.currency)
  );
}

async function rememberPaymentId(admin: SupabaseClient, row: CheckoutRow, paymentId: string, force = false) {
  if (!paymentId || row.payment_id === paymentId) return;
  if (row.payment_id && !force) return;
  const { error } = await admin.from("moyasar_invoices").update({ payment_id: paymentId }).eq("id", row.id);
  if (error) throw new Error(error.message);
  row.payment_id = paymentId;
}

async function applyVerifiedPayment(admin: SupabaseClient, row: CheckoutRow, payment: RemotePayment) {
  if (payment.metadata?.checkout_id !== row.id) {
    return { ok: false as const, reason: "checkout_mismatch" as const };
  }
  if (payment.amount !== Number(row.amount_halalas)) {
    return { ok: false as const, reason: "amount_mismatch" as const };
  }
  if (!currencyIsSar(payment.currency)) {
    return { ok: false as const, reason: "currency_mismatch" as const };
  }
  if (payment.id && (!row.payment_id || payment.status === "paid")) {
    await rememberPaymentId(admin, row, payment.id, payment.status === "paid");
  }
  if (payment.status !== "paid") {
    return { ok: false as const, reason: "not_paid" as const };
  }
  return settleCheckout(
    admin,
    row,
    { id: payment.id, status: payment.status, amount: payment.amount, currency: payment.currency },
    payment
  );
}

async function settlePaidSibling(admin: SupabaseClient, row: CheckoutRow, secret: string, skipId?: string) {
  const listed = await findMoyasarPaymentsForCheckout(secret, row.id);
  const paid = listed.find(
    (payment) => payment.status === "paid" && payment.id !== skipId && paymentBelongsToCheckout(payment, row)
  );
  if (!paid) return null;
  return applyVerifiedPayment(admin, row, paid);
}

/**
 * Verify a Moyasar payment by id with the secret key, then activate once.
 * A closed tab still settles when the webhook or a later lookup finds the paid payment.
 */
export async function confirmCheckout(
  admin: SupabaseClient,
  row: CheckoutRow,
  paymentId?: string | null
) {
  const secret = process.env.MOYASAR_SECRET_KEY;
  if (!secret) throw new Error("MOYASAR_SECRET_KEY is not set in environment.");
  const explicit = (paymentId || "").trim();
  const id = explicit || row.payment_id || "";
  if (id) {
    const payment = await fetchMoyasarPayment(secret, id);
    const applied = await applyVerifiedPayment(admin, row, payment);
    if (applied.ok) return applied;
    const sibling = await settlePaidSibling(admin, row, secret, payment.id);
    if (sibling) return sibling;
    return applied;
  }
  const sibling = await settlePaidSibling(admin, row, secret);
  if (sibling) return sibling;
  if (row.invoice_id) {
    const remote = await fetchMoyasarInvoice(secret, row.invoice_id);
    return settleCheckout(admin, row, remote);
  }
  return { ok: false as const, reason: "not_paid" as const };
}

export async function confirmStoredInvoice(admin: SupabaseClient, row: CheckoutRow) {
  return confirmCheckout(admin, row, row.payment_id);
}
