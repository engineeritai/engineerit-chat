-- engineerit advisor fix 2, 21 Oct 2026.
-- Paste this whole file into the Supabase SQL editor and run it as its own query.
-- Safe to run again. The diagnostic and the rollback are comments, so this
-- paste does not undo itself.
--
-- Nothing in the repo applies SQL on deploy, in CI, or on Vercel.
-- Apply needs the Supabase SQL editor (dashboard), signed in as the owner.
--
-- Views (anon and authenticated can currently select every user's plan):
--   public.user_current_plan
--   public.user_current_plan_view          (read by user_effective_plan_view)
--   public.user_effective_plan
--   public.user_effective_plan_view
--   public.user_effective_plan_final
-- The app does not query them. resolveEffectivePlan, the profile page, the
-- header, and useSubscriptionTier read profiles, subscriptions, team_members,
-- and teams. Chat limits use daily_usage_limits through the service role.
-- enqueue_subscription_emails reads the current-plan views.
-- enqueue_subscription_reminders reads user_effective_plan.
-- Those functions are SECURITY DEFINER. Inside them current_user is the
-- function owner, and a security_invoker view then runs as that owner.
-- A superuser still sees every row. A BYPASSRLS owner sees every row only
-- when that role can also SELECT the views and the underlying
-- subscriptions and profiles tables. The script grants the non-superuser
-- enqueue owner SELECT on the five views when that role is not anon,
-- authenticated, public, or service_role. It does not grant anything new
-- on subscriptions or profiles, and it does not change function owners.
-- The verification grid flags an enqueue owner that is neither superuser
-- nor a BYPASSRLS role with those SELECTs. A table owner who is neither
-- still bypasses RLS on tables they own unless FORCE ROW LEVEL SECURITY
-- is set. Leave FORCE ROW LEVEL SECURITY off.
--
-- Also:
--   Revoke EXECUTE from public, anon, and authenticated on public
--   SECURITY DEFINER functions those roles can call. Extension-owned
--   functions are left alone. Team and chat RLS helpers (is_team_member,
--   is_team_owner, current_team_ids, and any function named in a policy)
--   stay executable by authenticated. service_role keeps EXECUTE.
--   Triggers do not need an EXECUTE grant. pg_cron running as the owner
--   still can call the function.
--   Set search_path = public, extensions, pg_temp on public routines that
--   have none. Bodies are not edited. Empty search_path is not used,
--   because unqualified names in those bodies are unknown. pg_catalog is
--   still searched first. Schema net is not added: a body that calls
--   pg_net without the net. prefix will fail the next cron run. Qualified
--   net.http_post keeps working. Functions that already set search_path
--   (including user_id_by_email) are not changed.
--   feedback_messages: the feedback form posts to /api/feedback and sends
--   mail. It does not insert into this table. Permissive always-true
--   policies for anon, authenticated, or public are dropped, including
--   SELECT using (true). anon and authenticated lose table privileges.
--   No insert policy is added. service_role keeps the table.
--   storage.avatars stays a public bucket, so profile photos still render
--   from getPublicUrl. Dropped: permissive SELECT or ALL policies for
--   anon, authenticated, or public whose expression is the broad avatars
--   read (bucket_id = 'avatars', no auth.uid or foldername), or whose
--   expression is only true. shares_public_read (bucket_id = 'shares')
--   stays. Owner insert, update, and delete policies stay.
--
-- Read the grid at the bottom. ok = false is a row that still needs attention.
-- Rows are ordered with failures first.

/*
DIAGNOSTIC — optional. Copy this one statement into a separate query and run
it before the fix if you want the current policies and function owners.
The editor shows only the last result, so this is one grid.
It does not change anything. View definitions are already known and are omitted.

select * from (
  select 'feedback_policy'::text as section,
         pol.policyname as object_name,
         pol.cmd as role_or_cmd,
         coalesce(pol.permissive, '') || ' ' || coalesce(pol.roles::text, '')
           || ' using=' || coalesce(pol.qual, '')
           || ' check=' || coalesce(pol.with_check, '') as detail
  from pg_catalog.pg_policies pol
  where pol.schemaname = 'public'
    and pol.tablename = 'feedback_messages'

  union all

  select 'avatar_storage_policy',
         pol.policyname,
         pol.cmd,
         coalesce(pol.permissive, '') || ' ' || coalesce(pol.roles::text, '')
           || ' using=' || coalesce(pol.qual, '')
           || ' check=' || coalesce(pol.with_check, '')
  from pg_catalog.pg_policies pol
  where pol.schemaname = 'storage'
    and pol.tablename = 'objects'
    and (
      coalesce(pol.qual, '') ilike '%avatars%'
      or coalesce(pol.with_check, '') ilike '%avatars%'
      or pol.policyname ilike '%avatar%'
      or pol.qual is null
      or replace(replace(replace(lower(coalesce(pol.qual, '')), ' ', ''), E'\n', ''), E'\t', '')
         in ('true', '(true)', '1=1', '(1=1)')
    )

  union all

  select 'definer_function',
         p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')',
         pg_catalog.pg_get_userbyid(p.proowner),
         'super=' || ro.rolsuper::text
           || ' bypassrls=' || ro.rolbypassrls::text
           || ' anon_exec=' || pg_catalog.has_function_privilege('anon', p.oid, 'execute')::text
           || ' auth_exec=' || pg_catalog.has_function_privilege('authenticated', p.oid, 'execute')::text
           || ' service_exec=' || pg_catalog.has_function_privilege('service_role', p.oid, 'execute')::text
           || ' config=' || coalesce(array_to_string(p.proconfig, ','), '')
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  join pg_catalog.pg_roles ro on ro.oid = p.proowner
  where n.nspname = 'public'
    and p.prosecdef
) rows
order by section, object_name, role_or_cmd;
*/

begin;

create schema if not exists security_audit;

revoke all on schema security_audit from public;
revoke all on schema security_audit from anon;
revoke all on schema security_audit from authenticated;

create table if not exists security_audit.advisor_fix_2_20261021 (
  kind text not null,
  object_name text not null,
  identity_args text not null default '',
  detail text,
  anon_priv boolean,
  authenticated_priv boolean,
  primary key (kind, object_name, identity_args)
);

alter table security_audit.advisor_fix_2_20261021 enable row level security;
revoke all on table security_audit.advisor_fix_2_20261021 from public, anon, authenticated;

insert into security_audit.advisor_fix_2_20261021 (
  kind, object_name, identity_args, detail, anon_priv, authenticated_priv
)
select 'view',
       c.relname,
       '',
       coalesce(c.reloptions::text, ''),
       pg_catalog.has_table_privilege('anon', c.oid, 'SELECT'),
       pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT')
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'user_current_plan',
    'user_current_plan_view',
    'user_effective_plan',
    'user_effective_plan_view',
    'user_effective_plan_final'
  )
on conflict (kind, object_name, identity_args) do nothing;

revoke all on table public.user_current_plan from public, anon, authenticated;
revoke all on table public.user_current_plan_view from public, anon, authenticated;
revoke all on table public.user_effective_plan from public, anon, authenticated;
revoke all on table public.user_effective_plan_view from public, anon, authenticated;
revoke all on table public.user_effective_plan_final from public, anon, authenticated;

grant select on table public.user_current_plan to service_role;
grant select on table public.user_current_plan_view to service_role;
grant select on table public.user_effective_plan to service_role;
grant select on table public.user_effective_plan_view to service_role;
grant select on table public.user_effective_plan_final to service_role;

alter view public.user_current_plan set (security_invoker = on);
alter view public.user_current_plan_view set (security_invoker = on);
alter view public.user_effective_plan set (security_invoker = on);
alter view public.user_effective_plan_view set (security_invoker = on);
alter view public.user_effective_plan_final set (security_invoker = on);

do $functions$
declare
  fn record;
  view_name text;
  routine_kind text;
begin
  insert into security_audit.advisor_fix_2_20261021 (
    kind, object_name, identity_args, detail, anon_priv, authenticated_priv
  )
  select 'function_exec',
         p.proname,
         pg_catalog.pg_get_function_identity_arguments(p.oid),
         coalesce(array_to_string(p.proconfig, ','), ''),
         pg_catalog.has_function_privilege('anon', p.oid, 'execute'),
         pg_catalog.has_function_privilege('authenticated', p.oid, 'execute')
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and not exists (
      select 1
      from pg_catalog.pg_depend dep
      where dep.objid = p.oid
        and dep.deptype = 'e'
        and dep.classid = 'pg_catalog.pg_proc'::regclass
    )
    and (
      pg_catalog.has_function_privilege('anon', p.oid, 'execute')
      or pg_catalog.has_function_privilege('authenticated', p.oid, 'execute')
    )
  on conflict (kind, object_name, identity_args) do nothing;

  for fn in
    select object_name, identity_args
    from security_audit.advisor_fix_2_20261021
    where kind = 'function_exec'
  loop
    select case p.prokind
             when 'p' then 'procedure'
             else 'function'
           end
      into routine_kind
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = fn.object_name
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = fn.identity_args
    limit 1;

    if routine_kind is null then
      continue;
    end if;

    execute 'revoke all on ' || routine_kind || ' public.'
      || quote_ident(fn.object_name) || '(' || fn.identity_args
      || ') from public, anon, authenticated';

    if fn.object_name in ('is_team_member', 'is_team_owner', 'current_team_ids')
       or exists (
         select 1
         from pg_catalog.pg_policies pol
         where coalesce(pol.qual, '') ~* ('\m' || fn.object_name || '\M')
            or coalesce(pol.with_check, '') ~* ('\m' || fn.object_name || '\M')
       )
    then
      execute 'grant execute on ' || routine_kind || ' public.'
        || quote_ident(fn.object_name) || '(' || fn.identity_args
        || ') to authenticated';
    end if;

    execute 'grant execute on ' || routine_kind || ' public.'
      || quote_ident(fn.object_name) || '(' || fn.identity_args
      || ') to service_role';
  end loop;

  for fn in
    select p.proname as object_name,
           pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_args,
           p.prokind
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1
        from pg_catalog.pg_depend dep
        where dep.objid = p.oid
          and dep.deptype = 'e'
          and dep.classid = 'pg_catalog.pg_proc'::regclass
      )
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) as config
        where config like 'search_path=%'
      )
  loop
    routine_kind := case fn.prokind
      when 'p' then 'procedure'
      else 'function'
    end;

    insert into security_audit.advisor_fix_2_20261021 (
      kind, object_name, identity_args, detail, anon_priv, authenticated_priv
    )
    values ('function_path', fn.object_name, fn.identity_args, routine_kind, null, null)
    on conflict (kind, object_name, identity_args) do nothing;

    execute 'alter ' || routine_kind || ' public.'
      || quote_ident(fn.object_name) || '(' || fn.identity_args
      || ') set search_path = public, extensions, pg_temp';
  end loop;

  -- Non-superuser enqueue owners still need SELECT on the views after the
  -- revoke above. Superusers pass the privilege check without this grant.
  for fn in
    select distinct ro.oid as owner_oid, ro.rolname as owner
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    join pg_catalog.pg_roles ro on ro.oid = p.proowner
    where n.nspname = 'public'
      and p.proname like 'enqueue_subscription%'
      and not ro.rolsuper
      and ro.rolname not in ('anon', 'authenticated', 'public', 'service_role')
  loop
    foreach view_name in array '{user_current_plan,user_current_plan_view,user_effective_plan,user_effective_plan_view,user_effective_plan_final}'::text[]
    loop
      if to_regclass('public.' || view_name) is not null
         and not coalesce(
           pg_catalog.has_table_privilege(fn.owner_oid, to_regclass('public.' || view_name), 'SELECT'),
           false
         )
      then
        insert into security_audit.advisor_fix_2_20261021 (
          kind, object_name, identity_args, detail, anon_priv, authenticated_priv
        )
        values ('view_owner_grant', view_name, fn.owner, null, null, null)
        on conflict (kind, object_name, identity_args) do nothing;

        execute 'grant select on table public.' || quote_ident(view_name)
          || ' to ' || quote_ident(fn.owner);
      end if;
    end loop;
  end loop;

  for fn in
    select p.proname,
           pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_args,
           pg_catalog.pg_get_userbyid(p.proowner) as owner,
           ro.rolsuper,
           ro.rolbypassrls,
           ro.oid as owner_oid
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    join pg_catalog.pg_roles ro on ro.oid = p.proowner
    where n.nspname = 'public'
      and (p.proname like 'enqueue_subscription%' or p.proname = 'delete_old_chat_data')
  loop
    if fn.proname like 'enqueue_subscription%' and not fn.rolsuper and not fn.rolbypassrls then
      raise warning 'function %(%) owner % is not superuser or bypassrls. security_invoker views run as this role, so subscription mail may see only that role''s rows. See enqueue_or_cleanup_owner in the verification grid.',
        fn.proname, fn.identity_args, fn.owner;
    elsif fn.proname like 'enqueue_subscription%' and fn.rolbypassrls and not fn.rolsuper then
      if not (
        coalesce(pg_catalog.has_table_privilege(fn.owner_oid, to_regclass('public.subscriptions'), 'SELECT'), false)
        and coalesce(pg_catalog.has_table_privilege(fn.owner_oid, to_regclass('public.profiles'), 'SELECT'), false)
      ) then
        raise warning 'function %(%) owner % bypasses RLS but lacks SELECT on subscriptions or profiles. security_invoker views will fail inside it.',
          fn.proname, fn.identity_args, fn.owner;
      end if;
    end if;
  end loop;
end
$functions$;

do $policies$
declare
  pol record;
  normalized_qual text;
  normalized_check text;
  always_qual boolean;
  always_check boolean;
  applies boolean;
  drop_it boolean;
  recreate text;
  role_list text;
begin
  if to_regclass('public.feedback_messages') is not null then
    insert into security_audit.advisor_fix_2_20261021 (
      kind, object_name, identity_args, detail, anon_priv, authenticated_priv
    )
    select 'table_rls',
           'feedback_messages',
           '',
           case when c.relrowsecurity then 'rls=on' else 'rls=off' end,
           pg_catalog.has_table_privilege('anon', c.oid, 'SELECT')
             or pg_catalog.has_table_privilege('anon', c.oid, 'INSERT')
             or pg_catalog.has_table_privilege('anon', c.oid, 'UPDATE')
             or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'),
           pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT')
             or pg_catalog.has_table_privilege('authenticated', c.oid, 'INSERT')
             or pg_catalog.has_table_privilege('authenticated', c.oid, 'UPDATE')
             or pg_catalog.has_table_privilege('authenticated', c.oid, 'DELETE')
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'feedback_messages'
    on conflict (kind, object_name, identity_args) do nothing;

    execute 'alter table public.feedback_messages enable row level security';
  end if;

  for pol in
    select *
    from pg_catalog.pg_policies
    where (schemaname = 'public' and tablename = 'feedback_messages')
       or (schemaname = 'storage' and tablename = 'objects')
  loop
    normalized_qual := replace(replace(replace(lower(coalesce(pol.qual, '')), ' ', ''), E'\n', ''), E'\t', '');
    normalized_check := replace(replace(replace(lower(coalesce(pol.with_check, '')), ' ', ''), E'\n', ''), E'\t', '');
    always_qual := normalized_qual in ('true', '(true)', '1=1', '(1=1)');
    always_check := normalized_check in ('true', '(true)', '1=1', '(1=1)');
    applies := coalesce(
      pol.roles && array['anon'::name, 'authenticated'::name, 'public'::name],
      false
    );
    drop_it := false;

    -- Lint 0024 flags permissive UPDATE, DELETE, ALL, and INSERT policies
    -- with an always-true expression for anon, authenticated, or public.
    -- SELECT using (true) is dropped as well so one role cannot read
    -- another person's feedback. Restrictive policies are kept.
    if pol.schemaname = 'public'
       and pol.tablename = 'feedback_messages'
       and applies
       and pol.permissive = 'PERMISSIVE'
    then
      if pol.cmd in ('SELECT', 'UPDATE', 'DELETE', 'ALL')
         and (always_qual or pol.qual is null)
      then
        drop_it := true;
      end if;
      if pol.cmd = 'INSERT' and (always_check or pol.with_check is null) then
        drop_it := true;
      end if;
      if pol.cmd in ('UPDATE', 'ALL') and always_check then
        drop_it := true;
      end if;
    end if;

    -- Lint 0025: a public bucket plus a broad SELECT lists every file.
    -- Public object URLs do not use this policy. Owner policies mention
    -- auth.uid or foldername and stay. shares_public_read names shares.
    if pol.schemaname = 'storage'
       and pol.tablename = 'objects'
       and pol.cmd in ('SELECT', 'ALL')
       and pol.permissive = 'PERMISSIVE'
       and applies
       and replace(replace(replace(lower(coalesce(pol.qual, '') || coalesce(pol.with_check, '')), ' ', ''), E'\n', ''), E'\t', '') not like '%auth.uid()%'
       and replace(replace(replace(lower(coalesce(pol.qual, '') || coalesce(pol.with_check, '')), ' ', ''), E'\n', ''), E'\t', '') not like '%foldername%'
       and (
         replace(replace(replace(lower(coalesce(pol.qual, '')), ' ', ''), E'\n', ''), E'\t', '') like '%avatars%'
         or pol.qual is null
         or always_qual
       )
    then
      drop_it := true;
    end if;

    if not drop_it then
      continue;
    end if;

    if array_to_string(pol.roles, ',') in ('public', 'PUBLIC')
       or array_to_string(pol.roles, '') in ('public', 'PUBLIC')
    then
      role_list := 'public';
    else
      select string_agg(quote_ident(r.role_name::text), ', ' order by r.role_name::text)
        into role_list
      from unnest(pol.roles) as r(role_name);
    end if;

    if role_list is null or role_list = '' then
      raise exception 'policy % on %.% has no roles to recreate', pol.policyname, pol.schemaname, pol.tablename;
    end if;

    recreate := format(
      'create policy %I on %I.%I as %s for %s to %s',
      pol.policyname,
      pol.schemaname,
      pol.tablename,
      case when pol.permissive = 'PERMISSIVE' then 'permissive' else 'restrictive' end,
      pol.cmd,
      role_list
    );
    if pol.qual is not null then
      recreate := recreate || ' using (' || pol.qual || ')';
    end if;
    if pol.with_check is not null then
      recreate := recreate || ' with check (' || pol.with_check || ')';
    end if;

    insert into security_audit.advisor_fix_2_20261021 (
      kind, object_name, identity_args, detail, anon_priv, authenticated_priv
    )
    values (
      'policy',
      pol.schemaname || '.' || pol.tablename,
      pol.policyname,
      recreate,
      null,
      null
    )
    on conflict (kind, object_name, identity_args) do nothing;

    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  if to_regclass('public.feedback_messages') is not null then
    execute 'revoke all on table public.feedback_messages from public, anon, authenticated';
    execute 'grant all on table public.feedback_messages to service_role';
  end if;
end
$policies$;

commit;

-- One grid. ok = false is a row that still needs attention.
select * from (
  select 'view'::text as section,
         c.relname as object_name,
         (
           not pg_catalog.has_table_privilege('anon', c.oid, 'SELECT')
           and not pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT')
           and pg_catalog.has_table_privilege('service_role', c.oid, 'SELECT')
           and lower(coalesce(c.reloptions::text, '')) ~ 'security_invoker=(1|true|yes|on)'
         ) as ok,
         'anon=' || pg_catalog.has_table_privilege('anon', c.oid, 'SELECT')::text
           || ' auth=' || pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT')::text
           || ' service=' || pg_catalog.has_table_privilege('service_role', c.oid, 'SELECT')::text
           || ' opts=' || coalesce(c.reloptions::text, '') as detail
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'user_current_plan',
      'user_current_plan_view',
      'user_effective_plan',
      'user_effective_plan_view',
      'user_effective_plan_final'
    )

  union all

  select 'enqueue_or_cleanup_owner',
         p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')',
         (
           not pg_catalog.has_function_privilege('anon', p.oid, 'execute')
           and not pg_catalog.has_function_privilege('authenticated', p.oid, 'execute')
           and (
             p.proname = 'delete_old_chat_data'
             or ro.rolsuper
             or (
               ro.rolbypassrls
               and coalesce(pg_catalog.has_table_privilege(ro.oid, to_regclass('public.user_current_plan'), 'SELECT'), false)
               and coalesce(pg_catalog.has_table_privilege(ro.oid, to_regclass('public.user_current_plan_view'), 'SELECT'), false)
               and coalesce(pg_catalog.has_table_privilege(ro.oid, to_regclass('public.user_effective_plan'), 'SELECT'), false)
               and coalesce(pg_catalog.has_table_privilege(ro.oid, to_regclass('public.subscriptions'), 'SELECT'), false)
               and coalesce(pg_catalog.has_table_privilege(ro.oid, to_regclass('public.profiles'), 'SELECT'), false)
             )
           )
         ),
         'owner=' || pg_catalog.pg_get_userbyid(p.proowner)
           || ' super=' || ro.rolsuper::text
           || ' bypassrls=' || ro.rolbypassrls::text
           || ' anon_exec=' || pg_catalog.has_function_privilege('anon', p.oid, 'execute')::text
           || ' auth_exec=' || pg_catalog.has_function_privilege('authenticated', p.oid, 'execute')::text
           || ' views_select=' || (
                coalesce(pg_catalog.has_table_privilege(ro.oid, to_regclass('public.user_current_plan'), 'SELECT'), false)
                and coalesce(pg_catalog.has_table_privilege(ro.oid, to_regclass('public.user_current_plan_view'), 'SELECT'), false)
                and coalesce(pg_catalog.has_table_privilege(ro.oid, to_regclass('public.user_effective_plan'), 'SELECT'), false)
                and coalesce(pg_catalog.has_table_privilege(ro.oid, to_regclass('public.user_effective_plan_view'), 'SELECT'), false)
                and coalesce(pg_catalog.has_table_privilege(ro.oid, to_regclass('public.user_effective_plan_final'), 'SELECT'), false)
              )::text
           || ' subscriptions_select=' || coalesce(pg_catalog.has_table_privilege(ro.oid, to_regclass('public.subscriptions'), 'SELECT'), false)::text
           || ' profiles_select=' || coalesce(pg_catalog.has_table_privilege(ro.oid, to_regclass('public.profiles'), 'SELECT'), false)::text
           || ' subscriptions_rls=' || coalesce((select c.relrowsecurity::text from pg_catalog.pg_class c where c.oid = to_regclass('public.subscriptions')), 'missing')
           || ' profiles_rls=' || coalesce((select c.relrowsecurity::text from pg_catalog.pg_class c where c.oid = to_regclass('public.profiles')), 'missing')
           || ' subscriptions_force=' || coalesce((select c.relforcerowsecurity::text from pg_catalog.pg_class c where c.oid = to_regclass('public.subscriptions')), 'missing')
           || ' profiles_force=' || coalesce((select c.relforcerowsecurity::text from pg_catalog.pg_class c where c.oid = to_regclass('public.profiles')), 'missing')
           || ' subscriptions_owned=' || coalesce((select (c.relowner = p.proowner)::text from pg_catalog.pg_class c where c.oid = to_regclass('public.subscriptions')), 'missing')
           || ' profiles_owned=' || coalesce((select (c.relowner = p.proowner)::text from pg_catalog.pg_class c where c.oid = to_regclass('public.profiles')), 'missing')
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  join pg_catalog.pg_roles ro on ro.oid = p.proowner
  where n.nspname = 'public'
    and (p.proname like 'enqueue_subscription%' or p.proname = 'delete_old_chat_data')

  union all

  select 'anon_definer_remaining',
         'non_extension',
         count(*) = 0,
         'count=' || count(*)::text
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and pg_catalog.has_function_privilege('anon', p.oid, 'execute')
    and not exists (
      select 1
      from pg_catalog.pg_depend dep
      where dep.objid = p.oid
        and dep.deptype = 'e'
        and dep.classid = 'pg_catalog.pg_proc'::regclass
    )

  union all

  select 'anon_definer_extension',
         'extension_owned',
         count(*) = 0,
         'count=' || count(*)::text || ' extension-owned security definer functions still executable by anon; this script does not alter extensions'
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and pg_catalog.has_function_privilege('anon', p.oid, 'execute')
    and exists (
      select 1
      from pg_catalog.pg_depend dep
      where dep.objid = p.oid
        and dep.deptype = 'e'
        and dep.classid = 'pg_catalog.pg_proc'::regclass
    )

  union all

  select 'search_path_missing',
         'public_routines',
         count(*) = 0,
         'count=' || count(*)::text
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and not exists (
      select 1
      from pg_catalog.pg_depend dep
      where dep.objid = p.oid
        and dep.deptype = 'e'
        and dep.classid = 'pg_catalog.pg_proc'::regclass
    )
    and not exists (
      select 1
      from unnest(coalesce(p.proconfig, array[]::text[])) as config
      where config like 'search_path=%'
    )

  union all

  select 'feedback_open_policy',
         'always_true',
         count(*) = 0,
         'count=' || count(*)::text
  from pg_catalog.pg_policies pol
  where pol.schemaname = 'public'
    and pol.tablename = 'feedback_messages'
    and pol.permissive = 'PERMISSIVE'
    and coalesce(pol.roles && array['anon'::name, 'authenticated'::name, 'public'::name], false)
    and (
      (
        pol.cmd in ('SELECT', 'UPDATE', 'DELETE', 'ALL')
        and (
          pol.qual is null
          or replace(replace(replace(lower(coalesce(pol.qual, 'x')), ' ', ''), E'\n', ''), E'\t', '')
             in ('true', '(true)', '1=1', '(1=1)')
        )
      )
      or (
        pol.cmd = 'INSERT'
        and (
          pol.with_check is null
          or replace(replace(replace(lower(coalesce(pol.with_check, 'x')), ' ', ''), E'\n', ''), E'\t', '')
             in ('true', '(true)', '1=1', '(1=1)')
        )
      )
      or (
        pol.cmd in ('UPDATE', 'ALL')
        and replace(replace(replace(lower(coalesce(pol.with_check, 'x')), ' ', ''), E'\n', ''), E'\t', '')
            in ('true', '(true)', '1=1', '(1=1)')
      )
    )

  union all

  select 'feedback_table',
         'privileges',
         coalesce(c.oid is null, false)
           or (
             coalesce(c.relrowsecurity, false)
             and not coalesce(pg_catalog.has_table_privilege('anon', c.oid, 'SELECT'), false)
             and not coalesce(pg_catalog.has_table_privilege('anon', c.oid, 'INSERT'), false)
             and not coalesce(pg_catalog.has_table_privilege('anon', c.oid, 'UPDATE'), false)
             and not coalesce(pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'), false)
             and not coalesce(pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT'), false)
             and not coalesce(pg_catalog.has_table_privilege('authenticated', c.oid, 'INSERT'), false)
             and not coalesce(pg_catalog.has_table_privilege('authenticated', c.oid, 'UPDATE'), false)
             and not coalesce(pg_catalog.has_table_privilege('authenticated', c.oid, 'DELETE'), false)
             and coalesce(pg_catalog.has_table_privilege('service_role', c.oid, 'SELECT'), false)
           ),
         case
           when c.oid is null then 'missing'
           else 'rls=' || c.relrowsecurity::text
             || ' anon_select=' || coalesce(pg_catalog.has_table_privilege('anon', c.oid, 'SELECT'), false)::text
             || ' anon_insert=' || coalesce(pg_catalog.has_table_privilege('anon', c.oid, 'INSERT'), false)::text
             || ' auth_select=' || coalesce(pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT'), false)::text
             || ' auth_insert=' || coalesce(pg_catalog.has_table_privilege('authenticated', c.oid, 'INSERT'), false)::text
             || ' service_select=' || coalesce(pg_catalog.has_table_privilege('service_role', c.oid, 'SELECT'), false)::text
         end
  from (select pg_catalog.to_regclass('public.feedback_messages') as oid) marked
  left join pg_catalog.pg_class c on c.oid = marked.oid

  union all

  select 'avatar_list_policy',
         'broad_select',
         count(*) = 0,
         'count=' || count(*)::text
  from pg_catalog.pg_policies pol
  where pol.schemaname = 'storage'
    and pol.tablename = 'objects'
    and pol.cmd in ('SELECT', 'ALL')
    and pol.permissive = 'PERMISSIVE'
    and coalesce(pol.roles && array['anon'::name, 'authenticated'::name, 'public'::name], false)
    and replace(replace(replace(lower(coalesce(pol.qual, '') || coalesce(pol.with_check, '')), ' ', ''), E'\n', ''), E'\t', '') not like '%auth.uid()%'
    and replace(replace(replace(lower(coalesce(pol.qual, '') || coalesce(pol.with_check, '')), ' ', ''), E'\n', ''), E'\t', '') not like '%foldername%'
    and (
      replace(replace(replace(lower(coalesce(pol.qual, '')), ' ', ''), E'\n', ''), E'\t', '') like '%avatars%'
      or pol.qual is null
      or replace(replace(replace(lower(coalesce(pol.qual, 'x')), ' ', ''), E'\n', ''), E'\t', '')
         in ('true', '(true)', '1=1', '(1=1)')
    )

  union all

  select 'avatar_owner_policy',
         'kept_write_rules',
         count(*) >= 3,
         'count=' || count(*)::text
           || ' names=' || coalesce(string_agg(pol.policyname, ',' order by pol.policyname), '')
  from pg_catalog.pg_policies pol
  where pol.schemaname = 'storage'
    and pol.tablename = 'objects'
    and (
      coalesce(pol.qual, '') ilike '%avatars%'
      or coalesce(pol.with_check, '') ilike '%avatars%'
      or pol.policyname ilike '%avatar%'
    )
    and (
      coalesce(pol.qual, '') ilike '%auth.uid()%'
      or coalesce(pol.with_check, '') ilike '%auth.uid()%'
      or coalesce(pol.qual, '') ilike '%foldername%'
      or coalesce(pol.with_check, '') ilike '%foldername%'
    )
) checked
order by ok, section, object_name;

/*
ROLLBACK — paste this block alone into a new query to undo the fix.
It restores anon and authenticated SELECT on the five views, turns
security_invoker back off when it was off, grants EXECUTE back to whichever
of anon and authenticated had it, resets search_path on routines this
script pinned, revokes view SELECT granted to a non-superuser enqueue
owner, and recreates dropped policies. Running it twice is safe for those
policies (each one is dropped and created again). That re-opens the findings.

begin;

do $rollback$
declare
  row record;
  routine_kind text;
begin
  if to_regclass('security_audit.advisor_fix_2_20261021') is null then
    raise exception 'security_audit.advisor_fix_2_20261021 is missing; the fix has not been applied here';
  end if;

  for row in
    select object_name, identity_args
    from security_audit.advisor_fix_2_20261021
    where kind = 'view_owner_grant'
  loop
    execute 'revoke select on table public.' || quote_ident(row.object_name)
      || ' from ' || quote_ident(row.identity_args);
  end loop;

  for row in
    select object_name, detail, anon_priv, authenticated_priv
    from security_audit.advisor_fix_2_20261021
    where kind = 'view'
  loop
    if coalesce(row.detail, '') not ilike '%security_invoker%' then
      execute format('alter view public.%I reset (security_invoker)', row.object_name);
    end if;
    if row.anon_priv then
      execute format('grant select on table public.%I to anon', row.object_name);
    end if;
    if row.authenticated_priv then
      execute format('grant select on table public.%I to authenticated', row.object_name);
    end if;
  end loop;

  for row in
    select object_name, identity_args, anon_priv, authenticated_priv
    from security_audit.advisor_fix_2_20261021
    where kind = 'function_exec'
  loop
    select case p.prokind
             when 'p' then 'procedure'
             else 'function'
           end
      into routine_kind
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = row.object_name
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = row.identity_args
    limit 1;

    if routine_kind is null then
      raise warning 'skipping missing routine %', row.object_name;
      continue;
    end if;

    if row.anon_priv then
      execute 'grant execute on ' || routine_kind || ' public.'
        || quote_ident(row.object_name) || '(' || row.identity_args || ') to anon';
    end if;
    if row.authenticated_priv then
      execute 'grant execute on ' || routine_kind || ' public.'
        || quote_ident(row.object_name) || '(' || row.identity_args || ') to authenticated';
    end if;
  end loop;

  for row in
    select object_name, identity_args, detail
    from security_audit.advisor_fix_2_20261021
    where kind = 'function_path'
  loop
    if coalesce(row.detail, 'function') not in ('function', 'procedure') then
      raise exception 'unexpected routine kind % for %', row.detail, row.object_name;
    end if;
    execute 'alter ' || row.detail || ' public.'
      || quote_ident(row.object_name) || '(' || row.identity_args || ') reset search_path';
  end loop;

  for row in
    select object_name, identity_args, detail
    from security_audit.advisor_fix_2_20261021
    where kind = 'policy'
      and detail is not null
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      row.identity_args,
      split_part(row.object_name, '.', 1),
      split_part(row.object_name, '.', 2)
    );
    execute row.detail;
  end loop;

  if to_regclass('public.feedback_messages') is not null then
    if exists (
      select 1
      from security_audit.advisor_fix_2_20261021
      where kind = 'table_rls'
        and object_name = 'feedback_messages'
        and detail = 'rls=off'
    ) then
      execute 'alter table public.feedback_messages disable row level security';
    end if;
    if exists (
      select 1
      from security_audit.advisor_fix_2_20261021
      where kind = 'table_rls'
        and object_name = 'feedback_messages'
        and anon_priv is true
    ) then
      execute 'grant all on table public.feedback_messages to anon';
    end if;
    if exists (
      select 1
      from security_audit.advisor_fix_2_20261021
      where kind = 'table_rls'
        and object_name = 'feedback_messages'
        and authenticated_priv is true
    ) then
      execute 'grant all on table public.feedback_messages to authenticated';
    end if;
  end if;
end
$rollback$;

commit;
*/
