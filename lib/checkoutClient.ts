"use client";

import { supabase } from "@/lib/supabaseClient";
import { isSelfServePlan, type BillingInterval, type SelfServePlanId } from "@/lib/plans";

const PENDING_KEY = "engineerit_pending_checkout";

export type PendingCheckout = {
  planId: SelfServePlanId;
  interval: BillingInterval;
  extraSeats: number;
};

export function savePendingCheckout(pending: PendingCheckout) {
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* ignore */
  }
}

export function readPendingCheckout(): PendingCheckout | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCheckout;
    if (!isSelfServePlan(parsed?.planId)) return null;
    return {
      planId: parsed.planId,
      interval: parsed.interval === "year" ? "year" : "month",
      extraSeats: Number.isFinite(parsed.extraSeats) ? parsed.extraSeats : 0,
    };
  } catch {
    return null;
  }
}

function readLocale() {
  try {
    const stored = window.localStorage.getItem("engineerit_locale");
    if (stored === "ar" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  return "en";
}

export function clearPendingCheckout() {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export async function startMoyasarCheckout(
  pending: PendingCheckout
): Promise<
  | { ok: true }
  | { ok: false; needsAuth: true }
  | { ok: false; needsAuth: false; error: string }
> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    savePendingCheckout(pending);
    return { ok: false, needsAuth: true };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const res = await fetch("/api/checkout/moyasar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      planId: pending.planId,
      interval: pending.interval,
      extraSeats:
        pending.planId === "team" || pending.planId === "enterprise" ? pending.extraSeats : 0,
      locale: readLocale(),
    }),
  });
  const json = await res.json().catch(() => ({ error: "Could not start payment." }));
  if (!res.ok || !json.url) {
    return {
      ok: false,
      needsAuth: false,
      error: json.error || "Could not start payment. Please try again.",
    };
  }
  clearPendingCheckout();
  window.location.href = json.url as string;
  return { ok: true };
}
