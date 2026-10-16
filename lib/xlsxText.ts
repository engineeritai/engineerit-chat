import JSZip from "jszip";

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

function textFromRuns(inner: string): string {
  const cleaned = inner
    .replace(/<rPh\b[\s\S]*?<\/rPh>/g, "")
    .replace(/<phoneticPr\b[^>]*\/>/g, "");
  const parts: string[] = [];
  const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let match: RegExpExecArray | null;
  while ((match = tRe.exec(cleaned))) {
    parts.push(decodeXml(match[1]));
  }
  return parts.join("");
}

/** Shared-string table. Empty entries stay in place so cell indexes still match. */
export function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const siRe = /<si\b[^>]*>[\s\S]*?<\/si>|<si\b[^>]*\/>/g;
  let match: RegExpExecArray | null;
  while ((match = siRe.exec(xml))) {
    strings.push(textFromRuns(match[0]));
  }
  return strings;
}

function columnIndex(cellRef: string | undefined): number | null {
  if (!cellRef) return null;
  const letters = /^([A-Z]+)/i.exec(cellRef)?.[1];
  if (!letters) return null;
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

function cellValue(attrs: string, inner: string, shared: string[]): string {
  const type = /\bt="([^"]+)"/.exec(attrs)?.[1] ?? "n";
  if (type === "inlineStr") return textFromRuns(inner);
  const raw = decodeXml(/<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "").trim();
  if (type === "s") {
    const index = Number(raw);
    return Number.isInteger(index) && shared[index] != null ? shared[index] : "";
  }
  if (type === "b") return raw === "1" ? "TRUE" : raw === "0" ? "FALSE" : raw;
  if (type === "e") return "";
  // t="n", missing type (numeric), and t="str" (cached formula text) live in <v>.
  return raw;
}

function extractSheet(xml: string, shared: string[]): string {
  const rows: string[] = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(xml))) {
    const cols: string[] = [];
    const cellRe = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      const attrs = cellMatch[1];
      const value = cellValue(attrs, cellMatch[2] ?? "", shared);
      if (value === "") continue;
      const index = columnIndex(/\br="([^"]+)"/.exec(attrs)?.[1]);
      if (index == null || index < 0) {
        cols.push(value);
        continue;
      }
      while (cols.length < index) cols.push("");
      cols[index] = value;
    }
    const line = cols.join("\t").replace(/\t+$/g, "");
    if (line.trim()) rows.push(line);
  }
  return rows.join("\n");
}

/**
 * Read worksheet cells, including numeric values stored inline in sheet XML.
 * Shared strings alone drop every number, date serial, and formula result.
 */
export async function extractXlsxText(zip: JSZip): Promise<string> {
  const sharedFile = zip.file("xl/sharedStrings.xml");
  const shared = sharedFile ? parseSharedStrings(await sharedFile.async("text")) : [];

  const sheetNames = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = Number(/sheet(\d+)/i.exec(a)?.[1] ?? 0);
      const nb = Number(/sheet(\d+)/i.exec(b)?.[1] ?? 0);
      return na - nb;
    });

  const sections: string[] = [];
  for (const name of sheetNames) {
    const file = zip.file(name);
    if (!file) continue;
    const text = extractSheet(await file.async("text"), shared);
    if (text) sections.push(text);
  }

  if (sections.length > 0) return sections.join("\n\n");

  // No cell rows (unusual). Keep the previous shared-string dump so text-only
  // workbooks still produce something.
  return shared.filter((value) => value.trim()).join("\n");
}
