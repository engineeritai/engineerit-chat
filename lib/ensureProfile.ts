import { profileTermsFromMetadata } from "@/lib/termsAcceptance";

export type ProfileUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export type NewProfileRow = {
  id: string;
  full_name: string;
  subscription_tier: "assistant";
  updated_at: string;
  terms_accepted_at?: string;
  terms_version?: string;
};

/** Row inserted on first sign-in when the auth trigger has not created one yet. */
export function newProfileRow(user: ProfileUser, nowIso = new Date().toISOString()): NewProfileRow {
  const meta = user.user_metadata || {};
  const fromMeta = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  const fromName = typeof meta.name === "string" ? meta.name.trim() : "";
  const fullName = fromMeta || fromName || user.email?.split("@")[0] || "";
  const terms = profileTermsFromMetadata(meta, nowIso);
  return {
    id: user.id,
    full_name: fullName,
    subscription_tier: "assistant",
    updated_at: nowIso,
    ...(terms ?? {}),
  };
}

/** Insert shape used when the terms columns are not on the table yet. */
export function withoutTermsColumns(row: NewProfileRow) {
  const { terms_accepted_at, terms_version, ...rest } = row;
  void terms_accepted_at;
  void terms_version;
  return rest;
}
