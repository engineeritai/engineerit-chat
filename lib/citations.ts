export type WebSource = { title: string; url: string };

type Annotation = { type?: string; url?: string; title?: string };
type OutputPart = { type?: string; text?: string; annotations?: Annotation[] };
type OutputItem = { type?: string; content?: OutputPart[] };

export type SearchResponse = {
  output_text?: string;
  output?: OutputItem[];
};

export function sourcesFromResponse(response: SearchResponse): { text: string; sources: WebSource[] } {
  const sources: WebSource[] = [];
  const seen = new Set<string>();
  let text = response.output_text?.trim() || "";
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && part.text?.trim()) text = part.text.trim();
      for (const note of part.annotations ?? []) {
        if (note.type !== "url_citation" || !note.url || seen.has(note.url)) continue;
        seen.add(note.url);
        sources.push({ title: (note.title || note.url).trim(), url: note.url });
      }
    }
  }
  return { text, sources };
}

export function appendSources(reply: string, sources: WebSource[], locale: "en" | "ar"): string {
  const fresh = sources.filter((source) => !reply.includes(source.url));
  if (!fresh.length) return reply.trim();
  const heading = locale === "ar" ? "المصادر" : "Sources";
  const lines = fresh.map((source, index) => `${index + 1}. [${source.title}](${source.url})`);
  return `${reply.trim()}\n\n**${heading}**\n${lines.join("\n")}`;
}
