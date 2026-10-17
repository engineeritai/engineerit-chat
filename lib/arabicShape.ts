/**
 * pdf-lib draws glyphs from left to right, and its font engine already
 * applies Arabic joining to a logical word. Reversing presentation forms
 * before that pass mirrors the word and breaks the connections.
 * These helpers only choose visual token order. They leave letters logical
 * so the font can shape them.
 */

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

export function containsArabic(text: string): boolean {
  return ARABIC.test(text);
}

function paragraphRtl(text: string): boolean {
  for (const ch of text) {
    if (ARABIC.test(ch)) return true;
    if (/[A-Za-z]/.test(ch)) return false;
  }
  return false;
}

/** Tokens in the order a left-to-right canvas should paint them. */
export function visualTokens(text: string): string[] {
  const parts = text.split(/(\s+)/).filter((part) => part.length > 0);
  if (!parts.length) return [""];
  return paragraphRtl(text) ? parts.reverse() : parts;
}
