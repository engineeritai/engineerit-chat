import type { SupabaseClient } from "@supabase/supabase-js";
import { syncBillingSubscription } from "@/lib/billingAccount";
import { periodDays, quoteSelfServe, type BillingInterval, type SelfServePlanId } from "@/lib/plans";

export type RecordedPlan = SelfServePlanId;

type RecordArgs = {
  userId: string;
  email: string | null;
  plan: RecordedPlan;
  interval: BillingInterval;
  extraSeats?: number;
  seatLimit?: number;
  amountSar?: number;
  periodEnd?: string | null;
  company?: string | null;
  source: "moyasar" | "manual";
  periodStart?: string | null;
  cancelAtPeriodEnd?: boolean;
  locale?: string | null;
  skipRecent?: boolean;
  promo?: {
    codeId: string | null;
    code: string | null;
    cyclesRemaining: number;
    discountType: string | null;
    percentOff: number | null;
    amountOffSar: number | null;
  } | null;
};

function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function recordPlanPurchase(admin: SupabaseClient, args: RecordArgs) {
  const now = new Date();
  const nowIso = now.toISOString();
  const interval = args.interval;

  const quoted = quoteSelfServe(args.plan, interval, args.extraSeats ?? 0);

  const extraSeats = quoted.extraSeats;
  const seatLimit =
    args.seatLimit && args.seatLimit > 0 ? Math.floor(args.seatLimit) : quoted.seatLimit;

  const amountSar =
    typeof args.amountSar === "number" && Number.isFinite(args.amountSar)
      ? args.amountSar
      : quoted.amountSar;

  const endDate = args.periodEnd
    ? new Date(args.periodEnd)
    : addDays(now, periodDays(interval));
  if (Number.isNaN(endDate.getTime())) {
    throw new Error("Invalid period end.");
  }
  const endIso = endDate.toISOString();

  const periodStart =
    args.periodStart && !Number.isNaN(new Date(args.periodStart).getTime())
      ? new Date(args.periodStart).toISOString()
      : nowIso;

  if (args.source === "moyasar" && !args.skipRecent) {
    const since = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
    const { data: recentRows } = await admin
      .from("subscriptions")
      .select("id, end_date")
      .eq("user_id", args.userId)
      .eq("plan", args.plan)
      .eq("price", amountSar)
      .eq("status", "active")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);

    const recent = recentRows?.[0];

    if (recent?.id) {
      const healedEnd = (recent.end_date as string | null) || endIso;
      let healedTeam: string | null = null;
      if (args.plan === "team" || args.plan === "enterprise") {
        healedTeam = await ensureTeam(admin, {
          userId: args.userId,
          email: args.email,
          plan: args.plan,
          interval,
          extraSeats,
          seatLimit,
          periodEnd: healedEnd,
          company: args.company,
          nowIso,
        });
      }
      await syncBillingSubscription(admin, {
        userId: args.userId,
        email: args.email?.trim().toLowerCase() || null,
        plan: args.plan,
        interval,
        extraSeats,
        seatLimit,
        amountSar,
        amountHalalas: Math.round(amountSar * 100),
        periodStart,
        periodEnd: healedEnd,
        teamId: healedTeam,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        locale: args.locale,
        promo: args.promo,
      });
      return { ok: true as const, idempotent: true, endDate: healedEnd };
    }
  }

  const email = args.email?.trim().toLowerCase() || null;
  let teamId: string | null = null;
  if (args.plan === "team" || args.plan === "enterprise") {
    teamId = await ensureTeam(admin, {
      userId: args.userId,
      email,
      plan: args.plan,
      interval,
      extraSeats,
      seatLimit,
      periodEnd: endIso,
      company: args.company,
      nowIso,
    });
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: args.userId,
      subscription_tier: args.plan,
      updated_at: nowIso,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw new Error(profileError.message || "Failed to save subscription to profile.");
  }

  const { error: oldErr } = await admin
    .from("subscriptions")
    .update({ status: "replaced", updated_at: nowIso })
    .eq("user_id", args.userId)
    .in("status", ["paid", "active"]);

  if (oldErr) {
    console.warn("subscriptions replace warn:", oldErr);
  }

  const { error: insertErr } = await admin.from("subscriptions").insert({
    user_id: args.userId,
    plan: args.plan,
    price: amountSar,
    currency: "SAR",
    status: "active",
    start_date: nowIso,
    end_date: endIso,
    created_at: nowIso,
    updated_at: nowIso,
  });

  if (insertErr) {
    throw new Error(insertErr.message || "Failed to write billing record.");
  }

  await syncBillingSubscription(admin, {
    userId: args.userId,
    email,
    plan: args.plan,
    interval,
    extraSeats,
    seatLimit,
    amountSar,
    amountHalalas: Math.round(amountSar * 100),
    periodStart,
    periodEnd: endIso,
    teamId,
    cancelAtPeriodEnd: args.cancelAtPeriodEnd,
    locale: args.locale,
    promo: args.promo,
  });

  return { ok: true as const, idempotent: false, endDate: endIso, amountSar, seatLimit };
}

async function ensureTeam(
  admin: SupabaseClient,
  args: {
    userId: string;
    email: string | null;
    plan: "team" | "enterprise";
    interval: BillingInterval;
    extraSeats: number;
    seatLimit: number;
    periodEnd: string;
    company?: string | null;
    nowIso: string;
  }
) {
  const email = args.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("An account email is required to activate a team subscription.");
  }

  const { data: existing, error: readErr } = await admin
    .from("teams")
    .select("id, name")
    .eq("owner_id", args.userId)
    .maybeSingle();

  if (readErr) {
    throw new Error(readErr.message || "Could not read team.");
  }

  const name =
    (args.company && args.company.trim()) ||
    (existing?.name as string | undefined) ||
    "Team";

  const payload = {
    owner_id: args.userId,
    name,
    plan: args.plan,
    seat_limit: args.seatLimit,
    extra_seats: args.extraSeats,
    billing_interval: args.interval,
    status: "active",
    current_period_end: args.periodEnd,
    updated_at: args.nowIso,
  };

  let teamId = existing?.id as string | undefined;

  if (teamId) {
    const { error } = await admin.from("teams").update(payload).eq("id", teamId);
    if (error) throw new Error(error.message || "Could not update team.");
  } else {
    const { data, error } = await admin
      .from("teams")
      .insert({ ...payload, created_at: args.nowIso })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message || "Could not create team.");
    teamId = data.id as string;
  }

  const { data: ownerRow, error: ownerReadErr } = await admin
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("role", "owner")
    .maybeSingle();

  if (ownerReadErr) {
    throw new Error(ownerReadErr.message || "Could not read team owner.");
  }

  if (ownerRow?.id) {
    const { error } = await admin
      .from("team_members")
      .update({
        user_id: args.userId,
        email,
        role: "owner",
        status: "active",
        accepted_at: args.nowIso,
        invite_token: null,
        invite_expires_at: null,
      })
      .eq("id", ownerRow.id);
    if (error) throw new Error(error.message || "Could not update team owner.");
  } else {
    const { error } = await admin.from("team_members").insert({
      team_id: teamId,
      user_id: args.userId,
      email,
      role: "owner",
      status: "active",
      accepted_at: args.nowIso,
      invited_at: args.nowIso,
      created_at: args.nowIso,
    });
    if (error) throw new Error(error.message || "Could not add team owner.");
  }

  return teamId;
}

export async function findUserIdByEmail(admin: SupabaseClient, email: string) {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await admin.rpc("user_id_by_email", {
    target_email: normalized,
  });
  if (error) {
    throw new Error(error.message || "Could not look up that email.");
  }
  if (!data || typeof data !== "string") return null;
  return data;
}
