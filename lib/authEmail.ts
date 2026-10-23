import { createClient } from "@supabase/supabase-js";
import { checkAuthRate, consumeAuthDaily } from "@/lib/authRateLimit";
import { isProductionMailRuntime, mailDecision } from "@/lib/mailPolicy";
import { isSelfServePlan } from "@/lib/plans";
import { RESET_REDIRECT } from "@/lib/password";
import { getSupabaseAdmin } from "@/lib/serverSupabase";
import { verifyTurnstile } from "@/lib/turnstile";

export type AuthEmailAction = "signup" | "reset" | "resend";

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}

export function authEmailMode(args: { email: string; testHeader?: string | null; env?: NodeJS.ProcessEnv }) {
  const decision = mailDecision({ to: args.email, testHeader: args.testHeader, env: args.env });
  return decision.deliver === "smtp" ? "send" : "sink";
}

function signupMetadata(
  fullName: string | undefined,
  pending?: { pendingPlan?: string; pendingInterval?: string; pendingSeats?: number } | null
) {
  const data: Record<string, string | number> = {};
  const name = (fullName || "").trim();
  if (name) data.full_name = name;
  if (pending && isSelfServePlan(pending.pendingPlan)) {
    data.pending_plan = pending.pendingPlan;
    data.pending_interval = pending.pendingInterval === "year" ? "year" : "month";
    const seats = Number(pending.pendingSeats);
    data.pending_seats = Number.isFinite(seats) ? Math.max(0, Math.floor(seats)) : 0;
  }
  return data;
}

function placeholderSupabase(env: NodeJS.ProcessEnv) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("example.supabase.co") || !env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY.length < 20;
}

/** Recovery or signup link from the admin API. GoTrue does not send mail for generateLink. */
export async function createAuthLinkWithoutEmail(args: {
  action: AuthEmailAction;
  email: string;
  password?: string;
  fullName?: string;
  env?: NodeJS.ProcessEnv;
}) {
  const env = args.env || process.env;
  if (placeholderSupabase(env)) return { ok: true, link: null as string | null };
  try {
    const admin = getSupabaseAdmin();
    const generated =
      args.action === "reset"
        ? await admin.auth.admin.generateLink({
            type: "recovery",
            email: args.email,
            options: { redirectTo: RESET_REDIRECT },
          })
        : await admin.auth.admin.generateLink({
            type: "signup",
            email: args.email,
            password: args.password || "sink-only-not-sent",
            options: {
              redirectTo: RESET_REDIRECT,
              data: signupMetadata(args.fullName, undefined),
            },
          });
    const { data, error } = generated;
    if (error) return { ok: false, link: null, error: error.message };
    return { ok: true, link: data.properties?.action_link || null };
  } catch (err) {
    return { ok: false, link: null, error: err instanceof Error ? err.message : "link failed" };
  }
}

export async function handleAuthEmail(req: Request, action: AuthEmailAction) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    password?: string;
    fullName?: string;
    captchaToken?: string;
    pendingPlan?: string;
    pendingInterval?: string;
    pendingSeats?: number;
  } | null;
  const email = (body?.email || "").trim().toLowerCase();
  const password = body?.password || "";
  const fullName = (body?.fullName || "").trim();
  if (!email.includes("@")) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (action === "signup" && password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const ip = clientIp(req);
  const captcha = await verifyTurnstile(body?.captchaToken || "", ip);
  if (!captcha.ok) {
    return Response.json({ error: "Complete the captcha and try again." }, { status: 400 });
  }

  const limited = checkAuthRate({ email, ip });
  if (!limited.ok) {
    return Response.json({ error: "Please wait a moment and try again.", scope: limited.scope }, { status: 429 });
  }

  const mode = authEmailMode({ email, testHeader: req.headers.get("x-engineerit-test") });
  if (mode === "sink") {
    if (!isProductionMailRuntime()) {
      const link = await createAuthLinkWithoutEmail({ action, email, password, fullName });
      console.info("[mail-sink] auth email suppressed", action, email, link.ok ? (link.link ? "link" : "no-link") : link.error);
    } else {
      console.info("[mail-sink] production test recipient suppressed", action, email);
    }
    return Response.json({ ok: true, sent: false, needsConfirmation: action === "signup" });
  }

  const daily = consumeAuthDaily();
  if (!daily.ok) {
    if (daily.alert && process.env.MAIL_ALERT_WEBHOOK) {
      void fetch(process.env.MAIL_ALERT_WEBHOOK, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alert: daily.alert }),
      }).catch(() => undefined);
    }
    return Response.json({ error: "Please wait a moment and try again.", scope: "daily" }, { status: 429 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return Response.json({ error: "Auth is not configured." }, { status: 500 });
  }
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const captchaToken = body?.captchaToken || undefined;
  if (action === "signup") {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: signupMetadata(fullName, body),
        captchaToken,
      },
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true, sent: true, needsConfirmation: !data.session, user: data.user });
  }
  if (action === "resend") {
    const { error } = await client.auth.resend({ type: "signup", email, options: { captchaToken } });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true, sent: true });
  }
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: RESET_REDIRECT, captchaToken });
  if (error) {
    const later = /rate|too many|over_email_send_rate/i.test(error.message);
    if (later) return Response.json({ error: "Please wait a moment and try again." }, { status: 429 });
    console.error("password reset", error.message);
  }
  return Response.json({ ok: true, sent: true });
}
