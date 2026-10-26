/** Direction of a shared answer, taken from the words rather than the interface language. */

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_RUN = /[A-Za-z0-9][A-Za-z0-9./%:+#-]*/g;

/** Right-to-left mark. A plain-text line that starts with this opens on the right. */
export const RLM = "\u200F";

function letterCounts(text: string): { arabic: number; latin: number; first: "ar" | "en" | "" } {
  const stripped = text.replace(/https?:\/\/\S+/g, " ").replace(/```[\s\S]*?```/g, " ");
  let arabic = 0;
  let latin = 0;
  let first: "ar" | "en" | "" = "";
  for (const ch of stripped) {
    if (ARABIC.test(ch)) {
      arabic += 1;
      if (!first) first = "ar";
    } else if (/[A-Za-z]/.test(ch)) {
      latin += 1;
      if (!first) first = "en";
    }
  }
  return { arabic, latin, first };
}

/** True when the text is an Arabic answer, including one that embeds Latin words or numbers. */
export function hasArabicContent(text: string): boolean {
  const { arabic, latin, first } = letterCounts(text);
  if (arabic === 0) return false;
  if (arabic >= latin) return true;
  return first === "ar" && arabic >= 12;
}

/**
 * Language of a share. Arabic content stays Arabic when it was shared from an English interface.
 * An Arabic interface still applies when the answer itself is English.
 */
export function shareLanguage(text: string, locale: "en" | "ar"): "en" | "ar" {
  if (hasArabicContent(text)) return "ar";
  return locale === "ar" ? "ar" : "en";
}

export function shareDir(text: string, locale: "en" | "ar"): "rtl" | "ltr" {
  return shareLanguage(text, locale) === "ar" ? "rtl" : "ltr";
}

/** Per-block direction. Mixed paragraphs use auto so each side keeps its own order. */
export function blockDirection(text: string): "rtl" | "ltr" | "auto" {
  const arabic = ARABIC.test(text);
  const latin = /[A-Za-z]/.test(text);
  if (arabic && latin) return "auto";
  if (arabic) return "rtl";
  if (latin) return "ltr";
  return "auto";
}

/** Latin words and European numbers, split out so they can be isolated inside Arabic. */
export function isolatePieces(text: string): { text: string; isolate: boolean }[] {
  const pieces: { text: string; isolate: boolean }[] = [];
  let last = 0;
  for (const match of text.matchAll(LATIN_RUN)) {
    const index = match.index ?? 0;
    if (index > last) pieces.push({ text: text.slice(last, index), isolate: false });
    pieces.push({ text: match[0], isolate: true });
    last = index + match[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last), isolate: false });
  return pieces.length ? pieces : [{ text, isolate: false }];
}

/** Prefix Arabic lines so a plain-text or WhatsApp paste opens on the right. */
export function markRtlPlain(text: string): string {
  const arabicDoc = hasArabicContent(text);
  if (!arabicDoc && !ARABIC.test(text)) return text;
  return text
    .split("\n")
    .map((line) => {
      if (!line || line.startsWith(RLM)) return line;
      const hasArabic = ARABIC.test(line);
      const startsLatin = /^\s*[A-Za-z]/.test(line);
      if (hasArabic || (arabicDoc && line.trim() && !startsLatin)) return `${RLM}${line}`;
      return line;
    })
    .join("\n");
}
