import { NextResponse } from "next/server";
import { featureTier, type PlanId } from "@/lib/plans";
import { returnUserToAssistant } from "@/lib/returnToFree";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";
import type { UiLocale } from "@/lib/replyLanguage";

/** File analysis, including a drawing take-off, is a paid plan. Assistant and guests are not. */
export function fileAnalysisAllowed(planId: string | null | undefined): boolean {
  return featureTier(planId) !== "assistant";
}

const COPY = {
  en: {
    signIn: "Sign in to analyze a drawing or a file.",
    locked: "File analysis and quantity take-off are included from the Engineer plan upward.",
    unavailable: "File analysis is unavailable until the plan can be confirmed. Sign in again.",
  },
  ar: {
    signIn: "سجل الدخول لتحليل الرسم أو الملف.",
    locked: "تحليل الملفات وحصر الكميات متاحان من باقة المهندس فما فوق.",
    unavailable: "تحليل الملفات غير متاح حتى يتم التأكد من الباقة. سجل الدخول مرة أخرى.",
  },
} as const;

export async function assertFileAnalysisAccess(
  req: Request,
  locale: UiLocale
): Promise<{ ok: true; userId: string; plan: PlanId } | { ok: false; response: NextResponse }> {
  const copy = COPY[locale];
  const user = await getUserFromRequest(req).catch(() => null);
  if (!user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: copy.signIn, code: "sign_in" }, { status: 401 }),
    };
  }
  try {
    const access = await returnUserToAssistant(getSupabaseAdmin(), user.id);
    if (!fileAnalysisAllowed(access.plan)) {
      return {
        ok: false,
        response: NextResponse.json({ error: copy.locked, code: "locked" }, { status: 403 }),
      };
    }
    return { ok: true, userId: user.id, plan: access.plan };
  } catch (err) {
    console.error("file analysis plan", err);
    return {
      ok: false,
      response: NextResponse.json({ error: copy.unavailable, code: "locked" }, { status: 403 }),
    };
  }
}
