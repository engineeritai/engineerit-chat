-- Per-user export cap. Do not apply this to production until the owner approves it.
-- No row means unlimited, so existing accounts are unchanged.
-- This file does not insert or update any user.
-- After it is applied, the shared Consultant trial is one upsert:
--   export_limit = 3, used = 0, window_end = now() + interval '48 hours'.
-- Accessible only with the service role. Grants match the other service-role tables
-- in this repo: revoke from public, then grant service_role, or the role cannot call it.

create table if not exists public.export_quotas (
  user_id uuid primary key references auth.users (id) on delete cascade,
  export_limit integer not null check (export_limit >= 0),
  used integer not null default 0 check (used >= 0),
  window_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.export_quotas enable row level security;

revoke all on table public.export_quotas from public, anon, authenticated;
grant select, insert, update, delete on table public.export_quotas to service_role;

-- Atomic consume. Returns exports left after this one.
-- NULL when the user has no row or the cap is already reached.
create or replace function public.consume_export(p_user uuid) returns integer
language sql
security definer
set search_path = public
as $$
  update public.export_quotas
     set used = used + 1,
         updated_at = now()
   where user_id = p_user
     and used < export_limit
  returning export_limit - used
$$;

revoke all on function public.consume_export(uuid) from public, anon, authenticated;
grant execute on function public.consume_export(uuid) to service_role;

comment on table public.export_quotas is
  'Service-role export cap. Missing row means unlimited. Do not apply until approved.';
