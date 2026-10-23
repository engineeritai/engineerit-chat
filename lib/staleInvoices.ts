import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchMoyasarPayment,
  findMoyasarPaymentsForCheckout,
  type RemotePayment,
} from "@/lib/moyasar";
import { confirmCheckout, paymentBelongsToCheckout, type CheckoutRow } from "@/lib/settlePayment";

export const STALE_PENDING_MS = 3 * 24 * 60 * 60 * 1000;

export type StaleInvoiceAction = "settle" | "cancel" | "keep";

/**
 * Cancel only after Moyasar has been asked. A paid payment is never cancelled:
 * a matching paid payment is settled, and a paid payment we cannot safely apply is kept.
 */
export function chooseStaleInvoiceAction(
  payments: RemotePayment[],
  row: { id: string; amount_halalas: number }
): StaleInvoiceAction {
  const own = payments.filter((payment) => payment.metadata?.checkout_id === row.id);
  if (own.some((payment) => payment.status === "paid" && paymentBelongsToCheckout(payment, row))) {
    return "settle";
  }
  if (own.some((payment) => payment.status === "paid")) return "keep";
  if (payments.some((payment) => payment.status === "paid" && !payment.metadata?.checkout_id)) return "keep";
  return "cancel";
}

const COLUMNS =
  "id, invoice_id, payment_id, plan, billing_interval, amount_sar, amount_halalas, seat_limit, extra_seats, customer_email, user_id, lead_id, company, status, activated_at, receipt_sent_at, period_end, purpose, locale";

export async function cancelStalePendingInvoices(admin: SupabaseClient, now = new Date()) {
  const secret = process.env.MOYASAR_SECRET_KEY;
  if (!secret) throw new Error("MOYASAR_SECRET_KEY is not set in environment.");
  const cutoff = new Date(now.getTime() - STALE_PENDING_MS).toISOString();
  const { data, error } = await admin
    .from("moyasar_invoices")
    .select(COLUMNS)
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .limit(40);
  if (error) throw new Error(error.message);

  const results: { id: string; action: string }[] = [];
  for (const raw of data || []) {
    const row = raw as CheckoutRow;
    try {
      const payments = await paymentsForCheckout(secret, row);
      const action = chooseStaleInvoiceAction(payments, row);
      if (action === "settle") {
        const paid = payments.find(
          (payment) => payment.status === "paid" && paymentBelongsToCheckout(payment, row)
        );
        const settled = await confirmCheckout(admin, row, paid?.id || row.payment_id);
        results.push({ id: row.id, action: settled.ok ? "settled" : "kept" });
        continue;
      }
      if (action === "keep") {
        results.push({ id: row.id, action: "kept" });
        continue;
      }
      const { error: cancelErr } = await admin
        .from("moyasar_invoices")
        .update({ status: "cancelled" })
        .eq("id", row.id)
        .eq("status", "pending")
        .is("activated_at", null);
      if (cancelErr) throw new Error(cancelErr.message);
      results.push({ id: row.id, action: "cancelled" });
    } catch (err) {
      console.error("stale invoice left pending", row.id, err);
      results.push({ id: row.id, action: "kept" });
    }
  }
  return results;
}

async function paymentsForCheckout(secret: string, row: CheckoutRow) {
  const found: RemotePayment[] = [];
  if (row.payment_id) {
    found.push(await fetchMoyasarPayment(secret, row.payment_id));
  }
  const listed = await findMoyasarPaymentsForCheckout(secret, row.id);
  for (const payment of listed) {
    if (!found.some((item) => item.id && item.id === payment.id)) found.push(payment);
  }
  return found;
}
