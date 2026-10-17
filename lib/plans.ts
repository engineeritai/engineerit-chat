// lib/plans.ts

import { RIYAL, riyalAmount } from "@/lib/riyal";

export type PlanId =
  | "assistant"
  | "engineer"
  | "professional"
  | "consultant"
  | "team"
  | "enterprise";

export type FeatureTier = "assistant" | "engineer" | "professional" | "consultant";

export type BillingInterval = "month" | "year";

export type SelfServePlanId = "engineer" | "professional" | "consultant" | "team" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  shortName: string;
  tagline: string;
  priceMonthly: string;
  priceYearly: string;
  features: string[];
};

export const TEAM_INCLUDED_SEATS = 5;
export const ENTERPRISE_INCLUDED_SEATS = 10;

/** List prices in SAR. Annual is 10× monthly. */
export const PLAN_AMOUNTS_SAR: Record<
  SelfServePlanId,
  { month: number; year: number }
> = {
  engineer: { month: 19, year: 190 },
  professional: { month: 41, year: 410 },
  consultant: { month: 99, year: 990 },
  team: { month: 449, year: 4490 },
  enterprise: { month: 3900, year: 39000 },
};

/** Existing Consultant subscribers keep this price until consultant_legacy_price_until. */
export const CONSULTANT_LEGACY_SAR: { month: number; year: number } = {
  month: 79,
  year: 790,
};

export const EXTRA_SEAT_SAR: { month: number; year: number } = {
  month: 89,
  year: 890,
};

/** Published Enterprise add-on. Annual is 10× monthly, same as every other price. */
export const ENTERPRISE_EXTRA_SEAT_SAR: { month: number; year: number } = {
  month: 299,
  year: 2990,
};

export const ENTERPRISE_FROM_SAR: { month: number; year: number } = {
  month: 3900,
  year: 39000,
};

export const PLAN_LABELS: Record<PlanId, string> = {
  assistant: "Assistant Engineer",
  engineer: "Engineer",
  professional: "Professional Engineer",
  consultant: "Consultant Engineer",
  team: "Team",
  enterprise: "Enterprise",
};

export const ADVISOR_FEATURE_BY_PLAN = {
  consultant: "PMO Advisor included",
  team: "PMO and Program Assurance included",
  enterprise: "PMO, Program Assurance, Operations Readiness, and Decision Support included",
} as const;

export const ENTERPRISE_ADVISOR_FEATURES = [
  "PMO Advisor included",
  "Program Assurance included",
  "Operations Readiness included",
  "Decision Support included",
] as const;

export const MOYASAR_CHECKOUT_FEATURE = "Secure payment via Moyasar, monthly or yearly";

/** Shared plan colour tokens. Accent is the pill; soft is a wash behind cards. */
export const PLAN_THEME: Record<PlanId, { accent: string; soft: string; ink: string }> = {
  assistant: { accent: "#5c6b82", soft: "#f3f5f8", ink: "#243044" },
  engineer: { accent: "#c47b2b", soft: "#fbf6ef", ink: "#6a3e0c" },
  professional: { accent: "#1f7a72", soft: "#f1f8f7", ink: "#0d4f4a" },
  consultant: { accent: "#5b4db8", soft: "#f5f4fb", ink: "#32286e" },
  team: { accent: "#0e7490", soft: "#f2f8fa", ink: "#0a4d60" },
  enterprise: { accent: "#1c2430", soft: "#f4f5f7", ink: "#111418" },
};

export const PLAN_COLORS: Record<PlanId, string> = {
  assistant: PLAN_THEME.assistant.accent,
  engineer: PLAN_THEME.engineer.accent,
  professional: PLAN_THEME.professional.accent,
  consultant: PLAN_THEME.consultant.accent,
  team: PLAN_THEME.team.accent,
  enterprise: PLAN_THEME.enterprise.accent,
};

export const PLAN_BADGE: Record<PlanId, { en: string; ar: string }> = {
  assistant: { en: "Free", ar: "مجاني" },
  engineer: { en: "Eng", ar: "مهن" },
  professional: { en: "Pro", ar: "مح" },
  consultant: { en: "Cons", ar: "است" },
  team: { en: "Team", ar: "فريق" },
  enterprise: { en: "Ent", ar: "مؤس" },
};

/**
 * Header-only labels. Identical in every language and every plan slot so the
 * bar never grows with "Professional Engineer" or "المهندس الاستشاري".
 */
export const HEADER_PLAN_ABBREV: Record<PlanId, string> = {
  assistant: "Free",
  engineer: "Eng",
  professional: "Pro",
  consultant: "Cons",
  team: "Team",
  enterprise: "Ent",
};

export function planBadge(planId: PlanId, locale: "en" | "ar") {
  return PLAN_BADGE[planId][locale];
}

export function isPlanId(value: string | null | undefined): value is PlanId {
  return (
    value === "assistant" ||
    value === "engineer" ||
    value === "professional" ||
    value === "consultant" ||
    value === "team" ||
    value === "enterprise"
  );
}

/** Team and Enterprise use Consultant-tier product features. */
export function featureTier(planId: PlanId | string | null | undefined): FeatureTier {
  if (planId === "engineer" || planId === "professional" || planId === "consultant") {
    return planId;
  }
  if (planId === "team" || planId === "enterprise") return "consultant";
  return "assistant";
}

export function isSelfServePlan(planId: string | null | undefined): planId is SelfServePlanId {
  return (
    planId === "engineer" ||
    planId === "professional" ||
    planId === "consultant" ||
    planId === "team" ||
    planId === "enterprise"
  );
}

export function includedSeats(planId: SelfServePlanId) {
  if (planId === "team") return TEAM_INCLUDED_SEATS;
  if (planId === "enterprise") return ENTERPRISE_INCLUDED_SEATS;
  return 1;
}

export function extraSeatPrice(planId: SelfServePlanId) {
  return planId === "enterprise" ? ENTERPRISE_EXTRA_SEAT_SAR : EXTRA_SEAT_SAR;
}

export function periodDays(interval: BillingInterval) {
  return interval === "year" ? 365 : 30;
}

export function formatSar(amount: number, interval?: BillingInterval) {
  const formatted = riyalAmount(amount.toLocaleString("en-US"));
  if (!interval) return formatted;
  return `${formatted} / ${interval === "year" ? "year" : "month"}`;
}

export { RIYAL };

export type PriceQuote = {
  planId: SelfServePlanId;
  interval: BillingInterval;
  extraSeats: number;
  seatLimit: number;
  amountSar: number;
  amountHalalas: number;
  currency: "SAR";
};

export function consultantLegacyActive(
  until: string | Date | null | undefined,
  now = new Date()
) {
  if (!until) return false;
  const end = until instanceof Date ? until : new Date(until);
  return !Number.isNaN(end.getTime()) && end.getTime() > now.getTime();
}

export function quoteSelfServe(
  planId: SelfServePlanId,
  interval: BillingInterval,
  extraSeats = 0,
  options?: { consultantLegacy?: boolean }
): PriceQuote {
  const seated = planId === "team" || planId === "enterprise";
  const seats = seated ? normalizeExtraSeats(extraSeats) : 0;
  const base =
    planId === "consultant" && options?.consultantLegacy
      ? CONSULTANT_LEGACY_SAR[interval]
      : PLAN_AMOUNTS_SAR[planId][interval];
  const extra = seated ? seats * extraSeatPrice(planId)[interval] : 0;
  const amountSar = base + extra;
  return {
    planId,
    interval,
    extraSeats: seats,
    seatLimit: seated ? includedSeats(planId) + seats : 1,
    amountSar,
    amountHalalas: amountSar * 100,
    currency: "SAR",
  };
}

export function normalizeExtraSeats(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(200, Math.floor(n)));
}

export function parseInterval(value: unknown): BillingInterval {
  return value === "year" ? "year" : "month";
}

export const PLANS: Plan[] = [
  {
    id: "assistant",
    name: "Assistant Engineer",
    shortName: "A",
    tagline: "Ideal for students and junior engineers.",
    priceMonthly: "Free",
    priceYearly: "Free",
    features: [
      "AI chat in all disciplines",
      "Understand simple PFD / P&ID / block diagrams",
      "Basic data digitization (tables & simple tags)",
    ],
  },
  {
    id: "engineer",
    name: "Engineer",
    shortName: "E",
    tagline: "For practicing engineers who need faster documentation.",
    priceMonthly: formatSar(PLAN_AMOUNTS_SAR.engineer.month, "month"),
    priceYearly: formatSar(PLAN_AMOUNTS_SAR.engineer.year, "year"),
    features: [
      "Everything in Assistant Engineer",
      "Analyze Word, Excel, PowerPoint Documents",
      "Technical report review and analysis",
      "Engineering calculation sheets review",
      "Copy and Share Engineering Outcomes",
      MOYASAR_CHECKOUT_FEATURE,
    ],
  },
  {
    id: "professional",
    name: "Professional Engineer",
    shortName: "P",
    tagline: "For senior engineers and lead designers.",
    priceMonthly: formatSar(PLAN_AMOUNTS_SAR.professional.month, "month"),
    priceYearly: formatSar(PLAN_AMOUNTS_SAR.professional.year, "year"),
    features: [
      "Everything in Engineer",
      "Advanced designs, equations, formulas, design checks",
      "ITP & QA/QC checklist templates analysis",
      "BOQ & quantities take-off review",
      "Copy and Share Engineering Outcomes",
      "Export to pdf",
      MOYASAR_CHECKOUT_FEATURE,
    ],
  },
  {
    id: "consultant",
    name: "Consultant Engineer",
    shortName: "C",
    tagline: "For consultants and firms managing full projects.",
    priceMonthly: formatSar(PLAN_AMOUNTS_SAR.consultant.month, "month"),
    priceYearly: formatSar(PLAN_AMOUNTS_SAR.consultant.year, "year"),
    features: [
      ADVISOR_FEATURE_BY_PLAN.consultant,
      "Everything in Professional Engineer",
      "Equipment list & BOQ analysis",
      "Value Engineering outlines",
      "Resource & cost estimation & schedule check",
      "Project dashboards and portfolio overview",
      "Export to pdf, word and Powerpoint",
      MOYASAR_CHECKOUT_FEATURE,
    ],
  },
  {
    id: "team",
    name: "Team",
    shortName: "T",
    tagline: "Consultant-tier access for a firm, billed on one subscription.",
    priceMonthly: formatSar(PLAN_AMOUNTS_SAR.team.month, "month"),
    priceYearly: formatSar(PLAN_AMOUNTS_SAR.team.year, "year"),
    features: [
      ADVISOR_FEATURE_BY_PLAN.team,
      "Everything in Consultant Engineer",
      `${TEAM_INCLUDED_SEATS} seats included`,
      `Extra seat ${formatSar(EXTRA_SEAT_SAR.month, "month")}`,
      MOYASAR_CHECKOUT_FEATURE,
      "Invite colleagues by email",
      "Access ends for the whole team if the subscription lapses",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    shortName: "N",
    tagline: "Consultant-tier access for a larger firm, billed on one subscription.",
    priceMonthly: formatSar(ENTERPRISE_FROM_SAR.month, "month"),
    priceYearly: formatSar(ENTERPRISE_FROM_SAR.year, "year"),
    features: [
      ...ENTERPRISE_ADVISOR_FEATURES,
      "Everything in Consultant Engineer",
      `${ENTERPRISE_INCLUDED_SEATS} seats included`,
      `Extra seat ${formatSar(ENTERPRISE_EXTRA_SEAT_SAR.month, "month")}`,
      MOYASAR_CHECKOUT_FEATURE,
    ],
  },
];
