// lib/plans.ts

export type PlanId =
  | "assistant"
  | "engineer"
  | "professional"
  | "consultant"
  | "team"
  | "enterprise";

export type FeatureTier = "assistant" | "engineer" | "professional" | "consultant";

export type BillingInterval = "month" | "year";

export type SelfServePlanId = "engineer" | "professional" | "consultant" | "team";

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

/** List prices in SAR. Annual is 10× monthly. Team and Enterprise amounts include VAT. */
export const PLAN_AMOUNTS_SAR: Record<
  SelfServePlanId,
  { month: number; year: number }
> = {
  engineer: { month: 19, year: 190 },
  professional: { month: 41, year: 410 },
  consultant: { month: 79, year: 790 },
  team: { month: 349, year: 3490 },
};

export const EXTRA_SEAT_SAR: { month: number; year: number } = {
  month: 69,
  year: 690,
};

export const ENTERPRISE_FROM_SAR: { month: number; year: number } = {
  month: 2500,
  year: 25000,
};

export const PLAN_LABELS: Record<PlanId, string> = {
  assistant: "Assistant Engineer",
  engineer: "Engineer",
  professional: "Professional Engineer",
  consultant: "Consultant Engineer",
  team: "Team",
  enterprise: "Enterprise",
};

export const AI_ADVISORS_FEATURE = "AI Advisors (coming soon)";

export const PLAN_COLORS: Record<PlanId, string> = {
  assistant: "#2563eb",
  engineer: "#f97316",
  professional: "#0f766e",
  consultant: "#7c3aed",
  team: "#0e7490",
  enterprise: "#111827",
};

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
    planId === "team"
  );
}

export function periodDays(interval: BillingInterval) {
  return interval === "year" ? 365 : 30;
}

export function formatSar(amount: number, interval?: BillingInterval) {
  const formatted = amount.toLocaleString("en-US");
  if (!interval) return `SAR ${formatted}`;
  return `SAR ${formatted} / ${interval === "year" ? "year" : "month"}`;
}

export type PriceQuote = {
  planId: SelfServePlanId;
  interval: BillingInterval;
  extraSeats: number;
  seatLimit: number;
  amountSar: number;
  amountHalalas: number;
  currency: "SAR";
};

export function quoteSelfServe(
  planId: SelfServePlanId,
  interval: BillingInterval,
  extraSeats = 0
): PriceQuote {
  const seats = planId === "team" ? normalizeExtraSeats(extraSeats) : 0;
  const base = PLAN_AMOUNTS_SAR[planId][interval];
  const extra = planId === "team" ? seats * EXTRA_SEAT_SAR[interval] : 0;
  const amountSar = base + extra;
  return {
    planId,
    interval,
    extraSeats: seats,
    seatLimit: planId === "team" ? TEAM_INCLUDED_SEATS + seats : 1,
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
      "Everything in Professional Engineer",
      "Equipment list & BOQ analysis",
      "Value Engineering outlines",
      "Resource & cost estimation & schedule check",
      "Project dashboards and portfolio overview",
      "Export to pdf, word and Powerpoint",
      AI_ADVISORS_FEATURE,
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
      "Everything in Consultant Engineer",
      "5 seats included",
      `Extra seat ${formatSar(EXTRA_SEAT_SAR.month, "month")}`,
      "Invite colleagues by email",
      "VAT included",
      "Access ends for the whole team if the subscription lapses",
      AI_ADVISORS_FEATURE,
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    shortName: "N",
    tagline: "Custom rollout. Pay the quoted amount with Moyasar.",
    priceMonthly: `From ${formatSar(ENTERPRISE_FROM_SAR.month, "month")}`,
    priceYearly: `From ${formatSar(ENTERPRISE_FROM_SAR.year, "year")}`,
    features: [
      "Everything in Consultant Engineer",
      "Custom seat count",
      "Moyasar payment link for the quoted amount",
      "Access starts after Moyasar confirms payment",
      "VAT included",
      AI_ADVISORS_FEATURE,
    ],
  },
];
