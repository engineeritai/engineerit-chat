export type AuthCallbackKind = "recovery" | "signup" | "none";
export type ConfirmLinkStatus = "confirmed" | "invalid" | "idle";

export const CONFIRM_ERROR_PATH = "/auth/confirmed?error=link";

function paramsOf(value: string) {
  return new URLSearchParams(value.replace(/^[?#]/, ""));
}

function paramType(search: string, hash: string) {
  const query = paramsOf(search);
  const hashed = paramsOf(hash);
  return (query.get("type") || hashed.get("type") || "").toLowerCase();
}

/** Supabase puts an expired or rejected confirmation link in the query or hash. */
export function hasAuthLinkError(search: string, hash: string) {
  const query = paramsOf(search);
  const hashed = paramsOf(hash);
  if (query.get("error") === "link") return true;
  return Boolean(
    query.get("error_code") ||
      query.get("error_description") ||
      hashed.get("error") ||
      hashed.get("error_code") ||
      hashed.get("error_description")
  );
}

/** Failed links stay invalid. A session after a clean landing is the existing success path. */
export function confirmLinkStatus(args: { hasSession: boolean; failed: boolean }): ConfirmLinkStatus {
  if (args.failed) return "invalid";
  if (args.hasSession) return "confirmed";
  return "idle";
}

/** Signup confirmation versus password recovery, from the URL Supabase already redirects to. */
export function authCallbackKind(search: string, hash: string): AuthCallbackKind {
  const type = paramType(search, hash);
  if (type === "recovery") return "recovery";
  if (type === "signup" || type === "email" || type === "email_change") return "signup";
  return "none";
}

/**
 * A confirmation link lands on the Site URL. A recovery link lands on /reset-password.
 * Neither target is a new allow-list entry. /auth/confirmed is only a client forward.
 */
export function shouldForwardSignupConfirm(pathname: string, search: string, hash: string) {
  if (pathname.startsWith("/auth/confirmed")) return false;
  const kind = authCallbackKind(search, hash);
  if (kind === "recovery") return false;
  if (kind === "signup") return true;
  if (pathname.startsWith("/reset-password")) return false;
  const query = paramsOf(search);
  const hashed = paramsOf(hash);
  if (query.get("code")) return true;
  if (hashed.get("access_token")) return true;
  return hasAuthLinkError(search, hash);
}
