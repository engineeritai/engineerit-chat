import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { REPORT_LABEL } from "@/lib/exportName";
import { shareDescription, buildShareHtml } from "@/lib/shareDocument";
import { SITE_URL } from "@/lib/seo";

export type ShareRecord = {
  id: string;
  title: string;
  markdown: string;
  locale: "en" | "ar";
  description: string;
  createdAt: string;
};

const dir = path.join("/tmp", "engineerit-shares");
const SHARE_BUCKET = "shares";
const FALLBACK_BUCKET = "documents";

export function isMissingRelation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = error.message || "";
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /could not find the table/i.test(message) ||
    /does not exist/i.test(message)
  );
}

function safeId(id: string): string | null {
  return /^[A-Za-z0-9_-]{8,32}$/.test(id) ? id : null;
}

function configuredUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!url || url.includes("example.supabase.co")) return "";
  return url;
}

function serviceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

/** Vercel must not hand out a link that only exists on this instance. */
function mustPersist(): boolean {
  return process.env.VERCEL === "1" || Boolean(configuredUrl() && serviceKey());
}

async function admin(): Promise<SupabaseClient | null> {
  const url = configuredUrl();
  const key = serviceKey();
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function asRecord(data: Partial<ShareRecord> & { created_at?: string } | null | undefined): ShareRecord | null {
  if (!data || typeof data.id !== "string" || typeof data.markdown !== "string") return null;
  const locale = data.locale === "ar" ? "ar" : "en";
  return {
    id: data.id,
    title: data.title || REPORT_LABEL[locale],
    markdown: data.markdown,
    locale,
    description: data.description || shareDescription(data.markdown),
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
  };
}

async function writeFileRecord(record: ShareRecord) {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${record.id}.json`), JSON.stringify(record), "utf8");
}

async function readFileRecord(id: string): Promise<ShareRecord | null> {
  try {
    const raw = await readFile(path.join(dir, `${id}.json`), "utf8");
    return asRecord(JSON.parse(raw) as ShareRecord);
  } catch {
    return null;
  }
}

function missingBucket(error: { message?: string; statusCode?: string | number } | null): boolean {
  if (!error) return false;
  const message = error.message || "";
  return String(error.statusCode) === "404" || /bucket not found|not found/i.test(message);
}

async function uploadObject(
  client: SupabaseClient,
  bucket: string,
  objectPath: string,
  body: Buffer,
  contentType: string
): Promise<{ ok: boolean; missing: boolean; message: string }> {
  const uploaded = await client.storage.from(bucket).upload(objectPath, body, {
    contentType,
    upsert: true,
  });
  if (!uploaded.error) return { ok: true, missing: false, message: "" };
  return {
    ok: false,
    missing: missingBucket(uploaded.error),
    message: uploaded.error.message || "upload failed",
  };
}

async function writeStorage(client: SupabaseClient, record: ShareRecord): Promise<string | null> {
  const json = Buffer.from(JSON.stringify(record), "utf8");
  const html = Buffer.from(
    buildShareHtml({
      title: record.title,
      markdown: record.markdown,
      locale: record.locale,
      origin: SITE_URL,
      id: record.id,
      now: new Date(record.createdAt),
    }),
    "utf8"
  );
  const targets: { bucket: string; jsonPath: string }[] = [
    { bucket: SHARE_BUCKET, jsonPath: `${record.id}.json` },
    { bucket: FALLBACK_BUCKET, jsonPath: `shares/${record.id}.json` },
  ];
  let last = "storage upload failed";
  for (const target of targets) {
    let result = await uploadObject(client, target.bucket, target.jsonPath, json, "application/json");
    if (!result.ok && result.missing && target.bucket === SHARE_BUCKET) {
      const created = await client.storage.createBucket(SHARE_BUCKET, {
        public: true,
        fileSizeLimit: 2_097_152,
      });
      if (created.error && !/already exists/i.test(created.error.message || "")) {
        last = created.error.message || last;
        continue;
      }
      result = await uploadObject(client, target.bucket, target.jsonPath, json, "application/json");
    }
    if (!result.ok) {
      last = result.message || last;
      continue;
    }
    const htmlPath = target.jsonPath.replace(/\.json$/, ".html");
    await uploadObject(client, target.bucket, htmlPath, html, "text/html");
    return target.bucket;
  }
  console.error("shared page storage write failed", last);
  return null;
}

async function writeTable(client: SupabaseClient, record: ShareRecord): Promise<"ok" | "missing" | "error"> {
  const { error } = await client.from("shared_pages").upsert({
    id: record.id,
    title: record.title,
    markdown: record.markdown,
    locale: record.locale,
    description: record.description,
    created_at: record.createdAt,
  });
  if (!error) return "ok";
  if (isMissingRelation(error)) return "missing";
  console.error("shared page table write failed", error.code, error.message);
  return "error";
}

async function readTable(client: SupabaseClient, id: string): Promise<ShareRecord | null> {
  const { data, error } = await client
    .from("shared_pages")
    .select("id,title,markdown,locale,description,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return asRecord(data);
}

async function readStorage(client: SupabaseClient, id: string): Promise<ShareRecord | null> {
  const targets = [
    { bucket: SHARE_BUCKET, objectPath: `${id}.json` },
    { bucket: FALLBACK_BUCKET, objectPath: `shares/${id}.json` },
  ];
  for (const target of targets) {
    const downloaded = await client.storage.from(target.bucket).download(target.objectPath);
    if (!downloaded.error && downloaded.data) {
      try {
        const text = await downloaded.data.text();
        const record = asRecord(JSON.parse(text) as ShareRecord);
        if (record) return record;
      } catch (err) {
        console.error("shared page storage parse failed", err);
      }
    }
  }
  const url = configuredUrl();
  if (!url) return null;
  try {
    const res = await fetch(`${url}/storage/v1/object/public/${SHARE_BUCKET}/${id}.json`);
    if (!res.ok) return null;
    return asRecord((await res.json()) as ShareRecord);
  } catch {
    return null;
  }
}

export async function createShare(input: { title: string; markdown: string; locale: "en" | "ar" }): Promise<ShareRecord> {
  const markdown = input.markdown.slice(0, 200_000);
  const record: ShareRecord = {
    id: crypto.randomBytes(9).toString("base64url"),
    title: input.title.slice(0, 140) || REPORT_LABEL[input.locale],
    markdown,
    locale: input.locale,
    description: shareDescription(markdown),
    createdAt: new Date().toISOString(),
  };
  const client = await admin();
  if (!client) {
    if (mustPersist()) throw new Error("Supabase is not configured for share pages.");
    await writeFileRecord(record);
    return record;
  }
  const table = await writeTable(client, record);
  if (table !== "ok") {
    const bucket = await writeStorage(client, record);
    if (!bucket) throw new Error("Could not persist the share page.");
  }
  await writeFileRecord(record).catch((err) => console.error("shared page cache write failed", err));
  return record;
}

export async function readShare(id: string): Promise<ShareRecord | null> {
  const safe = safeId(id);
  if (!safe) return null;
  const client = await admin();
  if (client) {
    try {
      const stored = (await readTable(client, safe)) || (await readStorage(client, safe));
      if (stored) return stored;
    } catch (err) {
      console.error("shared page read failed", err);
    }
  }
  if (mustPersist()) return null;
  return readFileRecord(safe);
}
