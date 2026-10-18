import { showToast } from "@/lib/toast";

export function unreliableDownload(ua: string) {
  return /iPad|iPhone|iPod|MiuiBrowser|XiaoMi|Mi Browser|Mint Browser/i.test(ua);
}

/** iOS and Xiaomi browsers ignore the download attribute. Everyone else can save directly. */
export function saveRoute(ua: string, canShareFiles: boolean): "share" | "download" | "tab" {
  if (!unreliableDownload(ua)) return "download";
  return canShareFiles ? "share" : "tab";
}

function phrases() {
  const ar = typeof document !== "undefined" && (document.documentElement.lang === "ar" || document.documentElement.dir === "rtl");
  if (ar) {
    return {
      copied: "تم النسخ",
      downloaded: "تم التنزيل",
      opened: "فُتح في علامة جديدة. اضغط مطولاً على الملف لحفظه.",
      failed: "تعذر حفظ الملف",
    };
  }
  return {
    copied: "Copied",
    downloaded: "Downloaded",
    opened: "Opened in a new tab. Press and hold the file to save it.",
    failed: "Couldn't save the file",
  };
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] || "application/octet-stream";
  const binary = atob(body || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function openTab(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return Boolean(tab);
}

export function saveWasToasted(error: unknown) {
  const err = error as { name?: string; toasted?: boolean } | null;
  return err?.name === "AbortError" || Boolean(err?.toasted);
}

function markToasted(error: unknown) {
  if (error && typeof error === "object") {
    (error as { toasted?: boolean }).toasted = true;
    return error;
  }
  return Object.assign(new Error("save"), { toasted: true });
}

export async function deliverBlob(blob: Blob, filename: string): Promise<"share" | "download" | "tab"> {
  const type = blob.type || "application/octet-stream";
  const file = new File([blob], filename, { type });
  const route = saveRoute(navigator.userAgent || "", Boolean(navigator.canShare?.({ files: [file] })));
  const text = phrases();
  try {
    if (route === "share") {
      await navigator.share({ files: [file], title: filename });
      showToast(text.downloaded);
      return "share";
    }
    if (route === "download") {
      triggerDownload(blob, filename);
      showToast(text.downloaded);
      return "download";
    }
    if (!openTab(blob)) {
      showToast(text.failed, "err");
      throw markToasted(new Error("popup"));
    }
    showToast(text.opened);
    return "tab";
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") throw error;
    if (route === "share") {
      if (openTab(blob)) {
        showToast(text.opened);
        return "tab";
      }
    }
    showToast(text.failed, "err");
    throw markToasted(error);
  }
}

export async function copyImageBlob(blob: Blob, filename = "chart.png") {
  const type = blob.type || "image/png";
  const text = phrases();
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      const payload = type === "image/png" ? blob : new Blob([await blob.arrayBuffer()], { type: "image/png" });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": payload })]);
      showToast(text.copied);
      return;
    }
  } catch {
    /* fall through to the share sheet or a new tab */
  }
  try {
    await deliverBlob(new Blob([await blob.arrayBuffer()], { type }), filename);
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") return;
    showToast(text.failed, "err");
  }
}

export async function copyTextPayload(html: string, plain: string) {
  const text = phrases();
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      showToast(text.copied);
      return true;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(plain);
      showToast(text.copied);
      return true;
    }
  } catch {
    try {
      await navigator.clipboard.writeText(plain);
      showToast(text.copied);
      return true;
    } catch {
      showToast(text.failed, "err");
      return false;
    }
  }
  showToast(text.failed, "err");
  return false;
}
