-- Student verification for the Engineer 50% code. A student-looking login
-- email is not enough. Safe to run more than once.
-- Service role only. Signed-in users cannot write their own verification.

create extension if not exists pgcrypto;

alter table public.promo_codes
  add column if not exists requires_student boolean not null default false;

alter table public.moyasar_invoices
  add column if not exists promo_requires_student boolean not null default false;

alter table public.billing_subscriptions
  add column if not exists promo_requires_student boolean not null default false;

create table if not exists public.student_email_domains (
  domain text primary key,
  created_at timestamptz not null default now()
);

insert into public.student_email_domains (domain)
values ('.edu.sa'), ('.edu')
on conflict (domain) do nothing;

create table if not exists public.student_status (
  user_id uuid primary key,
  academic_email text,
  verified_until timestamptz,
  method text check (method is null or method in ('otp', 'document')),
  updated_at timestamptz not null default now()
);

create unique index if not exists student_status_academic_email_uidx
  on public.student_status (lower(academic_email))
  where academic_email is not null;

create table if not exists public.student_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  academic_email text not null,
  code_hash text not null,
  salt text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 5),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists student_otp_user_idx
  on public.student_otp_challenges (user_id, created_at desc);

create index if not exists student_otp_email_idx
  on public.student_otp_challenges (academic_email, created_at desc);

create table if not exists public.student_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 5242880),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists student_documents_status_idx
  on public.student_documents (status, created_at desc);

insert into public.promo_codes (
  code, label, discount_type, percent_off, plans, intervals, cycles,
  one_per_user, audience, domains, single_use, active, requires_student, note
)
select
  'STUDENT50',
  'Student 50%',
  'percent',
  50,
  array['engineer'],
  array['month'],
  12,
  true,
  'any',
  array[]::text[],
  false,
  true,
  true,
  '50% off the Engineer plan for 12 monthly cycles after student verification.'
where not exists (
  select 1 from public.promo_codes where code = 'STUDENT50'
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-documents',
  'student-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'student_documents_owner_select'
  ) then
    create policy student_documents_owner_select on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'student-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'student_documents_owner_insert'
  ) then
    create policy student_documents_owner_insert on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'student-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'student_documents_owner_delete'
  ) then
    create policy student_documents_owner_delete on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'student-documents'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;

alter table public.student_email_domains enable row level security;
alter table public.student_status enable row level security;
alter table public.student_otp_challenges enable row level security;
alter table public.student_documents enable row level security;

revoke all on table public.student_email_domains from public, anon, authenticated;
grant select, insert, update, delete on table public.student_email_domains to service_role;

revoke all on table public.student_status from public, anon, authenticated;
grant select, insert, update, delete on table public.student_status to service_role;

revoke all on table public.student_otp_challenges from public, anon, authenticated;
grant select, insert, update, delete on table public.student_otp_challenges to service_role;

revoke all on table public.student_documents from public, anon, authenticated;
grant select, insert, update, delete on table public.student_documents to service_role;
