-- Public chat shares. The service role writes and reads these rows.
-- Anonymous clients have no policies, so the table is not world-writable.
-- The app also stores a JSON and HTML copy in the public "shares" bucket
-- when this table is not present yet, so a share link does not depend on
-- a manual SQL step.

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
