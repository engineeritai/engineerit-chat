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

/**
 * Short page-footer line. The lead is plain; only the policy words are a link.
 * WhatsApp and the document exports keep the longer sentence in outputDisclaimer.
 */
export const PAGE_DISCLAIMER_HREF = "https://engineerit.ai/legal/terms";

export const PAGE_DISCLAIMER_LEAD: Record<UiLocale, string> = {
  en: "AI-generated, ",
  ar: "مُولَّد بالذكاء الاصطناعي، ",
};

export const PAGE_DISCLAIMER_LINK: Record<UiLocale, string> = {
  en: "User Policy Applied",
  ar: "تُطبَّق سياسة الاستخدام",
};

/** Footer and chat-line colour only. Brand, stamps, and subtitles stay darker. */
export const OUTPUT_DISCLAIMER_GRAY = "#9CA3AF";

export function pageDisclaimerHtml(locale: UiLocale): string {
  const lead = PAGE_DISCLAIMER_LEAD[locale].replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const link = PAGE_DISCLAIMER_LINK[locale].replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `${lead}<a href="${PAGE_DISCLAIMER_HREF}">${link}</a>`;
}

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

/** Unit and quantity columns are centred. Other take-off columns keep their own alignment. */
export function isCenteredBoqColumn(header: string): boolean {
  const name = header.replace(/\s+/g, " ").trim();
  return QUANTITY_UNIT.test(name) || QUANTITY_AMOUNT.test(name);
}

export function isOutputDisclaimer(text: string, locale: UiLocale): boolean {
  const plain = text.replace(/\s+/g, " ").trim();
  const locales: UiLocale[] = [locale, locale === "ar" ? "en" : "ar"];
  return locales.some((item) => {
    const body = outputDisclaimerBody(item);
    return plain === outputDisclaimer(item) || plain === `${body} ${OUTPUT_POLICY_LABEL}` || plain === body || plain.startsWith(`${body} `);
  });
}
