import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data: sub, error } = await admin
    .from("billing_subscriptions")
    .select(
      "id, plan, billing_interval, extra_seats, seat_limit, amount_sar, status, current_period_end, cancel_at_period_end, credit_halalas, failure_count, next_retry_at, saved_card_id"
    )
    .eq("user_id", user.id)
    .in("status", ["active", "past_due"])
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let card: { brand: string | null; last_four: string | null; status: string } | null = null;
  if (sub?.saved_card_id) {
    const { data } = await admin
      .from("saved_cards")
      .select("brand, last_four, status")
      .eq("id", sub.saved_card_id)
      .maybeSingle();
    card = data;
  }
  return NextResponse.json({ subscription: sub, card });
}
