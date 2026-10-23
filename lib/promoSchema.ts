type SchemaError = { code?: string; message?: string } | string | null | undefined;

const PROMO_NAMES =
  /promo_|weekly_questions|question_entries|reserve_promo_use|list_amount_sar|list_amount_halalas|discount_halalas|discount_sar/;

export function missingPromoSchema(error: SchemaError) {
  const message = typeof error === "string" ? error : error?.message || "";
  const code = typeof error === "string" ? "" : error?.code || "";
  const text = message.toLowerCase();
  const promo = PROMO_NAMES.test(text);
  if (code === "42P01" || code === "42703" || code === "PGRST204" || code === "PGRST205") {
    return promo || text.includes("column") || text.includes("relation") || text.includes("schema cache");
  }
  return promo && (text.includes("does not exist") || text.includes("schema cache") || text.includes("could not find"));
}

export function promoRenewalUpdate(
  sub: { promo_cycles_remaining?: number | null; promo_discount_type?: string | null },
  cyclesRemainingAfter: number
) {
  const active = (Number(sub.promo_cycles_remaining) || 0) > 0 || Boolean(sub.promo_discount_type);
  if (!active) return {};
  if (cyclesRemainingAfter <= 0) {
    return {
      promo_cycles_remaining: 0,
      promo_discount_type: null,
      promo_percent_off: null,
      promo_amount_off_sar: null,
      promo_code_id: null,
      promo_code: null,
    };
  }
  return { promo_cycles_remaining: cyclesRemainingAfter };
}
