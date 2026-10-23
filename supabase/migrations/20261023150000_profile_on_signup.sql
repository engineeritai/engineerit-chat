-- Profile row for every new account, and owner-only access for the signed-in user.
-- Safe to run more than once. Does not replace an existing on_auth_user_created trigger.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  email text,
  subscription_tier text not null default 'assistant',
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists subscription_tier text default 'assistant';
alter table public.profiles add column if not exists updated_at timestamptz default now();

alter table public.profiles enable row level security;

revoke all on public.profiles from public, anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $fn$
    begin
      insert into public.profiles (id, full_name, email, subscription_tier)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
        new.email,
        'assistant'
      )
      on conflict (id) do nothing;
      return new;
    end;
    $fn$;

    revoke all on function public.handle_new_user() from public, anon, authenticated;

    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- Pending checkouts can be cancelled after Moyasar says they were not paid.
alter table public.moyasar_invoices drop constraint if exists moyasar_invoices_status_check;
alter table public.moyasar_invoices
  add constraint moyasar_invoices_status_check
  check (status in ('pending', 'paid', 'cancelled'));
