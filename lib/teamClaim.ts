import type { SupabaseClient } from "@supabase/supabase-js";
import { teamGrantsAccess, type TeamAccessRow } from "@/lib/effectivePlan";
import { parseInterval, type BillingInterval } from "@/lib/plans";
import { recordPlanPurchase } from "@/lib/recordPlan";

function embedOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function claimAccessForUser(
  admin: SupabaseClient,
  user: { id: string; email?: string | null }
) {
  const email = user.email?.trim().toLowerCase();
  if (!email) return { claimed: 0, granted: false };

  let granted = false;

  const { data: grants } = await admin
    .from("pending_plan_grants")
    .select(
      "id, plan, billing_interval, seat_limit, amount_sar, current_period_end, company"
    )
    .eq("email", email)
    .is("applied_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const grant = grants?.[0];
  if (grant && (grant.plan === "team" || grant.plan === "enterprise")) {
    const interval = parseInterval(grant.billing_interval) as BillingInterval;
    await recordPlanPurchase(admin, {
      userId: user.id,
      email,
      plan: grant.plan,
      interval,
      seatLimit: Number(grant.seat_limit) || 1,
      extraSeats:
        grant.plan === "team" ? Math.max(0, Number(grant.seat_limit || 0) - 5) : 0,
      amountSar:
        grant.amount_sar === null || grant.amount_sar === undefined
          ? undefined
          : Number(grant.amount_sar),
      periodEnd: grant.current_period_end as string,
      company: (grant.company as string | null) ?? null,
      source: "manual",
    });
    await admin
      .from("pending_plan_grants")
      .update({
        applied_at: new Date().toISOString(),
        applied_user_id: user.id,
      })
      .eq("id", grant.id);
    granted = true;
  }

  const { data: invites } = await admin
    .from("team_members")
    .select("id, status, teams(plan, status, current_period_end)")
    .eq("email", email)
    .eq("status", "invited");

  let claimed = 0;
  for (const invite of invites || []) {
    const team = embedOne(
      invite.teams as TeamAccessRow | TeamAccessRow[] | null | undefined
    );
    if (!teamGrantsAccess(team)) continue;
    const { error } = await admin
      .from("team_members")
      .update({
        user_id: user.id,
        status: "active",
        accepted_at: new Date().toISOString(),
        invite_token: null,
      })
      .eq("id", invite.id);
    if (!error) claimed += 1;
  }

  return { claimed, granted };
}
