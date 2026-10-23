import { NextResponse } from "next/server";
import { resolveAdvisorPrompt } from "@/lib/advisorPrompts";
import {
  hasAdvisorAccess,
  isAdvisorId,
  resolveAdvisorAccessPlan,
  unlockPlanForAdvisor,
  type AdvisorId,
  type AdvisorPlanId,
} from "@/lib/advisors";
import { resolveEffectivePlan } from "@/lib/effectivePlan";
import { returnUserToAssistant } from "@/lib/returnToFree";
import { advisorsAreLive } from "@/lib/advisorLaunch";
import { isLocale, translate, type Locale } from "@/lib/i18n";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AdvisorGate =
  | { active: false }
  | { active: true; ok: true; advisorId: AdvisorId; locale: Locale; prompt: string }
  | { active: true; ok: false; response: NextResponse };

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

  const resolvedLocale: Locale = isLocale(locale) ? locale : "en";
  const copy = translate(resolvedLocale);

  if (!isAdvisorId(advisorId)) {
    return {
      active: true,
      ok: false,
      response: NextResponse.json(
        { error: resolvedLocale === "ar" ? "مستشار غير معروف." : "Unknown advisor." },
        { status: 400 }
      ),
    };
  }

  if (!advisorsAreLive()) {
    return {
      active: true,
      ok: false,
      response: NextResponse.json(
        { error: copy.advisors.comingSoonBody, code: "coming_soon" },
        { status: 403 }
      ),
    };
  }

  const { planId, isGuest } = await resolveAdvisorPlan(request);
  if (!hasAdvisorAccess(planId, advisorId, isGuest)) {
    const upgradePlan = unlockPlanForAdvisor(advisorId);
    const planName = copy.plans[upgradePlan];
    const advisorName = copy.advisors.items[advisorId].name;
    return {
      active: true,
      ok: false,
      response: NextResponse.json(
        {
          error:
            resolvedLocale === "ar"
              ? `${advisorName} مشمول في باقة ${planName}. الشراء عبر Moyasar.`
              : `${advisorName} is included on ${planName}. Buy that plan through Moyasar.`,
          code: "locked",
          upgrade: true,
          plan: upgradePlan,
        },
        { status: 403 }
      ),
    };
  }

  const prompt = resolveAdvisorPrompt(advisorId, resolvedLocale, playbookId);
  if (!prompt.ok) {
    return {
      active: true,
      ok: false,
      response: NextResponse.json(
        {
          error:
            resolvedLocale === "ar" ? "مستشار أو كتيب غير معروف." : "Unknown advisor or playbook.",
        },
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
 * Pilot and trial use profiles.advisor_trial_plan. Otherwise the effective plan
 * (an active team or enterprise seat included) decides each advisor.
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

    await returnUserToAssistant(supabaseAdmin, data.user.id).catch((err) => {
      console.error("return to assistant", err);
    });

    const selected = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier, advisor_trial_plan")
      .eq("id", data.user.id)
      .maybeSingle();

    let profile = selected.data;
    if (selected.error) {
      const fallback = await supabaseAdmin
        .from("profiles")
        .select("subscription_tier")
        .eq("id", data.user.id)
        .maybeSingle();
      if (fallback.error) return { planId: "assistant", isGuest: false };
      profile = fallback.data ? { ...fallback.data, advisor_trial_plan: null } : null;
    }

    const effective = await resolveEffectivePlan(supabaseAdmin, data.user.id).catch(() => "assistant" as const);
    return {
      planId: resolveAdvisorAccessPlan({
        tier: profile?.subscription_tier == null ? "" : String(profile.subscription_tier),
        trialPlan: profile?.advisor_trial_plan == null ? null : String(profile.advisor_trial_plan),
        effectivePlan: effective,
        isGuest: false,
      }),
      isGuest: false,
    };
  } catch {
    return { planId: "guest", isGuest: true };
  }
}
