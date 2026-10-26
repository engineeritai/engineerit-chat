import { flowSvg } from "@/lib/flowSvg";
import { riyadhStamp } from "@/lib/ksaTime";
import { parseMessage, plainInline, tokenizeInline, type Block, type ListItem } from "@/lib/messageDocument";
import { isOutputDisclaimer, outputDisclaimerBody, OUTPUT_DISCLAIMER_GRAY, OUTPUT_POLICY_URL } from "@/lib/outputDisclaimer";
import { renderChartSvg } from "@/lib/scheduleSvg";

export function shareDescription(markdown: string): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`|[\]\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 180);
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineHtml(value: string): string {
  return tokenizeInline(value)
    .map((token) => {
      if (token.type === "link") return `<a href="${esc(token.href)}">${esc(token.text)}</a>`;
      const text = esc(token.text);
      return token.bold ? `<strong>${text}</strong>` : text;
    })
    .join("");
}

function listHtml(ordered: boolean, items: ListItem[]): string {
  const tag = ordered ? "ol" : "ul";
  const body = items
    .map((item, index) => {
      const nested = item.children.length ? listHtml(item.orderedChildren, item.children) : "";
      return `<li${ordered ? ` value="${index + 1}"` : ""}>${inlineHtml(item.text)}${nested}</li>`;
    })
    .join("");
  return `<${tag}>${body}</${tag}>`;
}

function blocksHtml(blocks: Block[], dir: "ltr" | "rtl", locale: "en" | "ar"): string {
  return blocks
    .map((block) => {
      if (block.type === "heading") return `<h${block.level}>${inlineHtml(block.text)}</h${block.level}>`;
      if (block.type === "paragraph") {
        if (isOutputDisclaimer(plainInline(block.text), locale)) return "";
        return `<p>${inlineHtml(block.text)}</p>`;
      }
      if (block.type === "list") return listHtml(block.ordered, block.items);
      if (block.type === "table") {
        const head = block.headers.map((cell) => `<th>${inlineHtml(cell)}</th>`).join("");
        const body = block.rows
          .map((row) => `<tr>${block.headers.map((_, cell) => `<td>${inlineHtml(row[cell] ?? "")}</td>`).join("")}</tr>`)
          .join("");
        return `<div class="table-scroll" dir="${dir}"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
      }
      if (block.type === "chart") {
        const svg = renderChartSvg(block.model, dir, "light");
        return `<figure class="chart"><figcaption>${esc(block.model.title)}</figcaption>${svg}</figure>`;
      }
      if (block.type === "diagram") {
        const svg = flowSvg(block.source, dir);
        return svg ? `<figure class="chart">${svg}</figure>` : `<pre class="diagram">${esc(block.source)}</pre>`;
      }
      return `<pre>${esc(block.text)}</pre>`;
    })
    .join("\n");
}

export function buildShareHtml(args: {
  title: string;
  markdown: string;
  locale: "en" | "ar";
  origin?: string;
  id?: string;
  now?: Date;
}): string {
  const dir = args.locale === "ar" ? "rtl" : "ltr";
  const stamp = riyadhStamp(args.now ?? new Date(), args.locale);
  const description = shareDescription(args.markdown);
  const blocks = parseMessage(args.markdown);
  const image = args.origin && args.id ? `${args.origin}/share/${args.id}/og` : `${args.origin || ""}/og.png`;
  const pageUrl = args.origin && args.id ? `${args.origin}/share/${args.id}` : "";
  return `<!doctype html>
<html lang="${args.locale}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(args.title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&amp;family=IBM+Plex+Sans+Arabic:wght@400;600;700&amp;display=swap"/>
<meta name="description" content="${esc(description)}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(args.title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:image" content="${esc(image)}"/>
${pageUrl ? `<meta property="og:url" content="${esc(pageUrl)}"/>` : ""}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(args.title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(image)}"/>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Noto Naskh Arabic", "IBM Plex Sans Arabic", "Noto Sans Arabic", Inter, "Segoe UI", sans-serif; color: #0f172a; background: #f5f7fb; }
  header, footer { display: flex; align-items: center; gap: 12px; padding: 16px 22px; background: #fff; }
  header { border-bottom: 3px solid #1a56ff; }
  header h1 { margin: 0; font-size: 22px; font-weight: 700; }
  header img, footer img { width: 28px; height: 28px; }
  main { max-width: 980px; margin: 0 auto; padding: 22px 16px 48px; }
  article { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 18px 16px; min-width: 0; }
  h2 { font-size: 18px; color: #1a56ff; }
  h3 { font-size: 16px; }
  p, li { line-height: 1.6; }
  .table-scroll { max-width: 100%; overflow-x: auto; overflow-y: hidden; border: 1px solid #d0d7e2; border-radius: 12px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #d0d7e2; padding: 8px 10px; text-align: start; white-space: normal; overflow-wrap: anywhere; vertical-align: top; min-width: 7em; }
  ol { list-style: decimal; counter-reset: msg-item; }
  ol > li { counter-increment: msg-item; }
  ol > li::marker { content: counter(msg-item) ". "; }
  ul { list-style: disc; }
  th { background: #e7eeff; color: #1e3a8a; position: sticky; top: 0; }
  th:first-child, td:first-child { position: sticky; inset-inline-start: 0; background: inherit; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  figure { margin: 16px 0; }
  figure svg { width: 100%; height: auto; }
  figcaption { font-size: 13px; color: #64748b; margin-bottom: 6px; }
  ul, ol { margin: 8px 0 12px; padding-inline-start: 1.3em; }
  li { margin: 3px 0; }
  li ul, li ol { margin: 4px 0; }
  strong { font-weight: 700; }
  footer { border-top: 1px solid #e5e7eb; color: #64748b; font-size: 13px; display: block; }
  .footer-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .output-disclaimer { margin: 0 0 8px; font-size: 11px; line-height: 1.45; color: ${OUTPUT_DISCLAIMER_GRAY}; }
  .output-disclaimer a { color: ${OUTPUT_DISCLAIMER_GRAY}; text-decoration: underline; }
  @media (max-width: 640px) { header h1 { font-size: 18px; } main { padding: 12px; } }
  @media print {
    body { background: #fff; }
    header, footer { position: fixed; left: 0; right: 0; background: #fff; }
    header { top: 0; }
    footer { bottom: 0; }
    main { padding-top: 78px; padding-bottom: 108px; }
    article { border: 0; }
    h1, h2, h3, h4, figure, table { break-inside: avoid; }
  }
</style>
</head>
<body>
<header>
  <img src="https://engineerit.ai/icon-192.png" alt="eit"/>
  <h1>${esc(args.title)}</h1>
</header>
<main>
  <article dir="${dir}">
    ${blocksHtml(blocks, dir, args.locale)}
  </article>
</main>
<footer>
  <p class="output-disclaimer">${esc(outputDisclaimerBody(args.locale))} <a href="${esc(OUTPUT_POLICY_URL[args.locale])}">${esc(OUTPUT_POLICY_URL[args.locale])}</a></p>
  <div class="footer-meta">
    <span><img src="https://engineerit.ai/icon-192.png" alt=""/> engineer it · engineerit.ai</span>
    <span>${esc(stamp)}</span>
  </div>
</footer>
</body>
</html>`;
}
