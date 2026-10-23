import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchMoyasarPayment,
  listMoyasarPaymentsByCheckout,
  type RemotePayment,
} from "@/lib/moyasar";
import { confirmCheckout, type CheckoutRow } from "@/lib/settlePayment";

/** Pending checkouts older than this are cancelled only after Moyasar is asked. */
export const STALE_PENDING_MS = 3 * 24 * 60 * 60 * 1000;

export type PaymentLookup = "unavailable" | "paid" | "open" | "unpaid";

export function staleCheckoutAction(ageMs: number, lookup: PaymentLookup): "keep" | "settle" | "cancel" {
  if (ageMs < STALE_PENDING_MS) return "keep";
  if (lookup === "unavailable" || lookup === "open") return "keep";
  if (lookup === "paid") return "settle";
  return "cancel";
}

export function classifyCheckoutPayments(
  checkoutId: string,
  expectedHalalas: number,
  payments: RemotePayment[]
): PaymentLookup {
  let open = false;
  for (const payment of payments) {
    if (payment.metadata?.checkout_id && payment.metadata.checkout_id !== checkoutId) continue;
    const status = (payment.status || "").toLowerCase();
    if (status === "paid" && payment.amount === expectedHalalas && (payment.currency || "").toUpperCase() === "SAR") {
      return "paid";
    }
    if (status === "initiated" || status === "authorized") open = true;
  }
  return open ? "open" : "unpaid";
}

export function paidPaymentForCheckout(
  checkoutId: string,
  expectedHalalas: number,
  payments: RemotePayment[]
) {
  return (
    payments.find((payment) => {
      if (payment.metadata?.checkout_id && payment.metadata.checkout_id !== checkoutId) return false;
      return (
        payment.status === "paid" &&
        payment.amount === expectedHalalas &&
        (payment.currency || "").toUpperCase() === "SAR"
      );
    }) || null
  );
}

type StaleRow = CheckoutRow & { created_at?: string | null };

async function lookupPayments(secret: string, row: StaleRow): Promise<{ lookup: PaymentLookup; payment: RemotePayment | null }> {
  const expected = Number(row.amount_halalas);
  try {
    const listed = await listMoyasarPaymentsByCheckout(secret, row.id);
    const fromList = classifyCheckoutPayments(row.id, expected, listed);
    const paid = paidPaymentForCheckout(row.id, expected, listed);
    if (fromList === "paid" && paid) return { lookup: "paid", payment: paid };
    if (row.payment_id) {
      const one = await fetchMoyasarPayment(secret, row.payment_id);
      const fromId = classifyCheckoutPayments(row.id, expected, [one]);
      if (fromId === "paid") return { lookup: "paid", payment: one };
      if (fromId === "open" || fromList === "open") return { lookup: "open", payment: null };
      return { lookup: "unpaid", payment: null };
    }
    return { lookup: fromList, payment: null };
  } catch {
    if (!row.payment_id) return { lookup: "unavailable", payment: null };
    try {
      const one = await fetchMoyasarPayment(secret, row.payment_id);
      const fromId = classifyCheckoutPayments(row.id, expected, [one]);
      if (fromId === "paid") return { lookup: "paid", payment: one };
      if (fromId === "open") return { lookup: "open", payment: null };
      return { lookup: "unpaid", payment: null };
    } catch {
      return { lookup: "unavailable", payment: null };
    }
  }
}

export async function expireStaleCheckouts(admin: SupabaseClient, now = new Date()) {
  const cutoff = new Date(now.getTime() - STALE_PENDING_MS).toISOString();
  const { data, error } = await admin
    .from("moyasar_invoices")
    .select(
      "id, invoice_id, payment_id, plan, billing_interval, amount_sar, amount_halalas, seat_limit, extra_seats, customer_email, user_id, lead_id, company, status, activated_at, receipt_sent_at, period_end, purpose, locale, created_at"
    )
    .eq("status", "pending")
    .is("activated_at", null)
    .lt("created_at", cutoff)
    .limit(50);

  if (error) throw new Error(error.message);
  const secret = process.env.MOYASAR_SECRET_KEY || "";
  const results: { id: string; action: "keep" | "settle" | "cancel" }[] = [];

  for (const raw of data || []) {
    const row = raw as StaleRow;
    const created = row.created_at ? new Date(row.created_at).getTime() : now.getTime();
    const ageMs = now.getTime() - created;
    if (!secret) {
      results.push({ id: row.id, action: "keep" });
      continue;
    }
    const found = await lookupPayments(secret, row);
    const action = staleCheckoutAction(ageMs, found.lookup);
    if (action === "settle" && found.payment) {
      const settled = await confirmCheckout(admin, { ...row, payment_id: found.payment.id || row.payment_id }, found.payment.id);
      results.push({ id: row.id, action: settled.ok ? "settle" : "keep" });
      continue;
    }
    if (action === "cancel") {
      const { error: cancelError } = await admin
        .from("moyasar_invoices")
        .update({ status: "cancelled" })
        .eq("id", row.id)
        .eq("status", "pending")
        .is("activated_at", null);
      results.push({ id: row.id, action: cancelError ? "keep" : "cancel" });
      continue;
    }
    results.push({ id: row.id, action: "keep" });
  }
  return results;
}
