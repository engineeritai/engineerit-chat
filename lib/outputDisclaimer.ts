import type { UiLocale } from "@/lib/replyLanguage";

/**
 * Short notice derived from the live user policy at /legal/terms.
 * Section 1: outputs are drafts and must be verified.
 * Section 2 and the signup line: engineerit.ai is not responsible for
 * decisions based on its outputs.
 * The policy does not say "AI can make mistakes" or mention losses.
 * "can be wrong" / "قد تكون خاطئة" is the plain reading of those clauses.
 */
export const OUTPUT_POLICY_URL: Record<UiLocale, string> = {
  en: "https://engineerit.ai/legal/terms",
  ar: "https://engineerit.ai/legal/terms?lang=ar",
};

export function outputDisclaimerBody(locale: UiLocale): string {
  if (locale === "ar") {
    return "مخرجات الذكاء الاصطناعي مسودات فقط وقد تكون خاطئة. أنت مسؤول عن التحقق منها. engineerit.ai غير مسؤول عن القرارات المبنية على مخرجاته.";
  }
  return "AI outputs are drafts only and can be wrong. You are responsible for verifying them. engineerit.ai is not responsible for decisions based on its outputs.";
}

export function outputDisclaimer(locale: UiLocale): string {
  return `${outputDisclaimerBody(locale)} ${OUTPUT_POLICY_URL[locale]}`;
}

export function isOutputDisclaimer(text: string, locale: UiLocale): boolean {
  const plain = text.replace(/\s+/g, " ").trim();
  return plain === outputDisclaimer(locale) || plain === outputDisclaimerBody(locale);
}
