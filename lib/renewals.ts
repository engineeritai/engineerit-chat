import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addDays,
  afterChargeFailure,
  decideRenewal,
  formatBillingDate,
  GRACE_DAYS,
  nextPeriodEnd,
  renewalChargeHalalas,
  type RenewalDecision,
} from "@/lib/billingCycle";
import { downgradeNotice, expireNotice, pastDueNotice } from "@/lib/billingNotices";
import { appBaseUrl, deliverMail, escapeHtml } from "@/lib/mail";
import {
  assessTokenCharge,
  createMoyasarTokenPayment,
  fetchMoyasarPayment,
  MoyasarRequestError,
} from "@/lib/moyasar";
import {
  PLAN_LABELS,
  consultantLegacyActive,
  periodDays,
  quoteSelfServe,
  type BillingInterval,
  type PlanId,
  type SelfServePlanId,
} from "@/lib/plans";
import { priceRenewalWithPromo, type PromoDiscountType } from "@/lib/promo";
import { mentionsColumn, missingPromoSchema, promoRenewalUpdate } from "@/lib/promoSchema";
import { studentDiscountAllowed } from "@/lib/studentVerify";
import { planById } from "@/lib/labels";
import { applyAssistantRetention } from "@/lib/returnToFree";
import { sendReceipt } from "@/lib/receipt";

export type OpenSubscription = {
  id: string;
  user_id: string;
  customer_email: string | null;
  plan: SelfServePlanId;
  billing_interval: BillingInterval;
  extra_seats: number;
  seat_limit: number;
  amount_halalas: number;
  status: "active" | "past_due";
  current_period_end: string;
  cancel_at_period_end: boolean;
  saved_card_id: string | null;
  team_id: string | null;
  credit_halalas: number;
  failure_count: number;
  locale?: string | null;
  promo_cycles_remaining?: number | null;
  promo_code_id?: string | null;
  promo_code?: string | null;
  promo_discount_type?: string | null;
  promo_percent_off?: number | null;
  promo_amount_off_sar?: number | null;
  promo_requires_student?: boolean | null;
};

type ChargeResult = {
  paid: boolean;
  pending?: boolean;
  paymentId?: string | null;
  error?: string;
};

const SUBSCRIPTION_COLUMNS =
  "id, user_id, customer_email, plan, billing_interval, extra_seats, seat_limit, amount_halalas, status, current_period_end, cancel_at_period_end, saved_card_id, team_id, credit_halalas, failure_count, locale";
const SUBSCRIPTION_PROMO_COLUMNS =
  ", promo_cycles_remaining, promo_code_id, promo_code, promo_discount_type, promo_percent_off, promo_amount_off_sar";
const SUBSCRIPTION_STUDENT_COLUMN = ", promo_requires_student";

async function loadDueSubscriptions(admin: SupabaseClient, now: Date): Promise<OpenSubscription[]> {
  const query = (columns: string) =>
    admin
      .from("billing_subscriptions")
      .select(columns)
      .in("status", ["active", "past_due"])
      .lte("current_period_end", now.toISOString())
      .limit(100);
  let result = await query(SUBSCRIPTION_COLUMNS + SUBSCRIPTION_PROMO_COLUMNS + SUBSCRIPTION_STUDENT_COLUMN);
  if (result.error && mentionsColumn(result.error, "promo_requires_student")) {
    result = await query(SUBSCRIPTION_COLUMNS + SUBSCRIPTION_PROMO_COLUMNS);
  }
  if (result.error && missingPromoSchema(result.error)) {
    result = await query(SUBSCRIPTION_COLUMNS);
  }
  if (result.error) throw new Error(result.error.message);
  return (result.data || []) as unknown as OpenSubscription[];
}

export type RenewalRunResult = {
  id: string;
  action: string;
  plan?: string;
  periodEnd?: string;
  failureCount?: number;
  hasCard?: boolean;
};

export async function runDueRenewals(
  admin: SupabaseClient,
  now = new Date(),
  options?: { dryRun?: boolean }
) {
  const data = await loadDueSubscriptions(admin, now);

  const results: RenewalRunResult[] = [];
  for (const sub of data) {
    const decision = decideRenewal({
      now,
      subscriptionId: sub.id,
      periodEnd: new Date(sub.current_period_end),
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      failureCount: sub.failure_count,
    });
    if (options?.dryRun) {
      results.push({
        id: sub.id,
        action: `dry:${decision.action}`,
        plan: sub.plan,
        periodEnd: sub.current_period_end,
        failureCount: sub.failure_count,
        hasCard: Boolean(sub.saved_card_id),
      });
      continue;
    }
    const action = await applyRenewalDecision(admin, sub, decision, now);
    results.push({ id: sub.id, action });
  }
  return results;
}

export async function applyRenewalDecision(
  admin: SupabaseClient,
  sub: OpenSubscription,
  decision: RenewalDecision,
  now: Date
) {
  if (decision.action === "skip" || decision.action === "wait") return decision.action;
  if (decision.action === "expire" || decision.action === "downgrade") {
    await endAccess(admin, sub, decision.action === "expire" ? "canceled" : "expired");
    if (sub.customer_email) {
      const note =
        decision.action === "expire" ? expireNotice(noticeLocale(sub)) : downgradeNotice(noticeLocale(sub));
      await sendBillingNote(sub.customer_email, note.subject, note.text);
    }
    return decision.action;
  }

  const quote = await quoteRenewal(admin, sub, now);
  const priced = renewalChargeHalalas(quote.amountHalalas, sub.credit_halalas);
  if (priced.chargeHalalas === 0) {
    await extendSubscription(admin, sub, now, priced.creditRemaining);
    return "extended_with_credit";
  }

  const charge = await chargeSavedCard(admin, sub, {
    amountHalalas: priced.chargeHalalas,
    idempotencyKey: decision.idempotencyKey,
    attempt: decision.attempt,
    kind: "renewal",
    description: `engineerit.ai ${PLAN_LABELS[sub.plan]} renewal`,
  });

  if (charge.pending) return "pending";

  if (charge.paid) {
    await extendSubscription(admin, sub, now, priced.creditRemaining);
    if (sub.customer_email) {
      const periodEnd = nextPeriodEnd(now, new Date(sub.current_period_end), sub.billing_interval);
      const amountSar = priced.chargeHalalas / 100;
      const locale = sub.locale === "ar" ? "ar" : "en";
      await recordRenewalInvoice(admin, sub, {
        amountSar,
        amountHalalas: priced.chargeHalalas,
        periodEnd: periodEnd.toISOString(),
        paymentId: charge.paymentId || null,
        locale,
        now,
        discounted: quote.promoDiscounted,
      });
      try {
        await sendReceipt(sub.customer_email, {
          plan: sub.plan,
          amountSar,
          interval: sub.billing_interval,
          seats: sub.seat_limit,
          periodStart: now.toISOString(),
          periodEnd: periodEnd.toISOString(),
          locale,
          customerEmail: sub.customer_email,
          paymentMethod: "token",
          paymentId: charge.paymentId || null,
          issuedAt: now.toISOString(),
        });
      } catch (err) {
        console.error("renewal receipt email failed", err);
      }
    }
    return "renewed";
  }

  const next = afterChargeFailure(sub.failure_count);
  if (next.status === "downgrade") {
    await endAccess(admin, sub, "expired");
    if (sub.customer_email) {
      const note = downgradeNotice(noticeLocale(sub));
      await sendBillingNote(sub.customer_email, note.subject, note.text);
    }
    return "downgraded";
  }

  const retryAt = addDays(new Date(sub.current_period_end), next.retryDay);
  const graceUntil = addDays(new Date(sub.current_period_end), GRACE_DAYS);
  await admin
    .from("billing_subscriptions")
    .update({
      status: "past_due",
      failure_count: next.failureCount,
      next_retry_at: retryAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", sub.id);

  if (sub.team_id) {
    await admin
      .from("teams")
      .update({ current_period_end: graceUntil.toISOString(), status: "active", updated_at: now.toISOString() })
      .eq("id", sub.team_id);
  }

  if (sub.customer_email) {
    const locale = noticeLocale(sub);
    const note = pastDueNotice(locale, {
      plan: planById(locale, sub.plan).name,
      retryDate: formatBillingDate(retryAt, locale),
      billingUrl: `${appBaseUrl()}/account/billing`,
    });
    await sendBillingNote(sub.customer_email, note.subject, note.text);
  }
  return "past_due";
}

async function chargeSavedCard(
  admin: SupabaseClient,
  sub: OpenSubscription,
  args: {
    amountHalalas: number;
    idempotencyKey: string;
    attempt: number;
    kind: "renewal" | "seat_change";
    description: string;
  }
): Promise<ChargeResult> {
  const nowIso = new Date().toISOString();
  const { data: inserted, error: insertErr } = await admin
    .from("renewal_attempts")
    .insert({
      billing_subscription_id: sub.id,
      idempotency_key: args.idempotencyKey,
      kind: args.kind,
      attempt_number: args.attempt,
      amount_halalas: args.amountHalalas,
      status: "pending",
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id, status, moyasar_payment_id")
    .single();

  let attempt = inserted;
  if (insertErr) {
    const { data: existing } = await admin
      .from("renewal_attempts")
      .select("id, status, moyasar_payment_id")
      .eq("idempotency_key", args.idempotencyKey)
      .maybeSingle();
    attempt = existing;
  }
  if (!attempt) return { paid: false, error: insertErr?.message || "Could not record the charge." };
  if (attempt.status === "paid") return { paid: true, paymentId: attempt.moyasar_payment_id };

  const secret = process.env.MOYASAR_SECRET_KEY;
  if (!secret) return { paid: false, error: "MOYASAR_SECRET_KEY is not set." };
  if (!sub.saved_card_id) return finishAttempt(admin, attempt.id, "failed", null, "No saved card.");

  const { data: card } = await admin
    .from("saved_cards")
    .select("moyasar_token, status")
    .eq("id", sub.saved_card_id)
    .maybeSingle();
  if (!card || card.status !== "active" || !card.moyasar_token) {
    return finishAttempt(admin, attempt.id, "failed", null, "Saved card is not active.");
  }

  if (attempt.moyasar_payment_id) {
    try {
      const existingPayment = await fetchMoyasarPayment(secret, attempt.moyasar_payment_id);
    return finishAttempt(
      admin,
      attempt.id,
      assessTokenCharge(args.amountHalalas, existingPayment),
      existingPayment.id || attempt.moyasar_payment_id,
      existingPayment.source?.message || existingPayment.message || null
    );
    } catch {
      return {
        paid: false,
        pending: true,
        paymentId: attempt.moyasar_payment_id,
        error: "Payment is still being confirmed.",
      };
    }
  }

  try {
    const payment = await createMoyasarTokenPayment(secret, {
      amount: args.amountHalalas,
      currency: "SAR",
      description: args.description,
      callback_url: `${appBaseUrl()}/api/payments/moyasar/callback`,
      token: card.moyasar_token,
      idempotencyKey: args.idempotencyKey,
      metadata: {
        billing_subscription_id: sub.id,
        idempotency_key: args.idempotencyKey,
        kind: args.kind,
        plan_id: sub.plan,
      },
    });
    return finishAttempt(
      admin,
      attempt.id,
      assessTokenCharge(args.amountHalalas, payment),
      payment.id || null,
      payment.source?.message || payment.message || null
    );
  } catch (err) {
    if (err instanceof MoyasarRequestError && err.kind === "transport") {
      return {
        paid: false,
        pending: true,
        error: "The saved-card charge could not be confirmed. It will be checked again.",
      };
    }
    const message = err instanceof Error ? err.message : "Charge failed.";
    return finishAttempt(admin, attempt.id, "failed", null, message);
  }
}

async function finishAttempt(
  admin: SupabaseClient,
  attemptId: string,
  outcome: "paid" | "pending" | "failed",
  paymentId: string | null,
  error: string | null
): Promise<ChargeResult> {
  await admin
    .from("renewal_attempts")
    .update({
      status: outcome === "paid" ? "paid" : outcome === "pending" ? "pending" : "failed",
      moyasar_payment_id: paymentId,
      error: outcome === "paid" ? null : error,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId);
  return {
    paid: outcome === "paid",
    pending: outcome === "pending",
    paymentId,
    error: error || undefined,
  };
}

async function quoteRenewal(admin: SupabaseClient, sub: OpenSubscription, now: Date) {
  let consultantLegacy = false;
  if (sub.plan === "consultant") {
    const { data } = await admin
      .from("profiles")
      .select("consultant_legacy_price_until")
      .eq("id", sub.user_id)
      .maybeSingle();
    consultantLegacy = consultantLegacyActive(data?.consultant_legacy_price_until, now);
  }
  const list = quoteSelfServe(sub.plan, sub.billing_interval, sub.extra_seats, { consultantLegacy });
  const discountType = sub.promo_discount_type;
  const studentVerified = sub.promo_requires_student ? await readStudentVerified(admin, sub.user_id, now) : false;
  const promo = priceRenewalWithPromo(list.amountSar, {
    cyclesRemaining: Number(sub.promo_cycles_remaining) || 0,
    discountType:
      discountType === "percent" || discountType === "fixed" || discountType === "free_months"
        ? (discountType as PromoDiscountType)
        : null,
    percentOff: sub.promo_percent_off === null || sub.promo_percent_off === undefined ? null : Number(sub.promo_percent_off),
    amountOffSar:
      sub.promo_amount_off_sar === null || sub.promo_amount_off_sar === undefined ? null : Number(sub.promo_amount_off_sar),
    requiresStudent: Boolean(sub.promo_requires_student),
    studentVerified,
  });
  return {
    ...list,
    amountSar: promo.amountSar,
    amountHalalas: promo.amountHalalas,
    promoCyclesRemaining: promo.cyclesRemainingAfter,
    promoDiscounted: promo.discounted,
  };
}

async function extendSubscription(
  admin: SupabaseClient,
  sub: OpenSubscription,
  now: Date,
  creditRemaining: number
) {
  const quote = await quoteRenewal(admin, sub, now);
  const periodEnd = nextPeriodEnd(now, new Date(sub.current_period_end), sub.billing_interval);
  const nowIso = now.toISOString();
  const endIso = periodEnd.toISOString();
  await admin
    .from("billing_subscriptions")
    .update({
      status: "active",
      failure_count: 0,
      next_retry_at: null,
      credit_halalas: creditRemaining,
      amount_sar: quote.amountSar,
      amount_halalas: quote.amountHalalas,
      ...promoRenewalUpdate(sub, quote.promoCyclesRemaining),
      current_period_start: nowIso,
      current_period_end: endIso,
      updated_at: nowIso,
    })
    .eq("id", sub.id);

  await admin.from("profiles").upsert(
    { id: sub.user_id, subscription_tier: sub.plan, updated_at: nowIso },
    { onConflict: "id" }
  );
  await admin
    .from("subscriptions")
    .update({ status: "replaced", updated_at: nowIso })
    .eq("user_id", sub.user_id)
    .in("status", ["active", "paid"]);
  await admin.from("subscriptions").insert({
    user_id: sub.user_id,
    plan: sub.plan,
    price: quote.amountSar,
    currency: "SAR",
    status: "active",
    start_date: nowIso,
    end_date: endIso,
    created_at: nowIso,
    updated_at: nowIso,
  });
  if (sub.team_id) {
    await admin
      .from("teams")
      .update({ status: "active", current_period_end: endIso, updated_at: nowIso })
      .eq("id", sub.team_id);
  }
}

async function endAccess(admin: SupabaseClient, sub: OpenSubscription, status: "canceled" | "expired") {
  const nowIso = new Date().toISOString();
  await admin
    .from("billing_subscriptions")
    .update({ status, cancel_at_period_end: false, updated_at: nowIso })
    .eq("id", sub.id);
  await admin.from("profiles").update({ subscription_tier: "assistant", updated_at: nowIso }).eq("id", sub.user_id);
  await admin
    .from("subscriptions")
    .update({ status: "expired", updated_at: nowIso })
    .eq("user_id", sub.user_id)
    .in("status", ["active", "paid"]);
  if (sub.team_id) {
    await admin.from("teams").update({ status: "lapsed", updated_at: nowIso }).eq("id", sub.team_id);
  }
  await applyAssistantRetention(admin, sub.user_id);
}

export async function chargeSeatChange(
  admin: SupabaseClient,
  sub: OpenSubscription,
  args: { amountHalalas: number; idempotencyKey: string; description: string }
) {
  return chargeSavedCard(admin, sub, {
    ...args,
    attempt: 0,
    kind: "seat_change",
  });
}

async function recordRenewalInvoice(
  admin: SupabaseClient,
  sub: OpenSubscription,
  args: {
    amountSar: number;
    amountHalalas: number;
    periodEnd: string;
    paymentId: string | null;
    locale: "ar" | "en";
    now: Date;
    discounted?: boolean;
  }
) {
  if (args.paymentId) {
    const { data: existing } = await admin
      .from("moyasar_invoices")
      .select("id")
      .eq("payment_id", args.paymentId)
      .maybeSingle();
    if (existing?.id) return;
  }
  const nowIso = args.now.toISOString();
  const { error } = await admin.from("moyasar_invoices").insert({
    id: crypto.randomUUID(),
    invoice_id: args.paymentId,
    payment_id: args.paymentId,
    plan: sub.plan,
    billing_interval: sub.billing_interval,
    amount_sar: args.amountSar,
    amount_halalas: args.amountHalalas,
    currency: "SAR",
    seat_limit: sub.seat_limit,
    extra_seats: sub.extra_seats,
    customer_email: sub.customer_email,
    user_id: sub.user_id,
    status: "paid",
    paid_at: nowIso,
    activated_at: nowIso,
    period_end: args.periodEnd,
    purpose: "renewal",
    locale: args.locale,
    ...(args.discounted
      ? {
          promo_code_id: sub.promo_code_id || null,
          promo_code: sub.promo_code || null,
          promo_discount_type: sub.promo_discount_type || null,
          promo_percent_off: sub.promo_percent_off ?? null,
          promo_amount_off_sar: sub.promo_amount_off_sar ?? null,
          promo_cycles: sub.promo_cycles_remaining ?? null,
        }
      : {}),
  });
  if (error) console.error("renewal invoice insert", error);
}

async function readStudentVerified(admin: SupabaseClient, userId: string, now: Date) {
  const { data, error } = await admin.from("student_status").select("verified_until").eq("user_id", userId).maybeSingle();
  if (error) {
    if (missingPromoSchema(error)) return false;
    throw new Error(error.message);
  }
  return studentDiscountAllowed(data?.verified_until ? String(data.verified_until) : null, now);
}

function noticeLocale(sub: OpenSubscription): "en" | "ar" {
  return sub.locale === "ar" ? "ar" : "en";
}

async function sendBillingNote(to: string, subject: string, text: string) {
  const result = await deliverMail({
    to,
    subject: `engineerit.ai — ${subject}`,
    text,
    html: `<p>${escapeHtml(text)}</p>`,
  });
  return result.sent || result.sink === "log" || result.sink === "mailpit";
}

export function periodLengthDays(interval: BillingInterval) {
  return periodDays(interval);
}

export function isPlanLabel(plan: string): plan is PlanId {
  return plan in PLAN_LABELS;
}
