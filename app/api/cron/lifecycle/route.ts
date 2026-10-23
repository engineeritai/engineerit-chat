import { NextResponse } from "next/server";
import { loadLifecycleCandidates } from "@/lib/lifecycleAudience";
import {
  lifecycleBatchLimit,
  lifecycleCronAuthorized,
  lifecycleEmailsEnabled,
} from "@/lib/lifecycleMail";
import { supabaseLifecycleMailer } from "@/lib/lifecycleQueue";
import { runLifecycleEmails } from "@/lib/lifecycleRun";
import { appBaseUrl, deliverMail } from "@/lib/mail";
import { getSupabaseAdmin } from "@/lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appOrigin() {
  return appBaseUrl() || "https://engineerit.ai";
}

async function run(req: Request) {
  if (!lifecycleCronAuthorized(req.headers.get("authorization"), req.headers.get("x-cron-secret"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  const enabled = lifecycleEmailsEnabled();
  if (!enabled && !dryRun) {
    return NextResponse.json({ ok: true, enabled: false, dryRun: false, sent: 0 });
  }
  try {
    const admin = getSupabaseAdmin();
    const now = new Date();
    const users = await loadLifecycleCandidates(admin, now);
    const result = await runLifecycleEmails({
      now,
      enabled,
      dryRun,
      limit: lifecycleBatchLimit(),
      secret: process.env.CRON_SECRET || "",
      appUrl: appOrigin(),
      users,
      mailer: supabaseLifecycleMailer(admin),
      deliver: (message) => deliverMail({ ...message, headers: req.headers }),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("lifecycle cron", err);
    return NextResponse.json({ error: "Lifecycle run failed." }, { status: 500 });
  }
}

export function GET(req: Request) {
  return run(req);
}

export function POST(req: Request) {
  return run(req);
}
