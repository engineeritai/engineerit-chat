-- Team seats, enterprise leads, and manual invoice activation.
-- Existing individual plans and subscription rows are left in place.
-- New plan values are added to enum columns only when those columns are enums.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Widen plan enums / check constraints so "team" and "enterprise" can be stored
-- the same way as engineer, professional, and consultant.
-- ---------------------------------------------------------------------------

do $$
declare
  enum_typid oid;
  enum_schema text;
  enum_name text;
  label text;
begin
  select a.atttypid into enum_typid
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'profiles'
    and a.attname = 'subscription_tier'
    and a.attnum > 0
    and not a.attisdropped;

  if enum_typid is not null and exists (
    select 1 from pg_type t where t.oid = enum_typid and t.typtype = 'e'
  ) then
    select n.nspname, t.typname into enum_schema, enum_name
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.oid = enum_typid;

    foreach label in array array['team', 'enterprise']
    loop
      if not exists (
        select 1 from pg_enum e where e.enumtypid = enum_typid and e.enumlabel = label
      ) then
        execute format('alter type %I.%I add value %L', enum_schema, enum_name, label);
      end if;
    end loop;
  end if;
end $$;

do $$
declare
  r record;
begin
  if to_regclass('public.subscriptions') is null then
    return;
  end if;

  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'subscriptions'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%consultant%'
      and pg_get_constraintdef(con.oid) not ilike '%enterprise%'
  loop
    execute format('alter table public.subscriptions drop constraint %I', r.conname);
  end loop;

  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'profiles'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%subscription_tier%'
      and pg_get_constraintdef(con.oid) ilike '%consultant%'
      and pg_get_constraintdef(con.oid) not ilike '%enterprise%'
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Team',
  plan text not null default 'team' check (plan in ('team', 'enterprise')),
  seat_limit integer not null default 5 check (seat_limit >= 1),
  extra_seats integer not null default 0 check (extra_seats >= 0),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  status text not null default 'active' check (status in ('active', 'lapsed', 'canceled')),
  current_period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists teams_owner_id_uidx on public.teams (owner_id);

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'invited' check (status in ('invited', 'active', 'removed')),
  invite_token text,
  invite_expires_at timestamptz,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint team_members_email_lower check (email = lower(email)),
  constraint team_members_team_email_key unique (team_id, email)
);

create unique index if not exists team_members_invite_token_uidx
  on public.team_members (invite_token)
  where invite_token is not null;

create index if not exists team_members_user_id_idx on public.team_members (user_id);
create index if not exists team_members_team_id_idx on public.team_members (team_id);

-- ---------------------------------------------------------------------------
-- enterprise contact-sales leads
-- ---------------------------------------------------------------------------

create table if not exists public.enterprise_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text not null,
  phone text not null,
  seats integer not null check (seats >= 1),
  created_at timestamptz not null default now()
);

create index if not exists enterprise_leads_created_at_idx
  on public.enterprise_leads (created_at desc);

-- ---------------------------------------------------------------------------
-- Manual activation waiting for the customer to create an account
-- ---------------------------------------------------------------------------

create table if not exists public.pending_plan_grants (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  plan text not null check (plan in ('team', 'enterprise')),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  seat_limit integer not null check (seat_limit >= 1),
  amount_sar numeric,
  current_period_end timestamptz not null,
  company text,
  created_by uuid,
  applied_at timestamptz,
  applied_user_id uuid,
  created_at timestamptz not null default now(),
  constraint pending_plan_grants_email_lower check (email = lower(email))
);

create index if not exists pending_plan_grants_email_idx
  on public.pending_plan_grants (email)
  where applied_at is null;

-- ---------------------------------------------------------------------------
-- Helpers. security definer avoids RLS recursion between teams and team_members.
-- ---------------------------------------------------------------------------

create or replace function public.is_team_member(target_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members m
    where m.team_id = target_team
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_team_owner(target_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    where t.id = target_team
      and t.owner_id = auth.uid()
  );
$$;

create or replace function public.user_id_by_email(target_email text)
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;
$$;

revoke all on function public.is_team_member(uuid) from public, anon, authenticated;
revoke all on function public.is_team_owner(uuid) from public, anon, authenticated;
revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_owner(uuid) to authenticated;
grant execute on function public.user_id_by_email(text) to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.enterprise_leads enable row level security;
alter table public.pending_plan_grants enable row level security;

drop policy if exists teams_select_member on public.teams;
create policy teams_select_member
  on public.teams
  for select
  to authenticated
  using (owner_id = auth.uid() or public.is_team_member(id));

drop policy if exists team_members_select on public.team_members;
create policy team_members_select
  on public.team_members
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_team_owner(team_id));

-- No insert/update/delete policies: writes go through the service role.
-- enterprise_leads and pending_plan_grants have RLS enabled and no policies,
-- so the anon and authenticated roles cannot read or write them.

-- Explicit Data API grants. From 30 Oct 2026 a new public table is invisible
-- to supabase-js until granted. No anon grant: these rows are user data.
-- The browser reads teams and team_members for the signed-in member only.
grant select on table public.teams to authenticated;
grant select on table public.team_members to authenticated;
grant all on table public.teams to service_role;
grant all on table public.team_members to service_role;
grant all on table public.enterprise_leads to service_role;
grant all on table public.pending_plan_grants to service_role;
