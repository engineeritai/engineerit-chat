import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { memberId?: string } | null;
  const memberId = (body?.memberId || "").trim();
  if (!memberId) return NextResponse.json({ error: "Missing member." }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: team } = await admin
    .from("teams")
    .select("id, owner_id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: "Only the owner can transfer the team." }, { status: 403 });

  const { data: member } = await admin
    .from("team_members")
    .select("id, user_id, email, role, status, team_id")
    .eq("id", memberId)
    .maybeSingle();
  if (!member || member.team_id !== team.id || member.status !== "active" || !member.user_id) {
    return NextResponse.json({ error: "Choose an active member with an account." }, { status: 400 });
  }
  if (member.user_id === user.id) {
    return NextResponse.json({ error: "You already own this team." }, { status: 400 });
  }

  const { data: otherTeam } = await admin
    .from("teams")
    .select("id")
    .eq("owner_id", member.user_id)
    .maybeSingle();
  if (otherTeam) {
    return NextResponse.json({ error: "That person already owns a team." }, { status: 409 });
  }

  const { data: otherBilling } = await admin
    .from("billing_subscriptions")
    .select("id")
    .eq("user_id", member.user_id)
    .in("status", ["active", "past_due"])
    .maybeSingle();
  if (otherBilling) {
    return NextResponse.json(
      { error: "That person already has a subscription. They need to cancel it before taking ownership." },
      { status: 409 }
    );
  }

  const nowIso = new Date().toISOString();
  const { error: ownerErr } = await admin
    .from("teams")
    .update({ owner_id: member.user_id, updated_at: nowIso })
    .eq("id", team.id);
  if (ownerErr) return NextResponse.json({ error: ownerErr.message }, { status: 500 });

  await admin.from("team_members").update({ role: "member" }).eq("team_id", team.id).eq("user_id", user.id);
  await admin.from("team_members").update({ role: "owner" }).eq("id", member.id);
  await admin
    .from("billing_subscriptions")
    .update({ user_id: member.user_id, customer_email: member.email, updated_at: nowIso })
    .eq("team_id", team.id)
    .in("status", ["active", "past_due"]);

  return NextResponse.json({ ok: true });
}
