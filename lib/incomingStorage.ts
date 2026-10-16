import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  MAX_UPLOAD_BYTES,
  directUploadFailedMessage,
  fileTooLargeMessage,
} from "@/lib/uploadLimits";

export const UPLOAD_BUCKET = process.env.SUPABASE_UPLOAD_BUCKET || "documents";

const INCOMING_PATH =
  /^incoming\/\d{13}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[A-Za-z0-9._-]{1,120}$/i;

export class IncomingFileError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "IncomingFileError";
    this.status = status;
  }
}

export function safeUploadName(name: string): string {
  const base = (name.split(/[/\\]/).pop() || "upload").trim();
  const extMatch = /(\.[A-Za-z0-9]{1,8})$/.exec(base);
  const ext = extMatch?.[1]?.toLowerCase() ?? "";
  const stem = (ext ? base.slice(0, -ext.length) : base)
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 80);
  return `${stem || "upload"}${ext}`.slice(0, 120);
}

export function newIncomingPath(filename: string): string {
  return `incoming/${Date.now()}-${crypto.randomUUID()}-${safeUploadName(filename)}`;
}

export function isIncomingPath(path: string): boolean {
  return INCOMING_PATH.test(path);
}

export function filenameFromStoragePath(path: string): string {
  const leaf = path.split("/").pop() || "";
  const match = leaf.match(
    /^\d{13}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i
  );
  return match?.[1] || "upload";
}

function missingBucket(error: { message?: string; statusCode?: string | number } | null): boolean {
  if (!error) return false;
  return String(error.statusCode) === "404" || /bucket not found/i.test(error.message || "");
}

async function signedUpload(path: string) {
  return supabaseAdmin.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
}

export async function createIncomingUpload(filename: string): Promise<{
  bucket: string;
  path: string;
  token: string;
}> {
  const path = newIncomingPath(filename);
  let signed = await signedUpload(path);
  if (signed.error && missingBucket(signed.error)) {
    const created = await supabaseAdmin.storage.createBucket(UPLOAD_BUCKET, {
      public: false,
      fileSizeLimit: MAX_UPLOAD_BYTES,
    });
    if (created.error && !/already exists/i.test(created.error.message)) {
      throw new IncomingFileError(directUploadFailedMessage(created.error.message), 500);
    }
    signed = await signedUpload(path);
  }
  if (signed.error || !signed.data?.token) {
    throw new IncomingFileError(
      directUploadFailedMessage(signed.error?.message),
      500
    );
  }
  return { bucket: UPLOAD_BUCKET, path, token: signed.data.token };
}

export async function readIncomingFile(path: string): Promise<Buffer> {
  if (!isIncomingPath(path)) {
    throw new IncomingFileError(
      "This upload could not be found. Please attach the file again.",
      400
    );
  }
  const { data, error } = await supabaseAdmin.storage.from(UPLOAD_BUCKET).download(path);
  if (error || !data) {
    throw new IncomingFileError(directUploadFailedMessage(error?.message), 400);
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new IncomingFileError(fileTooLargeMessage(), 413);
  }
  if (buffer.length === 0) {
    throw new IncomingFileError("The uploaded file was empty. Please attach it again.", 400);
  }
  return buffer;
}

export async function removeIncomingFile(path: string): Promise<void> {
  if (!isIncomingPath(path)) return;
  const { error } = await supabaseAdmin.storage.from(UPLOAD_BUCKET).remove([path]);
  if (error) console.error("Could not delete incoming upload:", error.message);
}

/** Drop direct uploads that were never processed. Called from the cleanup job. */
export async function removeStaleIncoming(maxAgeMs = 6 * 60 * 60 * 1000): Promise<void> {
  const cutoff = Date.now() - maxAgeMs;
  const { data, error } = await supabaseAdmin.storage.from(UPLOAD_BUCKET).list("incoming", {
    limit: 1000,
  });
  if (error || !data) return;
  const stale = data
    .map((entry) => entry.name)
    .filter((name) => {
      const ts = Number(name.split("-")[0]);
      return Number.isFinite(ts) && ts > 0 && ts < cutoff;
    })
    .map((name) => `incoming/${name}`);
  if (stale.length === 0) return;
  const removed = await supabaseAdmin.storage.from(UPLOAD_BUCKET).remove(stale);
  if (removed.error) console.error("Could not delete stale uploads:", removed.error.message);
}
