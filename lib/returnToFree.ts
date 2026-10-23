import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, GRACE_DAYS } from "@/lib/billingCycle";
import { teamGrantsAccess, type TeamAccessRow } from "@/lib/effectivePlan";
import { expiresAtFromCreated } from "@/lib/historyRetention";
import {
  isPlanId,
  isSelfServePlan,
  type BillingInterval,
  type PlanId,
  type SelfServePlanId,
} from "@/lib/plans";

const PAID_TIERS = ["engineer", "professional", "consultant", "team", "enterprise"] as const;
const NOTICE_MS = 30 * 24 * 60 * 60 * 1000;

export type BillingAccessRow = {
  id: string;
  user_id?: string;
  plan?: string | null;
  billing_interval?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  failure_count?: number | null;
  team_id?: string | null;
  updated_at?: string | null;
};

export type AccessDecision = {
  /** Paid features must not stay on. */
  ended: boolean;
  /** Show the bilingual renew notice. */
  notice: boolean;
  plan: PlanId;
  reason: "current" | "grace" | "cancel" | "grace_elapsed" | "closed" | "free" | "team";
  previousPlan: SelfServePlanId;
  previousInterval: BillingInterval;
  /** Write Assistant and close an open billing row. */
  write: boolean;
};

function paidTier(value: string | null | undefined): PlanId | null {
  if (value === "engineer" || value === "professional" || value === "consultant" || value === "team" || value === "enterprise") {
    return value;
  }
  return null;
}

function previousPlanOf(billing: BillingAccessRow | null, stored: string | null | undefined): SelfServePlanId {
  if (isSelfServePlan(billing?.plan)) return billing.plan;
  if (isSelfServePlan(stored)) return stored;
  return "engineer";
}

function previousIntervalOf(billing: BillingAccessRow | null): BillingInterval {
  return billing?.billing_interval === "year" ? "year" : "month";
}

export function pickBillingRow(rows: BillingAccessRow[]): BillingAccessRow | null {
  const open = rows.filter((row) => row.status === "active" || row.status === "past_due");
  const pool = open.length > 0 ? open : rows;
  return (
    [...pool].sort((a, b) => String(b.current_period_end || "").localeCompare(String(a.current_period_end || "")))[0] ||
    null
  );
}

/**
 * A paid plan stays only while its period is still running, or while a renewal
 * is inside the 3-day retry window. Cancellation, a closed row, or the end of
 * that window returns the account to Assistant.
 */
export function decideReturnToAssistant(input: {
  now: Date;
  storedTier: string | null | undefined;
  billing: BillingAccessRow | null;
  teams?: TeamAccessRow[];
}): AccessDecision {
  const stored = (input.storedTier || "assistant").trim().toLowerCase();
  const billing = input.billing;
  const previousPlan = previousPlanOf(billing, stored);
  const previousInterval = previousIntervalOf(billing);
  const base = {
    previousPlan,
    previousInterval,
    notice: false,
    write: false,
  };

  const activeTeam = (input.teams || []).find((team) => teamGrantsAccess(team, input.now));
  const teamPlan: PlanId | null = activeTeam
    ? activeTeam.plan === "enterprise"
      ? "enterprise"
      : "team"
    : null;

  const personal = personalEnded(input.now, stored, billing);
  if (teamPlan && !personal.ended) {
    const own = paidTier(stored);
    return { ...base, ended: false, plan: own || teamPlan, reason: own ? "current" : "team" };
  }
  if (teamPlan && personal.ended) {
    return {
      ...base,
      ended: false,
      plan: teamPlan,
      reason: "team",
      notice: false,
      write: stored !== teamPlan || billingOpen(billing),
    };
  }
  if (!billing && (stored === "team" || stored === "enterprise") && !teamPlan) {
    return { ...base, ended: true, plan: "assistant", reason: "closed", notice: true, write: true };
  }
  if (!personal.ended) {
    const own = paidTier(stored);
    return { ...base, ended: false, plan: own || "assistant", reason: personal.reason };
  }
  return {
    ...base,
    ended: true,
    plan: "assistant",
    reason: personal.reason,
    notice: personal.notice,
    write: Boolean(paidTier(stored)) || billingOpen(billing),
  };
}

function billingOpen(billing: BillingAccessRow | null) {
  return billing?.status === "active" || billing?.status === "past_due";
}

function personalEnded(
  now: Date,
  stored: string,
  billing: BillingAccessRow | null
): { ended: boolean; reason: AccessDecision["reason"]; notice: boolean } {
  if (!billing) return { ended: false, reason: paidTier(stored) ? "current" : "free", notice: false };

  const end = billing.current_period_end ? new Date(billing.current_period_end) : null;
  const endMs = end && !Number.isNaN(end.getTime()) ? end.getTime() : null;
  const recent = endMs != null && now.getTime() - endMs < NOTICE_MS && now.getTime() >= endMs;
  if (endMs == null) return { ended: false, reason: paidTier(stored) ? "current" : "free", notice: false };
  if (now.getTime() < endMs) return { ended: false, reason: "current", notice: false };

  const stillPaid = Boolean(paidTier(stored));
  const cancel = Boolean(billing.cancel_at_period_end) || billing.status === "canceled";
  if (cancel) return { ended: true, reason: "cancel", notice: stillPaid || recent };
  if (billing.status === "expired" || billing.status === "canceled") {
    return { ended: true, reason: "closed", notice: stillPaid || recent };
  }
  const graceEnd = addDays(new Date(endMs), GRACE_DAYS).getTime();
  if (now.getTime() >= graceEnd || Number(billing.failure_count || 0) >= 3) {
    return { ended: true, reason: "grace_elapsed", notice: stillPaid || recent };
  }
  return { ended: false, reason: "grace", notice: false };
}

export async function returnUserToAssistant(
  admin: SupabaseClient,
  userId: string,
  now = new Date()
): Promise<AccessDecision> {
  const profile = await admin.from("profiles").select("subscription_tier").eq("id", userId).maybeSingle();

  const billingResult = await admin
    .from("billing_subscriptions")
    .select(
      "id, user_id, plan, billing_interval, status, current_period_end, cancel_at_period_end, failure_count, team_id, updated_at"
    )
    .eq("user_id", userId)
    .order("current_period_end", { ascending: false })
    .limit(5);
  let billing = pickBillingRow((billingResult.data || []) as BillingAccessRow[]);

  if (!billing) {
    const legacy = await admin
      .from("subscriptions")
      .select("plan, status, end_date")
      .eq("user_id", userId)
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = legacy.data as { plan?: string; status?: string; end_date?: string } | null;
    if (row?.end_date && (row.status === "active" || row.status === "paid" || row.status === "expired")) {
      billing = {
        id: `legacy:${userId}`,
        plan: row.plan,
        status: row.status === "paid" || row.status === "active" ? "active" : "expired",
        current_period_end: row.end_date,
        cancel_at_period_end: false,
      };
    }
  }

  const teamsResult = await admin
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .eq("status", "active");
  let teams: TeamAccessRow[] = [];
  const teamIds = ((teamsResult.data || []) as { team_id?: string }[])
    .map((row) => row.team_id)
    .filter((id): id is string => Boolean(id));
  if (teamIds.length > 0) {
    const teamRows = await admin.from("teams").select("plan, status, current_period_end").in("id", teamIds);
    teams = (teamRows.data || []) as TeamAccessRow[];
  }

  const stored = profile.error
    ? String(billing?.plan || "assistant")
    : String(profile.data?.subscription_tier || "assistant");
  const decision = decideReturnToAssistant({ now, storedTier: stored, billing, teams });
  if (!decision.write) return decision;

  const nowIso = now.toISOString();
  if (decision.plan === "assistant") {
    await admin
      .from("profiles")
      .update({ subscription_tier: "assistant", updated_at: nowIso })
      .eq("id", userId)
      .in("subscription_tier", [...PAID_TIERS]);
  } else if (stored !== decision.plan) {
    await admin
      .from("profiles")
      .update({ subscription_tier: decision.plan, updated_at: nowIso })
      .eq("id", userId);
  }

  const personalBilling =
    billing &&
    !billing.id.startsWith("legacy:") &&
    billingOpen(billing) &&
    (decision.plan === "assistant" || (billing.plan !== "team" && billing.plan !== "enterprise"));
  if (personalBilling && billing) {
    await admin
      .from("billing_subscriptions")
      .update({
        status: decision.reason === "cancel" ? "canceled" : "expired",
        cancel_at_period_end: false,
        updated_at: nowIso,
      })
      .eq("id", billing.id)
      .in("status", ["active", "past_due"]);
  }

  if (decision.plan === "assistant") {
    await admin
      .from("subscriptions")
      .update({ status: "expired", updated_at: nowIso })
      .eq("user_id", userId)
      .in("status", ["active", "paid"]);

    if (billing?.team_id) {
      await admin.from("teams").update({ status: "lapsed", updated_at: nowIso }).eq("id", billing.team_id);
    }
    await applyAssistantRetention(admin, userId);
  }
  return decision;
}

/** Rewrite this user's chat expiry to the free Assistant window. Idempotent. A missing column is ignored. */
export async function applyAssistantRetention(admin: SupabaseClient, userId: string) {
  try {
    const listed = await admin.from("conversations").select("id, created_at").eq("user_id", userId).limit(200);
    if (listed.error) return;
    const rows = (listed.data || []) as { id?: string; created_at?: string }[];
    for (const row of rows) {
      if (!row.id || !row.created_at) continue;
      const expiresAt = expiresAtFromCreated(row.created_at, "assistant");
      if (!expiresAt) continue;
      const updated = await admin.from("conversations").update({ expires_at: expiresAt }).eq("id", row.id).eq("user_id", userId);
      if (updated.error) return;
    }
  } catch {
    return;
  }
}

/** Cron sweep. Safe to run twice: a closed account is not selected again. */
export async function returnExpiredPlans(admin: SupabaseClient, now = new Date()) {
  const ids = new Set<string>();
  const profiles = await admin.from("profiles").select("id").in("subscription_tier", [...PAID_TIERS]).limit(100);
  for (const row of (profiles.data || []) as { id?: string }[]) {
    if (row.id) ids.add(row.id);
  }
  const cutoff = addDays(now, -GRACE_DAYS).toISOString();
  const stale = await admin
    .from("billing_subscriptions")
    .select("user_id")
    .in("status", ["active", "past_due"])
    .lte("current_period_end", cutoff)
    .limit(100);
  for (const row of (stale.data || []) as { user_id?: string }[]) {
    if (row.user_id) ids.add(row.user_id);
  }
  const cancelled = await admin
    .from("billing_subscriptions")
    .select("user_id")
    .in("status", ["active", "past_due"])
    .eq("cancel_at_period_end", true)
    .lte("current_period_end", now.toISOString())
    .limit(100);
  for (const row of (cancelled.data || []) as { user_id?: string }[]) {
    if (row.user_id) ids.add(row.user_id);
  }

  const results: { id: string; plan: PlanId }[] = [];
  for (const id of ids) {
    const decision = await returnUserToAssistant(admin, id, now);
    if (decision.ended) results.push({ id, plan: decision.plan });
  }
  return results;
}

export function planFromAccess(decision: AccessDecision): PlanId {
  return isPlanId(decision.plan) ? decision.plan : "assistant";
}
