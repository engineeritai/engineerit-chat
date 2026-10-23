"use client";

import { supabase } from "@/lib/supabaseClient";
import {
  parsePendingCheckout,
  pendingFromMetadata,
  type PendingCheckout,
} from "@/lib/pendingCheckout";

const PENDING_KEY = "engineerit_pending_checkout";
export const CHECKOUT_CONTINUE_PATH = "/checkout/continue";

export { parsePendingCheckout, pendingFromMetadata };
export type { PendingCheckout };

function writePending(storage: Storage, pending: PendingCheckout) {
  storage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function savePendingCheckout(pending: PendingCheckout) {
  const value = parsePendingCheckout(pending);
  if (!value) return;
  try {
    writePending(window.sessionStorage, value);
  } catch {
    /* ignore */
  }
  try {
    writePending(window.localStorage, value);
  } catch {
    /* ignore */
  }
}

export function readPendingCheckout(): PendingCheckout | null {
  const stores: Storage[] = [];
  try {
    stores.push(window.sessionStorage);
  } catch {
    /* ignore */
  }
  try {
    stores.push(window.localStorage);
  } catch {
    /* ignore */
  }
  for (const storage of stores) {
    try {
      const raw = storage.getItem(PENDING_KEY);
      if (!raw) continue;
      const parsed = parsePendingCheckout(JSON.parse(raw));
      if (parsed) return parsed;
    } catch {
      /* try the other store */
    }
  }
  return null;
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
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
  void supabase.auth.updateUser({ data: { pending_checkout: null } }).catch(() => undefined);
}

export async function readAnyPendingCheckout(): Promise<PendingCheckout | null> {
  const stored = readPendingCheckout();
  if (stored) return stored;
  const { data } = await supabase.auth.getUser();
  const pending = pendingFromMetadata(data.user?.user_metadata?.pending_checkout);
  if (pending) savePendingCheckout(pending);
  return pending;
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
