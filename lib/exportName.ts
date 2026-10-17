const GENERIC = new Set(["", "engineer it", "engineerit.ai", "engineerit-ai", "new chat", "محادثة جديدة", "engineering report", "تقرير هندسي"]);

const TRAILING =
  /^(process|workflow|diagram|diagrams|overview|report|summary|guide|flowchart|flow|chart|map|procedure|description|simplified|شرح|عملية|مخطط|تقرير)$/i;

const LEADING = /^(simplified|simple|basic|a|an|the)$/i;

const SMALL = new Set(["a", "an", "the", "of", "and", "or", "for", "in", "on", "to", "with", "by"]);

function clean(value: string | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function titleCase(text: string): string {
  if (/[\u0600-\u06FF]/.test(text) || /[A-Z]/.test(text)) return text;
  return text
    .split(" ")
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && SMALL.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** Main topic only: 2–6 words, without a subtitle, company clause, or trailing descriptor. */
export function shortTopic(source: string | undefined, fallback = ""): string {
  let text = clean(source);
  if (!text || GENERIC.has(text.toLowerCase())) return fallback;
  text = text.split(/\s+[–—]\s+|\s+-\s+|:\s+/)[0].replace(/[?؟.]+$/g, "").trim();
  let words = text.split(" ").filter(Boolean);
  while (words.length > 2 && LEADING.test(words[0])) words.shift();
  while (words.length > 2 && TRAILING.test(words[words.length - 1])) words.pop();
  if (words.length > 6) words = words.slice(0, 6);
  const topic = titleCase(words.join(" ")).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").trim().slice(0, 80).trim();
  return topic || fallback;
}

/** Cover line for the clause that was left out of the short title. */
export function coverSubtitle(source: string | undefined, locale: "en" | "ar"): string {
  const text = clean(source);
  const parts = text.split(/\s+[–—]\s+|\s+-\s+|:\s+/);
  const rest = parts.slice(1).join(" – ").trim();
  if (rest) return rest.slice(0, 160);
  return locale === "ar" ? "تقرير هندسي" : "Engineering report";
}

export function pickTopicSource(requested: string | undefined, prompt: string | undefined, heading: string | undefined): string {
  for (const value of [requested, prompt, heading]) {
    const text = clean(value);
    if (text && !GENERIC.has(text.toLowerCase())) return text;
  }
  return "";
}

/** Filename is the topic plus an extension. Arabic is kept. No brand or date suffix. */
export function downloadName(topic: string, extension: string): string {
  const ext = extension.replace(/^\./, "").toLowerCase() || "pdf";
  const base = (topic || "Report")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .replace(/[. ]+$/g, "");
  return `${base || "Report"}.${ext}`;
}

export function contentDisposition(topic: string, extension: string): string {
  const name = downloadName(topic, extension);
  const ext = extension.replace(/^\./, "").toLowerCase();
  const asciiBase = name
    .slice(0, -(ext.length + 1))
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/["\\]/g, "")
    .trim();
  const ascii = `${asciiBase || "report"}.${ext}`;
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
