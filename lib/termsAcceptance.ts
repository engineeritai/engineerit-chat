/** Version string stored with a new account's terms acceptance. */
export const TERMS_VERSION = "2026-10-26";

export function termsMetadata(acceptedAt: string) {
  return {
    terms_accepted_at: acceptedAt,
    terms_version: TERMS_VERSION,
  };
}

/** Copies signup metadata onto the profile. Accounts without it stay unset. */
export function profileTermsFromMetadata(meta: unknown, nowIso: string) {
  if (!meta || typeof meta !== "object") return null;
  const record = meta as Record<string, unknown>;
  const acceptedAt = typeof record.terms_accepted_at === "string" ? record.terms_accepted_at.trim() : "";
  const version = typeof record.terms_version === "string" ? record.terms_version.trim() : "";
  if (!acceptedAt && !version) return null;
  return {
    terms_accepted_at: acceptedAt || nowIso,
    terms_version: version || TERMS_VERSION,
  };
}

export function missingTermsColumn(message: string) {
  return /terms_accepted_at|terms_version|schema cache/i.test(message);
}
