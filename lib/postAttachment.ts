import { supabase } from "@/lib/supabaseClient";
import {
  DIRECT_UPLOAD_THRESHOLD_BYTES,
  MAX_UPLOAD_BYTES,
  UploadError,
  bodyTooLargeMessage,
  directUploadFailedMessage,
  fileTooLargeMessage,
} from "@/lib/uploadLimits";

export type AttachmentFields = {
  file: File;
  question: string;
  headers?: HeadersInit;
  advisorId?: string;
  locale?: string;
  playbookId?: string;
};

function withJson(headers?: HeadersInit): Headers {
  const next = new Headers(headers);
  next.set("Content-Type", "application/json");
  return next;
}

export async function readApiError(res: Response): Promise<{ message: string; code?: string }> {
  const text = await res.text();
  if (text) {
    try {
      const data = JSON.parse(text) as { error?: string; code?: string };
      const message = typeof data.error === "string" ? data.error.trim() : "";
      const code = typeof data.code === "string" ? data.code : undefined;
      if (message) return { message, code };
    } catch {
      // Vercel’s platform 413 is an HTML page. A short plain-text route error is still useful.
      const plain = text.replace(/\s+/g, " ").trim();
      if (plain && plain.length <= 300 && !plain.startsWith("<")) return { message: plain };
    }
  }
  if (res.status === 413) return { message: bodyTooLargeMessage() };
  return { message: "" };
}

async function uploadLargeFile(args: AttachmentFields): Promise<string> {
  const res = await fetch("/api/uploads/signed", {
    method: "POST",
    headers: withJson(args.headers),
    body: JSON.stringify({
      filename: args.file.name,
      size: args.file.size,
      contentType: args.file.type || "application/octet-stream",
      advisorId: args.advisorId || "",
      locale: args.locale || "",
      playbookId: args.playbookId || "",
    }),
  });
  if (!res.ok) {
    const failure = await readApiError(res);
    throw new UploadError(failure.message || directUploadFailedMessage(), res.status, failure.code);
  }
  const data = (await res.json()) as { bucket?: string; path?: string; token?: string };
  if (!data.bucket || !data.path || !data.token) {
    throw new UploadError(directUploadFailedMessage());
  }
  const uploaded = await supabase.storage.from(data.bucket).uploadToSignedUrl(data.path, data.token, args.file, {
    contentType: args.file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploaded.error) {
    throw new UploadError(directUploadFailedMessage(uploaded.error.message));
  }
  return data.path;
}

async function postFile(endpoint: "/api/document" | "/api/image", args: AttachmentFields): Promise<Response> {
  if (args.file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(fileTooLargeMessage());
  }

  if (args.file.size > DIRECT_UPLOAD_THRESHOLD_BYTES) {
    const storagePath = await uploadLargeFile(args);
    return fetch(endpoint, {
      method: "POST",
      headers: withJson(args.headers),
      body: JSON.stringify({
        storagePath,
        filename: args.file.name,
        contentType: args.file.type || "",
        question: args.question,
        advisorId: args.advisorId || "",
        locale: args.locale || "",
        playbookId: args.playbookId || "",
      }),
    });
  }

  const formData = new FormData();
  formData.append("file", args.file, args.file.name);
  formData.append("question", args.question);
  if (args.advisorId) formData.append("advisorId", args.advisorId);
  if (args.locale) formData.append("locale", args.locale);
  if (args.playbookId) formData.append("playbookId", args.playbookId);
  return fetch(endpoint, {
    method: "POST",
    body: formData,
    headers: args.headers,
  });
}

export function postDocument(args: AttachmentFields): Promise<Response> {
  return postFile("/api/document", args);
}

export function postImage(args: AttachmentFields): Promise<Response> {
  return postFile("/api/image", args);
}
