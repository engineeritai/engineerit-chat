import { NextResponse } from "next/server";
import { appBaseUrl, deliverMail } from "@/lib/mail";
import {
  reminderBatchLimit,
  reminderCronAuthorized,
  reminderEmailsEnabled,
  reminderEnqueueEnabled,
} from "@/lib/reminderMail";
import { loadReminderAudience, loadReminderQueue, supabaseReminderStore } from "@/lib/reminderQueue";
import { runReminderEmails } from "@/lib/reminderRun";
import { getSupabaseAdmin } from "@/lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appOrigin() {
  return appBaseUrl() || "https://engineerit.ai";
}

async function run(req: Request) {
  if (
    !reminderCronAuthorized(
      req.headers.get("authorization"),
      req.headers.get("x-cron-secret"),
      process.env.CRON_SECRET
    )
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  const enabled = reminderEmailsEnabled();
  const enqueue = reminderEnqueueEnabled();
  if (!enabled && !dryRun) {
    return NextResponse.json({ ok: true, enabled: false, dryRun: false, enqueue, sent: 0, stale: 0 });
  }
  try {
    const admin = getSupabaseAdmin();
    const now = new Date();
    const queue = await loadReminderQueue(admin, now);
    const audience = dryRun || enqueue ? await loadReminderAudience(admin) : { profiles: [], subscriptions: [] };
    const result = await runReminderEmails({
      now,
      enabled,
      dryRun,
      enqueue,
      limit: reminderBatchLimit(),
      secret: process.env.CRON_SECRET || "",
      appUrl: appOrigin(),
      rows: queue.rows,
      recentlySent: queue.recentlySent,
      optedOut: queue.optedOut,
      profiles: audience.profiles,
      subscriptions: audience.subscriptions,
      existingKeys: queue.existingKeys,
      store: supabaseReminderStore(admin),
      deliver: (message) => deliverMail({ ...message, headers: req.headers }),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("reminder cron", err);
    return NextResponse.json({ error: "Reminder run failed." }, { status: 500 });
  }
}

export function GET(req: Request) {
  return run(req);
}

export function POST(req: Request) {
  return run(req);
}
