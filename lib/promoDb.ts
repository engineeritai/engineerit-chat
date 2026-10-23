import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingInterval } from "@/lib/plans";
import { mapPromoRow } from "@/lib/promo";
import type { CheckoutPricePatch, PromoCheckoutRow, PromoDb, ReserveInput } from "@/lib/promoCheckout";

function intervalOf(value: string): BillingInterval {
  return value === "year" ? "year" : "month";
}

function num(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function promoDb(admin: SupabaseClient): PromoDb {
  return {
    async loadCheckout(id) {
      const { data, error } = await admin
        .from("moyasar_invoices")
        .select(
          "id, user_id, customer_email, plan, billing_interval, status, amount_halalas, list_amount_halalas, promo_code_id"
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data?.user_id) return null;
      const row: PromoCheckoutRow = {
        id: data.id,
        userId: data.user_id,
        email: String(data.customer_email || ""),
        plan: String(data.plan || ""),
        interval: intervalOf(String(data.billing_interval || "month")),
        status: String(data.status || ""),
        amountHalalas: num(data.amount_halalas),
        listHalalas: data.list_amount_halalas === null || data.list_amount_halalas === undefined ? null : num(data.list_amount_halalas),
        promoCodeId: data.promo_code_id ? String(data.promo_code_id) : null,
      };
      return row;
    },
    async loadCode(normalized) {
      const { data, error } = await admin.from("promo_codes").select("*").eq("code", normalized).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return mapPromoRow(data as Record<string, unknown>);
    },
    async countUses(codeId, exceptCheckoutId) {
      const { count, error } = await admin
        .from("promo_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("code_id", codeId)
        .in("status", ["reserved", "paid"])
        .neq("checkout_id", exceptCheckoutId);
      if (error) throw new Error(error.message);
      return count || 0;
    },
    async countUserUses(codeId, userId, exceptCheckoutId) {
      const { count, error } = await admin
        .from("promo_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("code_id", codeId)
        .eq("user_id", userId)
        .in("status", ["reserved", "paid"])
        .neq("checkout_id", exceptCheckoutId);
      if (error) throw new Error(error.message);
      return count || 0;
    },
    async hasOpenSubscription(userId) {
      const { data, error } = await admin
        .from("billing_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .in("status", ["active", "past_due"])
        .limit(1);
      if (error) throw new Error(error.message);
      return Boolean(data && data.length > 0);
    },
    async hasPaidBefore(userId) {
      const [invoices, subs] = await Promise.all([
        admin.from("moyasar_invoices").select("id").eq("user_id", userId).eq("status", "paid").limit(1),
        admin
          .from("billing_subscriptions")
          .select("id")
          .eq("user_id", userId)
          .in("status", ["canceled", "expired", "active", "past_due"])
          .limit(1),
      ]);
      if (invoices.error) throw new Error(invoices.error.message);
      if (subs.error) throw new Error(subs.error.message);
      return Boolean((invoices.data && invoices.data.length > 0) || (subs.data && subs.data.length > 0));
    },
    async releaseCheckout(checkoutId) {
      const { error } = await admin
        .from("promo_redemptions")
        .update({ status: "released" })
        .eq("checkout_id", checkoutId)
        .eq("status", "reserved");
      if (error) throw new Error(error.message);
    },
    async reserve(input: ReserveInput) {
      const { error } = await admin.rpc("reserve_promo_use", {
        p_code_id: input.code.id,
        p_user_id: input.checkout.userId,
        p_email: input.checkout.email,
        p_checkout_id: input.checkout.id,
        p_plan: input.checkout.plan,
        p_interval: input.checkout.interval,
        p_list_sar: input.quote.listSar,
        p_discount_sar: input.quote.discountSar,
        p_charged_sar: input.quote.chargedSar,
        p_cycles: input.quote.cycles,
        p_one_per_user: input.code.onePerUser,
        p_max_uses: input.code.singleUse ? 1 : input.code.maxUses,
      });
      if (error) {
        const message = error.message || "";
        if (message.includes("already_used")) return { ok: false, reason: "already_used" };
        if (message.includes("max_uses")) return { ok: false, reason: "max_uses" };
        throw new Error(message);
      }
      return { ok: true };
    },
    async writeCheckout(id, patch: CheckoutPricePatch) {
      const { data, error } = await admin
        .from("moyasar_invoices")
        .update({
          amount_sar: patch.amountSar,
          amount_halalas: patch.amountHalalas,
          promo_code_id: patch.promoCodeId,
          promo_code: patch.promoCode,
          list_amount_sar: patch.listAmountSar,
          list_amount_halalas: patch.listAmountHalalas,
          discount_sar: patch.discountSar,
          discount_halalas: patch.discountHalalas,
          promo_cycles: patch.promoCycles,
          promo_discount_type: patch.promoDiscountType,
          promo_percent_off: patch.promoPercentOff,
          promo_amount_off_sar: patch.promoAmountOffSar,
        })
        .eq("id", id)
        .eq("status", "pending")
        .select("id");
      if (error) throw new Error(error.message);
      return Boolean(data && data.length > 0);
    },
  };
}

export async function markPromoPaid(admin: SupabaseClient, checkoutId: string) {
  const { error } = await admin
    .from("promo_redemptions")
    .update({ status: "paid" })
    .eq("checkout_id", checkoutId)
    .eq("status", "reserved");
  if (error) console.error("promo redemption", error.message);
}

export function promoPurchaseFields(row: {
  promo_code_id?: string | null;
  promo_code?: string | null;
  promo_cycles?: number | null;
  promo_discount_type?: string | null;
  promo_percent_off?: number | null;
  promo_amount_off_sar?: number | null;
}) {
  if (!row.promo_code_id) return null;
  const cycles = Math.max(0, Math.floor(Number(row.promo_cycles) || 1) - 1);
  return {
    codeId: row.promo_code_id,
    code: row.promo_code || null,
    cyclesRemaining: cycles,
    discountType: row.promo_discount_type || null,
    percentOff: row.promo_percent_off === null || row.promo_percent_off === undefined ? null : Number(row.promo_percent_off),
    amountOffSar:
      row.promo_amount_off_sar === null || row.promo_amount_off_sar === undefined ? null : Number(row.promo_amount_off_sar),
  };
}
