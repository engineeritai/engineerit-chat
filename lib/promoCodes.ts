import { MIN_CHARGE_HALALAS } from "@/lib/billingCycle";
import {
  PLAN_AMOUNTS_SAR,
  isSelfServePlan,
  type BillingInterval,
  type SelfServePlanId,
} from "@/lib/plans";

export const PROMO_KINDS = ["percent", "fixed", "free_months"] as const;
export type PromoKind = (typeof PROMO_KINDS)[number];

export const PROMO_AUDIENCES = ["any", "email_domain", "lapsed", "user"] as const;
export type PromoAudience = (typeof PROMO_AUDIENCES)[number];

export const PROMO_PLANS: SelfServePlanId[] = [
  "engineer",
  "professional",
  "consultant",
  "team",
  "enterprise",
];

export type PromoTerms = {
  kind: PromoKind;
  percentOff: number | null;
  amountOffSar: number | null;
  freeMonths: number | null;
};

export type StoredPromo = PromoTerms & {
  id: string;
  code: string;
  status: "active" | "disabled";
  plans: string[];
  intervals: string[];
  cycleCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  onePerUser: boolean;
  audience: PromoAudience;
  emailDomains: string[];
  restrictedUserId: string | null;
};

export type PromoRejectReason =
  | "empty"
  | "not_found"
  | "disabled"
  | "not_started"
  | "expired"
  | "wrong_plan"
  | "wrong_interval"
  | "wrong_domain"
  | "wrong_user"
  | "not_lapsed"
  | "already_used"
  | "maxed"
  | "below_minimum";

export type PromoContext = {
  userId: string;
  email: string | null;
  plan: string;
  interval: BillingInterval;
  now: Date;
  /** Paid before, and no active or past-due subscription. */
  lapsed: boolean;
  redeemedByUser: boolean;
  /** Reservations and redemptions on other invoices. */
  otherUses: number;
};

export type PriceBreakdown = {
  listHalalas: number;
  discountHalalas: number;
  payableHalalas: number;
  free: boolean;
};

const CODE_RE = /^[A-Z0-9-]{4,40}$/;

export function normalizePromoCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function isPromoCodeShape(code: string) {
  return CODE_RE.test(code);
}

export function halalasToSar(halalas: number) {
  return Math.round(halalas) / 100;
}

export function emailMatchesDomains(email: string | null | undefined, domains: string[]) {
  const host = (email || "").trim().toLowerCase().split("@")[1] || "";
  if (!host || host.includes(" ") || !host.includes(".")) return false;
  return domains.some((raw) => {
    const domain = raw.trim().toLowerCase().replace(/^@/, "");
    if (!domain) return false;
    if (domain.startsWith(".")) return host.endsWith(domain);
    return host === domain || host.endsWith(`.${domain}`);
  });
}

/** Discount in halalas. Never reads a client-supplied payable amount. */
export function priceWithPromo(listHalalas: number, terms: PromoTerms): PriceBreakdown {
  const list = Math.max(0, Math.round(listHalalas));
  let discount = 0;
  if (terms.kind === "percent") {
    const percent = Math.min(100, Math.max(0, Number(terms.percentOff) || 0));
    discount = Math.round((list * percent) / 100);
  } else if (terms.kind === "fixed") {
    discount = Math.round((Number(terms.amountOffSar) || 0) * 100);
  } else {
    discount = list;
  }
  discount = Math.min(list, Math.max(0, discount));
  const payable = list - discount;
  return {
    listHalalas: list,
    discountHalalas: discount,
    payableHalalas: payable,
    free: payable === 0,
  };
}

/**
 * The amount Moyasar must charge. `claimedHalalas` is ignored so a tampered
 * checkout request cannot change the charge.
 */
export function pricedCheckout(input: {
  listHalalas: number;
  claimedHalalas?: number | null;
  terms: PromoTerms | null;
}): PriceBreakdown & { claimedHalalas: number | null } {
  const priced = input.terms
    ? priceWithPromo(input.listHalalas, input.terms)
    : {
        listHalalas: Math.max(0, Math.round(input.listHalalas)),
        discountHalalas: 0,
        payableHalalas: Math.max(0, Math.round(input.listHalalas)),
        free: Math.round(input.listHalalas) === 0,
      };
  return {
    ...priced,
    claimedHalalas:
      input.claimedHalalas === null || input.claimedHalalas === undefined
        ? null
        : Math.round(Number(input.claimedHalalas)),
  };
}

export function payableIsChargeable(payableHalalas: number) {
  return payableHalalas === 0 || payableHalalas >= MIN_CHARGE_HALALAS;
}

/** A free period is activated only when the server stored a zero charge and a code. */
export function canActivateFree(amountHalalas: number, promoCodeId: string | null | undefined) {
  return amountHalalas === 0 && Boolean(promoCodeId);
}

export function evaluatePromo(
  promo: StoredPromo | null,
  context: PromoContext
): { ok: true } | { ok: false; reason: PromoRejectReason } {
  if (!promo) return { ok: false, reason: "not_found" };
  if (promo.status !== "active") return { ok: false, reason: "disabled" };
  if (promo.startsAt) {
    const start = new Date(promo.startsAt);
    if (!Number.isNaN(start.getTime()) && context.now.getTime() < start.getTime()) {
      return { ok: false, reason: "not_started" };
    }
  }
  if (promo.expiresAt) {
    const end = new Date(promo.expiresAt);
    if (!Number.isNaN(end.getTime()) && context.now.getTime() >= end.getTime()) {
      return { ok: false, reason: "expired" };
    }
  }
  if (promo.plans.length > 0 && !promo.plans.includes(context.plan)) {
    return { ok: false, reason: "wrong_plan" };
  }
  if (promo.intervals.length > 0 && !promo.intervals.includes(context.interval)) {
    return { ok: false, reason: "wrong_interval" };
  }
  if (promo.audience === "email_domain" && !emailMatchesDomains(context.email, promo.emailDomains)) {
    return { ok: false, reason: "wrong_domain" };
  }
  if (promo.audience === "lapsed" && !context.lapsed) {
    return { ok: false, reason: "not_lapsed" };
  }
  if (promo.audience === "user" && promo.restrictedUserId && promo.restrictedUserId !== context.userId) {
    return { ok: false, reason: "wrong_user" };
  }
  if (promo.onePerUser && context.redeemedByUser) {
    return { ok: false, reason: "already_used" };
  }
  if (promo.maxUses !== null && context.otherUses >= promo.maxUses) {
    return { ok: false, reason: "maxed" };
  }
  return { ok: true };
}

export type CyclePrice = {
  chargeHalalas: number;
  discountHalalas: number;
  upcomingHalalas: number;
  cyclesRemainingAfter: number;
  discounted: boolean;
};

/** `remainingCycles` includes the charge about to be made. Zero means list price. */
export function cycleCharge(
  listHalalas: number,
  remainingCycles: number,
  terms: PromoTerms | null
): CyclePrice {
  const list = Math.max(0, Math.round(listHalalas));
  const remaining = Math.max(0, Math.floor(remainingCycles));
  if (!terms || remaining <= 0) {
    return {
      chargeHalalas: list,
      discountHalalas: 0,
      upcomingHalalas: list,
      cyclesRemainingAfter: 0,
      discounted: false,
    };
  }
  const priced = priceWithPromo(list, terms);
  const after = remaining - 1;
  const upcoming = after > 0 ? priceWithPromo(list, terms).payableHalalas : list;
  return {
    chargeHalalas: priced.payableHalalas,
    discountHalalas: priced.discountHalalas,
    upcomingHalalas: upcoming,
    cyclesRemainingAfter: after,
    discounted: true,
  };
}

export function termsFromSnapshot(row: {
  discount_kind?: string | null;
  discount_percent?: number | string | null;
  discount_amount_off_sar?: number | string | null;
}): PromoTerms | null {
  const kind = row.discount_kind;
  if (kind !== "percent" && kind !== "fixed" && kind !== "free_months") return null;
  return {
    kind,
    percentOff: row.discount_percent === null || row.discount_percent === undefined ? null : Number(row.discount_percent),
    amountOffSar:
      row.discount_amount_off_sar === null || row.discount_amount_off_sar === undefined
        ? null
        : Number(row.discount_amount_off_sar),
    freeMonths: kind === "free_months" ? 1 : null,
  };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomPromoCode(prefix: string, randomByte: (index: number) => number, length = 6) {
  const clean = prefix.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  let body = "";
  for (let i = 0; i < length; i += 1) body += ALPHABET[randomByte(i) % ALPHABET.length];
  return clean ? `${clean}-${body}` : body;
}

export type PromoDraft = {
  code?: string | null;
  kind: PromoKind;
  percentOff?: number | null;
  amountOffSar?: number | null;
  freeMonths?: number | null;
  plans?: string[] | null;
  intervals?: string[] | null;
  cycleCount?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
  onePerUser?: boolean | null;
  audience?: PromoAudience | null;
  emailDomains?: string[] | null;
  restrictedUserId?: string | null;
  note?: string | null;
};

export type NormalizedPromoDraft = {
  code: string;
  kind: PromoKind;
  percentOff: number | null;
  amountOffSar: number | null;
  freeMonths: number | null;
  plans: SelfServePlanId[];
  intervals: BillingInterval[];
  cycleCount: number;
  startsAt: string;
  expiresAt: string | null;
  maxUses: number | null;
  onePerUser: boolean;
  audience: PromoAudience;
  emailDomains: string[];
  restrictedUserId: string | null;
  note: string | null;
};

function cleanPlans(values: string[] | null | undefined): SelfServePlanId[] {
  const unique = new Set<SelfServePlanId>();
  for (const value of values || []) {
    if (isSelfServePlan(value)) unique.add(value);
  }
  return PROMO_PLANS.filter((plan) => unique.has(plan));
}

function cleanIntervals(values: string[] | null | undefined): BillingInterval[] {
  const set = new Set<BillingInterval>();
  for (const value of values || []) {
    if (value === "month" || value === "year") set.add(value);
  }
  return (["month", "year"] as const).filter((interval) => set.has(interval));
}

function cleanDomains(values: string[] | null | undefined) {
  const seen = new Set<string>();
  for (const value of values || []) {
    const domain = value.trim().toLowerCase().replace(/^@/, "");
    if (!domain || domain.length > 80) continue;
    if (!/^\.?[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) continue;
    seen.add(domain);
  }
  return [...seen];
}

export function validatePromoDraft(
  draft: PromoDraft,
  now = new Date()
): { ok: true; value: NormalizedPromoDraft } | { ok: false; error: string } {
  const kind = draft.kind;
  if (!PROMO_KINDS.includes(kind)) return { ok: false, error: "Choose percent, fixed, or free months." };
  const code = normalizePromoCode(draft.code || "");
  if (!isPromoCodeShape(code)) return { ok: false, error: "Use 4 to 40 letters, numbers, or hyphens." };

  let percentOff: number | null = null;
  let amountOffSar: number | null = null;
  let freeMonths: number | null = null;
  if (kind === "percent") {
    percentOff = Number(draft.percentOff);
    if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
      return { ok: false, error: "Percent off must be greater than 0 and at most 100." };
    }
  } else if (kind === "fixed") {
    amountOffSar = Number(draft.amountOffSar);
    if (!Number.isFinite(amountOffSar) || amountOffSar <= 0 || amountOffSar > 100000) {
      return { ok: false, error: "Enter a fixed discount in SAR." };
    }
    amountOffSar = Math.round(amountOffSar * 100) / 100;
  } else {
    freeMonths = Math.floor(Number(draft.freeMonths));
    if (!Number.isFinite(freeMonths) || freeMonths < 1 || freeMonths > 24) {
      return { ok: false, error: "Free months must be from 1 to 24." };
    }
  }

  const plans = cleanPlans(draft.plans);
  if (plans.length === 0) return { ok: false, error: "Choose at least one paid plan." };
  let intervals = cleanIntervals(draft.intervals);
  if (kind === "free_months") intervals = intervals.filter((interval) => interval === "month");
  if (intervals.length === 0) {
    return { ok: false, error: kind === "free_months" ? "Free months apply to monthly billing." : "Choose month or year." };
  }

  const cycleCount =
    kind === "free_months" ? freeMonths || 1 : Math.floor(Number(draft.cycleCount ?? 1));
  if (!Number.isFinite(cycleCount) || cycleCount < 1 || cycleCount > 36) {
    return { ok: false, error: "Discount cycles must be from 1 to 36." };
  }

  const startsAt = draft.startsAt ? new Date(draft.startsAt) : now;
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "Start date is not valid." };
  let expiresAt: Date | null = null;
  if (draft.expiresAt) {
    expiresAt = new Date(draft.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) return { ok: false, error: "Expiry date is not valid." };
    if (expiresAt.getTime() <= startsAt.getTime()) return { ok: false, error: "Expiry must be after the start." };
  }

  let maxUses: number | null = null;
  if (draft.maxUses !== null && draft.maxUses !== undefined && String(draft.maxUses) !== "") {
    maxUses = Math.floor(Number(draft.maxUses));
    if (!Number.isFinite(maxUses) || maxUses < 1 || maxUses > 100000) {
      return { ok: false, error: "Max uses must be a positive number." };
    }
  }

  const audience = draft.audience || "any";
  if (!PROMO_AUDIENCES.includes(audience)) return { ok: false, error: "Unknown audience." };
  const emailDomains = cleanDomains(draft.emailDomains);
  if (audience === "email_domain" && emailDomains.length === 0) {
    return { ok: false, error: "Add at least one email domain, such as .edu.sa." };
  }
  const restrictedUserId = (draft.restrictedUserId || "").trim() || null;
  if (audience === "user" && !restrictedUserId) return { ok: false, error: "A personal code needs a user." };

  const sample = priceWithPromo(PLAN_AMOUNTS_SAR[plans[0]][intervals[0]] * 100, {
    kind,
    percentOff,
    amountOffSar,
    freeMonths,
  });
  if (!payableIsChargeable(sample.payableHalalas)) {
    return { ok: false, error: "That discount leaves less than 1 SAR. Use 100% or free months instead." };
  }

  return {
    ok: true,
    value: {
      code,
      kind,
      percentOff,
      amountOffSar,
      freeMonths,
      plans,
      intervals,
      cycleCount,
      startsAt: startsAt.toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      maxUses,
      onePerUser: draft.onePerUser !== false,
      audience,
      emailDomains,
      restrictedUserId,
      note: (draft.note || "").trim().slice(0, 280) || null,
    },
  };
}

export function questionShareLinks(pageUrl: string, text: string) {
  return {
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
  };
}

export function listPricesUnchanged() {
  return (
    PLAN_AMOUNTS_SAR.engineer.month === 19 &&
    PLAN_AMOUNTS_SAR.professional.month === 41 &&
    PLAN_AMOUNTS_SAR.consultant.month === 99 &&
    PLAN_AMOUNTS_SAR.team.month === 449 &&
    PLAN_AMOUNTS_SAR.enterprise.month === 3900
  );
}
