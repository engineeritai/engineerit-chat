import {
  ENTERPRISE_EXTRA_SEAT_SAR,
  ENTERPRISE_FROM_SAR,
  EXTRA_SEAT_SAR,
  PLAN_AMOUNTS_SAR,
  PLANS,
  TEAM_INCLUDED_SEATS,
  formatSar as formatPlanSar,
  quoteSelfServe,
  type BillingInterval,
  type Plan,
  type PlanId,
} from "@/lib/plans";

/**
 * Public price display. Amounts come from lib/plans.ts, which is also what
 * Moyasar checkout charges for self-serve plans.
 */

/** Official Saudi riyal peg used only to show an approximate USD amount. */
export const SAR_PER_USD = 3.75;

/** Annual price = 10 × monthly (two months free). */
export const ANNUAL_MONTHS_BILLED = 10;

export type BillingPeriod = "monthly" | "annual";

const EXPECTED_PRICE_LABELS: Record<PlanId, string> = {
  assistant: "Free",
  engineer: "SAR 19 / month",
  professional: "SAR 41 / month",
  consultant: "SAR 99 / month",
  team: "SAR 499 / month",
  enterprise: "SAR 3,900 / month",
};

const EXPECTED_YEARLY_LABELS: Record<PlanId, string> = {
  assistant: "Free",
  engineer: "SAR 190 / year",
  professional: "SAR 410 / year",
  consultant: "SAR 990 / year",
  team: "SAR 4,990 / year",
  enterprise: "SAR 39,000 / year",
};

export function assertIndividualPlanPrices() {
  for (const plan of PLANS) {
    const expected = EXPECTED_PRICE_LABELS[plan.id];
    const expectedYear = EXPECTED_YEARLY_LABELS[plan.id];
    if (plan.priceMonthly !== expected || plan.priceYearly !== expectedYear) {
      throw new Error(
        `Plan "${plan.id}" is "${plan.priceMonthly}" / "${plan.priceYearly}" but the public pricing page expects "${expected}" / "${expectedYear}".`
      );
    }
  }

  const consultant = PLANS.find((plan) => plan.id === "consultant");
  if (!consultant || consultant.features.length === 0) {
    throw new Error("Consultant Engineer feature list is empty.");
  }
}

export function monthlySarFromPlan(plan: Plan): number {
  if (plan.id === "assistant") return 0;
  if (plan.id === "enterprise") return ENTERPRISE_FROM_SAR.month;
  if (plan.id === "team") return PLAN_AMOUNTS_SAR.team.month;
  return PLAN_AMOUNTS_SAR[plan.id].month;
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

export function planPriceLabel(
  planId: PlanId,
  interval: BillingInterval,
  extraSeats = 0,
  locale: "en" | "ar" = "en",
  consultantLegacy = false
): { primary: string; usd: string | null; amountSar: number } {
  if (planId === "assistant") {
    return { primary: locale === "ar" ? "مجاناً" : "Free", usd: null, amountSar: 0 };
  }
  const quote = quoteSelfServe(planId, interval, extraSeats, {
    consultantLegacy: consultantLegacy && planId === "consultant",
  });
  if (locale === "ar") {
    const period = interval === "year" ? "سنوياً" : "شهرياً";
    const usd = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(quote.amountSar / SAR_PER_USD);
    return {
      primary: `${quote.amountSar.toLocaleString("en-US")} ر.س ${period}`,
      usd: `${usd} دولار`,
      amountSar: quote.amountSar,
    };
  }
  return {
    primary: formatPlanSar(quote.amountSar, interval),
    usd: formatUsdApprox(quote.amountSar),
    amountSar: quote.amountSar,
  };
}

/** Same feature lines on every page. Extra-seat price follows the billing period. */
export function displayFeatures(plan: Plan, interval: BillingInterval): string[] {
  return plan.features.map((feature) => {
    if ((plan.id === "team" || plan.id === "enterprise") && feature.startsWith("Extra seat")) {
      const amount = plan.id === "enterprise" ? ENTERPRISE_EXTRA_SEAT_SAR[interval] : EXTRA_SEAT_SAR[interval];
      return `Extra seat ${formatPlanSar(amount, interval)} (approx. ${formatUsdApprox(amount)})`;
    }
    return feature;
  });
}

export const TEAM_PLAN = {
  id: "team" as const,
  name: "Team",
  monthlySar: PLAN_AMOUNTS_SAR.team.month,
  includedSeats: TEAM_INCLUDED_SEATS,
  extraSeatMonthlySar: EXTRA_SEAT_SAR.month,
};

export const ENTERPRISE_PLAN = {
  id: "enterprise" as const,
  name: "Enterprise",
  monthlySarFrom: ENTERPRISE_FROM_SAR.month,
};
