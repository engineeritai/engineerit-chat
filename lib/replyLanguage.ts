export type UiLocale = "en" | "ar";
export type ReplyLanguage = UiLocale;

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

export function uiLocale(value: unknown): UiLocale {
  return value === "ar" ? "ar" : "en";
}

/** The language of the user's own text. Arabic if it contains Arabic letters, otherwise English. */
export function chosenLanguage(text: string | null | undefined): ReplyLanguage {
  return ARABIC.test(text || "") ? "ar" : "en";
}

/**
 * Whole-reply language. The interface language is the default.
 * A latest message written in the other language switches the entire reply.
 */
export function replyLanguage(locale: unknown, latestMessage?: string | null): UiLocale {
  const ui = uiLocale(locale);
  const text = (latestMessage || "").trim();
  if (!text) return ui;
  const written = chosenLanguage(text);
  return written === ui ? ui : written;
}

/** Default reply language is the selected interface language. */
export function replyLanguageRule(locale: UiLocale): string {
  if (locale === "ar") {
    return "The interface language is Arabic. Reply entirely in Arabic. If the user's latest message is written in English, reply entirely in English. Do not mix English and Arabic in one reply.";
  }
  return "The interface language is English. Reply entirely in English. If the user's latest message is written in Arabic, reply entirely in Arabic. Do not mix English and Arabic in one reply.";
}
