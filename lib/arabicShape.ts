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

function isLatinToken(token: string): boolean {
  return /[A-Za-z0-9]/.test(token) && !ARABIC.test(token);
}

/** Split a word where Latin or digits sit against Arabic, including "PDF،". */
function splitMixed(token: string): string[] {
  if (/^\s+$/.test(token)) return [token];
  const pieces: string[] = [];
  let buf = "";
  let kind: "ar" | "lat" | "other" | "" = "";
  const classify = (ch: string): "ar" | "lat" | "other" => {
    if (ARABIC.test(ch)) return "ar";
    if (/[A-Za-z0-9]/.test(ch)) return "lat";
    return "other";
  };
  for (const ch of token) {
    const next = classify(ch);
    if (!kind || kind === "other" || next === "other") {
      buf += ch;
      if (next !== "other") kind = next;
      else if (!kind) kind = "other";
      continue;
    }
    if (next !== kind) {
      pieces.push(buf);
      buf = ch;
      kind = next;
      continue;
    }
    buf += ch;
  }
  if (buf) pieces.push(buf);
  return pieces.length ? pieces : [token];
}

/**
 * Tokens in the order a left-to-right canvas should paint them.
 * An Arabic line reverses word order, but a run of Latin words stays
 * in reading order ("engineer it", not "it engineer").
 */
export function visualTokens(text: string): string[] {
  const parts = text.split(/(\s+)/).flatMap(splitMixed).filter((part) => part.length > 0);
  if (!parts.length) return [""];
  if (!paragraphRtl(text)) return parts;
  const groups: string[][] = [];
  let latin: string[] | null = null;
  const flush = () => {
    if (!latin) return;
    groups.push(latin);
    latin = null;
  };
  for (let i = 0; i < parts.length; i++) {
    const token = parts[i];
    const latinWord = !/^\s+$/.test(token) && isLatinToken(token);
    if (latinWord) {
      (latin ??= []).push(token);
      continue;
    }
    if (latin && /^\s+$/.test(token) && i + 1 < parts.length && isLatinToken(parts[i + 1])) {
      latin.push(token);
      continue;
    }
    flush();
    groups.push([token]);
  }
  flush();
  return groups.reverse().flat();
}

/** Logical runs for a host bidi engine. Latin stays an LTR run inside Arabic. */
export function directionalRuns(text: string): { text: string; rtl: boolean }[] {
  const parts = text.split(/(\s+)/).flatMap(splitMixed).filter((part) => part.length > 0);
  const dirOf = (token: string): boolean | null => {
    if (ARABIC.test(token)) return true;
    if (/[A-Za-z]/.test(token)) return false;
    return null;
  };
  const groups: { text: string; rtl: boolean }[] = [];
  let current: { text: string; rtl: boolean } | null = null;
  let pending = "";
  const flushPending = (rtl: boolean) => {
    if (!pending) return;
    if (current && current.rtl === rtl) current.text += pending;
    else {
      if (current) groups.push(current);
      current = { rtl, text: pending };
    }
    pending = "";
  };
  for (const token of parts) {
    const dir = dirOf(token);
    if (dir === null) {
      pending += token;
      continue;
    }
    flushPending(current?.rtl ?? dir);
    if (current && current.rtl === dir) current.text += token;
    else {
      if (current) groups.push(current);
      current = { rtl: dir, text: token };
    }
  }
  if (pending) flushPending(current?.rtl ?? false);
  if (current) groups.push(current);
  return groups.length ? groups : [{ text: text || " ", rtl: false }];
}
