import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addDays,
  afterChargeFailure,
  decideRenewal,
  GRACE_DAYS,
  nextPeriodEnd,
  renewalChargeHalalas,
  type RenewalDecision,
} from "@/lib/billingCycle";
import { appBaseUrl, escapeHtml, getMailer } from "@/lib/mail";
import { createMoyasarTokenPayment, fetchMoyasarPayment } from "@/lib/moyasar";
import { PLAN_LABELS, periodDays, quoteSelfServe, type BillingInterval, type PlanId, type SelfServePlanId } from "@/lib/plans";
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
};

type ChargeResult = {
  paid: boolean;
  pending?: boolean;
  paymentId?: string | null;
  error?: string;
};

export async function runDueRenewals(admin: SupabaseClient, now = new Date()) {
  const { data, error } = await admin
    .from("billing_subscriptions")
    .select(
      "id, user_id, customer_email, plan, billing_interval, extra_seats, seat_limit, amount_halalas, status, current_period_end, cancel_at_period_end, saved_card_id, team_id, credit_halalas, failure_count"
    )
    .in("status", ["active", "past_due"])
    .lte("current_period_end", now.toISOString())
    .limit(100);

  if (error) throw new Error(error.message);

  const results: { id: string; action: string }[] = [];
  for (const row of data || []) {
    const sub = row as OpenSubscription;
    const decision = decideRenewal({
      now,
      subscriptionId: sub.id,
      periodEnd: new Date(sub.current_period_end),
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      failureCount: sub.failure_count,
    });
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
      await sendBillingNote(
        sub.customer_email,
        decision.action === "expire" ? "Subscription ended" : "Subscription moved to Assistant Engineer",
        decision.action === "expire"
          ? "The paid period ended after you cancelled. The account is now on Assistant Engineer."
          : "We could not renew the saved card after the retries on day 1, day 3, and day 7. The account is now on Assistant Engineer."
      );
    }
    return decision.action;
  }

  const quote = quoteSelfServe(sub.plan, sub.billing_interval, sub.extra_seats);
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
      await sendReceipt(sub.customer_email, {
        plan: sub.plan,
        amountSar: priced.chargeHalalas / 100,
        interval: sub.billing_interval,
        seats: sub.seat_limit,
        periodEnd: periodEnd.toISOString(),
      });
    }
    return "renewed";
  }

  const next = afterChargeFailure(sub.failure_count);
  if (next.status === "downgrade") {
    await endAccess(admin, sub, "expired");
    if (sub.customer_email) {
      await sendBillingNote(
        sub.customer_email,
        "Subscription moved to Assistant Engineer",
        "The last renewal retry failed. The account is now on Assistant Engineer. You can buy a plan again from the pricing page."
      );
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
    const base = appBaseUrl();
    await sendBillingNote(
      sub.customer_email,
      "Card charge failed",
      `We could not renew ${PLAN_LABELS[sub.plan]}. Update the card at ${base}/account/billing. The next retry is ${retryAt.toLocaleDateString("en-GB")}. Access stays on until the day-7 retry fails.`
    );
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
        chargeOutcome(existingPayment.status, existingPayment.amount, args.amountHalalas),
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
      chargeOutcome(payment.status, payment.amount, args.amountHalalas),
      payment.id || null,
      payment.source?.message || payment.message || null
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Charge failed.";
    return finishAttempt(admin, attempt.id, "failed", null, message);
  }
}

function chargeOutcome(
  status: string | undefined,
  amount: number | undefined,
  expected: number
): "paid" | "pending" | "failed" {
  if (status === "paid" && amount === expected) return "paid";
  if (status === "initiated" || status === "authorized") return "pending";
  return "failed";
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

async function extendSubscription(
  admin: SupabaseClient,
  sub: OpenSubscription,
  now: Date,
  creditRemaining: number
) {
  const quote = quoteSelfServe(sub.plan, sub.billing_interval, sub.extra_seats);
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

async function sendBillingNote(to: string, subject: string, text: string) {
  const mailer = getMailer();
  if (!mailer) return false;
  await mailer.transporter.sendMail({
    from: `"engineerit.ai" <${mailer.from}>`,
    to,
    subject: `engineerit.ai — ${subject}`,
    text,
    html: `<p>${escapeHtml(text)}</p>`,
  });
  return true;
}

export function periodLengthDays(interval: BillingInterval) {
  return periodDays(interval);
}

export function isPlanLabel(plan: string): plan is PlanId {
  return plan in PLAN_LABELS;
}
