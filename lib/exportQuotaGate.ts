import { NextResponse } from "next/server";
import { EXPORT_LIMIT_COPY, reserveExport, type ExportQuotaRow, type ExportQuotaStore } from "@/lib/exportQuota";
import type { UiLocale } from "@/lib/replyLanguage";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export function exportLocale(req: Request, bodyLocale?: unknown): UiLocale {
  if (bodyLocale === "ar" || bodyLocale === "en") return bodyLocale;
  const header = req.headers.get("x-locale");
  if (header === "ar" || header === "en") return header;
  const param = new URL(req.url).searchParams.get("locale");
  return param === "ar" ? "ar" : "en";
}

function profileStore(admin: ReturnType<typeof getSupabaseAdmin>): ExportQuotaStore {
  return {
    async read(userId) {
      const { data, error } = await admin
        .from("profiles")
        .select("export_limit, exports_used, export_window_started_at")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        console.error("export quota read", error.message);
        return { row: null, error: true };
      }
      const row = data as ExportQuotaRow | null;
      return { row, error: false };
    },
    async write(userId, nextUsed, expectedUsed, stampWindow) {
      const patch: { exports_used: number; export_window_started_at?: string } = { exports_used: nextUsed };
      if (stampWindow) patch.export_window_started_at = new Date().toISOString();
      const { data, error } = await admin
        .from("profiles")
        .update(patch)
        .eq("id", userId)
        .eq("exports_used", expectedUsed)
        .select("id");
      if (error) {
        console.error("export quota write", error.message);
        return false;
      }
      return Array.isArray(data) && data.length > 0;
    },
  };
}

export type ExportGuard = { ok: true; release: () => Promise<void> } | { ok: false; response: NextResponse };

/**
 * Signed-out callers and accounts with a null limit are unlimited.
 * A profile that cannot be read, including before the quota columns exist, is unlimited too.
 */
export async function guardExport(req: Request, locale: UiLocale): Promise<ExportGuard> {
  let userId = "";
  try {
    const user = await getUserFromRequest(req);
    userId = user?.id || "";
  } catch (err) {
    console.error("export quota user", err);
    return { ok: true, release: async () => {} };
  }
  if (!userId) return { ok: true, release: async () => {} };

  try {
    const reserved = await reserveExport(profileStore(getSupabaseAdmin()), userId);
    if (!reserved.ok) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: EXPORT_LIMIT_COPY[locale], code: "export_limit", limit: reserved.limit, used: reserved.used },
          { status: 403 }
        ),
      };
    }
    return { ok: true, release: reserved.release };
  } catch (err) {
    console.error("export quota", err);
    return { ok: true, release: async () => {} };
  }
}
