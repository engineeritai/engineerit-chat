import { NextResponse } from "next/server";
import { resolveAdvisorPrompt } from "@/lib/advisorPrompts";
import { hasAdvisorAccess, isAdvisorId, type AdvisorId } from "@/lib/advisors";
import { isLocale, type Locale } from "@/lib/i18n";

export type AdvisorGate =
  | { active: false }
  | { active: true; ok: true; advisorId: AdvisorId; locale: Locale; prompt: string }
  | { active: true; ok: false; response: NextResponse };

const LOCKED_MESSAGE =
  "AI Advisors are included on Consultant, Team, and Enterprise plans.";

/**
 * No advisor id → the existing chat / document path.
 * Unknown id → 400. Known id on a locked plan → 403.
 * Plan id is the same client-supplied tier the chat route already trusts.
 */
export function gateAdvisor(args: {
  advisorId: unknown;
  planId: unknown;
  locale: unknown;
  playbookId?: unknown;
}): AdvisorGate {
  const { advisorId, planId, locale, playbookId } = args;
  if (advisorId == null || advisorId === "") return { active: false };

  if (!isAdvisorId(advisorId)) {
    return {
      active: true,
      ok: false,
      response: NextResponse.json({ error: "Unknown advisor." }, { status: 400 }),
    };
  }

  const plan = typeof planId === "string" ? planId : "";
  const isGuest = !plan || plan === "guest";
  if (!hasAdvisorAccess(plan || "guest", advisorId, isGuest)) {
    return {
      active: true,
      ok: false,
      response: NextResponse.json(
        { error: LOCKED_MESSAGE, upgrade: true },
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
