import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingInterval, SelfServePlanId } from "@/lib/plans";
import { lastFour, type RemotePayment } from "@/lib/moyasar";

export async function syncBillingSubscription(
  admin: SupabaseClient,
  args: {
    userId: string;
    email: string | null;
    plan: SelfServePlanId;
    interval: BillingInterval;
    extraSeats: number;
    seatLimit: number;
    amountSar: number;
    amountHalalas: number;
    periodStart: string;
    periodEnd: string;
    teamId?: string | null;
    cancelAtPeriodEnd?: boolean;
    locale?: string | null;
  }
) {
  const nowIso = new Date().toISOString();
  const { data: existing, error: readErr } = await admin
    .from("billing_subscriptions")
    .select("id")
    .eq("user_id", args.userId)
    .in("status", ["active", "past_due"])
    .maybeSingle();

  if (readErr) throw new Error(readErr.message || "Could not read the billing subscription.");

  const payload = {
    customer_email: args.email,
    plan: args.plan,
    billing_interval: args.interval,
    extra_seats: args.extraSeats,
    seat_limit: args.seatLimit,
    amount_sar: args.amountSar,
    amount_halalas: args.amountHalalas,
    status: "active",
    current_period_start: args.periodStart,
    current_period_end: args.periodEnd,
    cancel_at_period_end: args.cancelAtPeriodEnd === true,
    canceled_at: args.cancelAtPeriodEnd === true ? nowIso : null,
    team_id: args.teamId ?? null,
    failure_count: 0,
    next_retry_at: null,
    updated_at: nowIso,
    ...(args.locale === "ar" || args.locale === "en" ? { locale: args.locale } : {}),
  };

  if (existing?.id) {
    const { error } = await admin.from("billing_subscriptions").update(payload).eq("id", existing.id);
    if (error) throw new Error(error.message || "Could not update the billing subscription.");
    return existing.id as string;
  }

  const { data, error } = await admin
    .from("billing_subscriptions")
    .insert({ ...payload, user_id: args.userId, created_at: nowIso })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Could not start the billing subscription.");
  return data.id as string;
}

/** Token, brand, and last four only. The PAN and CVC are never fields on this row. */
export function savedCardRecord(
  userId: string,
  payment: RemotePayment,
  nowIso = new Date().toISOString()
) {
  const token = payment.source?.token;
  if (!token || !token.startsWith("token_")) return null;
  return {
    user_id: userId,
    moyasar_token: token,
    brand: payment.source?.company || null,
    last_four: lastFour(payment.source?.number),
    holder_name: payment.source?.name || null,
    status: payment.status === "paid" ? "active" : "initiated",
    consent_at: nowIso,
    updated_at: nowIso,
  };
}

export async function saveCardFromPayment(
  admin: SupabaseClient,
  args: { userId: string; payment: RemotePayment; billingSubscriptionId?: string | null }
) {
  const nowIso = new Date().toISOString();
  const row = savedCardRecord(args.userId, args.payment, nowIso);
  if (!row) return null;

  const { data, error } = await admin
    .from("saved_cards")
    .upsert(row, { onConflict: "moyasar_token" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Could not save the card token.");

  if (args.billingSubscriptionId) {
    await admin
      .from("billing_subscriptions")
      .update({ saved_card_id: data.id, updated_at: nowIso })
      .eq("id", args.billingSubscriptionId);
  }
  return data.id as string;
}
