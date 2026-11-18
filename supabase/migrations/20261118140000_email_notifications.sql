-- Reminder queue. The Feb–Mar 2026 rows (assistant_weekly_upsell,
-- sub_expired_weekly, sub_expiring_3d) were left pending because no cron
-- in this app selected them. Apply this before setting REMINDER_EMAILS=on.
--
-- If public.email_notifications already exists, this only adds missing
-- columns. A row with no timestamp is backfilled to 30 days ago so the
-- sender treats it as stale and does not mail it.

create extension if not exists pgcrypto;

create table if not exists public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  email text,
  kind text,
  type text,
  status text not null default 'pending',
  locale text,
  dedupe_key text,
  skip_reason text,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.email_notifications add column if not exists user_id uuid;
alter table public.email_notifications add column if not exists email text;
alter table public.email_notifications add column if not exists kind text;
alter table public.email_notifications add column if not exists type text;
alter table public.email_notifications add column if not exists status text default 'pending';
alter table public.email_notifications add column if not exists locale text;
alter table public.email_notifications add column if not exists dedupe_key text;
alter table public.email_notifications add column if not exists skip_reason text;
alter table public.email_notifications add column if not exists claimed_at timestamptz;
alter table public.email_notifications add column if not exists sent_at timestamptz;
alter table public.email_notifications add column if not exists created_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'email_notifications' and column_name = 'queued_at'
  ) then
    execute $sql$
      update public.email_notifications
      set created_at = queued_at
      where created_at is null and queued_at is not null
    $sql$;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'email_notifications' and column_name = 'inserted_at'
  ) then
    execute $sql$
      update public.email_notifications
      set created_at = inserted_at
      where created_at is null and inserted_at is not null
    $sql$;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'email_notifications' and column_name = 'type'
  ) then
    execute $sql$
      update public.email_notifications
      set kind = type
      where kind is null and type is not null
    $sql$;
  end if;
end $$;

update public.email_notifications
set created_at = now() - interval '30 days'
where created_at is null;

alter table public.email_notifications alter column created_at set default now();

do $$
declare
  cons record;
begin
  for cons in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'email_notifications'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.email_notifications drop constraint %I', cons.conname);
  end loop;
end $$;

alter table public.email_notifications
  add constraint email_notifications_status_check
  check (status in ('pending', 'sent', 'skipped', 'expired'));

create unique index if not exists email_notifications_dedupe_idx
  on public.email_notifications (dedupe_key)
  where dedupe_key is not null;

create index if not exists email_notifications_status_idx
  on public.email_notifications (status, created_at);

comment on table public.email_notifications is
  'Subscription reminder queue. Service role only. Rows older than 7 days are expired, not sent.';

create table if not exists public.email_notification_opt_outs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  opted_out_at timestamptz not null default now()
);

comment on table public.email_notification_opt_outs is
  'Accounts that opted out of reminder email. One-click unsubscribe writes here.';

alter table public.email_notifications enable row level security;
alter table public.email_notifications force row level security;
alter table public.email_notification_opt_outs enable row level security;
alter table public.email_notification_opt_outs force row level security;

revoke all on table public.email_notifications from public, anon, authenticated;
revoke all on table public.email_notification_opt_outs from public, anon, authenticated;
grant all on table public.email_notifications to service_role;
grant all on table public.email_notification_opt_outs to service_role;
