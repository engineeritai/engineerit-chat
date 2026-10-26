import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { EXPORT_LIMIT_COPY, quotaDecision, reserveExport, type ExportQuotaRow, type ExportQuotaStore } from "../lib/exportQuota";
import { shellCopy } from "../lib/shell";

function memoryStore(initial: ExportQuotaRow | null, options?: { failRead?: boolean; failWrite?: boolean }): ExportQuotaStore & { row: ExportQuotaRow | null; writes: number } {
  const state: ExportQuotaStore & { row: ExportQuotaRow | null; writes: number } = {
    row: initial ? { ...initial } : null,
    writes: 0,
    async read() {
      if (options?.failRead) return { row: null, error: true };
      return { row: state.row ? { ...state.row } : null, error: false };
    },
    async write(_userId, nextUsed, expectedUsed, stampWindow) {
      state.writes += 1;
      if (options?.failWrite) return false;
      if (!state.row || Number(state.row.exports_used ?? 0) !== expectedUsed) return false;
      state.row = {
        ...state.row,
        exports_used: nextUsed,
        export_window_started_at: stampWindow ? "2026-10-26T00:00:00.000Z" : state.row.export_window_started_at ?? null,
      };
      return true;
    },
  };
  return state;
}

test("a null export limit stays unlimited and a cap of 3 blocks the fourth", async () => {
  assert.equal(quotaDecision(null).allow, true);
  assert.equal(quotaDecision({ export_limit: null, exports_used: 9 }).allow, true);
  const open = memoryStore({ export_limit: null, exports_used: 0 });
  const free = await reserveExport(open, "user");
  assert.equal(free.ok, true);
  assert.equal(open.writes, 0);

  const trial = memoryStore({ export_limit: 3, exports_used: 0, export_window_started_at: null });
  for (let n = 1; n <= 3; n += 1) {
    const reserved = await reserveExport(trial, "trial");
    assert.equal(reserved.ok, true);
    assert.equal(trial.row?.exports_used, n);
  }
  assert.equal(trial.row?.export_window_started_at, "2026-10-26T00:00:00.000Z");
  const blocked = await reserveExport(trial, "trial");
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.equal(blocked.limit, 3);
    assert.equal(blocked.used, 3);
  }
  assert.equal(trial.row?.exports_used, 3);
});

test("a failed build gives the export back, and a missing column does not block", async () => {
  const trial = memoryStore({ export_limit: 3, exports_used: 2, export_window_started_at: "2026-10-01T00:00:00.000Z" });
  const reserved = await reserveExport(trial, "trial");
  assert.equal(reserved.ok, true);
  assert.equal(trial.row?.exports_used, 3);
  if (reserved.ok) await reserved.release();
  assert.equal(trial.row?.exports_used, 2);

  const missing = memoryStore({ export_limit: 3, exports_used: 3 }, { failRead: true });
  const allowed = await reserveExport(missing, "trial");
  assert.equal(allowed.ok, true);
  assert.equal(missing.writes, 0);
});

test("the cap is enforced on every export route and the message is bilingual", () => {
  const routes = [
    "app/api/export/pdf/route.ts",
    "app/api/export/docx/route.ts",
    "app/api/export/pptx/route.ts",
    "app/api/export/xlsx/route.ts",
    "app/api/export/diagram/pdf/route.ts",
    "app/api/export/diagram/svg/route.ts",
    "app/api/history/[id]/export/route.ts",
  ];
  for (const file of routes) {
    assert.match(readFileSync(file, "utf8"), /guardExport/, file);
  }
  assert.match(readFileSync("app/chat/page.tsx", "utf8"), /exportRequestHeaders/);
  assert.match(readFileSync("lib/chatActions.ts", "utf8"), /exportRequestHeaders/);
  assert.match(readFileSync("app/components/ChatTable.tsx", "utf8"), /exportRequestHeaders/);
  assert.equal(shellCopy.en.chat.exportChatLimit, EXPORT_LIMIT_COPY.en);
  assert.equal(shellCopy.ar.chat.exportChatLimit, EXPORT_LIMIT_COPY.ar);
  assert.match(EXPORT_LIMIT_COPY.en, /export limit/);
  assert.match(EXPORT_LIMIT_COPY.ar, /حد التصدير/);
  assert.equal(/[\u064B-\u0652]/.test(EXPORT_LIMIT_COPY.ar), false);
  const sql = readFileSync("supabase/migrations/20261026140000_profile_export_quota.sql", "utf8");
  assert.match(sql, /export_limit integer/);
  assert.match(sql, /exports_used integer not null default 0/);
  assert.equal(/\bupdate\s+public\.profiles\b/i.test(sql), false);
});
