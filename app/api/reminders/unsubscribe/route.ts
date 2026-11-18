import { NextResponse } from "next/server";
import { reminderUnsubscribePage, reminderUserFromToken } from "@/lib/reminderMail";
import { recordReminderOptOut } from "@/lib/reminderQueue";
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
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return html(reminderUnsubscribePage("unconfigured"), 500);
  const token = new URL(req.url).searchParams.get("token") || "";
  const userId = reminderUserFromToken(token, secret);
  if (!userId) return html(reminderUnsubscribePage("invalid"), 400);
  try {
    await recordReminderOptOut(getSupabaseAdmin(), userId);
  } catch (err) {
    console.error("reminder unsubscribe", err);
    return html(reminderUnsubscribePage("unconfigured"), 500);
  }
  return html(reminderUnsubscribePage("done"), 200);
}

export function GET(req: Request) {
  return unsubscribe(req);
}

export function POST(req: Request) {
  return unsubscribe(req);
}
