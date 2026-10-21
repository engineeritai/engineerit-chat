# Migrations

Run each file yourself in the Supabase SQL editor. Nothing in this repo applies SQL: there is no `supabase/config.toml`, CI does not connect to the database, and Vercel does not run migrations.

From 30 October 2026, a table created in `public` does not receive Data API privileges on its own. `supabase-js` and PostgREST cannot see it until the same migration grants them. This includes a migration replayed by `supabase db reset`, a preview branch, or any other fresh database. Tables that already exist keep the privileges they have.

In the same migration, after every `create table public.…`:

1. `alter table public.<name> enable row level security`.
2. Add policies for the roles that should see rows. A table only the server writes (service role) can have RLS and no policies.
3. Grant explicitly. Grant `anon` select only when the table is genuinely public reference data. Do not grant `anon` on tables that hold user data. Grant `authenticated` the commands that role's policies allow. Grant `all` to `service_role`.

```sql
create table public.example (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  note text not null
);

alter table public.example enable row level security;

create policy example_select_own
  on public.example
  for select
  to authenticated
  using (user_id = auth.uid());

create policy example_insert_own
  on public.example
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- User data. No grant to anon.
grant select, insert on table public.example to authenticated;
grant all on table public.example to service_role;
```

Server-only table (invoices, card tokens, and the same kind of row):

```sql
alter table public.example enable row level security;
grant all on table public.example to service_role;
```

Genuinely public lookup table, no user rows:

```sql
alter table public.example enable row level security;
create policy example_public_read
  on public.example
  for select
  to anon, authenticated
  using (true);
grant select on table public.example to anon, authenticated;
grant all on table public.example to service_role;
```

CI reads `supabase/migrations/*.sql`. A file that creates a `public` table fails the `tests` check when that same file does not enable row level security on the table, does not grant it to `service_role`, or grants it to `anon` or `public`. The empty allowlist for an anon grant lives in `tests/rlsMigrations.test.ts`.

The 17 Oct 2026 advisor fix is scoped to the six objects the production diagnostic named: `subscription_email_queue`, `daily_usage_limits`, `email_queue`, `admin_users_overview`, `admin_users_subscription_view`, and `admin_users_with_subscription`. Paste `supabase/security/2026-10-21_fix_advisors.sql` into the SQL editor. The same text is `supabase/migrations/20261021150000_enable_rls_lock_auth_users.sql`. The rollback block in that file is a comment. The verification query at the bottom runs with the fix.
