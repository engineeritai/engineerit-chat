-- Lifecycle feedback: in-app ratings, opt-out, and the send queue.
-- Apply before turning LIFECYCLE_EMAILS on.
--
-- enqueue_subscription_emails already exists in the database (it is not
-- created in this repo). Its body is left as it is. Execute stays with
-- service_role only, matching the earlier revoke from anon and authenticated.
-- The app does not call it from the browser. Lifecycle mail uses
-- enqueue_lifecycle_feedback_emails, with the same server-only grant.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Ratings. Signed-in users insert their own row. No select policy: the
-- service role (owner stats) reads them. RLS still applies to authenticated.
-- ---------------------------------------------------------------------------

create table if not exists public.platform_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  liked text,
  improve text,
  created_at timestamptz not null default now(),
  constraint platform_feedback_liked_len check (liked is null or char_length(liked) <= 2000),
  constraint platform_feedback_improve_len check (improve is null or char_length(improve) <= 2000)
);

create index if not exists platform_feedback_created_idx
  on public.platform_feedback (created_at desc);

comment on table public.platform_feedback is
  'In-app platform ratings. Users insert their own rows. Owner stats read them with the service role.';

alter table public.platform_feedback enable row level security;
alter table public.platform_feedback force row level security;

revoke all on table public.platform_feedback from public, anon, authenticated;
grant insert on table public.platform_feedback to authenticated;
grant all on table public.platform_feedback to service_role;

drop policy if exists platform_feedback_insert_own on public.platform_feedback;
create policy platform_feedback_insert_own
  on public.platform_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Opt-out and queue. Service role only. No client policies.
-- ---------------------------------------------------------------------------

create table if not exists public.lifecycle_email_opt_outs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  opted_out_at timestamptz not null default now()
);

comment on table public.lifecycle_email_opt_outs is
  'Accounts that opted out of lifecycle feedback email. One-click unsubscribe writes here.';

create table if not exists public.lifecycle_email_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  cycle_key text not null,
  kind text not null check (kind in ('feedback', 'feedback_subscribe')),
  locale text,
  subject text not null,
  body_text text not null,
  body_html text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'skipped')),
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint lifecycle_email_queue_user_cycle unique (user_id, cycle_key),
  constraint lifecycle_email_queue_locale check (locale is null or locale in ('en', 'ar', 'both')),
  constraint lifecycle_email_queue_email_len check (char_length(email) between 3 and 320),
  constraint lifecycle_email_queue_cycle_len check (char_length(cycle_key) between 1 and 40),
  constraint lifecycle_email_queue_subject_len check (char_length(subject) between 1 and 200),
  constraint lifecycle_email_queue_text_len check (char_length(body_text) <= 8000),
  constraint lifecycle_email_queue_html_len check (char_length(body_html) <= 16000)
);

create index if not exists lifecycle_email_queue_status_idx
  on public.lifecycle_email_queue (status, sent_at);

comment on table public.lifecycle_email_queue is
  'Idempotent lifecycle feedback sends. One row per account per cycle. Service role only.';

alter table public.lifecycle_email_opt_outs enable row level security;
alter table public.lifecycle_email_opt_outs force row level security;
alter table public.lifecycle_email_queue enable row level security;
alter table public.lifecycle_email_queue force row level security;

revoke all on table public.lifecycle_email_opt_outs from public, anon, authenticated;
revoke all on table public.lifecycle_email_queue from public, anon, authenticated;
grant all on table public.lifecycle_email_opt_outs to service_role;
grant all on table public.lifecycle_email_queue to service_role;

-- Claim a cycle. Null means this caller must not send (already sent, or another
-- run claimed the row in the last 15 minutes). A stale claim can be retried.
create or replace function public.enqueue_lifecycle_feedback_emails(
  p_user_id uuid,
  p_email text,
  p_cycle_key text,
  p_kind text,
  p_locale text,
  p_subject text,
  p_text text,
  p_html text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing public.lifecycle_email_queue%rowtype;
  new_id uuid;
begin
  if p_kind not in ('feedback', 'feedback_subscribe') then
    raise exception 'invalid lifecycle kind';
  end if;
  if p_cycle_key is null or char_length(p_cycle_key) > 40 then
    raise exception 'invalid cycle key';
  end if;

  insert into public.lifecycle_email_queue (
    user_id, email, cycle_key, kind, locale, subject, body_text, body_html, status, claimed_at
  ) values (
    p_user_id, p_email, p_cycle_key, p_kind, p_locale, p_subject, p_text, p_html, 'queued', now()
  )
  on conflict (user_id, cycle_key) do nothing
  returning id into new_id;

  if new_id is not null then
    return new_id;
  end if;

  select * into existing
  from public.lifecycle_email_queue
  where user_id = p_user_id and cycle_key = p_cycle_key
  for update;

  if existing.id is null or existing.status <> 'queued' then
    return null;
  end if;

  if existing.claimed_at is not null and existing.claimed_at > now() - interval '15 minutes' then
    return null;
  end if;

  update public.lifecycle_email_queue
  set claimed_at = now()
  where id = existing.id
    and status = 'queued'
    and (claimed_at is null or claimed_at <= now() - interval '15 minutes')
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.enqueue_lifecycle_feedback_emails(uuid, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.enqueue_lifecycle_feedback_emails(uuid, text, text, text, text, text, text, text)
  to service_role;

-- Keep the existing subscription enqueue server-side if it is present.
do $$
declare
  fn record;
  routine_kind text;
begin
  for fn in
    select p.proname,
           pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_args,
           p.prokind
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'enqueue_subscription_emails'
  loop
    routine_kind := case fn.prokind when 'p' then 'procedure' else 'function' end;
    execute 'revoke all on ' || routine_kind || ' public.enqueue_subscription_emails('
      || fn.identity_args || ') from public, anon, authenticated';
    execute 'grant execute on ' || routine_kind || ' public.enqueue_subscription_emails('
      || fn.identity_args || ') to service_role';
  end loop;
end $$;
