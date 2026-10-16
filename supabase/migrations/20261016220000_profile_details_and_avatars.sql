-- Profile details and the public avatars bucket.
-- Apply after 20261016210000_profile_subscription_fields.sql.
-- Does not change billing amounts, invoices, or subscription status.

do $$
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  alter table public.profiles add column if not exists job_title text;
  alter table public.profiles add column if not exists company text;
  alter table public.profiles add column if not exists phone text;
  alter table public.profiles add column if not exists country text;
  alter table public.profiles add column if not exists discipline text;

  comment on column public.profiles.job_title is 'Job title shown on the profile.';
  comment on column public.profiles.company is 'Company shown on the profile.';
  comment on column public.profiles.phone is 'Phone shown on the profile.';
  comment on column public.profiles.country is 'Country shown on the profile.';
  comment on column public.profiles.discipline is 'Engineering discipline shown on the profile.';
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_public_read'
  ) then
    create policy avatars_public_read on storage.objects
      for select
      using (bucket_id = 'avatars');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_owner_insert'
  ) then
    create policy avatars_owner_insert on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_owner_update'
  ) then
    create policy avatars_owner_update on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_owner_delete'
  ) then
    create policy avatars_owner_delete on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
