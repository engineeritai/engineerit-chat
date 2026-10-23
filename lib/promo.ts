import crypto from "crypto";
import type { BillingInterval, SelfServePlanId } from "@/lib/plans";

export type PromoDiscountType = "percent" | "fixed" | "free_months";
export type PromoAudience = "any" | "domain" | "lapsed" | "batch";

export type PromoReason =
  | "invalid"
  | "inactive"
  | "not_started"
  | "expired"
  | "wrong_plan"
  | "wrong_interval"
  | "max_uses"
  | "already_used"
  | "wrong_domain"
  | "not_lapsed"
  | "wrong_user"
  | "below_minimum"
  | "student_unverified"
  | "closed"
  | "missing";

export type PromoCode = {
  id: string;
  code: string;
  discountType: PromoDiscountType;
  percentOff: number | null;
  amountOffSar: number | null;
  freeMonths: number | null;
  plans: string[];
  intervals: BillingInterval[];
  cycles: number;
  startsAt: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  onePerUser: boolean;
  audience: PromoAudience;
  domains: string[];
  singleUse: boolean;
  active: boolean;
  restrictedUserId: string | null;
  requiresStudent: boolean;
};

export type PromoFacts = {
  now: Date;
  userId: string;
  email: string;
  planId: string;
  interval: BillingInterval;
  listHalalas: number;
  uses: number;
  userUses: number;
  hasOpenSubscription: boolean;
  hasPaidBefore: boolean;
  studentVerified?: boolean;
};

export type PromoQuote = {
  ok: true;
  discountHalalas: number;
  chargedHalalas: number;
  cycles: number;
  free: boolean;
  listHalalas: number;
  discountSar: number;
  chargedSar: number;
  listSar: number;
};

export type PromoDecision = PromoQuote | { ok: false; reason: PromoReason };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizePromoCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[\s_-]+/g, "-").replace(/[^A-Z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function emailMatchesDomain(email: string, domains: string[]) {
  const host = email.trim().toLowerCase().split("@")[1] || "";
  if (!host || host.startsWith(".") || host.endsWith(".") || host.includes(" ")) return false;
  return domains.some((raw) => {
    let domain = raw.trim().toLowerCase();
    if (domain.startsWith("@")) domain = domain.slice(1);
    if (domain.startsWith("*.")) domain = domain.slice(2);
    if (domain.startsWith(".")) domain = domain.slice(1);
    if (!domain || domain.includes("@") || domain.includes(" ")) return false;
    return host === domain || host.endsWith(`.${domain}`);
  });
}

export function halalasToSar(halalas: number) {
  return Math.round(halalas) / 100;
}

function stamp(value: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NaN : time;
}

function cyclesOf(code: PromoCode) {
  const fromFree = code.discountType === "free_months" ? code.freeMonths || 0 : 0;
  const cycles = Math.floor(code.cycles || fromFree || 1);
  return Math.max(1, Math.min(36, cycles));
}

export function discountHalalas(listHalalas: number, code: Pick<PromoCode, "discountType" | "percentOff" | "amountOffSar">) {
  const list = Math.max(0, Math.round(listHalalas));
  if (code.discountType === "free_months") {
    return { discountHalalas: list, chargedHalalas: 0 };
  }
  if (code.discountType === "percent") {
    const percent = Math.min(100, Math.max(0, Number(code.percentOff) || 0));
    const discount = Math.round((list * percent) / 100);
    const charged = Math.max(0, list - discount);
    return { discountHalalas: list - charged, chargedHalalas: charged };
  }
  const off = Math.round((Number(code.amountOffSar) || 0) * 100);
  const discount = Math.min(list, Math.max(0, off));
  return { discountHalalas: discount, chargedHalalas: list - discount };
}

/** Client-supplied amounts are ignored. The charge is always the server quote. */
export function priceCheckout(
  listHalalas: number,
  code: Pick<PromoCode, "discountType" | "percentOff" | "amountOffSar">,
  clientAmountHalalas?: unknown
) {
  void clientAmountHalalas;
  const priced = discountHalalas(listHalalas, code);
  return {
    ...priced,
    moyasarAmount: priced.chargedHalalas,
    listHalalas: Math.max(0, Math.round(listHalalas)),
  };
}

export function evaluatePromo(code: PromoCode | null, facts: PromoFacts): PromoDecision {
  if (!code || !normalizePromoCode(code.code)) return { ok: false, reason: "invalid" };
  if (!code.active) return { ok: false, reason: "inactive" };
  const now = facts.now.getTime();
  const starts = stamp(code.startsAt);
  if (starts !== null && (Number.isNaN(starts) || starts > now)) return { ok: false, reason: "not_started" };
  const ends = stamp(code.expiresAt);
  if (ends !== null && (Number.isNaN(ends) || ends <= now)) return { ok: false, reason: "expired" };
  if (code.restrictedUserId && code.restrictedUserId !== facts.userId) {
    return { ok: false, reason: "wrong_user" };
  }
  if (code.audience === "lapsed" && (facts.hasOpenSubscription || !facts.hasPaidBefore)) {
    return { ok: false, reason: "not_lapsed" };
  }
  if (code.audience === "domain" || code.domains.length > 0) {
    if (!emailMatchesDomain(facts.email, code.domains)) return { ok: false, reason: "wrong_domain" };
  }
  if (code.requiresStudent && !facts.studentVerified) {
    return { ok: false, reason: "student_unverified" };
  }
  if (code.plans.length > 0 && !code.plans.includes(facts.planId)) {
    return { ok: false, reason: "wrong_plan" };
  }
  if (code.intervals.length > 0 && !code.intervals.includes(facts.interval)) {
    return { ok: false, reason: "wrong_interval" };
  }
  const maxUses = code.singleUse ? 1 : code.maxUses;
  if (maxUses !== null && facts.uses >= maxUses) return { ok: false, reason: "max_uses" };
  if (code.onePerUser && facts.userUses > 0) return { ok: false, reason: "already_used" };

  const list = Math.max(0, Math.round(facts.listHalalas));
  const priced = discountHalalas(list, code);
  if (priced.chargedHalalas > 0 && priced.chargedHalalas < 100) {
    return { ok: false, reason: "below_minimum" };
  }
  if (priced.discountHalalas <= 0) return { ok: false, reason: "invalid" };
  const cycles = cyclesOf(code);
  return {
    ok: true,
    ...priced,
    cycles,
    free: priced.chargedHalalas === 0,
    listHalalas: list,
    listSar: halalasToSar(list),
    discountSar: halalasToSar(priced.discountHalalas),
    chargedSar: halalasToSar(priced.chargedHalalas),
  };
}

export type RenewalPromoState = {
  cyclesRemaining: number;
  discountType: PromoDiscountType | null;
  percentOff: number | null;
  amountOffSar: number | null;
  requiresStudent?: boolean;
  studentVerified?: boolean;
};

export function priceRenewalWithPromo(listSar: number, state: RenewalPromoState) {
  const listHalalas = Math.max(0, Math.round(Number(listSar) * 100));
  const remaining = Math.max(0, Math.floor(Number(state.cyclesRemaining) || 0));
  if (state.requiresStudent && !state.studentVerified && remaining > 0 && state.discountType) {
    return {
      amountSar: halalasToSar(listHalalas),
      amountHalalas: listHalalas,
      cyclesRemainingAfter: remaining,
      discounted: false,
    };
  }
  if (remaining <= 0 || !state.discountType) {
    return {
      amountSar: halalasToSar(listHalalas),
      amountHalalas: listHalalas,
      cyclesRemainingAfter: 0,
      discounted: false,
    };
  }
  const priced = discountHalalas(listHalalas, {
    discountType: state.discountType,
    percentOff: state.percentOff,
    amountOffSar: state.amountOffSar,
  });
  const charged = priced.chargedHalalas > 0 && priced.chargedHalalas < 100 ? listHalalas : priced.chargedHalalas;
  return {
    amountSar: halalasToSar(charged),
    amountHalalas: charged,
    cyclesRemainingAfter: remaining - 1,
    discounted: charged !== listHalalas,
  };
}

export function canRedeemFree(row: { status: string; amountHalalas: number; promoCodeId: string | null }) {
  return row.status === "pending" && row.amountHalalas === 0 && Boolean(row.promoCodeId);
}

export function randomPromoCode(prefix: string) {
  const bytes = crypto.randomBytes(8);
  let body = "";
  for (let i = 0; i < 8; i += 1) body += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  const clean = normalizePromoCode(prefix).slice(0, 10);
  return clean ? `${clean}-${body}` : body;
}

export type PromoDraft = {
  code?: string;
  label?: string;
  discountType: PromoDiscountType;
  percentOff?: number | null;
  amountOffSar?: number | null;
  freeMonths?: number | null;
  plans?: string[];
  intervals?: BillingInterval[];
  cycles?: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
  onePerUser?: boolean;
  audience?: PromoAudience;
  domains?: string[];
  singleUse?: boolean;
  restrictedUserId?: string | null;
  requiresStudent?: boolean;
  note?: string;
};

const SELF_SERVE: SelfServePlanId[] = ["engineer", "professional", "consultant", "team", "enterprise"];

function cleanPlans(plans: string[] | undefined) {
  const picked = (plans || []).map((plan) => plan.trim()).filter((plan): plan is SelfServePlanId => {
    return (SELF_SERVE as string[]).includes(plan);
  });
  return [...new Set(picked)];
}

function cleanIntervals(intervals: BillingInterval[] | undefined, fallback: BillingInterval[]) {
  const picked = (intervals || fallback).filter((interval) => interval === "month" || interval === "year");
  return [...new Set(picked)];
}

function cleanDomains(domains: string[] | undefined) {
  return [...new Set((domains || []).map((domain) => domain.trim().toLowerCase()).filter(Boolean))];
}

export function parsePromoDraft(draft: PromoDraft, now = new Date()): { ok: true; row: PromoInsert } | { ok: false; error: string } {
  const discountType = draft.discountType;
  if (discountType !== "percent" && discountType !== "fixed" && discountType !== "free_months") {
    return { ok: false, error: "Choose percent, fixed, or free months." };
  }
  let percentOff: number | null = null;
  let amountOffSar: number | null = null;
  let freeMonths: number | null = null;
  if (discountType === "percent") {
    percentOff = Number(draft.percentOff);
    if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
      return { ok: false, error: "Percent off must be between 1 and 100." };
    }
  } else if (discountType === "fixed") {
    amountOffSar = Number(draft.amountOffSar);
    if (!Number.isFinite(amountOffSar) || amountOffSar <= 0) {
      return { ok: false, error: "Fixed discount must be greater than 0 SAR." };
    }
  } else {
    freeMonths = Math.floor(Number(draft.freeMonths));
    if (!Number.isFinite(freeMonths) || freeMonths < 1 || freeMonths > 24) {
      return { ok: false, error: "Free months must be from 1 to 24." };
    }
  }
  const cycles = Math.floor(Number(draft.cycles ?? freeMonths ?? 1));
  if (!Number.isFinite(cycles) || cycles < 1 || cycles > 36) {
    return { ok: false, error: "Cycles must be from 1 to 36." };
  }
  const audience = draft.audience || "any";
  if (audience !== "any" && audience !== "domain" && audience !== "lapsed" && audience !== "batch") {
    return { ok: false, error: "Unknown audience." };
  }
  const domains = cleanDomains(draft.domains);
  if (audience === "domain" && domains.length === 0) {
    return { ok: false, error: "Add at least one email domain." };
  }
  const intervals = cleanIntervals(draft.intervals, discountType === "free_months" ? ["month"] : ["month", "year"]);
  if (intervals.length === 0) return { ok: false, error: "Choose monthly, yearly, or both." };
  const maxUses =
    draft.maxUses === null || draft.maxUses === undefined || draft.maxUses === ("" as unknown)
      ? null
      : Math.floor(Number(draft.maxUses));
  if (maxUses !== null && (!Number.isFinite(maxUses) || maxUses < 1)) {
    return { ok: false, error: "Max uses must be empty or at least 1." };
  }
  const startsAt = draft.startsAt ? new Date(draft.startsAt) : now;
  const expiresAt = draft.expiresAt ? new Date(draft.expiresAt) : null;
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "Start date is not valid." };
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { ok: false, error: "Expiry date is not valid." };
  if (expiresAt && expiresAt.getTime() <= startsAt.getTime()) {
    return { ok: false, error: "Expiry must be after the start." };
  }
  const code = draft.code ? normalizePromoCode(draft.code) : randomPromoCode("GIFT");
  if (code.length < 4 || code.length > 40) return { ok: false, error: "Code must be 4 to 40 letters or numbers." };
  return {
    ok: true,
    row: {
      code,
      label: (draft.label || "").trim().slice(0, 120),
      discount_type: discountType,
      percent_off: percentOff,
      amount_off_sar: amountOffSar,
      free_months: freeMonths,
      plans: cleanPlans(draft.plans),
      intervals,
      cycles,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      max_uses: draft.singleUse ? 1 : maxUses,
      one_per_user: draft.onePerUser !== false,
      audience,
      domains,
      single_use: Boolean(draft.singleUse) || audience === "batch",
      active: true,
      restricted_user_id: draft.restrictedUserId || null,
      requires_student: Boolean(draft.requiresStudent),
      note: (draft.note || "").trim().slice(0, 280) || null,
    },
  };
}

export type PromoInsert = {
  code: string;
  label: string;
  discount_type: PromoDiscountType;
  percent_off: number | null;
  amount_off_sar: number | null;
  free_months: number | null;
  plans: string[];
  intervals: BillingInterval[];
  cycles: number;
  starts_at: string;
  expires_at: string | null;
  max_uses: number | null;
  one_per_user: boolean;
  audience: PromoAudience;
  domains: string[];
  single_use: boolean;
  active: boolean;
  restricted_user_id: string | null;
  requires_student: boolean;
  note: string | null;
  batch_id?: string | null;
};

export function promoInsertPayload(row: PromoInsert) {
  if (row.requires_student) return row;
  const { requires_student: _requiresStudent, ...rest } = row;
  return rest;
}

export function buildBatchCodes(args: { count: number; prefix: string; draft: PromoDraft; now?: Date }) {
  const count = Math.floor(args.count);
  if (!Number.isFinite(count) || count < 1 || count > 200) {
    return { ok: false as const, error: "Generate between 1 and 200 codes." };
  }
  const batchId = crypto.randomUUID();
  const rows: PromoInsert[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    let code = "";
    do {
      code = randomPromoCode(args.prefix || "STU");
    } while (seen.has(code));
    seen.add(code);
    const parsed = parsePromoDraft(
      {
        ...args.draft,
        code,
        audience: "batch",
        singleUse: true,
        maxUses: 1,
        onePerUser: true,
      },
      args.now
    );
    if (!parsed.ok) return parsed;
    rows.push({
      ...parsed.row,
      batch_id: batchId,
      single_use: true,
      max_uses: 1,
      audience: "batch",
      requires_student: Boolean(args.draft.requiresStudent),
    });
  }
  return { ok: true as const, batchId, rows };
}

export function mapPromoRow(row: Record<string, unknown>): PromoCode {
  const intervals = Array.isArray(row.intervals) ? row.intervals.filter((item) => item === "month" || item === "year") : [];
  return {
    id: String(row.id || ""),
    code: String(row.code || ""),
    discountType: row.discount_type === "fixed" || row.discount_type === "free_months" ? row.discount_type : "percent",
    percentOff: row.percent_off === null || row.percent_off === undefined ? null : Number(row.percent_off),
    amountOffSar: row.amount_off_sar === null || row.amount_off_sar === undefined ? null : Number(row.amount_off_sar),
    freeMonths: row.free_months === null || row.free_months === undefined ? null : Number(row.free_months),
    plans: Array.isArray(row.plans) ? row.plans.map(String) : [],
    intervals: intervals as BillingInterval[],
    cycles: Number(row.cycles) || 1,
    startsAt: row.starts_at ? String(row.starts_at) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    maxUses: row.max_uses === null || row.max_uses === undefined ? null : Number(row.max_uses),
    onePerUser: row.one_per_user !== false,
    audience:
      row.audience === "domain" || row.audience === "lapsed" || row.audience === "batch" ? row.audience : "any",
    domains: Array.isArray(row.domains) ? row.domains.map(String) : [],
    singleUse: Boolean(row.single_use),
    active: row.active !== false,
    restrictedUserId: row.restricted_user_id ? String(row.restricted_user_id) : null,
    requiresStudent: Boolean(row.requires_student),
  };
}

export type WeeklyQuestionRow = {
  id: string;
  question_en: string;
  question_ar: string;
  choices_en: string[];
  choices_ar: string[];
  answer_index: number;
  reward_percent: number;
  participation_only: boolean;
  valid_days: number;
  active: boolean;
  published_at: string | null;
};

export function publicWeeklyQuestion(row: WeeklyQuestionRow | null, now = new Date()) {
  if (!row || !row.active) return null;
  if (row.published_at && new Date(row.published_at).getTime() > now.getTime()) return null;
  return {
    id: row.id,
    questionEn: row.question_en,
    questionAr: row.question_ar,
    choicesEn: row.choices_en,
    choicesAr: row.choices_ar,
    rewardPercent: row.reward_percent,
    participationOnly: row.participation_only,
    validDays: row.valid_days,
  };
}

export function gradeWeeklyAnswer(row: WeeklyQuestionRow, choiceIndex: number) {
  const count = row.choices_en.length;
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= count) {
    return { invalid: true as const, correct: false, rewarded: false };
  }
  const correct = choiceIndex === row.answer_index;
  return { invalid: false as const, correct, rewarded: row.participation_only || correct };
}

export function buildRewardCode(args: {
  userId: string;
  percent: number;
  validDays: number;
  questionId: string;
  now?: Date;
}) {
  const now = args.now || new Date();
  const days = Math.max(1, Math.min(90, Math.floor(args.validDays) || 7));
  const percent = Math.min(100, Math.max(1, Math.round(args.percent) || 10));
  const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return {
    code: randomPromoCode("WEEK"),
    label: "Question of the week",
    discount_type: "percent" as const,
    percent_off: percent,
    amount_off_sar: null,
    free_months: null,
    plans: [] as string[],
    intervals: ["month", "year"] as BillingInterval[],
    cycles: 1,
    starts_at: now.toISOString(),
    expires_at: expires.toISOString(),
    max_uses: 1,
    one_per_user: true,
    audience: "any" as const,
    domains: [] as string[],
    single_use: true,
    active: true,
    restricted_user_id: args.userId,
    note: `question:${args.questionId}`,
  };
}

export type QuestionEntry = {
  rewarded: boolean;
  correct: boolean;
  code: string | null;
  expiresAt: string | null;
};

export function decideQuestionAttempt(existing: QuestionEntry | null, graded: ReturnType<typeof gradeWeeklyAnswer>) {
  if (existing) {
    return {
      ok: true as const,
      already: true,
      rewarded: existing.rewarded,
      correct: existing.correct,
      code: existing.code,
      expiresAt: existing.expiresAt,
    };
  }
  if (graded.invalid) return { ok: false as const, reason: "invalid" as const };
  return {
    ok: true as const,
    already: false,
    rewarded: graded.rewarded,
    correct: graded.correct,
    code: null as string | null,
    expiresAt: null as string | null,
  };
}
