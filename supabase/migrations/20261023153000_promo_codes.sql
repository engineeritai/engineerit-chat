-- Promo and gift codes. List prices stay in the app. The discounted payable
-- amount is what Moyasar charges, and the code is stored on the invoice.
-- Clients cannot read codes or weekly answers: RLS is on and forced, with no
-- policies, and table privileges are revoked from anon and authenticated.

create extension if not exists pgcrypto;

create table if not exists public.weekly_questions (
  id uuid primary key default gen_random_uuid(),
  question_en text not null,
  question_ar text not null,
  choices jsonb not null,
  reward_percent integer not null default 10 check (reward_percent > 0 and reward_percent <= 100),
  participation_only boolean not null default false,
  code_valid_days integer not null default 14 check (code_valid_days >= 1 and code_valid_days <= 90),
  plans text[] not null default array['engineer', 'professional', 'consultant', 'team', 'enterprise'],
  intervals text[] not null default array['month', 'year'],
  cycle_count integer not null default 1 check (cycle_count >= 1 and cycle_count <= 36),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_by uuid,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.weekly_question_answers (
  question_id uuid primary key references public.weekly_questions (id) on delete cascade,
  choice_id text not null
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  kind text not null check (kind in ('percent', 'fixed', 'free_months')),
  percent_off numeric,
  amount_off_sar numeric,
  free_months integer,
  plans text[] not null default '{}',
  intervals text[] not null default array['month', 'year'],
  cycle_count integer not null default 1 check (cycle_count >= 1 and cycle_count <= 36),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer,
  one_per_user boolean not null default true,
  audience text not null default 'any' check (audience in ('any', 'email_domain', 'lapsed', 'user')),
  email_domains text[] not null default '{}',
  restricted_user_id uuid,
  batch_id uuid,
  status text not null default 'active' check (status in ('active', 'disabled')),
  note text,
  source text not null default 'admin' check (source in ('admin', 'batch', 'question')),
  weekly_question_id uuid references public.weekly_questions (id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (code = upper(code) and char_length(code) between 4 and 40 and code ~ '^[A-Z0-9-]+$'),
  check (
    (kind = 'percent' and percent_off > 0 and percent_off <= 100)
    or (kind = 'fixed' and amount_off_sar > 0)
    or (kind = 'free_months' and free_months >= 1 and free_months <= 24)
  ),
  check (expires_at is null or expires_at > starts_at),
  check (max_uses is null or max_uses >= 1)
);

create unique index if not exists promo_codes_code_uidx on public.promo_codes (code);
create index if not exists promo_codes_batch_idx on public.promo_codes (batch_id);
create index if not exists promo_codes_status_idx on public.promo_codes (status);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes (id) on delete cascade,
  user_id uuid not null,
  invoice_id uuid not null references public.moyasar_invoices (id) on delete cascade,
  email text,
  status text not null check (status in ('reserved', 'redeemed')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

create unique index if not exists promo_redemptions_invoice_uidx on public.promo_redemptions (invoice_id);
create index if not exists promo_redemptions_code_idx on public.promo_redemptions (promo_code_id, status);

create table if not exists public.weekly_question_attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.weekly_questions (id) on delete cascade,
  user_id uuid not null,
  choice_id text not null,
  correct boolean not null,
  promo_code_id uuid references public.promo_codes (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (question_id, user_id)
);

alter table public.moyasar_invoices
  add column if not exists list_amount_sar numeric,
  add column if not exists list_amount_halalas integer,
  add column if not exists discount_sar numeric,
  add column if not exists discount_halalas integer,
  add column if not exists promo_code_id uuid,
  add column if not exists promo_code text,
  add column if not exists promo_cycles integer,
  add column if not exists discount_kind text,
  add column if not exists discount_percent numeric,
  add column if not exists discount_amount_off_sar numeric;

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
  add column if not exists discount_kind text,
  add column if not exists discount_percent numeric,
  add column if not exists discount_amount_off_sar numeric,
  add column if not exists discount_cycles_remaining integer not null default 0;

-- Serialize reservations. service_role only.
create or replace function public.reserve_promo_code(
  p_code_id uuid,
  p_user_id uuid,
  p_invoice_id uuid,
  p_email text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  promo public.promo_codes%rowtype;
  current_uses integer;
begin
  select * into promo from public.promo_codes where id = p_code_id for update;
  if not found then
    return 'not_found';
  end if;
  if promo.status <> 'active' then
    return 'disabled';
  end if;
  if promo.starts_at > now() then
    return 'not_started';
  end if;
  if promo.expires_at is not null and promo.expires_at <= now() then
    return 'expired';
  end if;
  if promo.one_per_user and exists (
    select 1 from public.promo_redemptions
    where promo_code_id = p_code_id and user_id = p_user_id and status = 'redeemed'
  ) then
    return 'already_used';
  end if;
  if promo.one_per_user then
    delete from public.promo_redemptions
    where promo_code_id = p_code_id
      and user_id = p_user_id
      and status = 'reserved'
      and invoice_id <> p_invoice_id;
  end if;
  select count(*) into current_uses
  from public.promo_redemptions
  where promo_code_id = p_code_id
    and status in ('reserved', 'redeemed')
    and invoice_id <> p_invoice_id;
  if promo.max_uses is not null and current_uses >= promo.max_uses then
    return 'maxed';
  end if;
  insert into public.promo_redemptions (promo_code_id, user_id, invoice_id, email, status)
  values (p_code_id, p_user_id, p_invoice_id, p_email, 'reserved')
  on conflict (invoice_id) do update
    set promo_code_id = excluded.promo_code_id,
        user_id = excluded.user_id,
        email = excluded.email,
        status = 'reserved',
        redeemed_at = null;
  return 'ok';
end;
$$;

create or replace function public.release_promo_reservation(
  p_invoice_id uuid,
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.promo_redemptions
  where invoice_id = p_invoice_id and user_id = p_user_id and status = 'reserved';
end;
$$;

create or replace function public.redeem_promo_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.promo_redemptions
  set status = 'redeemed', redeemed_at = now()
  where invoice_id = p_invoice_id and status = 'reserved';
end;
$$;

revoke all on table public.promo_codes from public, anon, authenticated;
revoke all on table public.promo_redemptions from public, anon, authenticated;
revoke all on table public.weekly_questions from public, anon, authenticated;
revoke all on table public.weekly_question_answers from public, anon, authenticated;
revoke all on table public.weekly_question_attempts from public, anon, authenticated;

grant select, insert, update, delete on table public.promo_codes to service_role;
grant select, insert, update, delete on table public.promo_redemptions to service_role;
grant select, insert, update, delete on table public.weekly_questions to service_role;
grant select, insert, update, delete on table public.weekly_question_answers to service_role;
grant select, insert, update, delete on table public.weekly_question_attempts to service_role;

revoke all on function public.reserve_promo_code(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.release_promo_reservation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.redeem_promo_invoice(uuid) from public, anon, authenticated;
grant execute on function public.reserve_promo_code(uuid, uuid, uuid, text) to service_role;
grant execute on function public.release_promo_reservation(uuid, uuid) to service_role;
grant execute on function public.redeem_promo_invoice(uuid) to service_role;

alter table public.promo_codes enable row level security;
alter table public.promo_codes force row level security;
alter table public.promo_redemptions enable row level security;
alter table public.promo_redemptions force row level security;
alter table public.weekly_questions enable row level security;
alter table public.weekly_questions force row level security;
alter table public.weekly_question_answers enable row level security;
alter table public.weekly_question_answers force row level security;
alter table public.weekly_question_attempts enable row level security;
alter table public.weekly_question_attempts force row level security;

comment on table public.promo_codes is
  'Owner-managed promo codes. No client policy: users cannot list codes.';
comment on table public.weekly_question_answers is
  'Correct choice for a weekly question. No client policy: users cannot read answers.';
