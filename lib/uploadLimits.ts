/** Hard cap for chat uploads (documents and images). */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * Vercel rejects a serverless request body at about 4.5 MB, before the route
 * runs. Multipart fields add a little overhead, so anything larger than 4 MB
 * is uploaded straight to Storage with a signed URL.
 */
export const DIRECT_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024;

export class UploadError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "UploadError";
    this.status = status;
    this.code = code;
  }
}

export type MessageLocale = "en" | "ar";

export function messageLocale(value: unknown): MessageLocale {
  return value === "ar" ? "ar" : "en";
}

export function fileTooLargeMessage(locale?: unknown): string {
  if (messageLocale(locale) === "ar") {
    return "هذا الملف أكبر من 20 ميجابايت. ارفع ملفا أصغر أو قسمه.";
  }
  return "This file is larger than 20 MB. Upload a smaller file, or split it into parts.";
}

export function directUploadFailedMessage(detail?: string, locale?: unknown): string {
  const base =
    messageLocale(locale) === "ar"
      ? "هذا الملف يتجاوز حد الخادم 4.5 ميجابايت ويجب رفعه مباشرة إلى التخزين. فشلت عملية الرفع. حاول مرة أخرى أو استخدم ملفا أصغر من 4 ميجابايت."
      : "This file is above the 4.5 MB server limit, so it has to upload directly to storage. That upload failed. Please try again, or use a file under 4 MB.";
  const extra = safeDetail(detail);
  return extra ? `${base} (${extra})` : base;
}

export function bodyTooLargeMessage(locale?: unknown): string {
  if (messageLocale(locale) === "ar") {
    return "رفض الخادم هذا الرفع لأنه يتجاوز حد 4.5 ميجابايت تقريبا. حاول مرة أخرى أو استخدم ملفا أصغر.";
  }
  return "The server rejected this upload because it is above the about 4.5 MB request limit. Please try again, or use a smaller file.";
}

function safeDetail(detail?: string): string | undefined {
  if (!detail) return undefined;
  const oneLine = detail.replace(/\s+/g, " ").trim();
  if (!oneLine || oneLine.length > 180) return undefined;
  if (/key|token|secret|password|authorization/i.test(oneLine)) return undefined;
  return oneLine;
}
