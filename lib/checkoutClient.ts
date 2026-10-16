"use client";

import { supabase } from "@/lib/supabaseClient";
import { isSelfServePlan, type BillingInterval, type SelfServePlanId } from "@/lib/plans";

const PENDING_KEY = "engineerit_pending_checkout";
export const CHECKOUT_CONTINUE_PATH = "/checkout/continue";

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

function rememberCheckoutReturn() {
  try {
    window.localStorage.setItem("engineerit_post_auth_next", CHECKOUT_CONTINUE_PATH);
  } catch {
    /* ignore */
  }
}

function sendToLogin() {
  rememberCheckoutReturn();
  window.location.assign(`/login?next=${encodeURIComponent(CHECKOUT_CONTINUE_PATH)}`);
}

/**
 * The only plan-purchase entry. Signed-out visitors go to login (register keeps the
 * same return path) and come back here. Signed-in visitors, including people who
 * already hold a plan, open a new Moyasar checkout for the selected plan.
 */
export async function startMoyasarCheckout(
  pending: PendingCheckout
): Promise<
  | { ok: true }
  | { ok: false; needsAuth: true }
  | { ok: false; needsAuth: false; error: string }
> {
  savePendingCheckout(pending);
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    sendToLogin();
    return { ok: false, needsAuth: true };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    sendToLogin();
    return { ok: false, needsAuth: true };
  }

  const res = await fetch("/api/checkout/moyasar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
  if (res.status === 401) {
    sendToLogin();
    return { ok: false, needsAuth: true };
  }
  if (!res.ok || !json.url) {
    return {
      ok: false,
      needsAuth: false,
      error: json.error || "Could not start payment. Please try again.",
    };
  }
  clearPendingCheckout();
  window.location.assign(json.url as string);
  return { ok: true };
}
