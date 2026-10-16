-- Chat history for the signed-in user.
-- Conversations and messages are keyed by auth.users.id.
-- Row level security: a user reads and writes only their own rows,
-- plus conversations a teammate explicitly shared with a shared team.
--
-- Retention is enforced by public.purge_expired_conversations(), which
-- the daily cron calls. Day counts match lib/historyRetention.ts:
--   assistant (free): 3 days
--   engineer: 30 days
--   professional: 90 days
--   consultant (and pilot/trial aliases): 365 days
--   team, enterprise: no expiry
--
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists team_members_user_idx on public.team_members (user_id);

alter table public.profiles
  add column if not exists team_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_team_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_team_id_fkey
      foreign key (team_id) references public.teams (id) on delete set null;
  end if;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  discipline text,
  pinned boolean not null default false,
  shared_with_team boolean not null default false,
  team_id uuid references public.teams (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, pinned desc, updated_at desc);

create index if not exists conversations_expires_idx
  on public.conversations (expires_at)
  where expires_at is not null;

create index if not exists conversations_team_shared_idx
  on public.conversations (team_id)
  where shared_with_team;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create index if not exists messages_user_idx on public.messages (user_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create or replace function public.current_team_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select tm.team_id
  from public.team_members tm
  where tm.user_id = auth.uid()
  union
  select p.team_id
  from public.profiles p
  where p.id = auth.uid()
    and p.team_id is not null
$$;

revoke all on function public.current_team_ids() from public;
grant execute on function public.current_team_ids() to authenticated;

drop policy if exists conversations_select_own on public.conversations;
create policy conversations_select_own
  on public.conversations
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists conversations_select_team on public.conversations;
create policy conversations_select_team
  on public.conversations
  for select
  to authenticated
  using (
    shared_with_team
    and team_id is not null
    and team_id in (select public.current_team_ids())
  );

drop policy if exists conversations_insert_own on public.conversations;
create policy conversations_insert_own
  on public.conversations
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      not shared_with_team
      or (
        team_id is not null
        and team_id in (select public.current_team_ids())
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and lower(coalesce(p.subscription_tier, '')) in ('team', 'enterprise')
        )
      )
    )
  );

drop policy if exists conversations_update_own on public.conversations;
create policy conversations_update_own
  on public.conversations
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      not shared_with_team
      or (
        team_id is not null
        and team_id in (select public.current_team_ids())
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and lower(coalesce(p.subscription_tier, '')) in ('team', 'enterprise')
        )
      )
    )
  );

drop policy if exists conversations_delete_own on public.conversations;
create policy conversations_delete_own
  on public.conversations
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists messages_select_visible on public.messages;
create policy messages_select_visible
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.user_id = auth.uid()
          or (
            c.shared_with_team
            and c.team_id is not null
            and c.team_id in (select public.current_team_ids())
          )
        )
    )
  );

drop policy if exists messages_insert_own on public.messages;
create policy messages_insert_own
  on public.messages
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists messages_delete_own on public.messages;
create policy messages_delete_own
  on public.messages
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists teams_select_member on public.teams;
create policy teams_select_member
  on public.teams
  for select
  to authenticated
  using (id in (select public.current_team_ids()));

drop policy if exists team_members_select_same_team on public.team_members;
create policy team_members_select_same_team
  on public.team_members
  for select
  to authenticated
  using (team_id in (select public.current_team_ids()));

grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, delete on public.messages to authenticated;
grant select on public.teams to authenticated;
grant select on public.team_members to authenticated;

-- Recompute expires_at from the owner's current plan, then delete expired chats.
-- Messages disappear with the conversation (ON DELETE CASCADE).
create or replace function public.purge_expired_conversations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
begin
  update public.conversations c
  set expires_at = case
    when lower(coalesce(p.subscription_tier, '')) in ('team', 'enterprise') then null
    when lower(coalesce(p.subscription_tier, '')) in (
      'consultant', 'consultant_engineer', 'pilot', 'trial', 'free_trial'
    ) then c.created_at + interval '365 days'
    when lower(coalesce(p.subscription_tier, '')) in (
      'professional', 'pro', 'professional_engineer'
    ) then c.created_at + interval '90 days'
    when lower(coalesce(p.subscription_tier, '')) = 'engineer'
      then c.created_at + interval '30 days'
    else c.created_at + interval '3 days'
  end
  from public.profiles p
  where p.id = c.user_id;

  update public.conversations c
  set expires_at = c.created_at + interval '3 days'
  where not exists (
    select 1 from public.profiles p where p.id = c.user_id
  );

  delete from public.conversations
  where expires_at is not null
    and expires_at <= now();

  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_expired_conversations() from public;
revoke all on function public.purge_expired_conversations() from anon;
revoke all on function public.purge_expired_conversations() from authenticated;
grant execute on function public.purge_expired_conversations() to service_role;
