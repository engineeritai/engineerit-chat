import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }
  const admin = getSupabaseAdmin();
  const [subs, attempts, teams] = await Promise.all([
    admin
      .from("billing_subscriptions")
      .select("id, plan, status, amount_sar, billing_interval, seat_limit, current_period_end, failure_count, cancel_at_period_end, customer_email")
      .order("current_period_end", { ascending: true })
      .limit(50),
    admin
      .from("renewal_attempts")
      .select("id, kind, status, amount_halalas, attempt_number, error, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("teams")
      .select("id, name, plan, status, seat_limit, extra_seats, current_period_end")
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);
  return NextResponse.json({
    subscriptions: subs.data || [],
    attempts: attempts.data || [],
    teams: teams.data || [],
    errors: [subs.error?.message, attempts.error?.message, teams.error?.message].filter(Boolean),
  });
}
