import { parseMessage, plainInline, tokenizeInline, type ListItem } from "@/lib/messageDocument";

function cleanMarks(value: string): string {
  return value.replace(/[*_~`#]/g, "").replace(/\s+/g, " ").trim();
}

function inline(text: string): string {
  return tokenizeInline(text)
    .map((token) => {
      if (token.type === "link") return `${cleanMarks(token.text)} (${token.href})`;
      const value = cleanMarks(token.text);
      return token.bold && value ? `*${value}*` : value;
    })
    .join("")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function list(items: ListItem[], ordered: boolean, depth: number): string {
  return items
    .map((item, index) => {
      const marker = ordered ? `${index + 1}.` : "•";
      const pad = "  ".repeat(depth);
      const nested = item.children.length ? `\n${list(item.children, item.orderedChildren, depth + 1)}` : "";
      return `${pad}${marker} ${inline(item.text)}${nested}`;
    })
    .join("\n");
}

function flowLine(source: string): string {
  const labeled = [...source.matchAll(/\w+\s*\[\s*"?([^\]"]+)"?\s*\]/g)]
    .map((match) => cleanMarks(match[1] || ""))
    .filter(Boolean);
  if (labeled.length >= 2) return labeled.join(" → ");
  const nodes: string[] = [];
  for (const match of source.matchAll(/([A-Za-z0-9_]+)\s*-->(?:\|[^|]*\|)?\s*([A-Za-z0-9_]+)/g)) {
    if (!nodes.length) nodes.push(match[1]);
    if (nodes[nodes.length - 1] !== match[2]) nodes.push(match[2]);
  }
  return nodes.length >= 2 ? nodes.join(" → ") : "";
}

/** WhatsApp text: *bold*, • bullets, numbered lines, and no markdown fences. */
export function toWhatsApp(markdown: string, link?: string): string {
  const parts: string[] = [];
  for (const block of parseMessage(markdown)) {
    if (block.type === "heading") {
      const title = cleanMarks(plainInline(block.text));
      if (title) parts.push(`*${title}*`);
    } else if (block.type === "paragraph") {
      const text = inline(block.text);
      if (text) parts.push(text);
    } else if (block.type === "list") {
      parts.push(list(block.items, block.ordered, 0));
    } else if (block.type === "table") {
      const header = block.headers.map((cell) => `*${cleanMarks(plainInline(cell))}*`).join(" | ");
      const rows = block.rows.map((row) => row.map((cell) => cleanMarks(plainInline(cell))).join(" | "));
      parts.push([header, ...rows].join("\n"));
    } else if (block.type === "diagram") {
      const line = flowLine(block.source);
      if (line) parts.push(line);
    } else if (block.type === "chart") {
      const title = cleanMarks(block.model.title) || "Schedule";
      if (block.model.kind === "gantt") {
        parts.push([`*${title}*`, ...block.model.tasks.map((task) => `• ${cleanMarks(task.name)}`)].join("\n"));
      } else {
        parts.push(`*${title}*`);
      }
    }
  }
  let text = parts.filter(Boolean).join("\n\n").replace(/```/g, "").replace(/^#{1,6}\s+/gm, "").trim();
  const href = (link || "").trim();
  if (href && !text.includes(href)) text = text ? `${text}\n\n${href}` : href;
  return text;
}
