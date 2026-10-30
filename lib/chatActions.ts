import { downloadName } from "@/lib/exportName";
import { deliverBlob } from "@/lib/saveFile";
import { buildShareHtml } from "@/lib/shareDocument";
import { markRtlPlain } from "@/lib/shareDirection";
import { clipSharedText, toWhatsApp } from "@/lib/whatsappText";

export function isArabicText(text: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

export function buildHtmlDocument(aiText: string, title = "Report", locale?: string) {
  const lang = locale === "ar" || isArabicText(aiText) ? "ar" : "en";
  return buildShareHtml({ title, markdown: aiText, locale: lang });
}

function htmlFileFromText(aiText: string, title = "Report", locale?: string) {
  const html = buildHtmlDocument(aiText, title, locale);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const file = new File([blob], downloadName(title, "html"), { type: "text/html" });
  return { html, blob, file };
}

export async function copyAsHtml(aiText: string, title = "Report") {
  const { html } = htmlFileFromText(aiText, title);
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([markRtlPlain(aiText)], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {
    /* fall through to plain text */
  }
  try {
    await navigator.clipboard.writeText(markRtlPlain(aiText));
    return true;
  } catch {
    return false;
  }
}

export function saveHtml(aiText: string, title = "Report", locale?: string) {
  const { blob } = htmlFileFromText(aiText, title, locale);
  void deliverBlob(blob, downloadName(title, "html")).catch(() => {
    /* deliverBlob already confirms or reports the failure */
  });
}

/** iPhone, iPad, and iPadOS desktop-mode Safari. Hidden iframe print does not run there. */
export function iosPrintHost(ua: string, platform = "", maxTouchPoints = 0): boolean {
  return /iPad|iPhone|iPod/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
}

/**
 * Desktop keeps the hidden iframe. iOS Safari and the home-screen app open a
 * print-ready tab. A blocked popup falls back to the system share sheet.
 */
export function printChannel(args: { ios: boolean; opened: boolean }): "iframe" | "tab" | "share" {
  if (!args.ios) return "iframe";
  return args.opened ? "tab" : "share";
}

function escapePrint(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type PrintPageCopy = {
  print: string;
  back: string;
  share: string;
  backToChat: string;
  title: string;
  chatUrl: string;
  shareText: string;
  markdown: string;
  locale: "en" | "ar";
  filename: string;
};

export function printPageCopy(args: {
  locale: "en" | "ar";
  title: string;
  chatUrl: string;
  shareText: string;
  markdown: string;
}): PrintPageCopy {
  const arabic = args.locale === "ar";
  return {
    print: arabic ? "طباعة" : "Print",
    back: arabic ? "رجوع" : "Back",
    share: arabic ? "مشاركة" : "Share",
    backToChat: arabic ? "العودة إلى المحادثة" : "Back to chat",
    title: args.title,
    chatUrl: args.chatUrl || "/chat",
    shareText: args.shareText,
    markdown: args.markdown,
    locale: args.locale,
    filename: downloadName(args.title, "pdf"),
  };
}

/** Home-screen apps ignore window.print(). A thrown print does too. Both share the PDF. */
export function printNeedsPdfShare(args: { standalone: boolean; threw: boolean }): boolean {
  return args.standalone || args.threw;
}

const PRINT_CHROME = `<style>
.print-call{position:fixed;top:0;left:0;right:0;z-index:1000;display:flex;align-items:center;gap:8px;box-sizing:border-box;min-height:calc(60px + env(safe-area-inset-top,0px));padding:8px 12px;padding-top:calc(8px + env(safe-area-inset-top,0px));background:#fff;border-bottom:1px solid #e5e7eb;pointer-events:auto}
.print-back,.print-go,.print-actions button{position:relative;z-index:1001;min-width:44px;min-height:44px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;cursor:pointer;font:inherit;font-weight:650}
.print-go{margin-inline-start:auto;padding:0 16px;border:0;border-radius:999px;background:#111418;color:#fff}
.print-back{padding:0 12px;border:0;border-radius:999px;background:transparent;color:#111418}
body{padding-top:calc(60px + env(safe-area-inset-top,0px))}
.print-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px))}
.print-actions button{padding:0 14px;border:1px solid #e5e7eb;border-radius:999px;background:#fff;color:#111418}
@media print{.print-call,.print-actions{display:none!important}body{padding-top:0!important}}
</style>`;

function printScript(copy: PrintPageCopy): string {
  const payload = JSON.stringify({
    title: copy.title,
    chatUrl: copy.chatUrl,
    shareText: copy.shareText,
    markdown: copy.markdown,
    locale: copy.locale,
    filename: copy.filename,
  })
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `<script>
var cfg = ${payload};
var pdfFile = null;
function eitHome(){return window.navigator.standalone===true||(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches);}
function eitPrimePdf(){if(pdfFile)return;fetch("/api/export/pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:cfg.title,content:cfg.markdown,locale:cfg.locale})}).then(function(res){return res.ok?res.blob():null;}).then(function(blob){if(!blob)return;pdfFile=new File([blob],cfg.filename,{type:"application/pdf"});}).catch(function(){});}
function eitPrint(){var home=eitHome();var threw=false;try{window.print();}catch(err){threw=true;}if((home||threw)&&pdfFile&&navigator.share){navigator.share({files:[pdfFile],title:cfg.title}).catch(function(){});return;}if(home||threw)eitPrimePdf();}
function eitShare(){if(navigator.share){navigator.share({title:cfg.title,text:cfg.shareText}).catch(function(){});return;}window.open("https://wa.me/?text="+encodeURIComponent(cfg.shareText),"_blank","noopener,noreferrer");}
function eitBack(){window.close();setTimeout(function(){if(!window.closed)location.href=cfg.chatUrl;},200);}
if(eitHome())eitPrimePdf();
</script>`;
}

/**
 * Print-ready copy of the share HTML.
 * Print runs only from the button tap (window.print() is the first call).
 * A home-screen app, where print is blocked, shares the PDF instead.
 */
export function printDocumentHtml(html: string, copy: PrintPageCopy): string {
  const bar = `<div class="print-call"><button type="button" class="print-back" onclick="eitBack()">${escapePrint(copy.back)}</button><button type="button" class="print-go" onclick="eitPrint()">${escapePrint(copy.print)}</button></div>`;
  const actions = `<div class="print-actions"><button type="button" onclick="eitPrint()">${escapePrint(copy.print)}</button><button type="button" onclick="eitShare()">${escapePrint(copy.share)}</button><button type="button" onclick="eitBack()">${escapePrint(copy.backToChat)}</button></div>`;
  const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>';
  let out = html.replace(/<meta name="viewport"[^>]*>/i, viewport);
  if (!/viewport-fit=cover/i.test(out)) {
    out = /<head[^>]*>/i.test(out) ? out.replace(/<head([^>]*)>/i, `<head$1>${viewport}`) : viewport + out;
  }
  out = /<head[^>]*>/i.test(out) ? out.replace(/<head([^>]*)>/i, `<head$1>${PRINT_CHROME}`) : PRINT_CHROME + out;
  const top = `${bar}${printScript(copy)}`;
  out = /<body[^>]*>/i.test(out) ? out.replace(/<body([^>]*)>/i, `<body$1>${top}`) : top + out;
  if (/<\/main>/i.test(out)) return out.replace(/<\/main>/i, `</main>${actions}`);
  if (/<footer[\s>]/i.test(out)) return out.replace(/<footer/i, `${actions}<footer`);
  return out + actions;
}

function openPrintTab(html: string, copy: PrintPageCopy): boolean {
  const tab = window.open("", "_blank");
  if (!tab) return false;
  tab.document.open();
  tab.document.write(printDocumentHtml(html, copy));
  tab.document.close();
  try {
    tab.focus();
  } catch {
    /* the tab is already in front */
  }
  return true;
}

function printInFrame(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => iframe.remove(), 900);
    }
  }, 250);
  return true;
}

export function printHtml(aiText: string, title = "Report", locale?: string) {
  const lang = locale === "ar" || isArabicText(aiText) ? "ar" : "en";
  const html = buildHtmlDocument(aiText, title, lang);
  const chatUrl = typeof location !== "undefined" && location.href ? location.href : "/chat";
  const copy = printPageCopy({
    locale: lang,
    title,
    chatUrl,
    shareText: clipSharedText(toWhatsApp(aiText, undefined, lang)),
    markdown: aiText,
  });
  const ios =
    typeof navigator !== "undefined" &&
    iosPrintHost(navigator.userAgent || "", navigator.platform || "", navigator.maxTouchPoints || 0);
  if (ios) {
    const opened = openPrintTab(html, copy);
    if (printChannel({ ios: true, opened }) === "share") {
      const { blob, file } = htmlFileFromText(aiText, title, locale);
      void deliverBlob(blob, file.name);
    }
    return;
  }
  if (!printInFrame(html)) openPrintTab(html, copy);
}

export async function exportPdf(
  aiText: string,
  filename = "engineerit.ai",
  options?: { title?: string; subtitle?: string; locale?: string; diagrams?: { index: number; pngBase64: string }[] }
) {
  const res = await fetch("/api/export/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: options?.title || filename,
      subtitle: options?.subtitle,
      content: aiText,
      filename,
      locale: options?.locale,
      diagrams: options?.diagrams,
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  await downloadBlob(blob, downloadName(options?.title || filename, "pdf"));
}

export async function nativeShareHtml(aiText: string, title = "Report", locale?: string, link?: string) {
  const text = clipSharedText(toWhatsApp(aiText, link, locale === "ar" ? "ar" : locale === "en" ? "en" : undefined));
  const { file } = htmlFileFromText(aiText, title, locale);
  try {
    if (navigator.share) {
      if (!link && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title, text, files: [file] });
        return true;
      }
      await navigator.share({ title, text, url: link });
      return true;
    }
  } catch {
    /* user cancelled or share failed */
  }
  return false;
}

/** Publish a durable page, then share the formatted text and that link together. */
export async function publishAndShare(args: { title: string; markdown: string; locale: string }): Promise<{ url: string | null; shared: boolean }> {
  const url = await publishShare(args);
  if (!url) return { url: null, shared: false };
  const text = clipSharedText(toWhatsApp(args.markdown, url, args.locale === "ar" ? "ar" : "en"));
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: args.title, text, url });
      return { url, shared: true };
    }
  } catch {
    /* user cancelled or this browser rejected the payload */
  }
  return { url, shared: false };
}

export function shareToWhatsApp(markdown: string, link?: string) {
  const payload = clipSharedText(toWhatsApp(markdown, link));
  const wa = `https://wa.me/?text=${encodeURIComponent(payload)}`;
  window.open(wa, "_blank", "noopener,noreferrer");
}

export async function exportWordDocx(
  aiText: string,
  filename = "engineerit.ai",
  options?: { title?: string; subtitle?: string; locale?: string; diagrams?: { index: number; pngBase64: string }[] }
) {
  const res = await fetch("/api/export/docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: aiText,
      title: options?.title || filename,
      subtitle: options?.subtitle,
      filename,
      locale: options?.locale,
      diagrams: options?.diagrams,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  await downloadBlob(blob, downloadName(options?.title || filename, "docx"));
}

export async function exportPptx(
  aiText: string,
  filename = "engineerit.ai",
  options?: { title?: string; subtitle?: string; locale?: string; diagrams?: { index: number; pngBase64: string }[] }
) {
  const res = await fetch("/api/export/pptx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: aiText,
      title: options?.title || filename,
      subtitle: options?.subtitle,
      filename,
      locale: options?.locale,
      diagrams: options?.diagrams,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  await downloadBlob(blob, downloadName(options?.title || filename, "pptx"));
}

async function downloadBlob(blob: Blob, filename: string) {
  await deliverBlob(blob, filename);
}

export async function publishShare(args: { title: string; markdown: string; locale: string }): Promise<string | null> {
  try {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return data.url || null;
  } catch {
    return null;
  }
}

export function todayUTCKey() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getLocalCount(key: string) {
  try {
    const v = window.localStorage.getItem(key);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

export function setLocalCount(key: string, n: number) {
  try {
    window.localStorage.setItem(key, String(n));
  } catch {
    /* ignore quota */
  }
}
