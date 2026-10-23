import { isSelfServePlan, type BillingInterval, type SelfServePlanId } from "@/lib/plans";

export const PENDING_CHECKOUT_KEY = "engineerit_pending_checkout";
export const POST_AUTH_NEXT_KEY = "engineerit_post_auth_next";
const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingCheckout = {
  planId: SelfServePlanId;
  interval: BillingInterval;
  extraSeats: number;
};

export function normalizePendingCheckout(value: unknown): PendingCheckout | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { planId?: unknown; interval?: unknown; extraSeats?: unknown };
  if (!isSelfServePlan(typeof record.planId === "string" ? record.planId : "")) return null;
  const seats = Number(record.extraSeats);
  return {
    planId: record.planId as SelfServePlanId,
    interval: record.interval === "year" ? "year" : "month",
    extraSeats: Number.isFinite(seats) ? Math.max(0, Math.floor(seats)) : 0,
  };
}

export function pendingFromMetadata(meta: unknown): PendingCheckout | null {
  if (!meta || typeof meta !== "object") return null;
  const record = meta as { pending_plan?: unknown; pending_interval?: unknown; pending_seats?: unknown };
  return normalizePendingCheckout({
    planId: record.pending_plan,
    interval: record.pending_interval,
    extraSeats: record.pending_seats,
  });
}

export function pendingFromSearch(params: { get(name: string): string | null }): PendingCheckout | null {
  const plan = params.get("plan");
  if (!plan) return null;
  return normalizePendingCheckout({
    planId: plan,
    interval: params.get("interval"),
    extraSeats: params.get("seats"),
  });
}

export function pendingCheckoutPath(pending: PendingCheckout) {
  const query = new URLSearchParams({
    plan: pending.planId,
    interval: pending.interval,
    seats: String(pending.extraSeats || 0),
  });
  return `/checkout/continue?${query.toString()}`;
}

export function savePendingCheckout(pending: PendingCheckout) {
  const payload = JSON.stringify({ ...pending, savedAt: Date.now() });
  try {
    window.sessionStorage.setItem(PENDING_CHECKOUT_KEY, payload);
  } catch {
    /* ignore */
  }
  try {
    window.localStorage.setItem(PENDING_CHECKOUT_KEY, payload);
  } catch {
    /* ignore */
  }
}

export function readPendingCheckout(): PendingCheckout | null {
  const fromSession = readStore("session");
  if (fromSession) return fromSession;
  return readStore("local");
}

function readStore(kind: "session" | "local"): PendingCheckout | null {
  try {
    const store = kind === "session" ? window.sessionStorage : window.localStorage;
    const raw = store.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCheckout & { savedAt?: number };
    if (parsed.savedAt && Date.now() - parsed.savedAt > PENDING_TTL_MS) {
      store.removeItem(PENDING_CHECKOUT_KEY);
      return null;
    }
    return normalizePendingCheckout(parsed);
  } catch {
    return null;
  }
}

export function clearPendingCheckout() {
  try {
    window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch {
    /* ignore */
  }
  try {
    window.localStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch {
    /* ignore */
  }
}
