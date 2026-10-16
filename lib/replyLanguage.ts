export type UiLocale = "en" | "ar";

export function uiLocale(value: unknown): UiLocale {
  return value === "ar" ? "ar" : "en";
}

/** Default reply language is the selected interface language. */
export function replyLanguageRule(locale: UiLocale): string {
  if (locale === "ar") {
    return "The interface language is Arabic. Reply entirely in Arabic. If the user's latest message is written in English, reply entirely in English. Do not mix English and Arabic in one reply.";
  }
  return "The interface language is English. Reply entirely in English. If the user's latest message is written in Arabic, reply entirely in Arabic. Do not mix English and Arabic in one reply.";
}
