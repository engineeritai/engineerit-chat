/**
 * Present Arabic for PDF engines that draw glyphs left to right
 * and do not shape cursive letters themselves.
 * Logical Arabic is converted to presentation forms, then reversed
 * so the first word sits on the right. Digit runs stay in order.
 */

const ARABIC_LETTER = /[\u0621-\u064A\u0671-\u06D3]/;
const STRONG_LATIN = /[A-Za-z]/;

type Forms = readonly [string, string, string, string];

/** isolated, final, initial, medial */
const DUAL: Record<string, Forms> = {
  "\u0628": ["\uFE8F", "\uFE90", "\uFE91", "\uFE92"],
  "\u062A": ["\uFE95", "\uFE96", "\uFE97", "\uFE98"],
  "\u062B": ["\uFE99", "\uFE9A", "\uFE9B", "\uFE9C"],
  "\u062C": ["\uFE9D", "\uFE9E", "\uFE9F", "\uFEA0"],
  "\u062D": ["\uFEA1", "\uFEA2", "\uFEA3", "\uFEA4"],
  "\u062E": ["\uFEA5", "\uFEA6", "\uFEA7", "\uFEA8"],
  "\u0633": ["\uFEB1", "\uFEB2", "\uFEB3", "\uFEB4"],
  "\u0634": ["\uFEB5", "\uFEB6", "\uFEB7", "\uFEB8"],
  "\u0635": ["\uFEB9", "\uFEBA", "\uFEBB", "\uFEBC"],
  "\u0636": ["\uFEBD", "\uFEBE", "\uFEBF", "\uFEC0"],
  "\u0637": ["\uFEC1", "\uFEC2", "\uFEC3", "\uFEC4"],
  "\u0638": ["\uFEC5", "\uFEC6", "\uFEC7", "\uFEC8"],
  "\u0639": ["\uFEC9", "\uFECA", "\uFECB", "\uFECC"],
  "\u063A": ["\uFECD", "\uFECE", "\uFECF", "\uFED0"],
  "\u0641": ["\uFED1", "\uFED2", "\uFED3", "\uFED4"],
  "\u0642": ["\uFED5", "\uFED6", "\uFED7", "\uFED8"],
  "\u0643": ["\uFED9", "\uFEDA", "\uFEDB", "\uFEDC"],
  "\u0644": ["\uFEDD", "\uFEDE", "\uFEDF", "\uFEE0"],
  "\u0645": ["\uFEE1", "\uFEE2", "\uFEE3", "\uFEE4"],
  "\u0646": ["\uFEE5", "\uFEE6", "\uFEE7", "\uFEE8"],
  "\u0647": ["\uFEE9", "\uFEEA", "\uFEEB", "\uFEEC"],
  "\u0626": ["\uFE89", "\uFE8A", "\uFE8B", "\uFE8C"],
  "\u064A": ["\uFEF1", "\uFEF2", "\uFEF3", "\uFEF4"],
};

const RIGHT: Record<string, Forms> = {
  "\u0627": ["\uFE8D", "\uFE8E", "\uFE8D", "\uFE8E"],
  "\u0623": ["\uFE83", "\uFE84", "\uFE83", "\uFE84"],
  "\u0625": ["\uFE87", "\uFE88", "\uFE87", "\uFE88"],
  "\u0622": ["\uFE81", "\uFE82", "\uFE81", "\uFE82"],
  "\u062F": ["\uFEA9", "\uFEAA", "\uFEA9", "\uFEAA"],
  "\u0630": ["\uFEAB", "\uFEAC", "\uFEAB", "\uFEAC"],
  "\u0631": ["\uFEAD", "\uFEAE", "\uFEAD", "\uFEAE"],
  "\u0632": ["\uFEAF", "\uFEB0", "\uFEAF", "\uFEB0"],
  "\u0648": ["\uFEED", "\uFEEE", "\uFEED", "\uFEEE"],
  "\u0624": ["\uFE85", "\uFE86", "\uFE85", "\uFE86"],
  "\u0629": ["\uFE93", "\uFE94", "\uFE93", "\uFE94"],
  "\u0649": ["\uFEEF", "\uFEF0", "\uFEEF", "\uFEF0"],
  "\u0621": ["\uFE80", "\uFE80", "\uFE80", "\uFE80"],
};

const LAM_ALEF: Record<string, readonly [string, string]> = {
  "\u0627": ["\uFEFB", "\uFEFC"],
  "\u0623": ["\uFEF7", "\uFEF8"],
  "\u0625": ["\uFEF9", "\uFEFA"],
  "\u0622": ["\uFEF5", "\uFEF6"],
};

function formsOf(ch: string): Forms | null {
  return DUAL[ch] ?? RIGHT[ch] ?? null;
}

function joinsForward(ch: string): boolean {
  return Boolean(DUAL[ch]);
}

function isLetter(ch: string | undefined): ch is string {
  return Boolean(ch && formsOf(ch));
}

function shapeLogical(text: string): string {
  const chars = [...text].filter((ch) => !/[\u064B-\u0652\u0670]/.test(ch));
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];
    const prev = chars[i - 1];
    const prevJoins = isLetter(prev) && joinsForward(prev);
    if (ch === "\u0644" && next && LAM_ALEF[next]) {
      out += LAM_ALEF[next][prevJoins ? 1 : 0];
      i += 1;
      continue;
    }
    const forms = formsOf(ch);
    if (!forms) {
      out += ch;
      continue;
    }
    const nextJoins = joinsForward(ch) && isLetter(next);
    const index = !prevJoins && !nextJoins ? 0 : prevJoins && nextJoins ? 3 : prevJoins ? 1 : 2;
    out += forms[index];
  }
  return out;
}

function reversePreserveNumbers(text: string): string {
  const parts = text.split(/(\d[\d.,]*)/g).filter((part) => part !== "");
  return parts
    .reverse()
    .map((part) => (/^\d/.test(part) ? part : [...part].reverse().join("")))
    .join("");
}

function shapeRtlRun(text: string): string {
  return reversePreserveNumbers(shapeLogical(text));
}

type Run = { rtl: boolean; text: string };

function splitRuns(line: string): Run[] {
  const runs: Run[] = [];
  let current = "";
  let rtl = false;
  const flush = () => {
    if (!current) return;
    runs.push({ rtl, text: current });
    current = "";
  };
  for (const ch of line) {
    const letter = ARABIC_LETTER.test(ch) || formsOf(ch) != null;
    if (!current) {
      rtl = letter;
      current = ch;
      continue;
    }
    if (letter === rtl || ch === " " || /\d/.test(ch)) {
      current += ch;
      continue;
    }
    flush();
    rtl = letter;
    current = ch;
  }
  flush();
  return runs;
}

export function containsArabic(text: string): boolean {
  return ARABIC_LETTER.test(text);
}

/** Visual string for a single line, safe to draw left to right. */
export function visualLine(line: string): string {
  if (!containsArabic(line)) return line;
  const runs = splitRuns(line).map((run) => (run.rtl ? shapeRtlRun(run.text) : run.text));
  const firstStrong = [...line].find((ch) => ARABIC_LETTER.test(ch) || STRONG_LATIN.test(ch));
  if (firstStrong && ARABIC_LETTER.test(firstStrong)) runs.reverse();
  return runs.join("");
}
