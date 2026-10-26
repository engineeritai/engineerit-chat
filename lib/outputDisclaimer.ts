import type { UiLocale } from "@/lib/replyLanguage";

/**
 * One-line notice. The live policy is /legal/terms (there is no /terms page).
 * The sentence is the owner's short form. Arabic is the same words without
 * vowel marks, matching the rest of the product.
 */
export const OUTPUT_POLICY_URL: Record<UiLocale, string> = {
  en: "https://engineerit.ai/legal/terms",
  ar: "https://engineerit.ai/legal/terms?lang=ar",
};

/** Visible label. The href is OUTPUT_POLICY_URL. */
export const OUTPUT_POLICY_LABEL = "engineerit.ai/legal/terms";

/** Footer and chat-line colour only. Brand, stamps, and subtitles stay darker. */
export const OUTPUT_DISCLAIMER_GRAY = "#9CA3AF";

export function outputDisclaimerBody(locale: UiLocale): string {
  if (locale === "ar") {
    return "مولد بالذكاء الاصطناعي وقد يحتوي على أخطاء. يرجى التحقق قبل الاستخدام. راجع";
  }
  return "AI-generated, may contain errors. Please verify before use. See";
}

/** Plain one-liner. The https URL is in the text so channels without hyperlinks stay clickable. */
export function outputDisclaimer(locale: UiLocale): string {
  return `${outputDisclaimerBody(locale)} ${OUTPUT_POLICY_URL[locale]}`;
}

const QUANTITY_UNIT = /^(unit|الوحدة)$/i;
const QUANTITY_AMOUNT = /^(quantity|qty|الكمية)$/i;

/** Take-off and bill-of-quantities tables have a unit column and a quantity column. */
export function isQuantityTable(headers: string[]): boolean {
  const cells = headers.map((header) => header.trim());
  return cells.some((header) => QUANTITY_UNIT.test(header)) && cells.some((header) => QUANTITY_AMOUNT.test(header));
}

export function isOutputDisclaimer(text: string, locale: UiLocale): boolean {
  const plain = text.replace(/\s+/g, " ").trim();
  const body = outputDisclaimerBody(locale);
  return (
    plain === outputDisclaimer(locale) ||
    plain === `${body} ${OUTPUT_POLICY_LABEL}` ||
    plain === body
  );
}
