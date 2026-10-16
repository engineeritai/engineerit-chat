import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("moyasar_invoices")
    .select("id, plan, billing_interval, amount_sar, seat_limit, paid_at, period_end, status, purpose")
    .eq("user_id", user.id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoices: data || [] });
}
