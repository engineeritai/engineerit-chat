-- Pending checkouts can be cancelled after Moyasar says they were not paid.
-- Paid rows stay paid. Service role is the only writer; RLS stays on.

alter table public.moyasar_invoices
  drop constraint if exists moyasar_invoices_status_check;

alter table public.moyasar_invoices
  add constraint moyasar_invoices_status_check
  check (status in ('pending', 'paid', 'cancelled'));

create index if not exists moyasar_invoices_pending_created_idx
  on public.moyasar_invoices (created_at)
  where status = 'pending';
