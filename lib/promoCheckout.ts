import {
  evaluatePromo,
  normalizePromoCode,
  type PromoCode,
  type PromoDecision,
  type PromoReason,
} from "@/lib/promo";
import type { BillingInterval } from "@/lib/plans";

export type PromoCheckoutRow = {
  id: string;
  userId: string;
  email: string;
  plan: string;
  interval: BillingInterval;
  status: string;
  amountHalalas: number;
  listHalalas: number | null;
  promoCodeId: string | null;
};

export type CheckoutPricePatch = {
  amountSar: number;
  amountHalalas: number;
  promoCodeId: string | null;
  promoCode: string | null;
  listAmountSar: number | null;
  listAmountHalalas: number | null;
  discountSar: number | null;
  discountHalalas: number | null;
  promoCycles: number | null;
  promoDiscountType: string | null;
  promoPercentOff: number | null;
  promoAmountOffSar: number | null;
};

export type ReserveInput = {
  code: PromoCode;
  checkout: PromoCheckoutRow;
  quote: Extract<PromoDecision, { ok: true }>;
};

export type PromoDb = {
  loadCheckout(id: string): Promise<PromoCheckoutRow | null>;
  loadCode(normalized: string): Promise<PromoCode | null>;
  countUses(codeId: string, exceptCheckoutId: string): Promise<number>;
  countUserUses(codeId: string, userId: string, exceptCheckoutId: string): Promise<number>;
  hasOpenSubscription(userId: string): Promise<boolean>;
  hasPaidBefore(userId: string): Promise<boolean>;
  releaseCheckout(checkoutId: string): Promise<void>;
  reserve(input: ReserveInput): Promise<{ ok: true } | { ok: false; reason: "already_used" | "max_uses" }>;
  writeCheckout(id: string, patch: CheckoutPricePatch): Promise<boolean>;
};

export type ApplyInput = {
  checkoutId: string;
  rawCode: string;
  userId: string;
  clientAmountHalalas?: unknown;
  now?: Date;
};

export type ApplyResult =
  | {
      ok: true;
      applied: boolean;
      reason?: undefined;
      code: string | null;
      listHalalas: number;
      discountHalalas: number;
      chargedHalalas: number;
      cycles: number;
      free: boolean;
      listSar: number;
      discountSar: number;
      chargedSar: number;
    }
  | { ok: false; reason: PromoReason; applied?: false };

function listHalalasOf(row: PromoCheckoutRow) {
  if (row.promoCodeId && row.listHalalas && row.listHalalas > 0) return row.listHalalas;
  return row.amountHalalas;
}

function clearedPatch(listHalalas: number): CheckoutPricePatch {
  const amountSar = Math.round(listHalalas) / 100;
  return {
    amountSar,
    amountHalalas: listHalalas,
    promoCodeId: null,
    promoCode: null,
    listAmountSar: null,
    listAmountHalalas: null,
    discountSar: null,
    discountHalalas: null,
    promoCycles: null,
    promoDiscountType: null,
    promoPercentOff: null,
    promoAmountOffSar: null,
  };
}

function appliedPatch(code: PromoCode, quote: Extract<PromoDecision, { ok: true }>): CheckoutPricePatch {
  return {
    amountSar: quote.chargedSar,
    amountHalalas: quote.chargedHalalas,
    promoCodeId: code.id,
    promoCode: code.code,
    listAmountSar: quote.listSar,
    listAmountHalalas: quote.listHalalas,
    discountSar: quote.discountSar,
    discountHalalas: quote.discountHalalas,
    promoCycles: quote.cycles,
    promoDiscountType: code.discountType,
    promoPercentOff: code.percentOff,
    promoAmountOffSar: code.amountOffSar,
  };
}

export async function applyPromo(db: PromoDb, input: ApplyInput): Promise<ApplyResult> {
  void input.clientAmountHalalas;
  const checkout = await db.loadCheckout(input.checkoutId);
  if (!checkout) return { ok: false, reason: "missing" };
  if (checkout.userId !== input.userId) return { ok: false, reason: "wrong_user" };
  if (checkout.status !== "pending") return { ok: false, reason: "closed" };

  const listHalalas = listHalalasOf(checkout);
  const normalized = normalizePromoCode(input.rawCode || "");
  if (!normalized) {
    await db.releaseCheckout(checkout.id);
    const wrote = await db.writeCheckout(checkout.id, clearedPatch(listHalalas));
    if (!wrote) return { ok: false, reason: "closed" };
    return {
      ok: true,
      applied: false,
      code: null,
      listHalalas,
      discountHalalas: 0,
      chargedHalalas: listHalalas,
      cycles: 0,
      free: false,
      listSar: listHalalas / 100,
      discountSar: 0,
      chargedSar: listHalalas / 100,
    };
  }

  const code = await db.loadCode(normalized);
  const [uses, userUses, hasOpenSubscription, hasPaidBefore] = code
    ? await Promise.all([
        db.countUses(code.id, checkout.id),
        db.countUserUses(code.id, checkout.userId, checkout.id),
        db.hasOpenSubscription(checkout.userId),
        db.hasPaidBefore(checkout.userId),
      ])
    : [0, 0, false, false];

  const decision = evaluatePromo(code, {
    now: input.now || new Date(),
    userId: checkout.userId,
    email: checkout.email,
    planId: checkout.plan,
    interval: checkout.interval,
    listHalalas,
    uses,
    userUses,
    hasOpenSubscription,
    hasPaidBefore,
  });
  if (!decision.ok || !code) return decision.ok ? { ok: false, reason: "invalid" } : decision;

  await db.releaseCheckout(checkout.id);
  const reserved = await db.reserve({ code, checkout, quote: decision });
  if (!reserved.ok) return { ok: false, reason: reserved.reason };
  const wrote = await db.writeCheckout(checkout.id, appliedPatch(code, decision));
  if (!wrote) {
    await db.releaseCheckout(checkout.id);
    return { ok: false, reason: "closed" };
  }
  return { ...decision, applied: true, code: code.code };
}

export function renewalCyclesAfterCheckout(cycles: number | null | undefined) {
  return Math.max(0, Math.floor(Number(cycles) || 0) - 1);
}
