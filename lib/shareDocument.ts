import { flowSvg } from "@/lib/flowSvg";
import { riyadhCoverDate } from "@/lib/ksaTime";
import { parseMessage, plainInline, tokenizeInline, type Block, type ListItem } from "@/lib/messageDocument";
import { isCenteredBoqColumn, isOutputDisclaimer, OUTPUT_DISCLAIMER_GRAY, pageDisclaimerHtml } from "@/lib/outputDisclaimer";
import { coverHtml, coverZone, ICON_URL, REPORT_FOOTER_LINE } from "@/lib/reportBrand";
import { asExportSvg, renderFittedChartParts } from "@/lib/scheduleSvg";
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
        const parts = renderFittedChartParts(block.model, dir).map((svg) => `<div class="chart-band">${svg}</div>`).join("");
        return `<figure class="chart"><figcaption>${esc(block.model.title)}</figcaption>${parts}</figure>`;
      }
      if (block.type === "diagram") {
        const svg = flowSvg(block.source, dir);
        return svg ? `<figure class="chart">${asExportSvg(svg)}</figure>` : `<pre class="diagram">${esc(block.source)}</pre>`;
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
  const now = args.now ?? new Date();
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
  body { margin: 0; display: flex; flex-direction: column; font-family: "Noto Naskh Arabic", "IBM Plex Sans Arabic", "Noto Sans Arabic", Inter, "Segoe UI", sans-serif; color: #14213D; background: #fff; text-align: start; }
  .cover { order: 1; }
  main { order: 2; }
  footer { order: 3; }
  bdi { unicode-bidi: isolate; }
  .runhead { display: none; }
  .runhead img { width: 16px; height: 16px; }
  .runhead-title { font-size: 12px; color: #5B6475; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cover { page: cover; position: relative; display: flex; flex-direction: column; min-height: 100vh; background: #fff; break-after: page; page-break-after: always; }
  main { page: content; }
  .cover-bar { height: 17px; background: #0D60E4; }
  .cover-body { margin: auto 0; padding: 48px 28px 12px; text-align: center; }
  .cover-mark { width: min(340px, 78%); height: auto; }
  .cover-rule { width: 112px; height: 2px; margin: 22px auto 26px; background: #0D60E4; }
  .cover-title { margin: 0; color: #14213D; font-size: 32px; line-height: 1.25; font-weight: 700; text-align: center; }
  .cover-sub { margin: 12px 0 0; color: #5B6475; font-size: 16px; text-align: center; }
  .cover-date { margin: 22px 0 0; color: #14213D; font-size: 15px; font-weight: 700; text-align: center; }
  .cover-zone { margin: 4px 0 0; color: #5B6475; font-size: 12px; text-align: center; }
  .cover-contact { padding: 0 24px 40px; text-align: center; }
  .cover-site { color: #0D60E4; font-weight: 700; font-size: 15px; text-align: center; }
  .cover-mail { color: #5B6475; font-size: 12px; margin-top: 2px; text-align: center; }
  main { max-width: 980px; margin: 0 auto; padding: 8px 16px 8px; }
  article { background: #fff; padding: 18px 16px; min-width: 0; }
  article h1, article h2, article h3, article h4 { color: #0D60E4; }
  h2 { font-size: 22px; }
  h3 { font-size: 18px; }
  p, li, h1, h2, h3 { line-height: 1.6; text-align: start; }
  .table-scroll { max-width: 100%; overflow: visible; border: 1px solid #D9E2F2; border-radius: 12px; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  th, td { border: 1px solid #D9E2F2; padding: 8px 10px; text-align: start; white-space: normal; overflow-wrap: anywhere; vertical-align: top; min-width: 0; }
  th.measure, td.measure { text-align: center; }
  ol { list-style: decimal; counter-reset: msg-item; }
  ol > li { counter-increment: msg-item; }
  ol > li::marker { content: counter(msg-item) ". "; }
  ul { list-style: disc; }
  th { background: #0D60E4; color: #fff; }
  td { background: #fff; }
  figure, .chart-band { margin: 16px 0; max-width: 100%; }
  figure svg, .chart-band svg { display: block; width: 100%; max-width: 100%; height: auto; }
  .gantt-fit { position: relative; max-width: 100%; }
  .gantt-fit-names { position: absolute; top: 0; bottom: 0; width: 30.12%; display: grid; }
  .gantt-fit[dir="ltr"] .gantt-fit-names { left: 0; }
  .gantt-fit[dir="rtl"] .gantt-fit-names { right: 0; }
  .gantt-fit-name, .gantt-fit-head { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; padding-inline: 8px; font-size: clamp(9px, 1.5vw, 13px); line-height: 1.1; color: #0f172a; }
  .gantt-fit-name.is-group { font-weight: 700; }
  .chart-band { break-inside: avoid; page-break-inside: avoid; }
  figcaption { font-size: 13px; color: #64748b; margin-bottom: 6px; }
  ul, ol { margin: 8px 0 12px; padding-left: 0; padding-right: 0; padding-inline-start: 1.3em; text-align: start; }
  li { margin: 3px 0; }
  li ul, li ol { margin: 4px 0; }
  strong { font-weight: 700; }
  footer { border-top: 1px solid #D9E2F2; color: #14213D; font-size: 13px; display: block; padding: 0; background: #fff; }
  .footer-inner { max-width: 980px; margin: 0 auto; box-sizing: border-box; padding: 12px calc(16px + 16px) calc(20px + env(safe-area-inset-bottom, 0px)); }
  .footer-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; flex-wrap: nowrap; font-size: 12px; color: #14213D; }
  .footer-brand { display: inline-flex; align-items: baseline; gap: 6px; white-space: nowrap; }
  [dir="rtl"] .footer-brand { flex-direction: row-reverse; }
  .footer-brand img { width: 16px; height: 16px; align-self: center; }
  .page-of { display: none; }
  @page cover { margin: 0; }
  @page content {
    margin: 16mm 14mm 20mm;
    ${lang === "ar"
      ? `@top-left { content: "${args.title.replace(/["\\\n\r]/g, " ").replace(/\s+/g, " ").trim()}"; font-size: 10pt; color: #5B6475; font-family: "Noto Naskh Arabic", sans-serif; }
         @bottom-right { content: "مُولَّد بالذكاء الاصطناعي، تُطبَّق سياسة الاستخدام\\A engineerit.ai · support@engineerit.ai"; white-space: pre; font-size: 8pt; color: #14213D; font-family: "Noto Naskh Arabic", sans-serif; }
         @bottom-left { content: "صفحة " counter(page) " من " counter(pages); font-size: 9pt; color: #14213D; font-family: "Noto Naskh Arabic", sans-serif; }`
      : `@top-right { content: "${args.title.replace(/["\\\n\r]/g, " ").replace(/\s+/g, " ").trim()}"; font-size: 10pt; color: #5B6475; font-family: Inter, sans-serif; }
         @bottom-left { content: "AI-generated, User Policy Applied\\A engineerit.ai · support@engineerit.ai"; white-space: pre; font-size: 8pt; color: #14213D; font-family: Inter, sans-serif; }
         @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9pt; color: #14213D; font-family: Inter, sans-serif; }`}
  }
  .output-disclaimer { margin: 0 0 8px; font-size: 12px; line-height: 1.35; color: ${OUTPUT_DISCLAIMER_GRAY}; white-space: nowrap; }
  .output-disclaimer a { color: ${OUTPUT_DISCLAIMER_GRAY}; text-decoration: underline; text-underline-offset: 2px; }
  @media (max-width: 560px) {
    .cover-title { font-size: 22px; }
    .cover-body { padding: 36px 16px 8px; }
    main { padding: 8px 12px; }
    .table-scroll { overflow: visible; }
    table { table-layout: fixed; }
    th, td { min-width: 0; overflow-wrap: anywhere; font-size: 12px; padding: 6px; }
    .output-disclaimer { white-space: normal; }
  }
  @media print {
    body { background: #fff; }
    .runhead, footer { position: fixed; left: 0; right: 0; background: #fff; }
    .runhead { display: flex; top: 6mm; align-items: center; justify-content: space-between; gap: 12px; padding: 0 16mm; }
    .runhead-title { display: none; }
    footer { display: none; }
    .cover { z-index: 5; background: #fff; }
    main { padding-top: 56px; padding-bottom: 108px; }
    article { border: 0; }
    h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; break-inside: avoid; }
    figure, .chart-band { break-before: avoid; page-break-before: avoid; max-width: 100%; }
    figure svg, .chart-band svg { width: 100% !important; max-width: 100% !important; height: auto !important; }
    .chart-band { break-inside: avoid; page-break-inside: avoid; }
    main, article, .table-scroll, figure, .chart-band { width: 100%; max-width: 100%; }
    .table-scroll { overflow: hidden; }
    table { width: 100% !important; max-width: 100% !important; table-layout: fixed; }
    th, td { min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
  }
</style>
</head>
<body dir="${dir}" lang="${lang}">
<header class="runhead" dir="${dir}">
  <img src="${ICON_URL}" alt="eit"/>
  <div class="runhead-title" dir="${blockDirection(args.title)}">${isolatedHtml(args.title)}</div>
</header>
<footer class="runfoot" dir="${dir}">
  <div class="footer-inner">
    <p class="output-disclaimer" dir="${dir}">${pageDisclaimerHtml(lang)}</p>
    <div class="footer-meta">
      <span class="footer-brand"><img src="${ICON_URL}" alt="eit" width="16" height="16"/> <span dir="ltr">${REPORT_FOOTER_LINE}</span></span>
      <span class="page-of"></span>
    </div>
  </div>
</footer>
${coverHtml({
  title: args.title,
  date: riyadhCoverDate(now, lang),
  zone: coverZone(lang),
  locale: lang,
  absolute: true,
})}
<main>
  <article dir="${dir}" lang="${lang}">
    ${blocksHtml(blocks, dir, lang)}
  </article>
</main>
</body>
</html>`;
}
