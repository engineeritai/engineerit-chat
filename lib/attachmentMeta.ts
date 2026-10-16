export type StoredAttachment = {
  name: string;
  type: "image" | "file";
  mime?: string;
  size?: number;
};

const MAX_ATTACHMENTS = 8;
const MAX_NAME = 180;

/** Keep file name, kind, mime, and size. Drop URLs and file bytes. */
export function sanitizeAttachments(input: unknown): StoredAttachment[] {
  if (!Array.isArray(input)) return [];
  const out: StoredAttachment[] = [];
  for (const item of input) {
    if (out.length >= MAX_ATTACHMENTS) break;
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const name = String(raw.name ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_NAME);
    if (!name) continue;
    const type = raw.type === "image" ? "image" : "file";
    const mime =
      typeof raw.mime === "string" && raw.mime.trim()
        ? raw.mime.trim().slice(0, 120)
        : undefined;
    const size =
      typeof raw.size === "number" && Number.isFinite(raw.size)
        ? Math.max(0, Math.floor(raw.size))
        : undefined;
    const stored: StoredAttachment = { name, type };
    if (mime) stored.mime = mime;
    if (size != null) stored.size = size;
    out.push(stored);
  }
  return out;
}
