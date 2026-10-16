import { NextResponse } from "next/server";
import { resolveAdvisorPrompt } from "@/lib/advisorPrompts";
import { hasAdvisorAccess, isAdvisorId, normalizeAdvisorPlan, type AdvisorId, type AdvisorPlanId } from "@/lib/advisors";
import { advisorsAreLive } from "@/lib/advisorLaunch";
import { isLocale, type Locale } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AdvisorGate =
  | { active: false }
  | { active: true; ok: true; advisorId: AdvisorId; locale: Locale; prompt: string }
  | { active: true; ok: false; response: NextResponse };

const LOCKED_MESSAGE =
  "AI Advisors are included on Consultant, Team, and Enterprise plans.";

const COMING_SOON_MESSAGE =
  "AI Advisors are coming soon. Playbooks are not open yet.";

/**
 * No advisor id → the existing chat / document path.
 * Unknown id → 400.
 * Known id before launch → 403, including entitled plans.
 * Known id on a locked plan → 403.
 *
 * The plan comes from the signed-in user's profiles.subscription_tier.
 * A plan id in the request body or form is ignored.
 */
export async function gateAdvisor(args: {
  request: Request;
  advisorId: unknown;
  locale: unknown;
  playbookId?: unknown;
}): Promise<AdvisorGate> {
  const { request, advisorId, locale, playbookId } = args;
  if (advisorId == null || advisorId === "") return { active: false };

  if (!isAdvisorId(advisorId)) {
    return {
      active: true,
      ok: false,
      response: NextResponse.json({ error: "Unknown advisor." }, { status: 400 }),
    };
  }

  if (!advisorsAreLive()) {
    return {
      active: true,
      ok: false,
      response: NextResponse.json(
        { error: COMING_SOON_MESSAGE, code: "coming_soon" },
        { status: 403 }
      ),
    };
  }

  const { planId, isGuest } = await resolveAdvisorPlan(request);
  if (!hasAdvisorAccess(planId, advisorId, isGuest)) {
    return {
      active: true,
      ok: false,
      response: NextResponse.json(
        { error: LOCKED_MESSAGE, code: "locked", upgrade: true },
        { status: 403 }
      ),
    };
  }

  const resolvedLocale: Locale = isLocale(locale) ? locale : "en";
  const prompt = resolveAdvisorPrompt(advisorId, resolvedLocale, playbookId);
  if (!prompt.ok) {
    return {
      active: true,
      ok: false,
      response: NextResponse.json(
        { error: "Unknown advisor or playbook." },
        { status: 400 }
      ),
    };
  }

  return {
    active: true,
    ok: true,
    advisorId,
    locale: resolvedLocale,
    prompt: prompt.prompt,
  };
}

/**
 * Verify the caller's Supabase access token, then read subscription_tier.
 * Missing or invalid token → guest. Unreadable profile → assistant (no advisors).
 * "pilot" and "trial" normalize to consultant inside normalizeAdvisorPlan.
 */
async function resolveAdvisorPlan(request: Request): Promise<{
  planId: AdvisorPlanId;
  isGuest: boolean;
}> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  const token = match?.[1];
  if (!token) return { planId: "guest", isGuest: true };

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return { planId: "guest", isGuest: true };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) return { planId: "assistant", isGuest: false };

    const raw = profile?.subscription_tier;
    return {
      planId: normalizeAdvisorPlan(raw == null ? "" : String(raw), false),
      isGuest: false,
    };
  } catch {
    return { planId: "guest", isGuest: true };
  }
}
