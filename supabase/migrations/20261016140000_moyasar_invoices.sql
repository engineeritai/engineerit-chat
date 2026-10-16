-- Moyasar invoices for every plan, including custom Enterprise quotes.
-- Payment confirmation reads this table. Clients cannot.

create table if not exists public.moyasar_invoices (
  id uuid primary key,
  invoice_id text unique,
  plan text not null,
  billing_interval text not null check (billing_interval in ('month', 'year')),
  amount_sar numeric not null,
  amount_halalas integer not null check (amount_halalas >= 100),
  currency text not null default 'SAR',
  seat_limit integer,
  extra_seats integer not null default 0,
  customer_email text,
  user_id uuid,
  lead_id uuid,
  company text,
  payment_url text,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  activated_at timestamptz,
  receipt_sent_at timestamptz,
  period_end timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists moyasar_invoices_lead_id_idx on public.moyasar_invoices (lead_id);

alter table public.moyasar_invoices enable row level security;

alter table public.enterprise_leads
  add column if not exists status text not null default 'open';

alter table public.enterprise_leads
  add column if not exists moyasar_invoice_id text;
