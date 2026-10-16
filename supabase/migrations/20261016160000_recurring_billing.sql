-- Self-serve recurring billing. Safe to run more than once.

create extension if not exists pgcrypto;

alter table public.moyasar_invoices
  add column if not exists payment_id text;

alter table public.moyasar_invoices
  add column if not exists purpose text not null default 'checkout';

create index if not exists moyasar_invoices_payment_id_idx
  on public.moyasar_invoices (payment_id);

create table if not exists public.saved_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  moyasar_token text not null unique,
  brand text,
  last_four text,
  holder_name text,
  status text not null default 'initiated' check (status in ('initiated', 'active', 'inactive')),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_cards_user_id_idx on public.saved_cards (user_id);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_email text,
  plan text not null,
  billing_interval text not null check (billing_interval in ('month', 'year')),
  extra_seats integer not null default 0 check (extra_seats >= 0),
  seat_limit integer not null default 1 check (seat_limit >= 1),
  amount_sar numeric not null,
  amount_halalas integer not null,
  currency text not null default 'SAR',
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'expired')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  saved_card_id uuid references public.saved_cards (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  credit_halalas integer not null default 0 check (credit_halalas >= 0),
  failure_count integer not null default 0 check (failure_count >= 0),
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_subscriptions_one_open_uidx
  on public.billing_subscriptions (user_id)
  where status in ('active', 'past_due');

create index if not exists billing_subscriptions_period_end_idx
  on public.billing_subscriptions (current_period_end)
  where status in ('active', 'past_due');

create table if not exists public.renewal_attempts (
  id uuid primary key default gen_random_uuid(),
  billing_subscription_id uuid not null references public.billing_subscriptions (id) on delete cascade,
  idempotency_key text not null unique,
  kind text not null check (kind in ('renewal', 'seat_change', 'card_update')),
  attempt_number integer not null default 0,
  amount_halalas integer not null,
  status text not null check (status in ('pending', 'paid', 'failed')),
  moyasar_payment_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saved_cards enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.renewal_attempts enable row level security;
