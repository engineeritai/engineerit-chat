/**
 * Per-account export cap. export_limit null means unlimited, which is every
 * existing account until someone sets a number on that profile.
 * A new trial window is exports_used reset to 0. This file does not invent a
 * calendar reset, and it does not set a limit on Consultant or any other plan.
 */
export const EXPORT_LIMIT_COPY = {
  en: "This account has reached its export limit. The files already downloaded are still yours to check.",
  ar: "بلغ هذا الحساب حد التصدير. الملفات التي نزلتها تبقى لديك لتراجعها.",
} as const;

export type ExportQuotaRow = {
  export_limit: number | null;
  exports_used: number | null;
  export_window_started_at?: string | null;
};

export type ExportQuotaDecision =
  | { allow: true; limited: false }
  | { allow: true; limited: true; nextUsed: number; expectedUsed: number; stampWindow: boolean }
  | { allow: false; limit: number; used: number };

export function quotaDecision(row: ExportQuotaRow | null | undefined): ExportQuotaDecision {
  if (!row || row.export_limit == null) return { allow: true, limited: false };
  const limit = Number(row.export_limit);
  const used = Number(row.exports_used ?? 0);
  if (!Number.isInteger(limit) || limit < 0) return { allow: true, limited: false };
  if (!Number.isInteger(used) || used < 0) return { allow: true, limited: false };
  if (used >= limit) return { allow: false, limit, used };
  return {
    allow: true,
    limited: true,
    nextUsed: used + 1,
    expectedUsed: used,
    stampWindow: row.export_window_started_at == null,
  };
}

export type ExportQuotaStore = {
  read(userId: string): Promise<{ row: ExportQuotaRow | null; error: boolean }>;
  /** Compare-and-set exports_used from expectedUsed to nextUsed. */
  write(userId: string, nextUsed: number, expectedUsed: number, stampWindow: boolean): Promise<boolean>;
};

export type ReservedExport = { ok: true; limited: boolean; release: () => Promise<void> } | { ok: false; limit: number; used: number };

/** Count one export. A missing column or a failed write does not block the download. */
export async function reserveExport(store: ExportQuotaStore, userId: string): Promise<ReservedExport> {
  const first = await store.read(userId);
  if (first.error) return { ok: true, limited: false, release: async () => {} };
  const decision = quotaDecision(first.row);
  if (!decision.allow) return { ok: false, limit: decision.limit, used: decision.used };
  if (!decision.limited) return { ok: true, limited: false, release: async () => {} };

  const wrote = await store.write(userId, decision.nextUsed, decision.expectedUsed, decision.stampWindow);
  if (!wrote) {
    const again = await store.read(userId);
    if (again.error) return { ok: true, limited: false, release: async () => {} };
    const second = quotaDecision(again.row);
    if (!second.allow) return { ok: false, limit: second.limit, used: second.used };
    if (!second.limited) return { ok: true, limited: false, release: async () => {} };
    const retried = await store.write(userId, second.nextUsed, second.expectedUsed, second.stampWindow);
    if (!retried) return { ok: true, limited: false, release: async () => {} };
    return {
      ok: true,
      limited: true,
      release: async () => {
        await store.write(userId, second.expectedUsed, second.nextUsed, false);
      },
    };
  }
  return {
    ok: true,
    limited: true,
    release: async () => {
      await store.write(userId, decision.expectedUsed, decision.nextUsed, false);
    },
  };
}
