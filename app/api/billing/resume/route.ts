import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = getSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data: open, error: readErr } = await admin
    .from("billing_subscriptions")
    .select("id, saved_card_id, current_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due"])
    .gt("current_period_end", nowIso)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!open) return NextResponse.json({ error: "Nothing to resume." }, { status: 404 });

  let cardActive = false;
  if (open.saved_card_id) {
    const { data: card } = await admin
      .from("saved_cards")
      .select("status")
      .eq("id", open.saved_card_id)
      .maybeSingle();
    cardActive = card?.status === "active";
  }
  if (!cardActive) {
    return NextResponse.json(
      { error: "Save a card before turning auto-renew on.", needsCard: true },
      { status: 409 }
    );
  }

  const { error } = await admin
    .from("billing_subscriptions")
    .update({ cancel_at_period_end: false, canceled_at: null, updated_at: nowIso })
    .eq("id", open.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
