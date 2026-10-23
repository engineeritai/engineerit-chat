import type { SupabaseClient } from "@supabase/supabase-js";
import { periodDays, type BillingInterval } from "@/lib/plans";
import { markPromoPaid, promoPurchaseFields } from "@/lib/promoDb";
import { canRedeemFree } from "@/lib/promo";
import { recordPlanPurchase } from "@/lib/recordPlan";
import { sendReceipt } from "@/lib/receipt";
import type { CheckoutRow } from "@/lib/settlePayment";

function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function fulfillFreeCheckout(admin: SupabaseClient, row: CheckoutRow) {
  if (
    !canRedeemFree({
      status: row.status,
      amountHalalas: Number(row.amount_halalas),
      promoCodeId: row.promo_code_id || null,
    })
  ) {
    return { ok: false as const, reason: "not_free" as const };
  }
  if (!row.user_id) return { ok: false as const, reason: "missing_user" as const };
  const plan =
    row.plan === "engineer" ||
    row.plan === "professional" ||
    row.plan === "consultant" ||
    row.plan === "team" ||
    row.plan === "enterprise"
      ? row.plan
      : null;
  if (!plan) return { ok: false as const, reason: "plan" as const };

  const nowIso = new Date().toISOString();
  const { data: claimed, error: claimErr } = await admin
    .from("moyasar_invoices")
    .update({ status: "paid", paid_at: nowIso, activated_at: nowIso })
    .eq("id", row.id)
    .eq("status", "pending")
    .is("activated_at", null)
    .select("id");
  if (claimErr) throw new Error(claimErr.message);
  if (!claimed || claimed.length === 0) return { ok: false as const, reason: "closed" as const };

  const interval: BillingInterval = row.billing_interval === "year" ? "year" : "month";
  try {
    const periodEnd = addDays(new Date(), periodDays(interval));
    await recordPlanPurchase(admin, {
      userId: row.user_id,
      email: row.customer_email,
      plan,
      interval,
      extraSeats: row.extra_seats || 0,
      seatLimit: row.seat_limit || undefined,
      amountSar: 0,
      periodEnd,
      locale: row.locale === "ar" ? "ar" : "en",
      source: "moyasar",
      promo: "promo_code_id" in row ? promoPurchaseFields(row) : undefined,
    });
    await admin.from("moyasar_invoices").update({ period_end: periodEnd }).eq("id", row.id);
    await markPromoPaid(admin, row.id);
    if (row.customer_email) {
      try {
        await sendReceipt(row.customer_email, {
          plan: row.plan,
          amountSar: 0,
          interval,
          seats: row.seat_limit,
          periodStart: nowIso,
          periodEnd,
          locale: row.locale === "ar" ? "ar" : "en",
          invoiceNumber: row.invoice_id || row.id,
          customerName: row.company,
          customerEmail: row.customer_email,
          issuedAt: nowIso,
        });
      } catch (err) {
        console.error("free checkout receipt", err);
      }
    }
    return { ok: true as const, periodEnd };
  } catch (err) {
    await admin
      .from("moyasar_invoices")
      .update({ status: "pending", paid_at: null, activated_at: null })
      .eq("id", row.id);
    throw err;
  }
}
