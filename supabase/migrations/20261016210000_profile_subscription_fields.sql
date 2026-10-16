-- Language for invoice emails and PDFs.
-- Apply after 20261016180000. Chat-history migration 20261016200000 is not part of this branch.

alter table public.moyasar_invoices
  add column if not exists locale text;

alter table public.billing_subscriptions
  add column if not exists locale text;

comment on column public.moyasar_invoices.locale is
  'en or ar. The invoice email and PDF use this language.';

comment on column public.billing_subscriptions.locale is
  'en or ar. Renewal invoice emails and PDFs use this language.';
