import { isSelfServePlan, type BillingInterval, type SelfServePlanId } from "@/lib/plans";

export type PendingCheckout = {
  planId: SelfServePlanId;
  interval: BillingInterval;
  extraSeats: number;
};

export function parsePendingCheckout(raw: unknown): PendingCheckout | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as PendingCheckout;
  if (!isSelfServePlan(parsed.planId)) return null;
  return {
    planId: parsed.planId,
    interval: parsed.interval === "year" ? "year" : "month",
    extraSeats: Number.isFinite(Number(parsed.extraSeats)) ? Number(parsed.extraSeats) : 0,
  };
}

export function pendingFromMetadata(meta: unknown): PendingCheckout | null {
  return parsePendingCheckout(meta);
}
