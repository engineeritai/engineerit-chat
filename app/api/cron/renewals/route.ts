import { NextResponse } from "next/server";
import { runDueRenewals } from "@/lib/renewals";
import { getSupabaseAdmin } from "@/lib/serverSupabase";

export const runtime = "nodejs";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const alt = req.headers.get("x-cron-secret") || "";
  return header === `Bearer ${secret}` || alt === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const admin = getSupabaseAdmin();
    const results = await runDueRenewals(admin, new Date());
    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (err) {
    console.error("renewal cron", err);
    return NextResponse.json({ error: "Renewal run failed." }, { status: 500 });
  }
}
