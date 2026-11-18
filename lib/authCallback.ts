export type AuthCallbackKind = "recovery" | "signup" | "none";
export type ConfirmationIntent = "signup" | "code" | "none";

function paramType(search: string, hash: string) {
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  const hashed = new URLSearchParams(hash.replace(/^#/, ""));
  return (query.get("type") || hashed.get("type") || "").toLowerCase();
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
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  const hashed = new URLSearchParams(hash.replace(/^#/, ""));
  if (query.get("code")) return true;
  return Boolean(hashed.get("access_token"));
}

/**
 * A signup event needs the confirmation navigation, not a later login.
 * type=signup is the email confirmation. A bare code can be the same flow
 * after the hash is removed. Recovery, invite, magic link, and email change are not new accounts.
 */
export function resolveConfirmationIntent(
  search: string,
  hash: string,
  stored: ConfirmationIntent = "none"
): ConfirmationIntent {
  const type = paramType(search, hash);
  if (type === "recovery" || type === "email_change" || type === "magiclink" || type === "invite" || type === "email") {
    return "none";
  }
  if (type === "signup") return "signup";
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  const hashed = new URLSearchParams(hash.replace(/^#/, ""));
  if (query.get("code") || query.get("token_hash") || hashed.get("access_token")) return "code";
  if (stored === "signup" || stored === "code") return stored;
  return "none";
}
