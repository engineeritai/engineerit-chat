import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { shareDescription } from "@/lib/shareDocument";

export type ShareRecord = {
  id: string;
  title: string;
  markdown: string;
  locale: "en" | "ar";
  description: string;
  createdAt: string;
};

const dir = path.join("/tmp", "engineerit-shares");

function safeId(id: string): string | null {
  return /^[A-Za-z0-9_-]{8,32}$/.test(id) ? id : null;
}

async function writeFileRecord(record: ShareRecord) {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${record.id}.json`), JSON.stringify(record), "utf8");
}

async function readFileRecord(id: string): Promise<ShareRecord | null> {
  try {
    const raw = await readFile(path.join(dir, `${id}.json`), "utf8");
    return JSON.parse(raw) as ShareRecord;
  } catch {
    return null;
  }
}

async function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function createShare(input: { title: string; markdown: string; locale: "en" | "ar" }): Promise<ShareRecord> {
  const markdown = input.markdown.slice(0, 200_000);
  const record: ShareRecord = {
    id: crypto.randomBytes(9).toString("base64url"),
    title: input.title.slice(0, 140) || (input.locale === "ar" ? "تقرير هندسي" : "Engineering report"),
    markdown,
    locale: input.locale,
    description: shareDescription(markdown),
    createdAt: new Date().toISOString(),
  };
  await writeFileRecord(record);
  try {
    const client = await supabase();
    if (client) {
      await client.from("shared_pages").upsert({
        id: record.id,
        title: record.title,
        markdown: record.markdown,
        locale: record.locale,
        description: record.description,
        created_at: record.createdAt,
      });
    }
  } catch (err) {
    console.error("shared page supabase write failed", err);
  }
  return record;
}

export async function readShare(id: string): Promise<ShareRecord | null> {
  const safe = safeId(id);
  if (!safe) return null;
  const local = await readFileRecord(safe);
  if (local) return local;
  try {
    const client = await supabase();
    if (!client) return null;
    const { data } = await client.from("shared_pages").select("id,title,markdown,locale,description,created_at").eq("id", safe).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      title: data.title,
      markdown: data.markdown,
      locale: data.locale === "ar" ? "ar" : "en",
      description: data.description || shareDescription(data.markdown || ""),
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error("shared page supabase read failed", err);
    return null;
  }
}
