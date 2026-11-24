import { createHash } from "node:crypto";
import { riyadhDateKey, type PageViewRow } from "@/lib/visitAggregate";
import { inspectVisit, type VisitRequestInput, type VisitSkip } from "@/lib/visitPublic";

/**
 * Server-only salt for the daily visitor id.
 * Set VISIT_HASH_SALT in production to a long random string (16+ characters).
 * If it is missing or shorter than 16 characters, visits still record with
 * VISIT_HASH_SALT_FALLBACK. The raw IP is never stored in either case.
 * The fallback is in the source, so set the env var before relying on the hash.
 */
export const VISIT_HASH_SALT_ENV = "VISIT_HASH_SALT";
export const VISIT_HASH_SALT_FALLBACK = "engineerit-visit-fallback-v1";

export function resolveVisitSalt(env: NodeJS.ProcessEnv = process.env) {
  const raw = (env.VISIT_HASH_SALT || "").trim();
  if (raw.length >= 16) return { salt: raw, fallback: false as const };
  return { salt: VISIT_HASH_SALT_FALLBACK, fallback: true as const };
}

/** Salted SHA-256 of IP, user agent, and the Arabia calendar date. Hex only. */
export function visitorId(ip: string, userAgent: string, day: string, salt: string) {
  return createHash("sha256")
    .update(salt, "utf8")
    .update("\0", "utf8")
    .update(ip, "utf8")
    .update("\0", "utf8")
    .update(userAgent, "utf8")
    .update("\0", "utf8")
    .update(day, "utf8")
    .digest("hex");
}

export type StoredPageView = Omit<PageViewRow, "created_at">;

export type VisitPlan = { record: false; reason: VisitSkip } | { record: true; row: StoredPageView };

export function planPageView(input: VisitRequestInput & { salt: string }): VisitPlan {
  const inspected = inspectVisit(input);
  if (!inspected.ok) return { record: false, reason: inspected.reason };
  const row: StoredPageView = {
    ...inspected.fields,
    visitor_id: visitorId(inspected.ip, inspected.userAgent, inspected.day, input.salt),
  };
  return { record: true, row };
}

export function visitDay(now: Date) {
  return riyadhDateKey(now);
}
