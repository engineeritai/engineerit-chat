/**
 * Chat history retention, read from profiles.subscription_tier.
 * null means the conversation does not expire.
 * Keep the day counts in sync with purge_expired_conversations() in the migration.
 */

export type SubscriptionTier =
  | "assistant"
  | "engineer"
  | "professional"
  | "consultant"
  | "team"
  | "enterprise";

const MS_DAY = 24 * 60 * 60 * 1000;

export function normalizeSubscriptionTier(raw: string | null | undefined): SubscriptionTier {
  const value = (raw ?? "").trim().toLowerCase();
  switch (value) {
    case "engineer":
      return "engineer";
    case "professional":
    case "pro":
    case "professional_engineer":
      return "professional";
    case "consultant":
    case "consultant_engineer":
    case "pilot":
    case "trial":
    case "free_trial":
      return "consultant";
    case "team":
      return "team";
    case "enterprise":
      return "enterprise";
    default:
      return "assistant";
  }
}

/** Days a conversation is kept after it is created. null = unlimited. */
export function retentionDaysForTier(raw: string | null | undefined): number | null {
  switch (normalizeSubscriptionTier(raw)) {
    case "engineer":
      return 30;
    case "professional":
      return 90;
    case "consultant":
      return 365;
    case "team":
    case "enterprise":
      return null;
    default:
      return 3;
  }
}

export function expiresAtFromCreated(
  createdAtIso: string,
  rawTier: string | null | undefined
): string | null {
  const days = retentionDaysForTier(rawTier);
  if (days == null) return null;
  const created = new Date(createdAtIso);
  if (Number.isNaN(created.getTime())) return null;
  return new Date(created.getTime() + days * MS_DAY).toISOString();
}

export function isExpired(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return false;
  return end <= now.getTime();
}

export function daysUntilExpiry(expiresAt: string | null | undefined, now = new Date()): number | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return null;
  const remaining = end - now.getTime();
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / MS_DAY);
}

/** How many days before deletion the sidebar should warn. */
export function warningLeadDays(retentionDays: number): number {
  if (retentionDays <= 3) return 1;
  if (retentionDays <= 30) return 3;
  if (retentionDays <= 90) return 7;
  return 14;
}

export function isNearingExpiry(
  expiresAt: string | null | undefined,
  rawTier: string | null | undefined,
  now = new Date()
): boolean {
  if (!expiresAt || isExpired(expiresAt, now)) return false;
  const retention = retentionDaysForTier(rawTier);
  if (retention == null) return false;
  const left = daysUntilExpiry(expiresAt, now);
  if (left == null) return false;
  return left <= warningLeadDays(retention);
}

export function canExportChatHistory(rawTier: string | null | undefined): boolean {
  const tier = normalizeSubscriptionTier(rawTier);
  return (
    tier === "professional" ||
    tier === "consultant" ||
    tier === "team" ||
    tier === "enterprise"
  );
}

export function canShareChatWithTeam(rawTier: string | null | undefined): boolean {
  const tier = normalizeSubscriptionTier(rawTier);
  return tier === "team" || tier === "enterprise";
}
