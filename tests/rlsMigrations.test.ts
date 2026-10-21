import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");

// Add a table here only when it is genuinely public reference data and the
// migration grants anon select on purpose. User data stays off this list.
const anonSelectAllowed = new Set<string>([]);

function stripSqlComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

function createdPublicTables(sql: string) {
  const names = [...sql.matchAll(/create\s+table(?:\s+if\s+not\s+exists)?\s+public\.([a-zA-Z_][a-zA-Z0-9_]*)/gi)].map(
    (match) => match[1].toLowerCase()
  );
  return [...new Set(names)];
}

function enabledTables(sql: string) {
  return new Set(
    [...sql.matchAll(/alter\s+table(?:\s+if\s+exists)?\s+public\.([a-zA-Z_][a-zA-Z0-9_]*)\s+enable\s+row\s+level\s+security/gi)].map(
      (match) => match[1].toLowerCase()
    )
  );
}

function grantsByTable(sql: string) {
  const grants = new Map<string, Set<string>>();
  const statements = sql.matchAll(
    /grant\s+[\s\S]*?\son\s+(?:table\s+)?([\s\S]*?)\s+to\s+([^;]+);/gi
  );
  for (const statement of statements) {
    const tables = [...statement[1].matchAll(/public\.([a-zA-Z_][a-zA-Z0-9_]*)/gi)].map((match) =>
      match[1].toLowerCase()
    );
    const roles = statement[2]
      .split(",")
      .map((role) => role.trim().toLowerCase().replace(/"/g, ""))
      .filter(Boolean);
    for (const table of tables) {
      const existing = grants.get(table) ?? new Set<string>();
      for (const role of roles) existing.add(role);
      grants.set(table, existing);
    }
  }
  return grants;
}

export function migrationIssues(sql: string) {
  const cleaned = stripSqlComments(sql);
  const issues: string[] = [];
  const enabled = enabledTables(cleaned);
  const grants = grantsByTable(cleaned);
  for (const table of createdPublicTables(cleaned)) {
    if (!enabled.has(table)) {
      issues.push(`public.${table} is created without enable row level security in the same migration`);
    }
    const roles = grants.get(table) ?? new Set<string>();
    if (!roles.has("service_role")) {
      issues.push(`public.${table} is created without a grant to service_role in the same migration`);
    }
    if ((roles.has("anon") || roles.has("public")) && !anonSelectAllowed.has(table)) {
      issues.push(`public.${table} grants anon or public; user data must not be granted to anon`);
    }
  }
  return issues;
}

test("migrations that create a public table enable RLS and grant service_role", () => {
  const files = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
  const failures: string[] = [];
  for (const file of files) {
    const issues = migrationIssues(readFileSync(path.join(migrationsDir, file), "utf8"));
    for (const issue of issues) failures.push(`${file}: ${issue}`);
  }
  assert.deepEqual(failures, []);
});

test("a public table without RLS or a service_role grant fails the check", () => {
  const bare = "create table public.widget (id int);";
  const issues = migrationIssues(bare);
  assert.ok(issues.some((issue) => /row level security/.test(issue)));
  assert.ok(issues.some((issue) => /service_role/.test(issue)));

  const rlsOnly = `${bare}\nalter table public.widget enable row level security;`;
  assert.ok(migrationIssues(rlsOnly).some((issue) => /service_role/.test(issue)));
  assert.ok(!migrationIssues(rlsOnly).some((issue) => /row level security/.test(issue)));
});

test("an anon grant on a user table fails the check", () => {
  const sql = `
    create table public.widget (id int);
    alter table public.widget enable row level security;
    grant select on table public.widget to anon;
    grant all on table public.widget to service_role;
  `;
  assert.ok(migrationIssues(sql).some((issue) => /anon or public/.test(issue)));
});

test("RLS plus a service_role grant passes, and comments are ignored", () => {
  const sql = `
    -- create table public.commented (id int);
    create table if not exists public.widget (id int);
    alter table public.widget enable row level security;
    grant all on table public.widget to service_role;
    /* grant select on table public.widget to anon; */
  `;
  assert.deepEqual(migrationIssues(sql), []);
});

test("the advisor fix is one paste file and does not grant anon", () => {
  const migration = readFileSync(
    path.join(migrationsDir, "20261021150000_enable_rls_lock_auth_users.sql"),
    "utf8"
  );
  const standalone = readFileSync(
    path.join(process.cwd(), "supabase/security/2026-10-21_fix_advisors.sql"),
    "utf8"
  );
  assert.equal(migration, standalone);
  assert.match(migration, /^begin;/m);
  assert.match(migration, /^commit;/m);
  assert.match(migration, /security_invoker = on/);
  assert.match(migration, /ROLLBACK/);
  const executable = stripSqlComments(migration);
  for (const table of ["subscription_email_queue", "daily_usage_limits", "email_queue"]) {
    assert.match(executable, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(executable, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`));
    assert.match(executable, new RegExp(`grant all on table public\\.${table} to service_role`));
  }
  for (const view of ["admin_users_overview", "admin_users_subscription_view", "admin_users_with_subscription"]) {
    assert.match(executable, new RegExp(`revoke all on table public\\.${view} from public, anon, authenticated`));
    assert.match(executable, new RegExp(`grant select on table public\\.${view} to service_role`));
    assert.match(executable, new RegExp(`alter view public\\.${view} set \\(security_invoker = on\\)`));
  }
  assert.doesNotMatch(executable, /grant\s+[\s\S]*?\sto\s+[^;]*\banon\b/i);
  assert.doesNotMatch(executable, /disable row level security/i);
  assert.equal(createdPublicTables(executable).length, 0);
});
