import { acquisitionFromClient, acquisitionMetadata, acquisitionPayload, isFreshGoogleSignup } from "@/lib/acquisition";
import { parsePendingCheckout, type PendingCheckout } from "@/lib/pendingCheckout";
import { safeNextPath } from "@/lib/safeNext";
import { termsMetadata } from "@/lib/termsAcceptance";

/**
 * The button stays hidden until this is exactly "true".
 * Turning it on also needs a Google OAuth client and the Google provider
 * enabled in the Supabase dashboard. See the pull request for those steps.
 * NEXT_PUBLIC values are inlined at build time, so a change needs a new deploy.
 */
export const GOOGLE_AUTH_FLAG = "NEXT_PUBLIC_GOOGLE_AUTH";

/**
 * Read the flag as a direct property. A dynamic process.env[key] lookup
 * is not inlined into the browser bundle, so the server would render the
 * button and the client would remove it.
 */
export function googleAuthEnabled(flag?: string) {
  if (flag !== undefined) return flag === "true";
  return process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";
}

export const GOOGLE_CALLBACK_PATH = "/auth/callback";

/** Where Supabase sends the browser after Google. Add both to the Supabase redirect allow-list. */
export const SUPABASE_GOOGLE_REDIRECT_URLS = [
  "https://engineerit.ai/auth/callback",
  "https://www.engineerit.ai/auth/callback",
] as const;

/** Authorized JavaScript origins on the Google OAuth client. */
export const GOOGLE_CLOUD_JAVASCRIPT_ORIGINS = ["https://engineerit.ai", "https://www.engineerit.ai"] as const;

export function googleRedirectUrl(origin: string) {
  const base = origin.replace(/\/$/, "");
  return `${base}${GOOGLE_CALLBACK_PATH}`;
}

/**
 * Google's Authorized redirect URI is Supabase, not the site.
 * Copy this exact value from Authentication → Providers → Google as well.
 */
export function supabaseGoogleCallback(supabaseUrl: string) {
  const base = supabaseUrl.trim().replace(/\/$/, "");
  return `${base}/auth/v1/callback`;
}

export function googleCallbackError(search: string, hash: string) {
  const query = new URLSearchParams(search.replace(/^[?#]/, ""));
  const hashed = new URLSearchParams(hash.replace(/^[?#]/, ""));
  return Boolean(
    query.get("error") || query.get("error_description") || hashed.get("error") || hashed.get("error_description")
  );
}

const PENDING_KEY = "engineerit_google_pending";

export type GooglePending = {
  next: string | null;
  termsAcceptedAt: string;
  acquisition: ReturnType<typeof acquisitionPayload>;
  pending: PendingCheckout | null;
};

export function serializeGooglePending(value: {
  next?: string | null;
  termsAcceptedAt?: string | null;
  acquisition?: unknown;
  pending?: unknown;
}) {
  const next = value.next ? safeNextPath(value.next, "") : "";
  const pending = parsePendingCheckout(value.pending);
  const body: GooglePending = {
    next: next || null,
    termsAcceptedAt: typeof value.termsAcceptedAt === "string" ? value.termsAcceptedAt : "",
    acquisition: acquisitionPayload(acquisitionFromClient(value.acquisition)),
    pending,
  };
  return JSON.stringify(body);
}

export function parseGooglePending(raw: string | null): GooglePending | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    const next = typeof record.next === "string" ? safeNextPath(record.next, "") : "";
    return {
      next: next || null,
      termsAcceptedAt: typeof record.termsAcceptedAt === "string" ? record.termsAcceptedAt : "",
      acquisition: acquisitionPayload(acquisitionFromClient(record.acquisition)),
      pending: parsePendingCheckout(record.pending),
    };
  } catch {
    return null;
  }
}

export function saveGooglePending(value: {
  next?: string | null;
  termsAcceptedAt?: string | null;
  acquisition?: unknown;
  pending?: unknown;
}) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PENDING_KEY, serializeGooglePending(value));
  } catch {
    /* The callback still reads the 30-day source already stored for this browser. */
  }
}

export function loadGooglePending() {
  if (typeof window === "undefined") return null;
  try {
    return parseGooglePending(window.sessionStorage.getItem(PENDING_KEY));
  } catch {
    return null;
  }
}

export function clearGooglePending() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Same landing as a finished email sign-up: an explicit next path, otherwise
 * checkout when a plan is waiting, otherwise the profile.
 */
export function googleLandingPath(args: {
  queryNext?: string | null;
  storedNext?: string | null;
  pendingNext?: string | null;
  hasCheckout: boolean;
}) {
  return safeNextPath(
    args.queryNext || args.storedNext || args.pendingNext || null,
    args.hasCheckout ? "/checkout/continue" : "/profile"
  );
}

/** Metadata written after Google returns. Existing source and terms stay as they are. */
export function oauthMetadataPatch(args: {
  existing: unknown;
  fresh: boolean;
  acquisition: unknown;
  termsAcceptedAt?: string | null;
  pending?: unknown;
}) {
  const existing = args.existing && typeof args.existing === "object" ? (args.existing as Record<string, unknown>) : {};
  const patch: Record<string, unknown> = {};
  if (args.fresh && typeof existing.acq_source !== "string") {
    Object.assign(patch, acquisitionMetadata(args.acquisition));
  }
  const acceptedAt = typeof args.termsAcceptedAt === "string" ? args.termsAcceptedAt.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}T/.test(acceptedAt) && acceptedAt.length <= 40 && typeof existing.terms_accepted_at !== "string") {
    Object.assign(patch, termsMetadata(acceptedAt));
  }
  const pending = parsePendingCheckout(args.pending);
  if (pending && !parsePendingCheckout(existing.pending_checkout)) {
    patch.pending_checkout = pending;
  }
  return patch;
}

export function shouldStampGoogleSignup(user: Parameters<typeof isFreshGoogleSignup>[0], nowMs: number) {
  return isFreshGoogleSignup(user, nowMs);
}
