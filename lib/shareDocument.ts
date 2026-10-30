import { flowSvg } from "@/lib/flowSvg";
import { riyadhStamp } from "@/lib/ksaTime";
import { parseMessage, plainInline, tokenizeInline, type Block, type ListItem } from "@/lib/messageDocument";
import { isCenteredBoqColumn, isOutputDisclaimer, OUTPUT_DISCLAIMER_GRAY, pageDisclaimerHtml } from "@/lib/outputDisclaimer";
import { renderChartSvg } from "@/lib/scheduleSvg";
import { blockDirection, hasArabicContent, isolatePieces, shareDir, shareLanguage } from "@/lib/shareDirection";

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

function isolatedHtml(value: string, force = false): string {
  if (!/[\u0600-\u06FF]/.test(value)) {
    // One isolate keeps a formula such as "40 × 7.95 + 54 × 5.95" in source order inside an RTL cell.
    return force ? `<bdi dir="ltr">${esc(value)}</bdi>` : esc(value);
  }
  return isolatePieces(value)
    .map((piece) => (piece.isolate ? `<bdi dir="ltr">${esc(piece.text)}</bdi>` : esc(piece.text)))
    .join("");
}

function inlineHtml(value: string, forceIsolate = false): string {
  const isolate = forceIsolate || /[\u0600-\u06FF]/.test(value);
  return tokenizeInline(value)
    .map((token) => {
      if (token.type === "link") {
        const label = isolate ? `<bdi dir="ltr">${esc(token.text)}</bdi>` : esc(token.text);
        return `<a href="${esc(token.href)}">${label}</a>`;
      }
      const text = isolate ? isolatedHtml(token.text, forceIsolate) : esc(token.text);
      return token.bold ? `<strong>${text}</strong>` : text;
    })
    .join("");
}

function listText(items: ListItem[]): string {
  return items.map((item) => `${item.text}\n${listText(item.children)}`).join("\n");
}

function listHtml(ordered: boolean, items: ListItem[], docDir: "ltr" | "rtl"): string {
  const tag = ordered ? "ol" : "ul";
  const dir = hasArabicContent(listText(items)) ? "rtl" : docDir;
  const body = items
    .map((item, index) => {
      const nested = item.children.length ? listHtml(item.orderedChildren, item.children, docDir) : "";
      return `<li dir="${blockDirection(item.text)}"${ordered ? ` value="${index + 1}"` : ""}>${inlineHtml(item.text)}${nested}</li>`;
    })
    .join("");
  return `<${tag} dir="${dir}">${body}</${tag}>`;
}

function blocksHtml(blocks: Block[], dir: "ltr" | "rtl", locale: "en" | "ar"): string {
  return blocks
    .map((block) => {
      if (block.type === "heading") {
        return `<h${block.level} dir="${blockDirection(block.text)}">${inlineHtml(block.text)}</h${block.level}>`;
      }
      if (block.type === "paragraph") {
        const plain = plainInline(block.text);
        if (isOutputDisclaimer(plain, locale) || isOutputDisclaimer(plain, locale === "ar" ? "en" : "ar")) return "";
        return `<p dir="${blockDirection(block.text)}">${inlineHtml(block.text)}</p>`;
      }
      if (block.type === "list") return listHtml(block.ordered, block.items, dir);
      if (block.type === "table") {
        const tableText = [...block.headers, ...block.rows.flat()].join("\n");
        const tableDir = hasArabicContent(tableText) ? "rtl" : dir;
        const isolate = tableDir === "rtl";
        const measure = block.headers.map((cell) => isCenteredBoqColumn(plainInline(cell)));
        const head = block.headers
          .map((cell, index) => `<th${measure[index] ? ' class="measure"' : ""}>${inlineHtml(cell, isolate)}</th>`)
          .join("");
        const body = block.rows
          .map(
            (row) =>
              `<tr>${block.headers
                .map((_, cell) => `<td${measure[cell] ? ' class="measure"' : ""}>${inlineHtml(row[cell] ?? "", isolate)}</td>`)
                .join("")}</tr>`
          )
          .join("");
        return `<div class="table-scroll" dir="${tableDir}"><table dir="${tableDir}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
      }
      if (block.type === "chart") {
        const svg = renderChartSvg(block.model, dir, "light");
        return `<figure class="chart"><figcaption>${esc(block.model.title)}</figcaption>${svg}</figure>`;
      }
      if (block.type === "diagram") {
        const svg = flowSvg(block.source, dir);
        return svg ? `<figure class="chart">${svg}</figure>` : `<pre class="diagram">${esc(block.source)}</pre>`;
      }
      return `<pre dir="ltr">${esc(block.text)}</pre>`;
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
  const lang = shareLanguage(args.markdown, args.locale);
  const dir = shareDir(args.markdown, args.locale);
  const stamp = riyadhStamp(args.now ?? new Date(), lang);
  const description = shareDescription(args.markdown);
  const blocks = parseMessage(args.markdown);
  const image = args.origin && args.id ? `${args.origin}/share/${args.id}/og` : `${args.origin || ""}/og.png`;
  const pageUrl = args.origin && args.id ? `${args.origin}/share/${args.id}` : "";
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
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
<meta property="og:locale" content="${lang === "ar" ? "ar_SA" : "en_US"}"/>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Noto Naskh Arabic", "IBM Plex Sans Arabic", "Noto Sans Arabic", Inter, "Segoe UI", sans-serif; color: #0f172a; background: #f5f7fb; text-align: start; }
  bdi { unicode-bidi: isolate; }
  header, footer { background: #fff; }
  header { display: flex; align-items: center; gap: 12px; padding: 16px 22px; border-bottom: 3px solid #1a56ff; direction: ltr; }
  header h1 { margin: 0; font-size: 22px; font-weight: 700; }
  [dir="rtl"] header h1 { margin-inline-start: auto; text-align: right; }
  header img { width: 28px; height: 28px; }
  main { max-width: 980px; margin: 0 auto; padding: 22px 16px 8px; }
  article { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 18px 16px; min-width: 0; }
  h2 { font-size: 18px; color: #1a56ff; }
  h3 { font-size: 16px; }
  p, li, h1, h2, h3 { line-height: 1.6; text-align: start; }
  .table-scroll { max-width: 100%; overflow-x: auto; overflow-y: hidden; border: 1px solid #d0d7e2; border-radius: 12px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #d0d7e2; padding: 8px 10px; text-align: start; white-space: normal; overflow-wrap: anywhere; vertical-align: top; min-width: 7em; }
  th.measure, td.measure { text-align: center; }
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
  ul, ol { margin: 8px 0 12px; padding-left: 0; padding-right: 0; padding-inline-start: 1.3em; text-align: start; }
  li { margin: 3px 0; }
  li ul, li ol { margin: 4px 0; }
  strong { font-weight: 700; }
  footer { border-top: 1px solid #e5e7eb; color: #64748b; font-size: 13px; display: block; padding: 0; }
  .footer-inner { max-width: 980px; margin: 0 auto; box-sizing: border-box; padding: 12px calc(16px + 16px) calc(20px + env(safe-area-inset-bottom, 0px)); }
  .footer-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; flex-wrap: nowrap; font-size: 12px; }
  .footer-brand { display: inline-flex; align-items: baseline; gap: 6px; white-space: nowrap; }
  .footer-brand img { width: 16px; height: 16px; align-self: center; }
  .footer-stamp { flex: 0 0 auto; white-space: nowrap; }
  .output-disclaimer { margin: 0 0 8px; font-size: 12px; line-height: 1.35; color: ${OUTPUT_DISCLAIMER_GRAY}; white-space: nowrap; }
  .output-disclaimer a { color: ${OUTPUT_DISCLAIMER_GRAY}; text-decoration: underline; text-underline-offset: 2px; }
  @media (max-width: 640px) { header h1 { font-size: 18px; } main { padding: 12px 16px 8px; } }
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
<body dir="${dir}" lang="${lang}">
<header>
  <img src="https://engineerit.ai/icon-192.png" alt="eit"/>
  <h1 dir="${blockDirection(args.title)}">${isolatedHtml(args.title)}</h1>
</header>
<main>
  <article dir="${dir}" lang="${lang}">
    ${blocksHtml(blocks, dir, lang)}
  </article>
</main>
<footer dir="${dir}">
  <div class="footer-inner">
    <p class="output-disclaimer" dir="${dir}">${pageDisclaimerHtml(lang)}</p>
    <div class="footer-meta">
      <span class="footer-brand"><img src="https://engineerit.ai/icon-192.png" alt="eit" width="16" height="16"/> <span>engineer it · engineerit.ai</span></span>
      <span class="footer-stamp">${esc(stamp)}</span>
    </div>
  </div>
</footer>
</body>
</html>`;
}
