export type ProfileUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

/** Row inserted on first sign-in when the auth trigger has not created one yet. */
export function newProfileRow(user: ProfileUser, nowIso = new Date().toISOString()) {
  const meta = user.user_metadata || {};
  const fromMeta = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  const fromName = typeof meta.name === "string" ? meta.name.trim() : "";
  const fullName = fromMeta || fromName || user.email?.split("@")[0] || "";
  return {
    id: user.id,
    full_name: fullName,
    subscription_tier: "assistant",
    updated_at: nowIso,
  };
}
