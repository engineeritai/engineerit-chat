-- Promo and gift codes. List prices stay in the app. A code only changes the
-- checkout charge. Clients cannot read codes, redemptions, or question answers.
-- Safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  label text not null default '',
  discount_type text not null check (discount_type in ('percent', 'fixed', 'free_months')),
  percent_off numeric,
  amount_off_sar numeric,
  free_months integer,
  plans text[] not null default '{}',
  intervals text[] not null default '{month,year}',
  cycles integer not null default 1 check (cycles >= 1 and cycles <= 36),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer,
  one_per_user boolean not null default true,
  audience text not null default 'any' check (audience in ('any', 'domain', 'lapsed', 'batch')),
  domains text[] not null default '{}',
  single_use boolean not null default false,
  batch_id uuid,
  active boolean not null default true,
  restricted_user_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists promo_codes_code_uidx on public.promo_codes (code);
create index if not exists promo_codes_batch_idx on public.promo_codes (batch_id);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.promo_codes (id) on delete cascade,
  user_id uuid not null,
  email text,
  checkout_id uuid,
  plan text,
  billing_interval text,
  list_amount_sar numeric not null default 0,
  discount_sar numeric not null default 0,
  charged_amount_sar numeric not null default 0,
  cycles integer not null default 1,
  one_per_user boolean not null default true,
  status text not null default 'reserved' check (status in ('reserved', 'paid', 'released')),
  created_at timestamptz not null default now()
);

create index if not exists promo_redemptions_code_idx on public.promo_redemptions (code_id, status);
create index if not exists promo_redemptions_checkout_idx on public.promo_redemptions (checkout_id);

create unique index if not exists promo_redemptions_one_user_uidx
  on public.promo_redemptions (code_id, user_id)
  where status in ('reserved', 'paid') and one_per_user;

create table if not exists public.weekly_questions (
  id uuid primary key default gen_random_uuid(),
  question_en text not null,
  question_ar text not null,
  choices_en jsonb not null,
  choices_ar jsonb not null,
  answer_index integer not null,
  reward_percent integer not null default 10 check (reward_percent >= 1 and reward_percent <= 100),
  participation_only boolean not null default false,
  valid_days integer not null default 7 check (valid_days >= 1 and valid_days <= 90),
  active boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.question_entries (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.weekly_questions (id) on delete cascade,
  user_id uuid not null,
  choice_index integer not null,
  correct boolean not null default false,
  rewarded boolean not null default false,
  code_id uuid references public.promo_codes (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (question_id, user_id)
);

alter table public.moyasar_invoices
  add column if not exists promo_code_id uuid,
  add column if not exists promo_code text,
  add column if not exists list_amount_sar numeric,
  add column if not exists list_amount_halalas integer,
  add column if not exists discount_sar numeric,
  add column if not exists discount_halalas integer,
  add column if not exists promo_cycles integer,
  add column if not exists promo_discount_type text,
  add column if not exists promo_percent_off numeric,
  add column if not exists promo_amount_off_sar numeric;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'moyasar_invoices'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%amount_halalas%'
  loop
    execute format('alter table public.moyasar_invoices drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.moyasar_invoices
  drop constraint if exists moyasar_invoices_amount_halalas_check;

alter table public.moyasar_invoices
  add constraint moyasar_invoices_amount_halalas_check check (amount_halalas >= 0);

alter table public.billing_subscriptions
  add column if not exists promo_code_id uuid,
  add column if not exists promo_code text,
  add column if not exists promo_cycles_remaining integer not null default 0,
  add column if not exists promo_discount_type text,
  add column if not exists promo_percent_off numeric,
  add column if not exists promo_amount_off_sar numeric;

create or replace function public.reserve_promo_use(
  p_code_id uuid,
  p_user_id uuid,
  p_email text,
  p_checkout_id uuid,
  p_plan text,
  p_interval text,
  p_list_sar numeric,
  p_discount_sar numeric,
  p_charged_sar numeric,
  p_cycles integer,
  p_one_per_user boolean,
  p_max_uses integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing uuid;
  used integer;
  new_id uuid;
begin
  perform 1 from public.promo_codes where id = p_code_id for update;
  if not found then
    raise exception 'invalid';
  end if;

  select id into existing
  from public.promo_redemptions
  where code_id = p_code_id
    and checkout_id = p_checkout_id
    and status = 'reserved'
  limit 1;
  if existing is not null then
    return existing;
  end if;

  if p_one_per_user and exists (
    select 1
    from public.promo_redemptions
    where code_id = p_code_id
      and user_id = p_user_id
      and status in ('reserved', 'paid')
  ) then
    raise exception 'already_used';
  end if;

  if p_max_uses is not null then
    select count(*) into used
    from public.promo_redemptions
    where code_id = p_code_id
      and status in ('reserved', 'paid');
    if used >= p_max_uses then
      raise exception 'max_uses';
    end if;
  end if;

  insert into public.promo_redemptions (
    code_id, user_id, email, checkout_id, plan, billing_interval,
    list_amount_sar, discount_sar, charged_amount_sar, cycles, one_per_user, status
  ) values (
    p_code_id, p_user_id, p_email, p_checkout_id, p_plan, p_interval,
    p_list_sar, p_discount_sar, p_charged_sar, p_cycles, coalesce(p_one_per_user, true), 'reserved'
  )
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.reserve_promo_use(uuid, uuid, text, uuid, text, text, numeric, numeric, numeric, integer, boolean, integer) from public;
revoke all on function public.reserve_promo_use(uuid, uuid, text, uuid, text, text, numeric, numeric, numeric, integer, boolean, integer) from anon;
revoke all on function public.reserve_promo_use(uuid, uuid, text, uuid, text, text, numeric, numeric, numeric, integer, boolean, integer) from authenticated;
grant execute on function public.reserve_promo_use(uuid, uuid, text, uuid, text, text, numeric, numeric, numeric, integer, boolean, integer) to service_role;

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.weekly_questions enable row level security;
alter table public.question_entries enable row level security;

revoke all on table public.promo_codes from public;
revoke all on table public.promo_codes from anon;
revoke all on table public.promo_codes from authenticated;
grant select, insert, update, delete on table public.promo_codes to service_role;

revoke all on table public.promo_redemptions from public;
revoke all on table public.promo_redemptions from anon;
revoke all on table public.promo_redemptions from authenticated;
grant select, insert, update, delete on table public.promo_redemptions to service_role;

revoke all on table public.weekly_questions from public;
revoke all on table public.weekly_questions from anon;
revoke all on table public.weekly_questions from authenticated;
grant select, insert, update, delete on table public.weekly_questions to service_role;

revoke all on table public.question_entries from public;
revoke all on table public.question_entries from anon;
revoke all on table public.question_entries from authenticated;
grant select, insert, update, delete on table public.question_entries to service_role;
