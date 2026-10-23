import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingInterval } from "@/lib/plans";
import { mapPromoRow } from "@/lib/promo";
import { mentionsColumn, missingPromoSchema } from "@/lib/promoSchema";
import type { CheckoutPricePatch, PromoCheckoutRow, PromoDb, ReserveInput } from "@/lib/promoCheckout";

function intervalOf(value: string): BillingInterval {
  return value === "year" ? "year" : "month";
}

function num(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function raise(error: { code?: string; message?: string }): never {
  const err = new Error(error.message || "Database error") as Error & { code?: string };
  err.code = error.code;
  throw err;
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
      if (error) raise(error);
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
      if (error) raise(error);
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
      if (error) raise(error);
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
      if (error) raise(error);
      return count || 0;
    },
    async hasOpenSubscription(userId) {
      const { data, error } = await admin
        .from("billing_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .in("status", ["active", "past_due"])
        .limit(1);
      if (error) raise(error);
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
      if (invoices.error) raise(invoices.error);
      if (subs.error) raise(subs.error);
      return Boolean((invoices.data && invoices.data.length > 0) || (subs.data && subs.data.length > 0));
    },
    async releaseCheckout(checkoutId) {
      const { error } = await admin
        .from("promo_redemptions")
        .update({ status: "released" })
        .eq("checkout_id", checkoutId)
        .eq("status", "reserved");
      if (error) raise(error);
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
        raise(error);
      }
      return { ok: true };
    },
    async writeCheckout(id, patch: CheckoutPricePatch) {
      const base = {
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
      };
      const withFlag = { ...base, promo_requires_student: Boolean(patch.promoRequiresStudent) };
      let result = await admin.from("moyasar_invoices").update(withFlag).eq("id", id).eq("status", "pending").select("id");
      if (result.error && mentionsColumn(result.error, "promo_requires_student") && !patch.promoRequiresStudent) {
        result = await admin.from("moyasar_invoices").update(base).eq("id", id).eq("status", "pending").select("id");
      }
      if (result.error) raise(result.error);
      return Boolean(result.data && result.data.length > 0);
    },
    async studentVerifiedUntil(userId) {
      const { data, error } = await admin
        .from("student_status")
        .select("verified_until")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        if (missingPromoSchema(error)) return null;
        raise(error);
      }
      return data?.verified_until ? String(data.verified_until) : null;
    },
  };
}

export async function markPromoPaid(admin: SupabaseClient, checkoutId: string) {
  const { error } = await admin
    .from("promo_redemptions")
    .update({ status: "paid" })
    .eq("checkout_id", checkoutId)
    .eq("status", "reserved");
  if (error && !missingPromoSchema(error)) console.error("promo redemption", error.message);
}

export function promoPurchaseFields(row: {
  promo_code_id?: string | null;
  promo_code?: string | null;
  promo_cycles?: number | null;
  promo_discount_type?: string | null;
  promo_percent_off?: number | null;
  promo_amount_off_sar?: number | null;
  promo_requires_student?: boolean | null;
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
    ...("promo_requires_student" in row ? { requiresStudent: Boolean(row.promo_requires_student) } : {}),
  };
}
