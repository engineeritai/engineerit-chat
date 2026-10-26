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

/** Print-ready copy of the share HTML, with a visible Print control hidden on paper. */
export function printDocumentHtml(html: string, printLabel: string): string {
  const bar = `<div class="print-call" style="position:sticky;top:0;z-index:5;display:flex;justify-content:flex-end;gap:8px;padding:8px 12px;background:#fff;border-bottom:1px solid #e5e7eb"><button type="button" onclick="window.print()" style="min-height:44px;padding:0 16px;border:0;border-radius:999px;background:#111418;color:#fff;font:inherit;font-weight:650">${escapePrint(printLabel)}</button></div><style>@media print{.print-call{display:none!important}}</style><script>window.addEventListener("load",function(){setTimeout(function(){try{window.print()}catch(e){}},60)});</script>`;
  if (/<body[^>]*>/i.test(html)) return html.replace(/<body([^>]*)>/i, `<body$1>${bar}`);
  return bar + html;
}

function openPrintTab(html: string, printLabel: string): boolean {
  const tab = window.open("", "_blank");
  if (!tab) return false;
  tab.document.open();
  tab.document.write(printDocumentHtml(html, printLabel));
  tab.document.close();
  try {
    tab.focus();
    tab.print();
  } catch {
    /* the document script calls print again after load */
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
  const html = buildHtmlDocument(aiText, title, locale);
  const printLabel = locale === "ar" || isArabicText(aiText) ? "طباعة" : "Print";
  const ios =
    typeof navigator !== "undefined" &&
    iosPrintHost(navigator.userAgent || "", navigator.platform || "", navigator.maxTouchPoints || 0);
  if (ios) {
    const opened = openPrintTab(html, printLabel);
    if (printChannel({ ios: true, opened }) === "share") {
      const { blob, file } = htmlFileFromText(aiText, title, locale);
      void deliverBlob(blob, file.name);
    }
    return;
  }
  if (!printInFrame(html)) openPrintTab(html, printLabel);
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
