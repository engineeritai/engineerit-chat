import { NextResponse } from "next/server";
import { purgeExpiredConversations } from "@/lib/historyDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }
  try {
    const removed = await purgeExpiredConversations();
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    console.error("history cleanup failed", err);
    return NextResponse.json({ code: "failed" }, { status: 500 });
  }
}

export function GET(request: Request) {
  return run(request);
}

export function POST(request: Request) {
  return run(request);
}
