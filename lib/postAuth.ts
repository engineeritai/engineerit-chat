import {
  pendingCheckoutPath,
  pendingFromMetadata,
  POST_AUTH_NEXT_KEY,
  readPendingCheckout,
} from "@/lib/pendingCheckout";
import { safeNextPath } from "@/lib/safeNext";

/** Where to send someone after register, email confirmation, or login. */
export function destinationAfterAuth(explicit: string | null | undefined, metadata?: unknown) {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(POST_AUTH_NEXT_KEY);
    window.localStorage.removeItem(POST_AUTH_NEXT_KEY);
  } catch {
    stored = null;
  }
  const chosen = safeNextPath(explicit || stored || "", "");
  if (chosen && chosen !== "/profile") return chosen;
  const pending = readPendingCheckout() || pendingFromMetadata(metadata);
  if (pending) return pendingCheckoutPath(pending);
  return "/profile";
}
