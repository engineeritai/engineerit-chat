-- Records terms acceptance for accounts created after this migration.
-- Do not apply this file to production from CI or an agent. Apply it yourself.
-- Existing profile rows stay null. This file does not update them.

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;

alter table public.profiles
  add column if not exists terms_version text;

comment on column public.profiles.terms_accepted_at is
  'When the account accepted the terms. Null for accounts created before this column.';

comment on column public.profiles.terms_version is
  'Terms version the account accepted, for example 2026-10-26. Null for accounts created before this column.';

-- If the optional signup trigger from 20261023150000 is already installed, copy
-- acceptance out of the auth metadata. This does not create that trigger, and
-- it leaves any other handle_new_user function alone.
do $mig$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'handle_new_user'
      and pg_get_functiondef(p.oid) like '%subscription_tier%'
      and pg_get_functiondef(p.oid) not like '%terms_accepted_at%'
  ) then
    execute $fn$
      create or replace function public.handle_new_user()
      returns trigger
      language plpgsql
      security definer
      set search_path = public
      as $body$
      begin
        insert into public.profiles (
          id,
          full_name,
          email,
          subscription_tier,
          terms_accepted_at,
          terms_version
        )
        values (
          new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
          new.email,
          'assistant',
          nullif(new.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz,
          nullif(new.raw_user_meta_data->>'terms_version', '')
        )
        on conflict (id) do nothing;
        return new;
      end;
      $body$
    $fn$;
    execute 'revoke all on function public.handle_new_user() from public, anon, authenticated';
  end if;
end
$mig$;
