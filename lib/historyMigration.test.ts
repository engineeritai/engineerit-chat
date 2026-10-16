import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const sql = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261016120000_conversations_and_messages.sql"),
  "utf8"
);

test("migration creates private conversation history", () => {
  assert.match(sql, /create table if not exists public\.conversations/i);
  assert.match(sql, /create table if not exists public\.messages/i);
  assert.match(sql, /attachments jsonb/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /user_id = auth\.uid\(\)/);
  assert.match(sql, /shared_with_team/);
  assert.match(sql, /interval '3 days'/);
  assert.match(sql, /interval '30 days'/);
  assert.match(sql, /interval '90 days'/);
  assert.match(sql, /interval '365 days'/);
  assert.match(sql, /purge_expired_conversations/);
  assert.match(sql, /grant execute on function public\.purge_expired_conversations\(\) to service_role/);
});
