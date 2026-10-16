import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlanId, type PlanId } from "@/lib/plans";

export type TeamAccessRow = {
  plan?: string | null;
  status?: string | null;
  current_period_end?: string | null;
};

export function teamGrantsAccess(
  team: TeamAccessRow | null | undefined,
  now: Date = new Date()
) {
  if (!team) return false;
  if (team.status !== "active") return false;
  if (!team.current_period_end) return false;
  const end = new Date(team.current_period_end);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() > now.getTime();
}

/**
 * Active team or enterprise membership grants Consultant-tier access.
 * A lapsed team does not. Personal plans are left as they were stored.
 */
export function pickEffectivePlan(
  ownTier: string | null | undefined,
  memberships: TeamAccessRow[],
  now: Date = new Date()
): PlanId {
  const active = memberships.filter((row) => teamGrantsAccess(row, now));
  if (active.some((row) => row.plan === "enterprise")) return "enterprise";
  if (active.length > 0) return "team";

  if (ownTier === "team" || ownTier === "enterprise") return "assistant";
  if (isPlanId(ownTier)) return ownTier;
  return "assistant";
}

/**
 * Browser-safe lookup. If the teams tables are not migrated yet, falls back
 * to the stored individual plan so existing subscribers keep working.
 */
export async function resolveEffectivePlan(
  client: SupabaseClient,
  userId: string
): Promise<PlanId> {
  let own: string | null = "assistant";

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .maybeSingle();

  if (!profileError && profile?.subscription_tier) {
    own = profile.subscription_tier as string;
  }

  const { data: rows, error } = await client
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error || !rows) {
    return fallbackStoredPlan(client, userId, own);
  }

  if (rows.length === 0) {
    return pickEffectivePlan(own, []);
  }

  const ids = rows.map((row) => row.team_id).filter(Boolean);
  const { data: teams, error: teamError } = await client
    .from("teams")
    .select("plan, status, current_period_end")
    .in("id", ids);

  if (teamError || !teams) {
    return fallbackStoredPlan(client, userId, own);
  }

  return pickEffectivePlan(own, teams as TeamAccessRow[]);
}

async function fallbackStoredPlan(
  client: SupabaseClient,
  userId: string,
  own: string | null
): Promise<PlanId> {
  if (own !== "team" && own !== "enterprise") {
    return isPlanId(own) ? own : "assistant";
  }

  const { data: subs } = await client
    .from("subscriptions")
    .select("end_date")
    .eq("user_id", userId)
    .eq("plan", own)
    .in("status", ["active", "paid"])
    .order("end_date", { ascending: false })
    .limit(1);

  const end = subs?.[0]?.end_date as string | undefined;
  if (end && teamGrantsAccess({ status: "active", current_period_end: end, plan: own })) {
    return own;
  }
  return "assistant";
}
