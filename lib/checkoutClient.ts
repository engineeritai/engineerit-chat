"use client";

import { supabase } from "@/lib/supabaseClient";
import {
  clearPendingCheckout,
  pendingCheckoutPath,
  POST_AUTH_NEXT_KEY,
  readPendingCheckout,
  savePendingCheckout,
  type PendingCheckout,
} from "@/lib/pendingCheckout";

export const CHECKOUT_CONTINUE_PATH = "/checkout/continue";
export type { PendingCheckout };
export { clearPendingCheckout, readPendingCheckout, savePendingCheckout };

function readLocale() {
  try {
    const stored = window.localStorage.getItem("engineerit_locale");
    if (stored === "ar" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  return "en";
}

function rememberCheckoutReturn(pending: PendingCheckout) {
  const next = pendingCheckoutPath(pending);
  try {
    window.localStorage.setItem(POST_AUTH_NEXT_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

function sendToLogin(pending: PendingCheckout) {
  const next = rememberCheckoutReturn(pending);
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
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
    sendToLogin(pending);
    return { ok: false, needsAuth: true };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    sendToLogin(pending);
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
    sendToLogin(pending);
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
  void supabase.auth.updateUser({
    data: { pending_plan: "", pending_interval: "", pending_seats: "" },
  });
  window.location.assign(json.url as string);
  return { ok: true };
}
