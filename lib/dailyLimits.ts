import { retentionDaysForTier } from "@/lib/historyRetention";

/**
 * Daily reply caps are the spend guard for guest and free chats
 * (gpt-4o-mini plus web search). Paid plans stay uncapped here.
 * Engineer SAR 19, Professional SAR 41, Consultant SAR 99, Team SAR 449,
 * and Enterprise stay more valuable: no daily cap, file analysis, and
 * copy/share. Auth-email rate limits are a separate guard and are not set here.
 */
export const GUEST_DAILY_REPLIES = 3;
export const ASSISTANT_DAILY_REPLIES = 15;

export type LimitLocale = "en" | "ar";

/** Days a free Assistant chat is kept. Same value history retention uses. */
export function assistantHistoryDays() {
  return retentionDaysForTier("assistant") ?? 3;
}

/** Guest and the free Assistant plan are capped. Every paid plan is not. */
export function dailyReplyCap(planId: string | null | undefined): number {
  const plan = (planId || "guest").trim().toLowerCase();
  if (plan === "guest") return GUEST_DAILY_REPLIES;
  if (plan === "assistant" || plan === "free") return ASSISTANT_DAILY_REPLIES;
  return Number.POSITIVE_INFINITY;
}

/**
 * The free-account sentence. The pricing Free column and the FAQ use this
 * exact string, and the guest prompts repeat it rather than a different claim.
 */
export function freeAccountAllowance(locale: LimitLocale): string {
  const days = assistantHistoryDays();
  if (locale === "ar") {
    return `الحساب المجاني يشمل ${ASSISTANT_DAILY_REPLIES} ردا في اليوم ويحفظ المحادثات على كل الأجهزة لمدة ${days} أيام.`;
  }
  return `A free account includes ${ASSISTANT_DAILY_REPLIES} replies a day and keeps chats on every device for ${days} days.`;
}

export function guestAllowance(locale: LimitLocale): string {
  if (locale === "ar") return `الزائر يحصل على ${GUEST_DAILY_REPLIES} ردود في اليوم.`;
  return `Guests receive ${GUEST_DAILY_REPLIES} replies a day.`;
}

export function guestLimitNotice(locale: LimitLocale): string {
  if (locale === "ar") return `بلغت الحد اليومي (${GUEST_DAILY_REPLIES} ردود في اليوم).`;
  return `Daily limit reached (${GUEST_DAILY_REPLIES} replies a day).`;
}

export function assistantLimitNotice(locale: LimitLocale): string {
  if (locale === "ar") return `استخدمت ${ASSISTANT_DAILY_REPLIES} ردا اليوم في باقة المساعد المجانية.`;
  return `You have used today's ${ASSISTANT_DAILY_REPLIES} replies on the free Assistant plan.`;
}

export function dailyLimitError(locale: LimitLocale, plan: string): string {
  return plan === "guest" ? guestLimitNotice(locale) : assistantLimitNotice(locale);
}

/** FAQ answer. Contains guestAllowance and freeAccountAllowance unchanged. */
export function tryChatAnswer(locale: LimitLocale): string {
  if (locale === "ar") {
    return `نعم. المحادثة متاحة دون حساب. ${guestAllowance("ar")} ${freeAccountAllowance("ar")} باقات المهندس والمهندس المحترف والمهندس الاستشاري غير مقيدة بهذا الحد اليومي.`;
  }
  return `Yes. Open chat is available without an account. ${guestAllowance("en")} ${freeAccountAllowance("en")} Engineer, Professional Engineer, and Consultant Engineer are not capped by that daily limit.`;
}

export function guideSignupBody(locale: LimitLocale): string {
  if (locale === "ar") {
    return `افتح التسجيل وأنشئ حسابا. ${guestAllowance("ar")} ${freeAccountAllowance("ar")} الباقات المدفوعة ترفع هذا الحد اليومي.`;
  }
  return `Open registration and create an account. ${guestAllowance("en")} ${freeAccountAllowance("en")} Paid plans remove that daily cap.`;
}

export function guestLimitReply(locale: LimitLocale): string {
  return `${guestLimitNotice(locale)} ${freeAccountAllowance(locale)}`;
}

export function assistantLimitReply(locale: LimitLocale): string {
  if (locale === "ar") {
    return `بلغت الحد اليومي لباقة المساعد (${ASSISTANT_DAILY_REPLIES} ردا). باقة المهندس 19 ريال شهريا: بلا حد يومي للردود، مع تحليل ملفات وورد وإكسل وباوربوينت.`;
  }
  return `Daily limit reached on the free Assistant plan (${ASSISTANT_DAILY_REPLIES} replies). Engineer is SAR 19 a month: no daily reply cap, plus Word, Excel, and PowerPoint file analysis.`;
}

export function attachGuestNotice(locale: LimitLocale): string {
  if (locale === "ar") {
    return `إرفاق الملفات في باقة المهندس (19 ريال شهريا). ${freeAccountAllowance("ar")}`;
  }
  return `File attachments are on the Engineer plan (SAR 19 a month). ${freeAccountAllowance("en")}`;
}

export function registerLeadBefore(locale: LimitLocale): string {
  if (locale === "ar") {
    return `أنشئ حسابا مجانيا. ${freeAccountAllowance("ar")} الباقات المدفوعة تضيف محادثات بلا حد يومي وتصدير المحادثات حسب مزايا كل باقة (`;
  }
  return `Create a free account. ${freeAccountAllowance("en")} Paid plans add unlimited chats and chat export, according to each plan's features (`;
}
