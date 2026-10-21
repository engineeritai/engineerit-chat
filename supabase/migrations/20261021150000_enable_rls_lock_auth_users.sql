-- engineerit advisor fix, 21 Oct 2026.
-- Paste this whole file into the Supabase SQL editor and run it as its own query.
-- Safe to run again. The rollback is a comment, so this paste does not undo itself.
--
-- Nothing in the repo applies SQL on deploy, in CI, or on Vercel.
-- There is no supabase/config.toml.
--
-- Scoped to the six objects from the production diagnostic:
--
--   public.subscription_email_queue
--   public.daily_usage_limits
--   public.email_queue
--   public.admin_users_overview
--   public.admin_users_subscription_view
--   public.admin_users_with_subscription
--
-- Tables. No file in this repo reads or writes subscription_email_queue or
-- email_queue. daily_usage_limits is read and upserted only by
-- app/api/chat/route.ts through the service-role client (not the user
-- session). The key is day + ip hash + user_key + plan, including guests,
-- so an auth.uid() policy would not match that path. All three tables are
-- server-only: RLS on, no policies, anon and authenticated revoked,
-- service_role keeps every privilege. The service role bypasses RLS.
--
-- Views. No file in this repo selects these views. Admin pages send the
-- user access token to /api/admin/stats and /api/admin/overview, and those
-- routes use the service-role client (auth.admin.listUsers,
-- billing_subscriptions, moyasar_invoices, conversations, renewal_attempts,
-- teams). The browser client is used only to read the session. Revoke anon
-- and authenticated, set security_invoker, and leave SELECT for service_role.

begin;

alter table public.subscription_email_queue enable row level security;
alter table public.daily_usage_limits enable row level security;
alter table public.email_queue enable row level security;

revoke all on table public.subscription_email_queue from public, anon, authenticated;
revoke all on table public.daily_usage_limits from public, anon, authenticated;
revoke all on table public.email_queue from public, anon, authenticated;

grant all on table public.subscription_email_queue to service_role;
grant all on table public.daily_usage_limits to service_role;
grant all on table public.email_queue to service_role;

revoke all on table public.admin_users_overview from public, anon, authenticated;
revoke all on table public.admin_users_subscription_view from public, anon, authenticated;
revoke all on table public.admin_users_with_subscription from public, anon, authenticated;

grant select on table public.admin_users_overview to service_role;
grant select on table public.admin_users_subscription_view to service_role;
grant select on table public.admin_users_with_subscription to service_role;

alter view public.admin_users_overview set (security_invoker = on);
alter view public.admin_users_subscription_view set (security_invoker = on);
alter view public.admin_users_with_subscription set (security_invoker = on);

commit;

-- Post-apply check. Expect three tables with rls_enabled true, three views,
-- every anon_* and authenticated_* column false, service_select true,
-- and each view's reloptions containing security_invoker.
select c.relname,
       c.relkind,
       c.relrowsecurity as rls_enabled,
       pg_catalog.has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
       pg_catalog.has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
       pg_catalog.has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
       pg_catalog.has_table_privilege('anon', c.oid, 'DELETE') as anon_delete,
       pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
       pg_catalog.has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_insert,
       pg_catalog.has_table_privilege('authenticated', c.oid, 'UPDATE') as authenticated_update,
       pg_catalog.has_table_privilege('authenticated', c.oid, 'DELETE') as authenticated_delete,
       pg_catalog.has_table_privilege('service_role', c.oid, 'SELECT') as service_select,
       c.reloptions
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'subscription_email_queue',
    'daily_usage_limits',
    'email_queue',
    'admin_users_overview',
    'admin_users_subscription_view',
    'admin_users_with_subscription'
  )
order by c.relname;

/*
ROLLBACK — paste this block alone into a new query to undo the fix.
It turns RLS back off on the three tables and grants anon and authenticated
the Data API privileges those tables had under Supabase's old defaults.
It also makes the three views security-definer again and grants them SELECT.
That re-opens the advisor findings. Run it only to revert.

begin;

alter table public.subscription_email_queue disable row level security;
alter table public.daily_usage_limits disable row level security;
alter table public.email_queue disable row level security;

grant all on table public.subscription_email_queue to anon, authenticated;
grant all on table public.daily_usage_limits to anon, authenticated;
grant all on table public.email_queue to anon, authenticated;

alter view public.admin_users_overview reset (security_invoker);
alter view public.admin_users_subscription_view reset (security_invoker);
alter view public.admin_users_with_subscription reset (security_invoker);

grant select on table public.admin_users_overview to anon, authenticated;
grant select on table public.admin_users_subscription_view to anon, authenticated;
grant select on table public.admin_users_with_subscription to anon, authenticated;

commit;
*/
