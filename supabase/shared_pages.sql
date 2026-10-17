-- Public chat shares. Apply this in the Supabase SQL editor, or rely on
-- supabase/migrations/20261017063000_shared_pages.sql.
-- The service role writes and reads these rows. Anonymous clients have no
-- policies. If the table is missing, the app stores the same record in the
-- public "shares" storage bucket so the link still works.

create table if not exists public.shared_pages (
  id text primary key,
  title text not null,
  markdown text not null,
  locale text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.shared_pages enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shares',
  'shares',
  true,
  2097152,
  array['application/json', 'text/html']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'shares_public_read'
  ) then
    create policy shares_public_read on storage.objects
      for select
      using (bucket_id = 'shares');
  end if;
end $$;
