-- Anonymous page views for the owner traffic page.
--
-- The app stores a daily visitor id that is a salted SHA-256 of
-- (IP + user agent + Arabia date). It does not store the raw IP, the user
-- agent, a cookie, or an email.
--
-- Set VISIT_HASH_SALT on the server (Vercel production) to a long random
-- string of at least 16 characters. If the variable is missing, the app
-- still records visits with a built-in fallback salt and still stores no
-- raw IP. Set the variable before you rely on the hash.
--
-- Run this in the Supabase SQL editor. Until it is applied, the admin
-- traffic page says "Visits: table not created yet".
--
-- Inserts and reads go through the service role. The stats API checks the
-- owner email before it reads. There is no policy for anon or authenticated,
-- so the browser cannot insert or select.

create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_class text not null,
  language text not null,
  visitor_id text not null,
  constraint page_views_path_shape check (
    char_length(path) between 1 and 180
    and path like '/%'
    and position('?' in path) = 0
    and position('#' in path) = 0
    and position('@' in path) = 0
  ),
  constraint page_views_referrer_shape check (
    referrer_host is null
    or (
      char_length(referrer_host) between 1 and 253
      and referrer_host !~ '[:/?#@\s]'
    )
  ),
  constraint page_views_utm_source_shape check (
    utm_source is null or utm_source ~ '^[a-z0-9][a-z0-9_-]{0,40}$'
  ),
  constraint page_views_utm_medium_shape check (
    utm_medium is null or utm_medium ~ '^[a-z0-9][a-z0-9_-]{0,40}$'
  ),
  constraint page_views_utm_campaign_shape check (
    utm_campaign is null or utm_campaign ~ '^[a-z0-9][a-z0-9_-]{0,40}$'
  ),
  constraint page_views_device_class check (device_class in ('mobile', 'desktop')),
  constraint page_views_language check (language in ('en', 'ar')),
  constraint page_views_visitor_id_shape check (visitor_id ~ '^[0-9a-f]{64}$')
);

create index if not exists page_views_created_idx
  on public.page_views (created_at desc);

comment on table public.page_views is
  'Anonymous page views. Service role inserts them. The owner stats API reads them. No raw IP and no cookies.';

alter table public.page_views enable row level security;
alter table public.page_views force row level security;

revoke all on table public.page_views from public, anon, authenticated;
grant select, insert on table public.page_views to service_role;

revoke all on sequence public.page_views_id_seq from public, anon, authenticated;
grant usage, select on sequence public.page_views_id_seq to service_role;
