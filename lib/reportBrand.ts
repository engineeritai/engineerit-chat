/** Colours sampled from the weekly assurance report the cover follows. */
export const BRAND_HEX = "0D60E4";
export const INK_HEX = "14213D";
export const MUTED_HEX = "5B6475";
export const LINE_HEX = "D9E2F2";
export const WHITE_HEX = "FFFFFF";

/** Official wordmark drawn at this width on an A4 cover. Do not recolor or stretch. */
export const WORDMARK_WIDTH_PT = 340;

export const COVER_BAR_PT = 17;
export const COVER_RULE_PT = 112;

export const REPORT_FOOTER_LINE = "engineerit.ai · support@engineerit.ai";
export const COVER_SITE = "engineerit.ai";
export const COVER_MAIL = "support@engineerit.ai";

export const WORDMARK_URL = "https://engineerit.ai/brand/engineerit-wordmark.png";
export const ICON_URL = "https://engineerit.ai/icon-192.png";

export function pageLabel(page: number, total: number, locale: "en" | "ar"): string {
  return locale === "ar" ? `صفحة ${page} من ${total}` : `Page ${page} of ${total}`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Cover block shared by Save HTML, print, and the report viewer. */
export function coverHtml(args: {
  title: string;
  subtitle?: string;
  date: string;
  time: string;
  locale: "en" | "ar";
  absolute?: boolean;
}): string {
  const wordmark = args.absolute ? WORDMARK_URL : "/brand/engineerit-wordmark.png";
  const subtitle = (args.subtitle || "").trim();
  const dir = args.locale === "ar" ? "rtl" : "ltr";
  return `<section class="cover" dir="${dir}">
  <div class="cover-bar"></div>
  <div class="cover-body">
    <img class="cover-mark" src="${wordmark}" alt="engineerit" width="834" height="188"/>
    <div class="cover-rule"></div>
    <h1 class="cover-title" dir="auto">${esc(args.title)}</h1>
    ${subtitle ? `<p class="cover-sub" dir="auto">${esc(subtitle)}</p>` : ""}
    <p class="cover-date">${esc(args.date)}</p>
    <p class="cover-time">${esc(args.time)}</p>
  </div>
  <div class="cover-contact">
    <div class="cover-site">${COVER_SITE}</div>
    <div class="cover-mail">${COVER_MAIL}</div>
  </div>
</section>`;
}
