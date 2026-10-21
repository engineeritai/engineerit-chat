import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20261021170000_fix_definer_views_and_warnings.sql"
);
const standalonePath = path.join(process.cwd(), "supabase/security/2026-10-21_fix_advisors_2.sql");

function stripSqlComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

test("the second advisor script matches and does not grant anon", () => {
  const migration = readFileSync(migrationPath, "utf8");
  const standalone = readFileSync(standalonePath, "utf8");
  assert.equal(migration, standalone);
  assert.match(migration, /^begin;/m);
  assert.match(migration, /^commit;/m);
  assert.match(migration, /ROLLBACK/);

  const executable = stripSqlComments(migration);
  for (const view of [
    "user_current_plan",
    "user_current_plan_view",
    "user_effective_plan",
    "user_effective_plan_view",
    "user_effective_plan_final",
  ]) {
    assert.match(executable, new RegExp(`revoke all on table public\\.${view} from public, anon, authenticated`));
    assert.match(executable, new RegExp(`grant select on table public\\.${view} to service_role`));
    assert.match(executable, new RegExp(`alter view public\\.${view} set \\(security_invoker = on\\)`));
  }
  assert.match(executable, /is_team_member/);
  assert.match(executable, /current_team_ids/);
  assert.match(executable, /search_path = public, extensions, pg_temp/);
  assert.match(executable, /feedback_messages/);
  assert.match(executable, /avatars/);
  assert.match(executable, /delete_old_chat_data/);
  assert.match(executable, /pol\.permissive = 'PERMISSIVE'/);
  assert.match(executable, /rolbypassrls/);
  assert.match(executable, /enqueue_or_cleanup_owner/);
  assert.match(executable, /not in \('anon', 'authenticated', 'public', 'service_role'\)/);
  assert.doesNotMatch(executable, /DIAGNOSTIC/);
  assert.doesNotMatch(executable, /grant\s+[\s\S]*?\sto\s+[^;]*\banon\b/i);
  assert.doesNotMatch(executable, /create\s+table(?:\s+if\s+not\s+exists)?\s+public\./i);
});
