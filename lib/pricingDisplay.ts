import { PLANS, type Plan, type PlanId } from "@/lib/plans";

/**
 * Display helpers for the public pricing page.
 * Individual prices are read from PLANS (the same source as /register).
 * Team, Enterprise, and annual billing are marketing-only.
 * Do not import this module into Moyasar or subscription checkout.
 */

/** Official Saudi riyal peg used only to show an approximate USD amount. */
export const SAR_PER_USD = 3.75;

/** Annual price = 10 × monthly (two months free). */
export const ANNUAL_MONTHS_BILLED = 10;

export type BillingPeriod = "monthly" | "annual";

/**
 * Guards the public page against drifting away from registration prices.
 * Update the marketing copy if these labels ever change on purpose.
 */
const EXPECTED_PRICE_LABELS: Record<PlanId, string> = {
  assistant: "Free",
  engineer: "SAR 19 / month",
  professional: "SAR 41 / month",
  consultant: "SAR 79 / month",
};

export function assertIndividualPlanPrices() {
  for (const plan of PLANS) {
    const expected = EXPECTED_PRICE_LABELS[plan.id];
    if (plan.priceMonthly !== expected) {
      throw new Error(
        `Individual plan "${plan.id}" is "${plan.priceMonthly}" but the public pricing page expects "${expected}".`
      );
    }
  }
}

export function monthlySarFromPlan(plan: Plan): number {
  if (plan.priceMonthly.trim().toLowerCase() === "free") return 0;
  const match = plan.priceMonthly.match(/SAR\s+(\d+(?:\.\d+)?)/i);
  if (!match) {
    throw new Error(
      `Could not read a SAR amount from plan "${plan.id}" (${plan.priceMonthly}).`
    );
  }
  return Number(match[1]);
}

export function annualSar(monthlySar: number) {
  return monthlySar * ANNUAL_MONTHS_BILLED;
}

export function formatSar(amount: number) {
  return `SAR ${amount.toLocaleString("en-US")}`;
}

export function formatUsdApprox(sar: number) {
  const usd = sar / SAR_PER_USD;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
  return `USD ${formatted}`;
}

/** Not part of PLANS and not sent to Moyasar. */
export const TEAM_PLAN = {
  id: "team",
  name: "Team",
  monthlySar: 349,
  includedSeats: 5,
  extraSeatMonthlySar: 69,
} as const;

/** Not part of PLANS and not sent to Moyasar. */
export const ENTERPRISE_PLAN = {
  id: "enterprise",
  name: "Enterprise",
  monthlySarFrom: 2500,
} as const;
