import { NextResponse } from "next/server";
import { runDueRenewals } from "@/lib/renewals";
import { returnExpiredPlans } from "@/lib/returnToFree";
import { expireStaleCheckouts } from "@/lib/staleCheckouts";
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
    const dryRun = new URL(req.url).searchParams.get("dry") === "1";
    const now = new Date();
    const results = await runDueRenewals(admin, now, { dryRun });
    let returned: { id: string; plan: string }[] = [];
    if (!dryRun) {
      try {
        returned = await returnExpiredPlans(admin, now);
      } catch (err) {
        console.error("return to assistant", err);
      }
    }
    let stale: { id: string; action: string }[] = [];
    let staleError = "";
    if (!dryRun) {
      try {
        stale = await expireStaleCheckouts(admin, now);
      } catch (err) {
        staleError = err instanceof Error ? err.message : "Could not review old checkouts.";
        console.error("stale checkouts", err);
      }
    }
    return NextResponse.json({
      ok: true,
      dryRun,
      processed: results.length,
      results,
      returned,
      stale,
      ...(staleError ? { staleError } : {}),
    });
  } catch (err) {
    console.error("renewal cron", err);
    return NextResponse.json({ error: "Renewal run failed." }, { status: 500 });
  }
}
