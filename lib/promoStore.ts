import type { SupabaseClient } from "@supabase/supabase-js";
import {
  cycleCharge,
  evaluatePromo,
  halalasToSar,
  isPromoCodeShape,
  normalizePromoCode,
  payableIsChargeable,
  pricedCheckout,
  termsFromSnapshot,
  type PromoContext,
  type PromoRejectReason,
  type StoredPromo,
} from "@/lib/promoCodes";
import type { BillingInterval } from "@/lib/plans";

export const INVOICE_PROMO_FIELDS =
  "list_amount_sar, list_amount_halalas, discount_sar, discount_halalas, promo_code_id, promo_code, promo_cycles, discount_kind, discount_percent, discount_amount_off_sar";

type InvoiceRow = {
  id: string;
  user_id: string | null;
  customer_email: string | null;
  plan: string;
  billing_interval: string;
  amount_sar: number | string;
  amount_halalas: number;
  list_amount_sar?: number | string | null;
  list_amount_halalas?: number | null;
  status: string;
  promo_code_id?: string | null;
};

export type PromoQuote = {
  amount_sar: number;
  amount_halalas: number;
  list_amount_sar: number;
  list_amount_halalas: number;
  discount_sar: number;
  discount_halalas: number;
  promo_code: string | null;
  promo_cycles: number | null;
  free: boolean;
};

function mapPromo(row: Record<string, unknown>): StoredPromo {
  const kind = row.kind;
  return {
    id: String(row.id),
    code: String(row.code),
    status: row.status === "disabled" ? "disabled" : "active",
    kind: kind === "fixed" || kind === "free_months" ? kind : "percent",
    percentOff: row.percent_off === null || row.percent_off === undefined ? null : Number(row.percent_off),
    amountOffSar: row.amount_off_sar === null || row.amount_off_sar === undefined ? null : Number(row.amount_off_sar),
    freeMonths: row.free_months === null || row.free_months === undefined ? null : Number(row.free_months),
    plans: Array.isArray(row.plans) ? row.plans.map(String) : [],
    intervals: Array.isArray(row.intervals) ? row.intervals.map(String) : [],
    cycleCount: Number(row.cycle_count) || 1,
    startsAt: row.starts_at ? String(row.starts_at) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    maxUses: row.max_uses === null || row.max_uses === undefined ? null : Number(row.max_uses),
    onePerUser: row.one_per_user !== false,
    audience:
      row.audience === "email_domain" || row.audience === "lapsed" || row.audience === "user"
        ? row.audience
        : "any",
    emailDomains: Array.isArray(row.email_domains) ? row.email_domains.map(String) : [],
    restrictedUserId: row.restricted_user_id ? String(row.restricted_user_id) : null,
  };
}

function listHalalas(invoice: InvoiceRow) {
  if (invoice.list_amount_halalas !== null && invoice.list_amount_halalas !== undefined) {
    return Number(invoice.list_amount_halalas);
  }
  return Number(invoice.amount_halalas);
}

export function quoteFromInvoice(invoice: {
  amount_sar: number | string;
  amount_halalas: number;
  list_amount_sar?: number | string | null;
  list_amount_halalas?: number | null;
  discount_sar?: number | string | null;
  discount_halalas?: number | null;
  promo_code?: string | null;
  promo_cycles?: number | null;
}): PromoQuote {
  const payableHalalas = Number(invoice.amount_halalas);
  const list = invoice.list_amount_halalas ?? payableHalalas;
  const discount = invoice.discount_halalas ?? Math.max(0, Number(list) - payableHalalas);
  return {
    amount_sar: Number(invoice.amount_sar),
    amount_halalas: payableHalalas,
    list_amount_sar: Number(invoice.list_amount_sar ?? invoice.amount_sar),
    list_amount_halalas: Number(list),
    discount_sar: Number(invoice.discount_sar ?? halalasToSar(discount)),
    discount_halalas: Number(discount),
    promo_code: invoice.promo_code || null,
    promo_cycles: invoice.promo_cycles ?? null,
    free: payableHalalas === 0,
  };
}

async function userIsLapsed(admin: SupabaseClient, userId: string) {
  const { data: open } = await admin
    .from("billing_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "past_due"])
    .limit(1)
    .maybeSingle();
  if (open?.id) return false;
  const { data: paid } = await admin
    .from("moyasar_invoices")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();
  if (paid?.id) return true;
  const { data: ended } = await admin
    .from("billing_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["canceled", "expired"])
    .limit(1)
    .maybeSingle();
  return Boolean(ended?.id);
}

async function usageFor(admin: SupabaseClient, promoId: string, userId: string, invoiceId: string) {
  const [{ data: own }, { count }] = await Promise.all([
    admin
      .from("promo_redemptions")
      .select("status")
      .eq("promo_code_id", promoId)
      .eq("user_id", userId)
      .eq("status", "redeemed")
      .limit(1),
    admin
      .from("promo_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("promo_code_id", promoId)
      .in("status", ["reserved", "redeemed"])
      .neq("invoice_id", invoiceId),
  ]);
  return {
    redeemedByUser: Boolean(own && own.length > 0),
    otherUses: count || 0,
  };
}

export async function applyPromoCode(
  admin: SupabaseClient,
  args: {
    invoice: InvoiceRow;
    code: string;
    claimedHalalas?: number | null;
    now?: Date;
  }
): Promise<{ ok: true; quote: PromoQuote } | { ok: false; reason: PromoRejectReason }> {
  const invoice = args.invoice;
  if (!invoice.user_id) return { ok: false, reason: "wrong_user" };
  if (invoice.status === "paid") return { ok: false, reason: "already_used" };
  const code = normalizePromoCode(args.code);
  if (!code) return { ok: false, reason: "empty" };
  if (!isPromoCodeShape(code)) return { ok: false, reason: "not_found" };

  const { data: row, error } = await admin.from("promo_codes").select("*").eq("code", code).maybeSingle();
  if (error) throw new Error(error.message);
  const promo = row ? mapPromo(row as Record<string, unknown>) : null;
  const now = args.now || new Date();
  const interval: BillingInterval = invoice.billing_interval === "year" ? "year" : "month";
  const lapsed = promo?.audience === "lapsed" ? await userIsLapsed(admin, invoice.user_id) : false;
  const usage = promo ? await usageFor(admin, promo.id, invoice.user_id, invoice.id) : { redeemedByUser: false, otherUses: 0 };
  const context: PromoContext = {
    userId: invoice.user_id,
    email: invoice.customer_email,
    plan: invoice.plan,
    interval,
    now,
    lapsed,
    redeemedByUser: usage.redeemedByUser,
    otherUses: usage.otherUses,
  };
  const decision = evaluatePromo(promo, context);
  if (!decision.ok || !promo) return { ok: false, reason: decision.ok ? "not_found" : decision.reason };

  const priced = pricedCheckout({
    listHalalas: listHalalas(invoice),
    claimedHalalas: args.claimedHalalas,
    terms: promo,
  });
  if (!payableIsChargeable(priced.payableHalalas)) return { ok: false, reason: "below_minimum" };

  const { data: reserved, error: reserveErr } = await admin.rpc("reserve_promo_code", {
    p_code_id: promo.id,
    p_user_id: invoice.user_id,
    p_email: invoice.customer_email,
    p_invoice_id: invoice.id,
  });
  if (reserveErr) throw new Error(reserveErr.message);
  if (reserved !== "ok") {
    const reason = String(reserved || "maxed");
    if (
      reason === "disabled" ||
      reason === "expired" ||
      reason === "not_started" ||
      reason === "already_used" ||
      reason === "maxed" ||
      reason === "not_found"
    ) {
      return { ok: false, reason };
    }
    return { ok: false, reason: "maxed" };
  }

  const quote: PromoQuote = {
    amount_sar: halalasToSar(priced.payableHalalas),
    amount_halalas: priced.payableHalalas,
    list_amount_sar: halalasToSar(priced.listHalalas),
    list_amount_halalas: priced.listHalalas,
    discount_sar: halalasToSar(priced.discountHalalas),
    discount_halalas: priced.discountHalalas,
    promo_code: promo.code,
    promo_cycles: promo.cycleCount,
    free: priced.free,
  };
  const { error: updateErr } = await admin
    .from("moyasar_invoices")
    .update({
      amount_sar: quote.amount_sar,
      amount_halalas: quote.amount_halalas,
      list_amount_sar: quote.list_amount_sar,
      list_amount_halalas: quote.list_amount_halalas,
      discount_sar: quote.discount_sar,
      discount_halalas: quote.discount_halalas,
      promo_code_id: promo.id,
      promo_code: promo.code,
      promo_cycles: promo.cycleCount,
      discount_kind: promo.kind,
      discount_percent: promo.percentOff,
      discount_amount_off_sar: promo.amountOffSar,
    })
    .eq("id", invoice.id)
    .eq("status", "pending");
  if (updateErr) throw new Error(updateErr.message);
  return { ok: true, quote };
}

export async function removePromoCode(admin: SupabaseClient, invoice: InvoiceRow) {
  if (!invoice.user_id || invoice.status === "paid") return { ok: false as const, reason: "already_used" as const };
  const list = listHalalas(invoice);
  const { error } = await admin
    .from("moyasar_invoices")
    .update({
      amount_sar: halalasToSar(list),
      amount_halalas: list,
      discount_sar: 0,
      discount_halalas: 0,
      promo_code_id: null,
      promo_code: null,
      promo_cycles: null,
      discount_kind: null,
      discount_percent: null,
      discount_amount_off_sar: null,
    })
    .eq("id", invoice.id)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  const { error: releaseErr } = await admin.rpc("release_promo_reservation", {
    p_invoice_id: invoice.id,
    p_user_id: invoice.user_id,
  });
  if (releaseErr) throw new Error(releaseErr.message);
  return {
    ok: true as const,
    quote: quoteFromInvoice({
      amount_sar: halalasToSar(list),
      amount_halalas: list,
      list_amount_sar: halalasToSar(list),
      list_amount_halalas: list,
      discount_sar: 0,
      discount_halalas: 0,
      promo_code: null,
      promo_cycles: null,
    }),
  };
}

export function billingPromoFromInvoice(row: {
  amount_sar: number | string;
  amount_halalas: number;
  list_amount_halalas?: number | null;
  promo_code_id?: string | null;
  promo_code?: string | null;
  promo_cycles?: number | null;
  discount_kind?: string | null;
  discount_percent?: number | string | null;
  discount_amount_off_sar?: number | string | null;
}) {
  const chargedHalalas = Number(row.amount_halalas);
  const terms = termsFromSnapshot(row);
  const cycles = Number(row.promo_cycles || 0);
  if (!row.promo_code_id || !terms || cycles < 1) {
    return {
      billingAmountSar: Number(row.amount_sar),
      billingAmountHalalas: chargedHalalas,
      promo: null as null,
    };
  }
  const list = Number(row.list_amount_halalas ?? chargedHalalas);
  const cycle = cycleCharge(list, cycles, terms);
  return {
    billingAmountSar: halalasToSar(cycle.upcomingHalalas),
    billingAmountHalalas: cycle.upcomingHalalas,
    promo: {
      promoCodeId: row.promo_code_id,
      promoCode: row.promo_code || null,
      kind: terms.kind,
      percentOff: terms.percentOff,
      amountOffSar: terms.amountOffSar,
      cyclesRemaining: cycle.cyclesRemainingAfter,
    },
  };
}
