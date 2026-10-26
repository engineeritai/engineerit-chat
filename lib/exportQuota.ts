import { NextResponse } from "next/server";
import { EXPORT_LIMIT_COPY, EXPORT_SIGN_IN_COPY } from "@/lib/exportLimitCopy";
import type { UiLocale } from "@/lib/replyLanguage";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/serverSupabase";

export { EXPORT_LIMIT_COPY, EXPORT_SIGN_IN_COPY };

/**
 * Guests can still export while this is false. Signed-in users are capped
 * whenever they have an export_quotas row, whether or not this is on.
 * Turn it on only after the owner decides that guests should lose exports.
 */
export const EXPORT_REQUIRES_SIGN_IN = false;

export type QuotaRead = { exists: boolean; error: boolean };
export type QuotaConsume = { left: number | null; error: boolean };

export type ExportQuotaDeps = {
  userId(req: Request): Promise<string | null>;
  read(userId: string): Promise<QuotaRead>;
  consume(userId: string): Promise<QuotaConsume>;
};

export type QuotaOutcome = { allow: true } | { allow: false; status: 401 | 429 };

/**
 * No row means unlimited. A row plus a null consume means the cap is already hit.
 * A failed read fails open, because that caller has no confirmed row.
 * A failed consume fails closed, because the row does exist.
 */
export async function settleExportQuota(
  userId: string | null,
  deps: Pick<ExportQuotaDeps, "read" | "consume">,
  requireSignIn = EXPORT_REQUIRES_SIGN_IN
): Promise<QuotaOutcome> {
  if (!userId) return requireSignIn ? { allow: false, status: 401 } : { allow: true };
  const read = await deps.read(userId);
  if (read.error || !read.exists) return { allow: true };
  const consumed = await deps.consume(userId);
  if (consumed.error || consumed.left == null || !Number.isInteger(consumed.left)) {
    return { allow: false, status: 429 };
  }
  return { allow: true };
}

let testDeps: ExportQuotaDeps | null = null;

/** Tests install a fake reader. Production leaves this unset. */
export function setExportQuotaDeps(next: ExportQuotaDeps | null) {
  testDeps = next;
}

function liveDeps(): ExportQuotaDeps {
  return {
    async userId(req) {
      const user = await getUserFromRequest(req);
      return user?.id || null;
    },
    async read(userId) {
      try {
        const admin = getSupabaseAdmin();
        const { data, error } = await admin.from("export_quotas").select("user_id").eq("user_id", userId).maybeSingle();
        if (error) {
          console.error("export quota read", error.message);
          return { exists: false, error: true };
        }
        return { exists: Boolean(data), error: false };
      } catch (err) {
        console.error("export quota read", err);
        return { exists: false, error: true };
      }
    },
    async consume(userId) {
      try {
        const admin = getSupabaseAdmin();
        const { data, error } = await admin.rpc("consume_export", { p_user: userId });
        if (error) {
          console.error("export quota consume", error.message);
          return { left: null, error: true };
        }
        if (data == null) return { left: null, error: false };
        const left = Number(data);
        return Number.isInteger(left) ? { left, error: false } : { left: null, error: true };
      } catch (err) {
        console.error("export quota consume", err);
        return { left: null, error: true };
      }
    },
  };
}

export function exportLocale(req: Request, bodyLocale?: unknown): UiLocale {
  if (bodyLocale === "ar" || bodyLocale === "en") return bodyLocale;
  const header = req.headers.get("x-locale");
  if (header === "ar" || header === "en") return header;
  const param = new URL(req.url).searchParams.get("locale");
  return param === "ar" ? "ar" : "en";
}

function deniedResponse(locale: UiLocale, status: 401 | 429): NextResponse {
  if (status === 401) {
    return NextResponse.json({ error: EXPORT_SIGN_IN_COPY[locale], code: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: EXPORT_LIMIT_COPY[locale], code: "export_limit" }, { status: 429 });
}

/** Null means the export may continue. A response is a 401 or a 429. */
export async function checkExportQuota(req: Request, locale: UiLocale): Promise<NextResponse | null> {
  const deps = testDeps ?? liveDeps();
  let userId: string | null = null;
  try {
    userId = await deps.userId(req);
  } catch (err) {
    console.error("export quota user", err);
    return EXPORT_REQUIRES_SIGN_IN ? deniedResponse(locale, 401) : null;
  }
  try {
    const outcome = await settleExportQuota(userId, deps);
    return outcome.allow ? null : deniedResponse(locale, outcome.status);
  } catch (err) {
    console.error("export quota", err);
    return null;
  }
}
