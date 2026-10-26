import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { POST as exportPdf } from "../app/api/export/pdf/route";
import {
  EXPORT_LIMIT_COPY,
  EXPORT_REQUIRES_SIGN_IN,
  EXPORT_SIGN_IN_COPY,
  setExportQuotaDeps,
  settleExportQuota,
  type ExportQuotaDeps,
  type QuotaConsume,
  type QuotaRead,
} from "../lib/exportQuota";
import { shellCopy } from "../lib/shell";

type Row = { export_limit: number; used: number };

function memory(initial: Row | null, options?: { readError?: boolean; consumeError?: boolean }) {
  const state = {
    row: initial ? { ...initial } : null,
    reads: 0,
    consumes: 0,
  };
  const deps: Pick<ExportQuotaDeps, "read" | "consume"> = {
    async read(): Promise<QuotaRead> {
      state.reads += 1;
      if (options?.readError) return { exists: false, error: true };
      return { exists: state.row != null, error: false };
    },
    async consume(): Promise<QuotaConsume> {
      state.consumes += 1;
      if (options?.consumeError) return { left: null, error: true };
      if (!state.row || state.row.used >= state.row.export_limit) return { left: null, error: false };
      state.row = { ...state.row, used: state.row.used + 1 };
      return { left: state.row.export_limit - state.row.used, error: false };
    },
  };
  return { state, deps };
}

test("no quota row is unlimited, and a cap of 3 blocks the fourth export", async () => {
  const open = memory(null);
  const free = await settleExportQuota("user", open.deps);
  assert.deepEqual(free, { allow: true });
  assert.equal(open.state.consumes, 0);

  const trial = memory({ export_limit: 3, used: 0 });
  for (let n = 1; n <= 3; n += 1) {
    const allowed = await settleExportQuota("trial", trial.deps);
    assert.deepEqual(allowed, { allow: true });
    assert.equal(trial.state.row?.used, n);
  }
  const blocked = await settleExportQuota("trial", trial.deps);
  assert.deepEqual(blocked, { allow: false, status: 429 });
  assert.equal(trial.state.row?.used, 3);
});

test("a missing table fails open, and a failed consume on a real row fails closed", async () => {
  const missing = memory({ export_limit: 3, used: 3 }, { readError: true });
  assert.deepEqual(await settleExportQuota("trial", missing.deps), { allow: true });
  assert.equal(missing.state.consumes, 0);

  const broken = memory({ export_limit: 3, used: 0 }, { consumeError: true });
  assert.deepEqual(await settleExportQuota("trial", broken.deps), { allow: false, status: 429 });
  assert.equal(broken.state.row?.used, 0);
});

test("sign-in is optional until the flag is turned on", async () => {
  assert.equal(EXPORT_REQUIRES_SIGN_IN, false);
  const store = memory({ export_limit: 3, used: 3 });
  assert.deepEqual(await settleExportQuota(null, store.deps, false), { allow: true });
  assert.equal(store.state.reads, 0);
  assert.deepEqual(await settleExportQuota(null, store.deps, true), { allow: false, status: 401 });
  assert.equal(EXPORT_SIGN_IN_COPY.en, "Sign in to export.");
  assert.equal(/[\u064B-\u0652]/.test(EXPORT_SIGN_IN_COPY.ar), false);
});

test("the pdf route returns 429 for a capped account and still serves a guest", async () => {
  setExportQuotaDeps({
    async userId() {
      return "trial";
    },
    async read() {
      return { exists: true, error: false };
    },
    async consume() {
      return { left: null, error: false };
    },
  });
  try {
    const capped = await exportPdf(
      new Request("http://local/api/export/pdf", {
        method: "POST",
        headers: { authorization: "Bearer token", "x-locale": "en", "content-type": "application/json" },
        body: JSON.stringify({ content: "Slab note", locale: "en" }),
      })
    );
    assert.equal(capped.status, 429);
    const body = (await capped.json()) as { error?: string; code?: string };
    assert.equal(body.code, "export_limit");
    assert.equal(body.error, EXPORT_LIMIT_COPY.en);

    setExportQuotaDeps({
      async userId() {
        return "trial";
      },
      async read() {
        return { exists: true, error: false };
      },
      async consume() {
        return { left: null, error: false };
      },
    });
    const arabic = await exportPdf(
      new Request("http://local/api/export/pdf", {
        method: "POST",
        headers: { "x-locale": "ar", "content-type": "application/json" },
        body: JSON.stringify({ content: "ملاحظة", locale: "ar" }),
      })
    );
    assert.equal(arabic.status, 429);
    const arBody = (await arabic.json()) as { error?: string };
    assert.equal(arBody.error, EXPORT_LIMIT_COPY.ar);

    let consumed = 0;
    setExportQuotaDeps({
      async userId() {
        return null;
      },
      async read() {
        throw new Error("guest should not be read");
      },
      async consume() {
        consumed += 1;
        throw new Error("guest should not be counted");
      },
    });
    const guest = await exportPdf(
      new Request("http://local/api/export/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: "Guest note", title: "Guest" }),
      })
    );
    assert.equal(guest.status, 200);
    assert.equal(guest.headers.get("content-type"), "application/pdf");
    assert.equal(consumed, 0);
  } finally {
    setExportQuotaDeps(null);
  }
});

test("every export route checks the quota and the buttons send the session token", () => {
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
    const source = readFileSync(file, "utf8");
    assert.match(source, /checkExportQuota/, file);
    assert.doesNotMatch(source, /guardExport/, file);
  }
  const history = readFileSync("app/api/history/[id]/export/route.ts", "utf8");
  assert.match(history, /requireHistoryUser/);
  assert.ok(history.indexOf("requireHistoryUser") < history.indexOf("checkExportQuota"));
  assert.match(readFileSync("app/chat/page.tsx", "utf8"), /exportRequestHeaders/);
  assert.match(readFileSync("lib/chatActions.ts", "utf8"), /exportRequestHeaders/);
  assert.match(readFileSync("app/components/ChatTable.tsx", "utf8"), /exportRequestHeaders/);
  assert.match(readFileSync("app/components/AdvisorChat.tsx", "utf8"), /exportPdf/);
  assert.equal(shellCopy.en.chat.exportChatLimit, EXPORT_LIMIT_COPY.en);
  assert.equal(shellCopy.ar.chat.exportChatLimit, EXPORT_LIMIT_COPY.ar);
  assert.match(EXPORT_LIMIT_COPY.en, /3 exports/);
  assert.match(EXPORT_LIMIT_COPY.ar, /٣ عمليات تصدير/);
  assert.equal(/[\u064B-\u0652]/.test(EXPORT_LIMIT_COPY.ar), false);

  const sql = readFileSync("supabase/migrations/20261027090000_export_quotas.sql", "utf8");
  assert.match(sql, /create table if not exists public\.export_quotas/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.export_quotas from public, anon, authenticated/);
  assert.match(sql, /grant select, insert, update, delete on table public\.export_quotas to service_role/);
  assert.match(sql, /function public\.consume_export\(p_user uuid\)/);
  assert.match(sql, /revoke all on function public\.consume_export\(uuid\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.consume_export\(uuid\) to service_role/);
  assert.equal(/\bupdate\s+public\.profiles\b/i.test(sql), false);
  assert.equal(/\binsert\s+into\b/i.test(sql), false);
});
