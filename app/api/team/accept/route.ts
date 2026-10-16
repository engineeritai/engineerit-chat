import { NextResponse } from "next/server";
import { teamGrantsAccess, type TeamAccessRow } from "@/lib/effectivePlan";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

function embedOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { token?: string } | null;
    const token = (body?.token || "").trim();
    if (!token) {
      return NextResponse.json({ error: "Missing invite token." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: row, error } = await admin
      .from("team_members")
      .select("id, email, status, user_id, invite_expires_at, teams(plan, status, current_period_end, name)")
      .eq("invite_token", token)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!row) {
      return NextResponse.json(
        { error: "This invite is no longer valid. Ask the team owner to send a new one." },
        { status: 404 }
      );
    }

    const invitedEmail = String(row.email || "").toLowerCase();
    if (invitedEmail !== user.email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: `Sign in with ${invitedEmail} to accept this invite.` },
        { status: 403 }
      );
    }

    if (row.status === "active" && row.user_id === user.id) {
      return NextResponse.json({ ok: true, already: true });
    }

    if (row.invite_expires_at && new Date(row.invite_expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "This invite has expired. Ask the team owner to send it again." },
        { status: 410 }
      );
    }

    const team = embedOne(row.teams as TeamAccessRow | TeamAccessRow[] | null);
    if (!teamGrantsAccess(team)) {
      return NextResponse.json(
        { error: "This team subscription is not active." },
        { status: 409 }
      );
    }

    const { error: updateErr } = await admin
      .from("team_members")
      .update({
        user_id: user.id,
        status: "active",
        accepted_at: new Date().toISOString(),
        invite_token: null,
      })
      .eq("id", row.id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/team/accept", err);
    return NextResponse.json({ error: "Could not accept the invite." }, { status: 500 });
  }
}
