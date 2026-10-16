export function isArabicText(text: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildHtmlDocument(aiText: string, title = "engineerit.ai") {
  const rtl = isArabicText(aiText);
  const safe = escapeHtml(aiText);

  return `<!doctype html>
<html lang="${rtl ? "ar" : "en"}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px;color:#111827;background:#fff;}
  .wrap{max-width:980px;margin:0 auto;}
  .card{border:1px solid #e5e7eb;border-radius:16px;padding:18px;background:#fff;}
  pre{white-space:pre-wrap;word-break:break-word;margin:0;font:inherit;line-height:1.6;}
  .footer{margin-top:14px;color:#6b7280;font-size:12px}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card"><pre>${safe}</pre></div>
    <div class="footer">— engineerit.ai</div>
  </div>
</body>
</html>`;
}

function htmlFileFromText(aiText: string, filename = "engineerit.ai") {
  const html = buildHtmlDocument(aiText, filename);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const file = new File([blob], `${filename}.html`, { type: "text/html" });
  return { html, blob, file };
}

export async function copyAsHtml(aiText: string) {
  const { html } = htmlFileFromText(aiText);
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([aiText], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {
    /* fall through to plain text */
  }
  try {
    await navigator.clipboard.writeText(aiText);
    return true;
  } catch {
    return false;
  }
}

export function saveHtml(aiText: string, filename = "engineerit.ai") {
  const { blob } = htmlFileFromText(aiText, filename);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function printHtml(aiText: string, title = "engineerit.ai") {
  const html = buildHtmlDocument(aiText, title);

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
    return;
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
}

export async function exportPdf(aiText: string, filename = "engineerit.ai") {
  const res = await fetch("/api/export/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: filename,
      content: aiText,
      filename,
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  downloadBlob(blob, `${filename}.pdf`);
}

export async function nativeShareHtml(aiText: string, title = "engineerit.ai") {
  const { file } = htmlFileFromText(aiText, title);
  try {
    if (navigator.share) {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title,
          text: title,
          files: [file],
        });
        return true;
      }
      await navigator.share({
        title,
        text: aiText.slice(0, 4000),
      });
      return true;
    }
  } catch {
    /* user cancelled or share failed */
  }
  return false;
}

export function shareToWhatsApp(text: string) {
  const payload = text.slice(0, 8000);
  const wa = `https://wa.me/?text=${encodeURIComponent(payload)}`;
  window.open(wa, "_blank", "noopener,noreferrer");
}

export async function exportWordDocx(aiText: string, filename = "engineerit.ai") {
  const res = await fetch("/api/export/docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: aiText }),
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  downloadBlob(blob, `${filename}.docx`);
}

export async function exportPptx(aiText: string, filename = "engineerit.ai") {
  const res = await fetch("/api/export/pptx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: aiText }),
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  downloadBlob(blob, `${filename}.pptx`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
