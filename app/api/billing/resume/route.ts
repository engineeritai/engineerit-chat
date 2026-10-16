import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = getSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("billing_subscriptions")
    .update({ cancel_at_period_end: false, canceled_at: null, updated_at: nowIso })
    .eq("user_id", user.id)
    .in("status", ["active", "past_due"])
    .gt("current_period_end", nowIso)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Nothing to resume." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
