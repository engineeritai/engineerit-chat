import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { memberId?: string } | null;
    const memberId = body?.memberId;
    if (!memberId) {
      return NextResponse.json({ error: "Missing member." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 500 });
    if (!team) {
      return NextResponse.json({ error: "Only the team owner can remove members." }, { status: 403 });
    }

    const { data: member, error: memberErr } = await admin
      .from("team_members")
      .select("id, role, team_id")
      .eq("id", memberId)
      .maybeSingle();

    if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });
    if (!member || member.team_id !== team.id) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }
    if (member.role === "owner") {
      return NextResponse.json({ error: "The owner seat cannot be removed." }, { status: 400 });
    }

    const { error } = await admin
      .from("team_members")
      .update({ status: "removed", invite_token: null, invite_expires_at: null })
      .eq("id", member.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/team/members", err);
    return NextResponse.json({ error: "Could not remove member." }, { status: 500 });
  }
}
