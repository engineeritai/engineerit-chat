import { NextResponse } from "next/server";
import { returnUserToAssistant } from "@/lib/returnToFree";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  normalizeSubscriptionTier,
  type SubscriptionTier,
} from "@/lib/historyRetention";

export type HistoryAccount = {
  userId: string;
  tier: SubscriptionTier;
  rawTier: string;
  teamIds: string[];
};

export type HistoryGate =
  | { ok: true; account: HistoryAccount }
  | { ok: false; response: NextResponse };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function historyCode(status: number, code: string) {
  return NextResponse.json({ code }, { status });
}

export async function loadHistoryAccount(userId: string): Promise<HistoryAccount> {
  await returnUserToAssistant(supabaseAdmin, userId).catch((err) => {
    console.error("return to assistant", err);
  });

  const teamIds = new Set<string>();
  let rawTier = "assistant";

  const withTeam = await supabaseAdmin
    .from("profiles")
    .select("subscription_tier, team_id")
    .eq("id", userId)
    .maybeSingle();

  if (withTeam.error) {
    const fallback = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .maybeSingle();
    rawTier = fallback.data?.subscription_tier ? String(fallback.data.subscription_tier) : "assistant";
  } else {
    rawTier = withTeam.data?.subscription_tier
      ? String(withTeam.data.subscription_tier)
      : "assistant";
    const teamId = withTeam.data?.team_id ? String(withTeam.data.team_id) : "";
    if (isUuid(teamId)) teamIds.add(teamId);
  }

  const activeMembers = await supabaseAdmin
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .eq("status", "active");
  const members = activeMembers.error
    ? await supabaseAdmin.from("team_members").select("team_id").eq("user_id", userId)
    : activeMembers;

  if (!members.error && members.data) {
    for (const row of members.data) {
      const teamId = row.team_id ? String(row.team_id) : "";
      if (isUuid(teamId)) teamIds.add(teamId);
    }
  }

  const ownedTeams = await supabaseAdmin.from("teams").select("id").eq("owner_id", userId);
  if (!ownedTeams.error && ownedTeams.data) {
    for (const row of ownedTeams.data) {
      const teamId = row.id ? String(row.id) : "";
      if (isUuid(teamId)) teamIds.add(teamId);
    }
  }

  return {
    userId,
    rawTier,
    tier: normalizeSubscriptionTier(rawTier),
    teamIds: [...teamIds],
  };
}

export async function requireHistoryUser(request: Request): Promise<HistoryGate> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  if (!match) return { ok: false, response: historyCode(401, "unauthorized") };

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(match[1]);
    if (error || !data.user) return { ok: false, response: historyCode(401, "unauthorized") };
    const account = await loadHistoryAccount(data.user.id);
    return { ok: true, account };
  } catch (err) {
    console.error("history auth failed", err);
    return { ok: false, response: historyCode(401, "unauthorized") };
  }
}
