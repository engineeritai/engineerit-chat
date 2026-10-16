import { NextResponse } from "next/server";
import { teamGrantsAccess, type TeamAccessRow } from "@/lib/effectivePlan";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

function embedOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: owned, error: ownedErr } = await admin
      .from("teams")
      .select(
        "id, name, plan, seat_limit, extra_seats, billing_interval, status, current_period_end, owner_id"
      )
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownedErr) {
      return NextResponse.json({ error: ownedErr.message }, { status: 500 });
    }

    let team = owned;
    let isOwner = Boolean(owned);

    if (!team) {
      const { data: membership, error: memberErr } = await admin
        .from("team_members")
        .select(
          "role, status, teams(id, name, plan, seat_limit, extra_seats, billing_interval, status, current_period_end, owner_id)"
        )
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (memberErr) {
        return NextResponse.json({ error: memberErr.message }, { status: 500 });
      }

      team = embedOne(membership?.teams as typeof owned | typeof owned[] | null);
      isOwner = false;
    }

    if (!team) {
      return NextResponse.json({ team: null, members: [], isOwner: false, access: false });
    }

    const { data: members, error: listErr } = await admin
      .from("team_members")
      .select("id, email, role, status, accepted_at, invited_at")
      .eq("team_id", team.id)
      .order("role", { ascending: true });

    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }

    const access = teamGrantsAccess(team as TeamAccessRow);
    const occupied = (members || []).filter(
      (member) => member.status === "active" || member.status === "invited"
    ).length;

    return NextResponse.json({
      team,
      members: members || [],
      isOwner,
      access,
      seatsUsed: occupied,
      seatsAvailable: Math.max(0, Number(team.seat_limit || 0) - occupied),
    });
  } catch (err) {
    console.error("GET /api/team", err);
    return NextResponse.json({ error: "Could not load team." }, { status: 500 });
  }
}
