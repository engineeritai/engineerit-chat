import { NextResponse } from "next/server";
import { lifecycleUserFromToken, unsubscribePage } from "@/lib/lifecycleMail";
import { recordLifecycleOptOut } from "@/lib/lifecycleQueue";
import { getSupabaseAdmin } from "@/lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function html(body: string, status: number) {
  return new NextResponse(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function unsubscribe(req: Request) {
  const secret = process.env.CRON_SECRET || process.env.LIFECYCLE_UNSUBSCRIBE_SECRET || "";
  if (!secret) return html(unsubscribePage("unconfigured"), 500);
  const token = new URL(req.url).searchParams.get("token") || "";
  const userId = lifecycleUserFromToken(token, secret);
  if (!userId) return html(unsubscribePage("invalid"), 400);
  try {
    await recordLifecycleOptOut(getSupabaseAdmin(), userId);
  } catch (err) {
    console.error("lifecycle unsubscribe", err);
    return html(unsubscribePage("unconfigured"), 500);
  }
  return html(unsubscribePage("done"), 200);
}

export function GET(req: Request) {
  return unsubscribe(req);
}

export function POST(req: Request) {
  return unsubscribe(req);
}
