import type { BillingInterval } from "@/lib/plans";

/** First charge on the renewal date, then retries 1, 3, and 7 days later. */
export const RENEWAL_ATTEMPT_DAY_OFFSETS = [0, 1, 3, 7] as const;
export const GRACE_DAYS = 7;
export const VAT_RATE = 0.15;
export const MIN_CHARGE_HALALAS = 100;

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function renewalIdempotencyKey(
  subscriptionId: string,
  periodEndIso: string,
  attempt: number
) {
  return `renewal:${subscriptionId}:${periodEndIso}:${attempt}`;
}

export function seatChangeIdempotencyKey(
  subscriptionId: string,
  periodEndIso: string,
  fromExtra: number,
  toExtra: number
) {
  return `seats:${subscriptionId}:${periodEndIso}:${fromExtra}->${toExtra}`;
}

export type RenewalDecision =
  | { action: "skip" }
  | { action: "expire" }
  | { action: "wait"; nextAt: string }
  | { action: "downgrade" }
  | { action: "charge"; attempt: number; idempotencyKey: string; dueAt: string };

export function decideRenewal(input: {
  now: Date;
  subscriptionId: string;
  periodEnd: Date;
  status: "active" | "past_due" | "canceled" | "expired";
  cancelAtPeriodEnd: boolean;
  failureCount: number;
}): RenewalDecision {
  if (input.status === "canceled" || input.status === "expired") return { action: "skip" };
  if (Number.isNaN(input.periodEnd.getTime())) return { action: "skip" };

  if (input.cancelAtPeriodEnd && input.now.getTime() >= input.periodEnd.getTime()) {
    return { action: "expire" };
  }

  if (input.failureCount === 0 && input.now.getTime() < input.periodEnd.getTime()) {
    return { action: "skip" };
  }

  if (input.failureCount >= RENEWAL_ATTEMPT_DAY_OFFSETS.length) {
    return { action: "downgrade" };
  }

  const attempt = input.failureCount;
  const due = addDays(input.periodEnd, RENEWAL_ATTEMPT_DAY_OFFSETS[attempt]);
  if (input.now.getTime() < due.getTime()) {
    return { action: "wait", nextAt: due.toISOString() };
  }

  return {
    action: "charge",
    attempt,
    dueAt: due.toISOString(),
    idempotencyKey: renewalIdempotencyKey(
      input.subscriptionId,
      input.periodEnd.toISOString(),
      attempt
    ),
  };
}

export function afterChargeFailure(failureCount: number) {
  const nextCount = failureCount + 1;
  if (nextCount >= RENEWAL_ATTEMPT_DAY_OFFSETS.length) {
    return { status: "downgrade" as const, failureCount: nextCount };
  }
  return {
    status: "past_due" as const,
    failureCount: nextCount,
    retryDay: RENEWAL_ATTEMPT_DAY_OFFSETS[nextCount],
  };
}

export function nextPeriodEnd(now: Date, periodEnd: Date, interval: BillingInterval) {
  const anchor = now.getTime() > periodEnd.getTime() ? now : periodEnd;
  const days = interval === "year" ? 365 : 30;
  return addDays(anchor, days);
}

export function prorateSeatChange(input: {
  now: Date;
  periodStart: Date;
  periodEnd: Date;
  pricePerSeatSar: number;
  fromExtra: number;
  toExtra: number;
}) {
  const deltaSeats = input.toExtra - input.fromExtra;
  const span = input.periodEnd.getTime() - input.periodStart.getTime();
  const remaining = Math.min(span, Math.max(0, input.periodEnd.getTime() - input.now.getTime()));
  const fraction = span > 0 ? remaining / span : 0;
  const rawHalalas = Math.round(deltaSeats * input.pricePerSeatSar * fraction * 100);
  let amountHalalas = rawHalalas;
  if (amountHalalas > 0 && amountHalalas < MIN_CHARGE_HALALAS) {
    amountHalalas = MIN_CHARGE_HALALAS;
  }
  return {
    deltaSeats,
    fraction,
    amountHalalas,
    amountSar: amountHalalas / 100,
    creditHalalas: amountHalalas < 0 ? -amountHalalas : 0,
  };
}

export function renewalChargeHalalas(fullHalalas: number, creditHalalas: number) {
  const credit = Math.max(0, Math.floor(creditHalalas));
  const full = Math.max(0, Math.floor(fullHalalas));
  const chargeHalalas = Math.max(0, full - credit);
  const creditUsed = full - chargeHalalas;
  return { chargeHalalas, creditUsed, creditRemaining: credit - creditUsed };
}

export function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function vatFromInclusive(amountSar: number) {
  const gross = roundMoney(amountSar);
  const net = roundMoney(gross / (1 + VAT_RATE));
  const vat = roundMoney(gross - net);
  return { gross, net, vat, rate: VAT_RATE, inclusive: true as const };
}

export function zatcaInvoicesEnabled(flag: string | undefined) {
  return flag === "true" || flag === "1";
}
